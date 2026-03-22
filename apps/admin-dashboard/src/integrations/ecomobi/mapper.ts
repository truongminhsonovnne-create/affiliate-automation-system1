/**
 * Ecomobi → NormalisedOffer Mapper
 *
 * Maps raw Ecomobi API items to the shared NormalisedOffer schema.
 *
 * PENDING: Real mapping depends on actual Ecomobi API field names.
 * This scaffold maps based on common Ecomobi API patterns.
 * Replace field extractions once Ecomobi docs are available.
 *
 * Reference: masoffer-mapper.ts for full implementation pattern.
 */

import { createHash } from 'crypto';
import type { EcomobiRawItem, EcomobiMappedOffer } from './types';

// ── Helpers ─────────────────────────────────────────────────────────────────────

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

function parseDiscountValue(raw: string | number | undefined | null): number | null {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse date string — supports ISO (2025-01-15) and dd/mm/yyyy.
 * Returns ISO date string or null.
 */
function parseDate(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  const s = dateStr.trim();
  // ISO: 2025-01-15 or 2025-01-15T09:30:00Z
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // dd/mm/yyyy
  const parts = s.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (y && m && d) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr < new Date().toLocaleDateString('en-CA');
}

function isFuture(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr > new Date().toLocaleDateString('en-CA');
}

/**
 * Estimate confidence score based on offer quality signals.
 *
 * PENDING: Adjust weights once real Ecomobi data quality is known.
 * Current baseline assumes MasOffer-like field availability.
 */
function computeConfidence(item: EcomobiRawItem): number {
  let score = 0.30; // Base score

  // TODO: Adjust field names once Ecomobi docs are available.
  // Current scaffold uses generic field names.
  const s = item as Record<string, unknown>;

  if (s.status === 'active') score += 0.20;
  else if (s.status === 'upcoming' || s.status === 'pending') score += 0.10;

  const code = (s.code as string | undefined) ?? '';
  if (code.length >= 3) score += 0.15;
  else if (code.length > 0) score += 0.05;

  if (s.discount != null) score += 0.10;
  if (s.link != null) score += 0.10;

  // Future end date = not yet expired bonus
  const endDate = parseDate(s.end_date as string | undefined);
  if (endDate && isFuture(endDate)) score += 0.05;

  if (s.verified === true) score += 0.05;
  if (s.image_url || s.logo_url) score += 0.05;

  return Math.min(score, 1.0);
}

// ── Mapper ──────────────────────────────────────────────────────────────────────

/**
 * Map a raw Ecomobi API item to the shared NormalisedOffer schema.
 *
 * PENDING: Field extractions must be verified against actual Ecomobi API response.
 * Common Ecomobi fields (TBD — replace with real mapping):
 *   - id / offer_id
 *   - title
 *   - description
 *   - code / coupon_code
 *   - discount (e.g. "10%" or "10000")
 *   - discount_type
 *   - min_purchase / min_order_value
 *   - max_discount
 *   - start_date / start_at
 *   - end_date / end_at
 *   - link / destination_url / tracking_url
 *   - image_url / image
 *   - merchant_name / advertiser_name
 *   - merchant_id / advertiser_id
 *   - category
 *   - status
 *   - exclusive
 *   - verified
 */
export function mapEcomobiItemToOffer(
  item: EcomobiRawItem
): Omit<EcomobiMappedOffer, 'source'> {
  const now = new Date().toISOString();

  // TODO: Replace with actual Ecomobi field accessors
  // Current scaffold assumes MasOffer-like structure
  const s = item as Record<string, unknown>;

  const startAt = parseDate(s.start_date as string | undefined);
  const endAt = parseDate(s.end_date as string | undefined);
  const expired = isExpired(endAt);

  // Determine offer status
  let status: string;
  if (expired) status = 'expired';
  else if (s.status === 'upcoming' || s.status === 'pending') status = 'pending';
  else status = (s.status as string) === 'active' ? 'active' : 'inactive';

  // Determine source_type — coupon if code present, else deal
  const code = ((s.code ?? s.coupon_code) as string | undefined) ?? '';
  const sourceType = code.length > 0 ? 'coupon' : 'deal';

  const externalId = `emo_${s.id ?? s.offer_id ?? Math.random()}`;
  const title = ((s.title as string) ?? 'Untitled').trim();
  const merchantName = ((s.merchant_name ?? s.advertiser_name) as string | undefined) ?? 'Unknown Merchant';

  // Dedup hash — stable across sync runs
  const dedupeInput = [
    externalId,
    title,
    code,
    String(s.discount ?? ''),
    endAt ?? '',
  ].join('|');
  const hash = createHash('sha256').update(dedupeInput).digest('hex');

  return {
    source_type: sourceType,
    external_id: externalId,
    title,
    slug: toSlug(title),
    description: (s.description as string | null) ?? null,
    merchant_name: merchantName,
    merchant_id: s.merchant_id
      ? String(s.merchant_id)
      : s.advertiser_id
      ? String(s.advertiser_id)
      : null,
    category: (s.category as string | null) ?? null,
    destination_url: ((s.link ?? s.url ?? s.destination_url) as string | null) ?? null,
    tracking_url: ((s.link ?? s.url ?? s.tracking_url) as string | null) ?? null,
    coupon_code: code || null,
    discount_type: (s.discount_type as string | null) ?? null,
    discount_value: parseDiscountValue((s.discount ?? s.discount_value) as string | number | null | undefined),
    max_discount: parseDiscountValue(s.max_discount as string | number | null | undefined),
    min_order_value: parseDiscountValue((s.min_purchase ?? s.min_order_value) as string | number | null | undefined),
    currency: 'VND',
    start_at: startAt ? `${startAt}T00:00:00Z` : null,
    end_at: endAt ? `${endAt}T23:59:59Z` : null,
    status,
    terms: (s.terms ?? s.terms_and_conditions) as string | null,
    image_url: ((s.image_url ?? s.image) as string | null) ?? null,
    confidence_score: computeConfidence(item),
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: s,
    normalized_hash: hash,
  };
}
