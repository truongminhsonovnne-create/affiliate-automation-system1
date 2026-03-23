/**
 * AccessTrade → NormalisedOffer Mapper (admin-dashboard copy)
 *
 * Maps raw AccessTrade API offers (/v1/offers_informations) to the shared
 * NormalisedOffer schema used by the sync orchestrator.
 *
 * Docs: https://developers.accesstrade.vn/api-publisher-vietnamese
 */

import { createHash } from 'crypto';
import type { AccessTradeOffer } from './accesstrade-types';

// =============================================================================
// Utilities
// =============================================================================

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function inferPlatform(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('shopee')) return 'shopee';
  if (t.includes('lazada')) return 'lazada';
  if (t.includes('tiki')) return 'tiki';
  if (t.includes('tiktok')) return 'tiktok';
  if (t.includes('sendo')) return 'sendo';
  if (t.includes('grab')) return 'grab';
  if (t.includes('baemin') || t.includes('baemin')) return 'baemin';
  if (t.includes('shopee')) return 'shopee';
  return 'unknown';
}

function getFirstCouponCode(offer: AccessTradeOffer): string | null {
  if (Array.isArray(offer.coupons) && offer.coupons.length > 0) {
    const first = offer.coupons[0];
    if (typeof first === 'object' && first !== null && 'coupon_code' in first) {
      const code = (first as { coupon_code: string }).coupon_code;
      if (typeof code === 'string' && code.trim().length > 0) return code.trim();
    }
  }
  if (typeof offer.code === 'string' && offer.code.trim().length > 0) return offer.code.trim();
  return null;
}

function getCategories(offer: AccessTradeOffer): string[] {
  if (!Array.isArray(offer.categories)) return [];
  return offer.categories
    .filter((c) => typeof c === 'object' && c !== null && 'category_name' in c)
    .map((c) => (c as { category_name: string }).category_name)
    .filter(Boolean);
}

function inferSourceType(offer: AccessTradeOffer): string {
  const firstCode = getFirstCouponCode(offer);
  if (firstCode && firstCode.length > 0) return 'coupon';

  const t = `${offer.name ?? ''} ${offer.content ?? ''}`.toLowerCase();
  if (t.includes('free ship') || t.includes('freeshipping')) return 'voucher';
  if (t.includes('flash sale') || t.includes('flash_sale')) return 'deal';
  if (t.includes('cashback') || t.includes('hoàn tiền')) return 'deal';
  return 'voucher';
}

function computeConfidence(offer: AccessTradeOffer): number {
  let score = 0.30;

  const firstCode = getFirstCouponCode(offer);
  if (firstCode && firstCode.length >= 3) score += 0.15;

  if (offer.end_time) {
    const expiry = new Date(offer.end_time).getTime();
    if (!isNaN(expiry) && expiry > Date.now()) score += 0.12;
  }

  if (offer.aff_link) score += 0.10;

  if (offer.content && typeof offer.content === 'string' && offer.content.length > 20) score += 0.08;

  if (offer.merchant) score += 0.08;

  if (Array.isArray(offer.coupons) && offer.coupons.length > 1) score += 0.05;

  if (offer.categories && Array.isArray(offer.categories) && offer.categories.length > 0) score += 0.05;

  if (offer.end_time) {
    const expiry = new Date(offer.end_time).getTime();
    if (!isNaN(expiry) && expiry < Date.now()) score = Math.min(score, 0.45);
  }

  return Math.min(score, 1.0);
}

// =============================================================================
// Main mapper
// =============================================================================

export function mapOfferToNormalisedOffer(
  offer: AccessTradeOffer,
  raw: Record<string, unknown>
): {
  external_id: string;
  source: string;
  source_type: string;
  title: string;
  slug: string | null;
  description: string | null;
  merchant_name: string;
  merchant_id: string | null;
  category: string | null;
  destination_url: string | null;
  tracking_url: string | null;
  coupon_code: string | null;
  discount_type: string | null;
  discount_value: number | null;
  max_discount: number | null;
  min_order_value: number | null;
  currency: string;
  start_at: string | null;
  end_at: string | null;
  status: string;
  terms: string | null;
  image_url: string | null;
  confidence_score: number;
  last_seen_at: string;
  first_seen_at: string;
  synced_at: string;
  raw_payload_jsonb: Record<string, unknown>;
  normalized_hash: string;
} {
  const now = new Date().toISOString();
  const title = typeof offer.name === 'string' && offer.name.trim().length > 0
    ? offer.name.trim() : 'Unknown Offer';
  const merchantName = typeof offer.merchant === 'string' && offer.merchant.trim().length > 0
    ? offer.merchant.trim() : 'Unknown Merchant';

  const code = getFirstCouponCode(offer);
  const sourceType = inferSourceType(offer);
  const categories = getCategories(offer);
  const category = categories.length > 0
    ? categories.join(', ')
    : inferPlatform(`${merchantName} ${title}`);

  // Determine status
  let status = 'active';
  if (offer.end_time) {
    const expiry = new Date(offer.end_time).getTime();
    if (!isNaN(expiry) && expiry < Date.now()) status = 'expired';
  }

  // Generate dedupe hash
  const dedupeInput = [
    'accesstrade',
    sourceType,
    title.toLowerCase(),
    merchantName.toLowerCase(),
    (code ?? '').toLowerCase(),
  ].join('|');
  const hash = createHash('sha256').update(dedupeInput).digest('hex');

  // Determine discount type
  let discountType: string | null = 'percent';
  const contentLower = (offer.content ?? '').toLowerCase();
  if (
    contentLower.includes('free ship') ||
    contentLower.includes('freeshipping') ||
    contentLower.includes('miễn phí vận chuyển')
  ) {
    discountType = 'free_shipping';
  } else if (
    contentLower.includes('cashback') ||
    contentLower.includes('hoàn tiền')
  ) {
    discountType = 'cashback';
  }

  return {
    external_id: `at_offer_${offer.id}`,
    source: 'accesstrade',
    source_type: sourceType,
    title,
    slug: toSlug(title),
    description: typeof offer.content === 'string' && offer.content.trim().length > 0
      ? offer.content.trim()
      : null,
    merchant_name: merchantName,
    merchant_id: null,
    category,
    destination_url: typeof offer.link === 'string' ? offer.link : null,
    tracking_url: typeof offer.aff_link === 'string' ? offer.aff_link : null,
    coupon_code: code,
    discount_type: discountType,
    discount_value: null,    // real API doesn't expose numeric discount
    max_discount: null,
    min_order_value: null,
    currency: 'VND',
    start_at: typeof offer.start_time === 'string' ? offer.start_time : null,
    end_at: typeof offer.end_time === 'string' ? offer.end_time : null,
    status,
    terms: typeof offer.content === 'string' ? offer.content : null,
    image_url: typeof offer.image === 'string' ? offer.image : null,
    confidence_score: computeConfidence(offer),
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: raw,
    normalized_hash: hash,
  };
}
