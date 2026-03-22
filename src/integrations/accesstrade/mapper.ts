/**
 * AccessTrade Mapper — Normalise raw API records into domain Offer model
 *
 * Responsible for:
 *  - Mapping AccessTrade fields → NormalisedOffer schema
 *  - Normalising text (trim, collapse whitespace)
 *  - Inferring platform from merchant/campaign name
 *  - Mapping status enums
 *  - Computing confidence score
 *  - Generating stable dedupe hashes
 */

import { createHash } from 'crypto';
import type {
  AccessTradeCampaign,
  AccessTradeDeal,
  NormalisedOffer,
  NormalisedDiscountType,
  NormalisedOfferStatus,
  OfferSourceType,
} from './types.js';

// =============================================================================
// Status Mappers
// =============================================================================

/** Map AccessTrade campaign status → domain status */
export function mapCampaignStatus(raw: AccessTradeCampaign['status']): NormalisedOfferStatus {
  switch (raw) {
    case 'active':   return 'active';
    case 'inactive': return 'inactive';
    case 'pending':  return 'pending';
    default:         return 'pending';
  }
}

/** Map AccessTrade deal status → domain status */
export function mapDealStatus(raw: AccessTradeDeal['status']): NormalisedOfferStatus {
  switch (raw) {
    case 'active':  return 'active';
    case 'inactive':return 'inactive';
    case 'expired': return 'expired';
    default:        return 'pending';
  }
}

/** Map AccessTrade deal type → domain source_type */
export function mapDealType(raw: AccessTradeDeal['type']): OfferSourceType {
  switch (raw) {
    case 'voucher':    return 'voucher';
    case 'promotion':  return 'promotion';
    case 'cashback':    return 'coupon'; // treat cashback as coupon for display
    case 'flash_sale':  return 'deal';
    default:            return 'deal';
  }
}

// =============================================================================
// Discount Normalisation
// =============================================================================

export function mapDiscountType(raw: AccessTradeDeal['discount_type']): NormalisedDiscountType {
  switch (raw) {
    case 'percent':    return 'percent';
    case 'fixed':      return 'fixed';
    default:           return 'percent';
  }
}

// =============================================================================
// Platform Inference
// =============================================================================

/** Infer e-commerce platform from text */
function inferPlatform(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('shopee'))   return 'shopee';
  if (t.includes('lazada'))   return 'lazada';
  if (t.includes('tiki'))     return 'tiki';
  if (t.includes('tiktok'))   return 'tiktok';
  if (t.includes('sendo'))    return 'sendo';
  if (t.includes('bidv'))     return 'bidv';
  if (t.includes('grab'))     return 'grab';
  if (t.includes('gojek'))    return 'gojek';
  return 'unknown';
}

// =============================================================================
// Text Normalisation
// =============================================================================

function normaliseText(input: string | null | undefined): string | null {
  if (!input) return null;
  return input.trim().replace(/\s+/g, ' ');
}

function normaliseUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const u = new URL(input);
    return u.toString();
  } catch {
    return input.trim();
  }
}

// =============================================================================
// Confidence Scoring
// =============================================================================

/**
 * Compute confidence score (0.0–1.0) based on data quality.
 *
 * Rules:
 *  + Has non-empty title         → +0.15
 *  + Has coupon code            → +0.15
 *  + Has end date (not expired) → +0.15
 *  + Has discount value         → +0.10
 *  + Has min order value        → +0.05
 *  + Has description            → +0.10
 *  + Has merchant name          → +0.10
 *  + Has tracking URL           → +0.10
 *  + Exclusive deal             → +0.10
 *  — Expired                    → 0.3 cap
 */
export function computeConfidenceScore(deal: AccessTradeDeal): number {
  let score = 0.3; // base

  if (deal.title && deal.title.trim().length > 0) score += 0.15;
  if (deal.code && deal.code.trim().length > 0) score += 0.15;
  if (deal.end_date) {
    const expiry = new Date(deal.end_date).getTime();
    if (expiry > Date.now()) score += 0.15;
  }
  if (deal.discount_value && deal.discount_value > 0) score += 0.10;
  if (deal.min_order_value && deal.min_order_value > 0) score += 0.05;
  if (deal.description && deal.description.trim().length > 10) score += 0.10;
  if (deal.campaign_name && deal.campaign_name.trim().length > 0) score += 0.10;
  if (deal.tracking_url && deal.tracking_url.trim().length > 0) score += 0.10;
  if (deal.is_exclusive) score += 0.10;

  // Cap expired deals at 0.5
  if (deal.status === 'expired') score = Math.min(score, 0.5);
  // Cap score at 1.0
  return Math.min(score, 1.0);
}

// =============================================================================
// Stable Dedupe Hash
// =============================================================================

/**
 * Generate a SHA-256 hash from key normalised fields.
 * Used for dedupe even when external_id may be unstable across API calls.
 *
 * Inputs: source | source_type | title (normalised) | merchant_name | coupon_code
 */
export function computeOfferHash(offer: {
  source: string;
  sourceType: string;
  title: string | null;
  merchantName: string;
  couponCode: string | null;
}): string {
  const parts = [
    offer.source,
    offer.sourceType,
    (offer.title ?? '').toLowerCase().trim(),
    offer.merchantName.toLowerCase().trim(),
    (offer.couponCode ?? '').toLowerCase().trim(),
  ];
  const payload = parts.join('|');
  return createHash('sha256').update(payload).digest('hex');
}

// =============================================================================
// Campaign → Offer Mapping
// =============================================================================

/**
 * Map an AccessTrade campaign to a normalised offer.
 *
 * Campaigns are treated as merchant-level records — no coupon code,
 * no discount value. Useful for browsing merchants, not for direct vouchers.
 */
export function mapCampaignToOffer(
  campaign: AccessTradeCampaign,
  rawPayload: Record<string, unknown>
): Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'> {
  const now = new Date().toISOString();

  return {
    source: 'accesstrade',
    source_type: 'campaign',
    external_id: `at_campaign_${campaign.id}`,
    title: normaliseText(campaign.name) ?? 'Unknown Campaign',
    slug: null,
    description: normaliseText(campaign.description) ?? null,
    merchant_name: normaliseText(campaign.name) ?? 'Unknown',
    merchant_id: String(campaign.id),
    category: campaign.categories?.join(', ') ?? null,
    destination_url: normaliseUrl(campaign.url ?? null),
    tracking_url: null,
    coupon_code: null,
    discount_type: null,
    discount_value: campaign.commission_value ?? null,
    max_discount: campaign.commission_cap ?? null,
    min_order_value: campaign.min_order_value ?? null,
    currency: 'VND',
    start_at: campaign.created_at ?? now,
    end_at: null,
    status: mapCampaignStatus(campaign.status),
    terms: campaign.description ?? null,
    image_url: null,
    confidence_score: campaign.status === 'active' ? 0.6 : 0.3,
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: rawPayload,
    normalized_hash: computeOfferHash({
      source: 'accesstrade',
      sourceType: 'campaign',
      title: campaign.name,
      merchantName: campaign.name,
      couponCode: null,
    }),
  };
}

// =============================================================================
// Deal → Offer Mapping
// =============================================================================

/**
 * Map an AccessTrade deal to a normalised offer.
 *
 * This is the primary mapping for voucher/deal/coupon ingestion.
 */
export function mapDealToOffer(
  deal: AccessTradeDeal,
  rawPayload: Record<string, unknown>
): Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'> {
  const now = new Date().toISOString();
  const title = normaliseText(deal.title) ?? 'Unknown Offer';
  const merchantName = normaliseText(deal.campaign_name) ?? 'Unknown Merchant';

  return {
    source: 'accesstrade',
    source_type: mapDealType(deal.type),
    external_id: `at_deal_${deal.id}`,
    title,
    slug: null,
    description: normaliseText(deal.description) ?? null,
    merchant_name: merchantName,
    merchant_id: String(deal.campaign_id),
    category: inferPlatform(merchantName),
    destination_url: normaliseUrl(deal.tracking_url ?? null),
    tracking_url: normaliseUrl(deal.tracking_url ?? null),
    coupon_code: deal.code ? normaliseText(deal.code) : null,
    discount_type: mapDiscountType(deal.discount_type),
    discount_value: deal.discount_value ?? null,
    max_discount: deal.max_discount ?? null,
    min_order_value: deal.min_order_value ?? null,
    currency: 'VND',
    start_at: deal.start_date ?? null,
    end_at: deal.end_date ?? null,
    status: mapDealStatus(deal.status),
    terms: deal.description ?? null,
    image_url: null,
    confidence_score: computeConfidenceScore(deal),
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: rawPayload,
    normalized_hash: computeOfferHash({
      source: 'accesstrade',
      sourceType: mapDealType(deal.type),
      title: deal.title,
      merchantName: deal.campaign_name,
      couponCode: deal.code,
    }),
  };
}

// =============================================================================
// Batch Normalisation
// =============================================================================

/**
 * Normalise a batch of deals, updating first_seen_at for existing records.
 */
export function mapDealsToOffers(
  deals: AccessTradeDeal[],
  existingIds: Map<string, string>
): Array<{ offer: Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'>; externalId: string }> {
  const now = new Date().toISOString();

  return deals.map((deal) => {
    const externalId = `at_deal_${deal.id}`;
    const isUpdate = existingIds.has(externalId);
    const rawPayload = deal as unknown as Record<string, unknown>;
    const mapped = mapDealToOffer(deal, rawPayload);

    if (isUpdate) {
      // Keep first_seen_at from the original record
      mapped.first_seen_at = now; // will be overridden by the update logic
    }

    return { offer: mapped, externalId };
  });
}
