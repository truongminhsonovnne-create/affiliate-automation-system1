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
  AccessTradeVoucher,
  AccessTradeCoupon,
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

const PLATFORM_KEYWORDS: Array<[string[], string]> = [
  [['shopee'], 'shopee'],
  [['lazada'], 'lazada'],
  [['tiki'], 'tiki'],
  [['tiktok', 'tik tok', 'tiktokshop'], 'tiktok'],
  [['sendo'], 'sendo'],
  [['grab'], 'grab'],
  [['gojek', 'go-jek'], 'gojek'],
  [['bidv'], 'bidv'],
  [['vnpay'], 'vnpay'],
  [['momo', 'momo'], 'momo'],
  [['zalora'], 'zalora'],
  [['fahasa'], 'fahasa'],
  [['food', 'ăn uống', 'nhà hàng'], 'food'],
  [['travel', 'du lịch', 'vé máy bay', 'khách sạn'], 'travel'],
  [['beauty', 'mỹ phẩm', 'skincare'], 'beauty'],
  [['fashion', 'thời trang', 'quần áo', 'giày'], 'fashion'],
  [['electronics', 'điện tử', 'laptop', 'điện thoại'], 'electronics'],
];

const DEAL_TYPE_KEYWORDS: Array<[string[], string]> = [
  [['flash sale', 'flash_sale', 'flashsale', 'deal nóng', 'hot deal'], 'flash_sale'],
  [['push sale', 'pushsale', 'push sale'], 'pushsale'],
  [['cashback', 'hoàn tiền', 'hoàn xu'], 'cashback'],
  [['freeshipping', 'free ship', 'miễn phí vận chuyển', 'ship'], 'free_shipping'],
];

/** Infer e-commerce platform from text */
function inferPlatform(text: string | null | undefined): string {
  if (!text) return 'unknown';
  const t = text.toLowerCase();
  for (const [keywords, platform] of PLATFORM_KEYWORDS) {
    if (keywords.some((kw) => t.includes(kw))) return platform;
  }
  return 'unknown';
}

/** Infer deal-type label from text. */
function inferDealCategory(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const [keywords, label] of DEAL_TYPE_KEYWORDS) {
    if (keywords.some((kw) => t.includes(kw))) return label;
  }
  return null;
}

/** Merges platform + deal-type into a single normalised category string. */
function normaliseCategory(merchantName: string | null | undefined, description: string | null | undefined): string {
  const platform = inferPlatform(merchantName ?? undefined);
  const dealCat = inferDealCategory(description ?? undefined);
  if (platform !== 'unknown' && dealCat) return `${platform}:${dealCat}`;
  if (platform !== 'unknown') return platform;
  if (dealCat) return dealCat;
  return 'general';
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
 * Compute confidence score (0.0–1.0) based on data quality and engagement signals.
 *
 * Rules:
 *  Base score                     → 0.15
 *  + Has non-empty title          → +0.20
 *  + Has coupon code              → +0.12
 *  + Has end date (not expired)  → +0.12
 *  + Has discount value > 0      → +0.10
 *  + Has min order value         → +0.05
 *  + Has description (>10 chars) → +0.10
 *  + Has merchant name           → +0.08
 *  + Has tracking URL            → +0.08
 *  + Exclusive deal              → +0.08
 *  + Has usage_limit (real offer) → +0.05
 *  + Has uses_remaining > 0      → +0.02
 *  — Expired                     → cap at 0.50
 *  — Inactive                    → cap at 0.40
 */
export function computeConfidenceScore(deal: AccessTradeDeal): number {
  let score = 0.15; // base floor

  if (deal.title && deal.title.trim().length > 0) score += 0.20;
  if (deal.code && deal.code.trim().length > 0) score += 0.12;
  if (deal.end_date) {
    const expiry = new Date(deal.end_date).getTime();
    if (expiry > Date.now()) score += 0.12;
  }
  const dv = typeof deal.discount_value === 'number'
    ? deal.discount_value
    : Number(deal.discount_value) || 0;
  if (dv > 0) score += 0.10;
  if (deal.min_order_value && deal.min_order_value > 0) score += 0.05;
  if (deal.description && deal.description.trim().length > 10) score += 0.10;
  if (deal.campaign_name && deal.campaign_name.trim().length > 0) score += 0.08;
  if (deal.tracking_url && deal.tracking_url.trim().length > 0) score += 0.08;
  if (deal.is_exclusive) score += 0.08;
  if (deal.usage_limit != null && deal.usage_limit > 0) score += 0.05;
  if (deal.uses_remaining != null && deal.uses_remaining > 0) score += 0.02;

  // Cap by status
  if (deal.status === 'expired') score = Math.min(score, 0.50);
  else if (deal.status === 'inactive') score = Math.min(score, 0.40);

  return Math.min(Math.round(score * 100) / 100, 1.0);
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

  // Normalise categories: join with comma, then try to infer platform
  const rawCategory = campaign.categories?.join(', ') ?? null;
  const platformCat = inferPlatform(rawCategory ?? undefined);
  const category = platformCat !== 'unknown' ? platformCat : rawCategory;

  return {
    source: 'accesstrade',
    source_type: 'campaign',
    external_id: `at_campaign_${campaign.id}`,
    title: normaliseText(campaign.name) ?? 'Unknown Campaign',
    slug: null,
    description: normaliseText(campaign.description) ?? null,
    merchant_name: normaliseText(campaign.name) ?? 'Unknown',
    merchant_id: String(campaign.id),
    category,
    destination_url: normaliseUrl(campaign.url ?? null),
    tracking_url: null,
    coupon_code: null,
    discount_type: 'percent', // commission-based campaigns
    discount_value: campaign.commission_percent ?? null,
    max_discount: campaign.commission_cap ?? null,
    min_order_value: campaign.min_order_value ?? null,
    currency: 'VND',
    start_at: campaign.created_at ?? now,
    end_at: null,
    status: mapCampaignStatus(campaign.status),
    terms: `Commission type: ${campaign.commission_type ?? 'unknown'}. Cookie duration: ${campaign.cookie_duration ?? '?'} days.${campaign.description ? ' ' + campaign.description : ''}`,
    image_url: null,
    confidence_score: campaign.status === 'active' ? 0.6 : 0.35,
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
 *
 * Improvements over v1:
 *  - discount_value parsed as number (API may return number or string)
 *  - category normalised via inferPlatform + inferDealCategory
 *  - exclusive flag embedded in raw_payload for scoring
 *  - terms preserved separately from description
 *  - new enrichment fields populated
 */
export function mapDealToOffer(
  deal: AccessTradeDeal,
  rawPayload: Record<string, unknown>
): Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'> {
  const now = new Date().toISOString();
  const title = normaliseText(deal.title) ?? 'Unknown Offer';
  const merchantName = normaliseText(deal.campaign_name) ?? 'Unknown Merchant';

  // discount_value: API type says number, but normalise to handle both
  const discountValue = typeof deal.discount_value === 'number'
    ? deal.discount_value
    : Number(deal.discount_value) || null;

  const enrichedPayload: Record<string, unknown> = {
    ...(rawPayload as Record<string, unknown>),
    _voucherfinder: {
      is_exclusive: deal.is_exclusive ?? false,
      usage_limit: deal.usage_limit,
      uses_remaining: deal.uses_remaining,
      enriched_at: now,
    },
  };

  // URL quality
  const urlQualityScore = computeUrlQualityScore(deal.tracking_url ?? null);

  // Deal subtype
  const dealSubtype = inferAtDealSubtype(deal.type, deal.title ?? '');

  return {
    source: 'accesstrade',
    source_type: mapDealType(deal.type),
    external_id: `at_deal_${deal.id}`,
    title,
    slug: null,
    description: normaliseText(deal.description) ?? null,
    merchant_name: merchantName,
    merchant_id: String(deal.campaign_id),
    category: normaliseCategory(merchantName, deal.description ?? null),
    destination_url: normaliseUrl(deal.tracking_url ?? null),
    tracking_url: normaliseUrl(deal.tracking_url ?? null),
    coupon_code: deal.code ? normaliseText(deal.code) : null,
    discount_type: mapDiscountType(deal.discount_type),
    discount_value: discountValue,
    max_discount: deal.max_discount ?? null,
    min_order_value: deal.min_order_value ?? null,
    currency: 'VND',
    start_at: deal.start_date ?? null,
    end_at: deal.end_date ?? null,
    status: mapDealStatus(deal.status),
    terms: deal.description ?? null,
    image_url: null,
    confidence_score: computeConfidenceScore(deal),
    // ── New enrichment fields ────────────────────────────────
    is_exclusive: deal.is_exclusive ?? false,
    url_quality_score: urlQualityScore,
    deal_subtype: dealSubtype,
    // ── Audit ───────────────────────────────────────────────
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: enrichedPayload,
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
 * Normalise a batch of deals. The `existingIds` map is used for debugging/logging
 * only; dedupe is handled by the DB layer via (source, external_id) uniqueness.
 */
export function mapDealsToOffers(
  deals: AccessTradeDeal[],
  _existingIds?: Map<string, string>
): Array<{ offer: Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'>; externalId: string }> {
  return deals.map((deal) => {
    const externalId = `at_deal_${deal.id}`;
    const rawPayload = deal as unknown as Record<string, unknown>;
    const mapped = mapDealToOffer(deal, rawPayload);
    return { offer: mapped, externalId };
  });
}

/**
 * Map an AccessTrade voucher to a normalised offer.
 */
export function mapVoucherToOffer(
  voucher: AccessTradeVoucher,
  rawPayload: Record<string, unknown>
): Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'> {
  const now = new Date().toISOString();
  const title = normaliseText(voucher.title) ?? 'Unknown Voucher';
  const merchantName = normaliseText(voucher.campaign_name) ?? 'Unknown Merchant';

  const enrichedPayload = {
    ...rawPayload,
    _voucherfinder: {
      is_exclusive: voucher.is_exclusive ?? false,
      usage_limit: voucher.usage_limit,
      uses_remaining: voucher.uses_remaining,
      enriched_at: now,
    },
  };

  return {
    source: 'accesstrade',
    source_type: 'voucher',
    external_id: `at_voucher_${voucher.id}`,
    title,
    slug: null,
    description: normaliseText(voucher.description) ?? null,
    merchant_name: merchantName,
    merchant_id: String(voucher.campaign_id),
    category: normaliseCategory(merchantName, voucher.description ?? null),
    destination_url: normaliseUrl(voucher.tracking_url ?? null),
    tracking_url: normaliseUrl(voucher.tracking_url ?? null),
    coupon_code: voucher.code ? normaliseText(voucher.code) : null,
    discount_type: voucher.discount_type === 'percent' ? 'percent' : 'fixed',
    discount_value: typeof voucher.discount_value === 'number'
      ? voucher.discount_value
      : Number(voucher.discount_value) || null,
    max_discount: voucher.max_discount ?? null,
    min_order_value: voucher.min_order_value ?? null,
    currency: 'VND',
    start_at: voucher.start_date ?? null,
    end_at: voucher.end_date ?? null,
    status: mapDealStatus(voucher.status),
    terms: voucher.description ?? null,
    image_url: null,
    confidence_score: computeVoucherConfidenceScore(voucher),
    is_exclusive: voucher.is_exclusive ?? false,
    url_quality_score: computeUrlQualityScore(voucher.tracking_url ?? null),
    deal_subtype: voucher.discount_type === 'free_shipping' ? 'free_shipping' : 'voucher',
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: enrichedPayload,
    normalized_hash: computeOfferHash({
      source: 'accesstrade',
      sourceType: 'voucher',
      title: voucher.title,
      merchantName: voucher.campaign_name,
      couponCode: voucher.code,
    }),
  };
}

/**
 * Map an AccessTrade coupon to a normalised offer.
 */
export function mapCouponToOffer(
  coupon: AccessTradeCoupon,
  rawPayload: Record<string, unknown>
): Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'> {
  const now = new Date().toISOString();
  const title = normaliseText(coupon.title) ?? 'Unknown Coupon';
  const merchantName = normaliseText(coupon.campaign_name) ?? 'Unknown Merchant';

  const enrichedPayload = {
    ...rawPayload,
    _voucherfinder: {
      is_exclusive: coupon.is_exclusive ?? false,
      usage_limit: coupon.usage_limit,
      uses_remaining: coupon.uses_remaining,
      enriched_at: now,
    },
  };

  return {
    source: 'accesstrade',
    source_type: 'coupon',
    external_id: `at_coupon_${coupon.id}`,
    title,
    slug: null,
    description: normaliseText(coupon.description) ?? null,
    merchant_name: merchantName,
    merchant_id: String(coupon.campaign_id),
    category: normaliseCategory(merchantName, coupon.description ?? null),
    destination_url: normaliseUrl(coupon.tracking_url ?? null),
    tracking_url: normaliseUrl(coupon.tracking_url ?? null),
    coupon_code: coupon.code ? normaliseText(coupon.code) : null,
    discount_type: coupon.discount_type === 'percent' ? 'percent' : 'fixed',
    discount_value: typeof coupon.discount_value === 'number'
      ? coupon.discount_value
      : Number(coupon.discount_value) || null,
    max_discount: coupon.max_discount ?? null,
    min_order_value: coupon.min_order_value ?? null,
    currency: 'VND',
    start_at: coupon.start_date ?? null,
    end_at: coupon.end_date ?? null,
    status: mapDealStatus(coupon.status),
    terms: coupon.description ?? null,
    image_url: null,
    confidence_score: computeCouponConfidenceScore(coupon),
    is_exclusive: coupon.is_exclusive ?? false,
    url_quality_score: computeUrlQualityScore(coupon.tracking_url ?? null),
    deal_subtype: 'coupon',
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: enrichedPayload,
    normalized_hash: computeOfferHash({
      source: 'accesstrade',
      sourceType: 'coupon',
      title: coupon.title,
      merchantName: coupon.campaign_name,
      couponCode: coupon.code,
    }),
  };
}

function computeVoucherConfidenceScore(v: AccessTradeVoucher): number {
  let score = 0.15;
  if (v.title && v.title.trim().length > 0) score += 0.20;
  if (v.status === 'active') score += 0.20;
  if (v.code && v.code.trim().length >= 3) score += 0.12;
  if (v.end_date && new Date(v.end_date).getTime() > Date.now()) score += 0.12;
  if (v.discount_value) score += 0.10;
  if (v.min_order_value && v.min_order_value > 0) score += 0.05;
  if (v.description && v.description.trim().length > 10) score += 0.08;
  if (v.campaign_name) score += 0.08;
  if (v.tracking_url) score += 0.08;
  if (v.is_exclusive) score += 0.08;
  if (v.usage_limit != null) score += 0.05;
  if (v.uses_remaining != null && v.uses_remaining > 0) score += 0.02;
  if (v.status === 'expired') score = Math.min(score, 0.50);
  else if (v.status === 'inactive') score = Math.min(score, 0.40);
  return Math.min(Math.round(score * 100) / 100, 1.0);
}

// =============================================================================
// URL Quality Scoring (shared helper)
// =============================================================================

/**
 * Scores a URL's quality from 0.0 to 1.0.
 * HTTPS + tracking params = 1.0; HTTPS only = 0.8; HTTP = 0.5; invalid = 0.0
 */
function computeUrlQualityScore(url: string | null | undefined): number {
  if (!url) return 0.0;
  try {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const hasParams = parsed.searchParams.size > 0;
    const hasTracking = /utm_|click_id|affiliate|tracking/i.test(parsed.search);
    if (isHttps && hasTracking) return 1.0;
    if (isHttps && hasParams) return 0.9;
    if (isHttps) return 0.8;
    if (parsed.protocol === 'http:') return 0.5;
    return 0.3;
  } catch {
    return 0.1;
  }
}

/** Infers granular deal subtype from AccessTrade deal type or title. */
function inferAtDealSubtype(type: string, title: string): string {
  const t = type.toLowerCase();
  const tt = title.toLowerCase();
  if (t === 'flash_sale' || tt.includes('flash sale')) return 'flash_sale';
  if (t === 'pushsale' || tt.includes('push sale') || tt.includes('pushsale')) return 'pushsale';
  if (t === 'cashback' || tt.includes('cashback') || tt.includes('hoàn tiền')) return 'cashback';
  if (t === 'voucher' || tt.includes('voucher')) return 'voucher';
  if (t === 'coupon' || tt.includes('coupon') || tt.includes('mã giảm')) return 'coupon';
  return 'general';
}

function computeCouponConfidenceScore(c: AccessTradeCoupon): number {
  let score = 0.15;
  if (c.title && c.title.trim().length > 0) score += 0.20;
  if (c.status === 'active') score += 0.20;
  if (c.code && c.code.trim().length >= 3) score += 0.15;
  if (c.end_date && new Date(c.end_date).getTime() > Date.now()) score += 0.12;
  if (c.discount_value) score += 0.10;
  if (c.min_order_value && c.min_order_value > 0) score += 0.05;
  if (c.description && c.description.trim().length > 10) score += 0.08;
  if (c.campaign_name) score += 0.08;
  if (c.tracking_url) score += 0.08;
  if (c.is_exclusive) score += 0.08;
  if (c.usage_limit != null) score += 0.05;
  if (c.uses_remaining != null && c.uses_remaining > 0) score += 0.02;
  if (c.status === 'expired') score = Math.min(score, 0.50);
  else if (c.status === 'inactive') score = Math.min(score, 0.40);
  return Math.min(Math.round(score * 100) / 100, 1.0);
}
