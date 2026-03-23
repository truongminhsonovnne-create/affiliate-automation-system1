/**
 * MasOffer Mapper — normalises raw MasOffer API responses
 * into the shared NormalisedOffer domain model with dedupe hash and confidence score.
 *
 * Schema alignment: all records are written into the shared `offers` table
 * (shared with AccessTrade). Required fields: merchant_name, currency, slug, etc.
 */

import { createHash } from 'crypto';
import type {
  MasOfferOfferItem,
  MasOfferCampaign,
} from './masoffer.types.js';
import type {
  NormalisedOffer,
  NormalisedDiscountType,
  NormalisedOfferStatus,
  OfferSourceType,
} from '../accesstrade/types.js';

// =============================================================================
// Canonical Category Map — normalise MasOffer category strings
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
  [['wine', 'rượu'], 'alcohol'],
  [['food', 'ăn uống', 'nhà hàng', 'giao thức ăn'], 'food'],
  [['travel', 'du lịch', 'vé máy bay', 'khách sạn'], 'travel'],
  [['beauty', 'mỹ phẩm', 'skincare', 'cosmetic'], 'beauty'],
  [['fashion', 'thời trang', 'quần áo', 'giày', ' túi'], 'fashion'],
  [['electronics', 'điện tử', 'laptop', 'điện thoại', 'smartphone'], 'electronics'],
  [['home', 'nhà cửa', 'nội thất', 'decor'], 'home'],
  [['kids', 'trẻ em', 'baby', 'mẹ và bé'], 'kids'],
  [['sport', 'thể thao', 'gym', 'fitness'], 'sport'],
  [['insurance', 'bảo hiểm'], 'insurance'],
  [['finance', 'tài chính', 'ngân hàng'], 'finance'],
];

const CATEGORY_KEYWORDS: Array<[string[], string]> = [
  [['voucher', 'mã giảm', 'coupon', 'khuyến mãi', 'khuyen mai', 'sale', 'flash sale', 'deal hot', 'hot deal', 'pushsale', 'push sale', 'giam gia', 'giảm giá'], 'discount'],
  [['freeshipping', 'free ship', 'miễn phí vận chuyển', 'ship'], 'shipping'],
  [['cashback', 'hoàn tiền', 'hoàn xu'], 'cashback'],
  [['installment', 'trả góp'], 'installment'],
];

/** Infers a canonical platform from free-text category or campaign name. */
export function inferPlatform(text: string | null | undefined): string {
  if (!text) return 'unknown';
  const t = text.toLowerCase();
  for (const [keywords, platform] of PLATFORM_KEYWORDS) {
    if (keywords.some((kw) => t.includes(kw))) return platform;
  }
  return 'unknown';
}

/** Infers a deal-type category label. */
export function inferDealCategory(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const [keywords, label] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => t.includes(kw))) return label;
  }
  return null;
}

/** Merges platform + deal-type into a single normalised category string. */
export function normaliseCategory(raw: string | null | undefined): string {
  const platform = inferPlatform(raw ?? undefined);
  const dealCat = inferDealCategory(raw ?? undefined);
  if (platform !== 'unknown' && dealCat) return `${platform}:${dealCat}`;
  if (platform !== 'unknown') return platform;
  if (dealCat) return dealCat;
  return 'general';
}

// =============================================================================
// Shared Helpers
// =============================================================================

/** Generates a slug from a string (kebab-case, max 80 chars). */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

// =============================================================================
// Date / Datetime Parsing
// =============================================================================

/**
 * Parses a MasOffer date string into an ISO 8601 date string (YYYY-MM-DD).
 * Handles: "2025-01-15", "2025-01-15 00:00:00", "15/01/2025", "01/15/2025"
 * Returns null if the date cannot be parsed.
 */
export function parseMasOfferDate(raw: string | undefined | null): string | null {
  if (!raw) return null;

  const s = raw.trim();

  // ISO format: 2025-01-15 or 2025-01-15T00:00:00Z
  // Extract date portion directly — avoids timezone offset issues
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }

  // dd/mm/yyyy (common in Vietnam) — extract date portion directly
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    // Validate ranges
    const y = Number(year), m = Number(month), d = Number(day);
    if (y >= 1900 && y <= 9999 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Parses a MasOffer datetime string into an ISO 8601 full timestamp.
 */
export function parseMasOfferDateTime(raw: string | undefined | null): string | null {
  if (!raw) return null;

  const s = raw.trim();

  // ISO / RFC2822: 2025-01-15T00:00:00Z or 2025-01-15T00:00:00+07:00
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    // Normalise: extract YYYY-MM-DDTHH:MM:SS portion and append Z
    const match = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    if (match) return match[1] + 'Z';
  }

  // dd/mm/yyyy hh:mm:ss
  const dmyTime = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/);
  if (dmyTime) {
    const [, day, month, year, hour = '0', min = '0', sec = '0'] = dmyTime;
    const y = Number(year), m = Number(month), d = Number(day);
    const h = String(hour).padStart(2, '0'), mi = String(min).padStart(2, '0'), se = String(sec).padStart(2, '0');
    if (y >= 1900 && y <= 9999 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${h}:${mi}:${se}Z`;
    }
  }

  return parseMasOfferDate(s);
}

// =============================================================================
// Status Mapping
// =============================================================================

/** Maps MasOffer status string to the canonical domain status. */
export function mapMasOfferStatus(raw: string | undefined | null): NormalisedOfferStatus {
  if (!raw) return 'inactive';

  const s = raw.toLowerCase().trim();
  if (s === 'active' || s === '1' || s === 'true') return 'active';
  if (s === 'expired' || s === 'ended') return 'expired';
  return 'inactive';
}

/** Maps MasOffer discount_type to the canonical NormalisedDiscountType. */
export function mapDiscountType(raw: string | undefined | null): NormalisedDiscountType {
  if (!raw) return 'other';

  const s = raw.toLowerCase().trim();
  if (s === 'percentage' || s === '%' || s.endsWith('%')) return 'percent';
  if (s === 'fixed' || s === 'amount') return 'fixed';
  if (s === 'free_shipping' || s === 'freeshipping' || s === 'shipping') return 'free_shipping';
  return 'other';
}

// =============================================================================
// Offer Type Detection
// =============================================================================

/** Detects the canonical offer type from a MasOffer offer item. */
export function detectOfferType(item: MasOfferOfferItem): OfferSourceType {
  // Explicit type field takes precedence
  if (item.type === 'coupon') return 'coupon';
  if (item.type === 'voucher') return 'voucher';
  if (item.type === 'promotion' || item.type === 'deal') return 'deal';
  if (item.type === 'pushsale' || item.type === 'hot_deal' || item.type === 'flash_sale') return 'deal';
  // Fallback to heuristics
  if (item.code) return 'coupon';
  if (item.discount_type === 'free_shipping') return 'voucher';
  return 'deal';
}

// =============================================================================
// Numeric Value Parsing
// =============================================================================

/**
 * Parses a MasOffer monetary string into a number.
 * Handles: "200000", "200,000", "20%", "15%" (strips non-numeric chars except comma and dot).
 * Returns null if unparseable.
 */
export function parseMasOfferMoney(raw: string | undefined | null): number | null {
  if (!raw) return null;
  // Strip % sign, commas, spaces
  const s = raw.trim().replace('%', '').replace(/,/g, '').replace(/\s/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Parses min_purchase / min_order_value. */
export function parseMinPurchase(raw: string | undefined | null): number | null {
  return parseMasOfferMoney(raw);
}

/** Parses max_discount cap. */
export function parseMaxDiscount(raw: string | undefined | null): number | null {
  return parseMasOfferMoney(raw);
}

// =============================================================================
// Hotness / Freshness Signals
// =============================================================================

/**
 * Returns a "hotness" score (0.0–1.0) from engagement metrics.
 * Higher used_count / click_count relative to typical range = hotter.
 */
export function computeHotnessScore(item: MasOfferOfferItem): number {
  const usedCount = item.used_count ?? 0;
  const clickCount = item.click_count ?? 0;
  const convCount = item.conversion_count ?? 0;

  // Rough heuristic: >500 uses = hot, >5000 = very hot
  const usageScore = Math.min(usedCount / 5000, 1.0) * 0.6;
  // Conversion rate proxy: conv / click
  const convRate = clickCount > 0 ? Math.min(convCount / clickCount, 1.0) : 0;
  const convScore = convRate * 0.4;

  return Math.round((usageScore + convScore) * 100) / 100;
}

/** Returns true if the offer appears to be a hot/pushsale deal. */
export function isPushSaleDeal(item: MasOfferOfferItem): boolean {
  return (
    item.exclusive === true ||
    (item.used_count ?? 0) > 100 ||
    (item.click_count ?? 0) > 1000 ||
    inferDealCategory(item.title ?? item.category ?? undefined) === 'discount'
  );
}

// =============================================================================
// URL Quality Scoring
// =============================================================================

/**
 * Scores a URL's quality from 0.0 to 1.0.
 *
 * Signals:
 *  1.0 — HTTPS + contains click/utm/affiliate tracking params
 *  0.8 — HTTPS + valid domain, no params
 *  0.5 — HTTP only (no encryption)
 *  0.3 — URL exists but malformed
 *  0.0 — empty/null
 */
export function computeUrlQualityScore(url: string | null | undefined): number {
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

// =============================================================================
// Deal Subtype Inference
// =============================================================================

/** Infers the granular deal subtype from the API type field or title. */
export function inferDealSubtype(type: string | undefined, title: string): string {
  const t = (type ?? '').toLowerCase();
  const tt = title.toLowerCase();

  if (t === 'flash_sale' || tt.includes('flash sale')) return 'flash_sale';
  if (t === 'pushsale' || t === 'hot_deal' || tt.includes('push sale') || tt.includes('pushsale') || tt.includes('deal nóng') || tt.includes('hot deal')) return 'pushsale';
  if (t === 'cashback' || tt.includes('cashback') || tt.includes('hoàn tiền') || tt.includes('hoàn xu')) return 'cashback';
  if (t === 'free_shipping' || tt.includes('free ship') || tt.includes('freeshipping') || tt.includes('miễn phí vận chuyển')) return 'free_shipping';
  if (t === 'coupon') return 'coupon';
  if (t === 'voucher') return 'voucher';
  return 'general';
}

// =============================================================================
// Confidence Score (0.0 – 1.0)
// =============================================================================

/**
 * Computes a confidence score for a MasOffer offer record.
 *
 * Signal breakdown:
 *  - title present & >3 chars:          +0.20  (was 0.30)
 *  - active status:                      +0.15  (was 0.20)
 *  - coupon code present (>3 chars):     +0.10  (was 0.15)
 *  - discount value present & >0:        +0.10
 *  - valid http link:                    +0.08  (was 0.10)
 *  - end_date in the future:             +0.08  (was 0.05)
 *  - verified flag:                      +0.08  (was 0.05)
 *  - exclusive deal:                     +0.08
 *  - image or logo present:              +0.05  (was 0.05)
 *  - has terms/description:              +0.05
 *  - hotness score > 0.5:               +0.03
 */
export function computeMasOfferConfidenceScore(item: MasOfferOfferItem): number {
  let score = 0.15; // base floor (up from 0)

  if (item.title && item.title.trim().length > 3) score += 0.20;
  if (item.status === 'active') score += 0.15;
  if (item.code && item.code.trim().length >= 3) score += 0.10;
  if (item.discount_value && parseMasOfferMoney(item.discount_value)) score += 0.10;
  if (item.link && item.link.startsWith('http')) score += 0.08;
  if (item.end_date && !isExpired(item.end_date)) score += 0.08;
  if (item.verified === true) score += 0.08;
  if (item.exclusive === true) score += 0.08;
  if (item.image_url || item.logo_url) score += 0.05;
  if ((item.description ?? item.terms ?? '').trim().length > 10) score += 0.05;
  if (computeHotnessScore(item) > 0.5) score += 0.03;

  return Math.min(Math.round(score * 100) / 100, 1.0);
}

function isExpired(endDate: string | undefined | null): boolean {
  if (!endDate) return false;
  const parsed = parseMasOfferDate(endDate);
  if (!parsed) return false;
  // Compare date strings directly in local timezone — 'en-CA' format is YYYY-MM-DD
  const today = new Date().toLocaleDateString('en-CA');
  return parsed < today;
}

// =============================================================================
// Dedup Hash
// =============================================================================

/**
 * Generates a deterministic SHA-256 hash for deduping MasOffer offers.
 * Key fields: source + external_id + title + code + discount_value
 */
export function computeMasOfferOfferHash(item: MasOfferOfferItem): string {
  const parts = [
    'masoffer',
    String(item.id),
    (item.title ?? '').toLowerCase().trim(),
    (item.code ?? '').toLowerCase().trim(),
    (item.discount_value ?? '').toLowerCase().trim(),
  ];
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

// =============================================================================
// Intra-Source Dedupe Helper
// =============================================================================

/**
 * Deduplicates MasOfferOfferItems that appear across multiple endpoint types
 * (deals, vouchers, coupons — the same item ID can appear in all three).
 * Returns a deduped array and a Set of seen IDs.
 */
export function dedupeOfferItems(items: MasOfferOfferItem[]): MasOfferOfferItem[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

// =============================================================================
// Normaliser: MasOfferOfferItem → Partial<NormalisedOffer>
// =============================================================================

const NOW = new Date().toISOString();

/**
 * Maps a MasOfferOfferItem to the fields needed for upsert into the shared
 * `offers` table.  All required fields (merchant_name, currency, slug, etc.)
 * are filled in to satisfy the schema constraint.
 *
 * Improvements over v1:
 *  - min_purchase → min_order_value (parsed as number)
 *  - max_discount → max_discount (parsed as number)
 *  - category normalised via inferPlatform + inferDealCategory
 *  - exclusive flag used in confidence scoring
 *  - hotness/engagement used in confidence scoring
 *  - is_pushsale signal embedded in raw_payload_jsonb
 */
export function mapOfferItemToOffer(
  item: MasOfferOfferItem,
  now = NOW
): Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'> {
  const offerType = detectOfferType(item);
  const discountType = mapDiscountType(item.discount_type);
  const discountValue = parseMasOfferMoney(item.discount_value);
  const merchantName = item.campaign_name ?? item.title ?? 'MasOffer';
  // Merge category text from the item and its campaign name for richer platform inference
  const rawCategoryText = [item.category, merchantName, item.title].filter(Boolean).join(' ');
  const hotnessScore = computeHotnessScore(item);
  const isPushSale = isPushSaleDeal(item);

  const enrichedPayload: Record<string, unknown> = {
    ...(item as unknown as Record<string, unknown>),
    _voucherfinder: {
      hotness_score: hotnessScore,
      is_pushsale: isPushSale,
      enriched_at: now,
    },
  };

  // URL quality: assess the destination URL quality
  const urlQualityScore = computeUrlQualityScore(item.link ?? null);

  // Inferred deal subtype from type field or title
  const dealSubtype = inferDealSubtype(item.type, item.title ?? '');

  return {
    source: 'masoffer' as const,
    source_type: offerType,
    external_id: `mo_${item.id}`,
    title: (item.title ?? 'Untitled').trim(),
    slug: toSlug(item.title ?? 'untitled'),
    description: item.description ?? null,
    merchant_name: merchantName,
    merchant_id: item.campaign_id != null ? String(item.campaign_id) : null,
    category: normaliseCategory(rawCategoryText),
    destination_url: item.link ?? null,
    tracking_url: null, // MasOffer doesn't expose a separate tracking URL
    coupon_code: item.code ?? null,
    discount_type: discountType,
    discount_value: discountValue,
    max_discount: parseMaxDiscount(item.max_discount),
    min_order_value: parseMinPurchase(item.min_purchase),
    currency: 'VND',
    start_at: parseMasOfferDate(item.start_date),
    end_at: parseMasOfferDate(item.end_date),
    status: mapMasOfferStatus(item.status),
    terms: item.terms ?? null,
    image_url: item.image_url ?? item.logo_url ?? null,
    confidence_score: computeMasOfferConfidenceScore(item),
    // ── New enrichment fields ────────────────────────────────
    used_count: item.used_count,
    click_count: item.click_count,
    conversion_count: item.conversion_count,
    hotness_score: hotnessScore,
    is_pushsale: isPushSale,
    is_exclusive: item.exclusive ?? false,
    verified_at: item.verified === true ? now : null,
    url_quality_score: urlQualityScore,
    deal_subtype: dealSubtype,
    // ── Audit ───────────────────────────────────────────────
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: enrichedPayload,
    normalized_hash: computeMasOfferOfferHash(item),
  };
}

// =============================================================================
// Normaliser: MasOfferCampaign → Partial<NormalisedOffer>
// =============================================================================

export function computeMasOfferCampaignHash(campaign: MasOfferCampaign): string {
  const parts = [
    'masoffer_campaign',
    String(campaign.id),
    (campaign.name ?? '').toLowerCase().trim(),
  ];
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

export function mapCampaignToOffer(
  campaign: MasOfferCampaign,
  now = NOW
): Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'> {
  const rawCategoryText = [campaign.category, campaign.name].filter(Boolean).join(' ');

  return {
    source: 'masoffer' as const,
    source_type: 'campaign' as const,
    external_id: `mo_camp_${campaign.id}`,
    title: campaign.name ?? 'Untitled Campaign',
    slug: toSlug(campaign.name ?? 'untitled-campaign'),
    description: campaign.description ?? null,
    merchant_name: campaign.name ?? 'MasOffer',
    merchant_id: null,
    category: normaliseCategory(rawCategoryText),
    destination_url: campaign.website_url ?? null,
    tracking_url: null,
    coupon_code: null,
    discount_type: null,
    discount_value: null,
    max_discount: null,
    min_order_value: null,
    currency: 'VND',
    start_at: parseMasOfferDate(campaign.created_at),
    end_at: null,
    status: mapMasOfferStatus(campaign.status),
    terms: campaign.description ?? null,
    image_url: campaign.logo_url ?? campaign.banner_url ?? null,
    confidence_score: campaign.status === 'active' ? 0.6 : 0.35,
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: campaign as unknown as Record<string, unknown>,
    normalized_hash: computeMasOfferCampaignHash(campaign),
  };
}
