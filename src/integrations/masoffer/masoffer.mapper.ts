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
  if (item.code) return 'coupon';
  if (item.discount_type === 'free_shipping') return 'voucher';
  return 'deal';
}

// =============================================================================
// Discount Value Parsing
// =============================================================================

/**
 * Parses discount_value from MasOffer — strips % sign, converts to number.
 * Returns null if unparseable.
 */
export function parseDiscountValue(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const s = raw.trim().replace('%', '').replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// =============================================================================
// Confidence Score (0.0 – 1.0)
// =============================================================================

/**
 * Computes a confidence score for a MasOffer offer record.
 *
 * Signal breakdown:
 *  - title present & >3 chars:     +0.30
 *  - active status:                +0.20
 *  - coupon code present (>3 chars):+0.15
 *  - discount value present:       +0.10
 *  - valid http link:              +0.10
 *  - end_date in the future:       +0.05
 *  - verified flag:                +0.05
 *  - image or logo present:        +0.05
 */
export function computeMasOfferConfidenceScore(item: MasOfferOfferItem): number {
  let score = 0;

  if (item.title && item.title.trim().length > 3) score += 0.30;
  if (item.status === 'active') score += 0.20;
  if (item.code && item.code.trim().length >= 3) score += 0.15;
  if (item.discount_value) score += 0.10;
  if (item.link && item.link.startsWith('http')) score += 0.10;
  if (item.end_date && !isExpired(item.end_date)) score += 0.05;
  if (item.verified === true) score += 0.05;
  if (item.image_url || item.logo_url) score += 0.05;

  return Math.round(score * 100) / 100;
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
// Normaliser: MasOfferOfferItem → Partial<NormalisedOffer>
// =============================================================================

const NOW = new Date().toISOString();

/**
 * Maps a MasOfferOfferItem to the fields needed for upsert into the shared
 * `offers` table.  All required fields (merchant_name, currency, slug, etc.)
 * are filled in to satisfy the schema constraint.
 */
export function mapOfferItemToOffer(
  item: MasOfferOfferItem,
  now = NOW
): Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'> {
  const offerType = detectOfferType(item);
  const discountType = mapDiscountType(item.discount_type);
  const discountValue = parseDiscountValue(item.discount_value);
  const merchantName = item.campaign_name ?? item.title ?? 'MasOffer';

  return {
    source: 'masoffer' as const,
    source_type: offerType,
    external_id: `mo_${item.id}`,
    title: (item.title ?? 'Untitled').trim(),
    slug: toSlug(item.title ?? 'untitled'),
    description: item.description ?? null,
    merchant_name: merchantName,
    merchant_id: item.campaign_id != null ? String(item.campaign_id) : null,
    category: item.category ?? null,
    destination_url: item.link ?? null,
    tracking_url: null,        // MasOffer doesn't expose separate tracking URL
    coupon_code: item.code ?? null,
    discount_type: discountType,
    discount_value: discountValue,
    max_discount: null,        // MasOffer has max_discount as string, not parsed here
    min_order_value: null,      // MasOffer has min_purchase as string
    currency: 'VND',
    start_at: parseMasOfferDate(item.start_date),
    end_at: parseMasOfferDate(item.end_date),
    status: mapMasOfferStatus(item.status),
    terms: item.terms ?? null,
    image_url: item.image_url ?? item.logo_url ?? null,
    confidence_score: computeMasOfferConfidenceScore(item),
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: item as Record<string, unknown>,
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
  return {
    source: 'masoffer' as const,
    source_type: 'campaign' as const,
    external_id: `mo_camp_${campaign.id}`,
    title: campaign.name ?? 'Untitled Campaign',
    slug: toSlug(campaign.name ?? 'untitled-campaign'),
    description: campaign.description ?? null,
    merchant_name: campaign.name ?? 'MasOffer',
    merchant_id: null,
    category: campaign.category ?? null,
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
    terms: null,
    image_url: campaign.logo_url ?? campaign.banner_url ?? null,
    confidence_score: 0.5,  // Campaign records are informational
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: campaign as Record<string, unknown>,
    normalized_hash: computeMasOfferCampaignHash(campaign),
  };
}
