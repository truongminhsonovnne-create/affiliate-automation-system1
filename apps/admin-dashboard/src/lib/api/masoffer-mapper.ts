/**
 * MasOffer → NormalisedOffer Mapper
 *
 * Maps raw MasOffer API items to the shared NormalisedOffer schema.
 * Used by the sync orchestrator within admin-dashboard.
 */

import { createHash } from 'crypto';

interface MasOfferOfferItem {
  id: number;
  title: string;
  description?: string;
  code?: string;
  discount_type?: string;
  discount_value?: string;
  min_purchase?: string;
  max_discount?: string;
  start_date?: string;
  end_date?: string;
  exclusive?: boolean;
  verified?: boolean;
  status?: string;
  terms?: string;
  link?: string;
  image_url?: string;
  logo_url?: string;
  campaign_id?: number;
  campaign_name?: string;
  category?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

interface NormalisedOffer {
  id: string;
  source: string;
  source_type: string;
  external_id: string;
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
  created_at: string;
  updated_at: string;
}

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

function parseDiscountValue(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function parseDate(isoOrDdMmYyyy: string | undefined): string | null {
  if (!isoOrDdMmYyyy) return null;
  const s = isoOrDdMmYyyy.trim();
  // ISO format: 2025-01-15T09:30:00Z or 2025-01-15
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }
  // dd/mm/yyyy format
  const parts = s.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (y && m && d) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return null;
}

function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return dateStr < new Date().toLocaleDateString('en-CA');
}

function computeConfidence(item: MasOfferOfferItem): number {
  let score = 0.30; // Base

  if (item.status === 'active') score += 0.20;
  else if (item.status === 'upcoming') score += 0.10;

  if (item.code && item.code.length >= 3) score += 0.15;
  else if (item.code) score += 0.05;

  if (item.discount_value) score += 0.10;

  if (item.link) score += 0.10;

  // Future end date = bonus
  if (item.end_date && !isExpired(item.end_date)) score += 0.05;

  if (item.verified) score += 0.05;

  if (item.image_url || item.logo_url) score += 0.05;

  return Math.min(score, 1.0);
}

export function mapOfferItemToOffer(
  item: MasOfferOfferItem
): Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'> {
  const now = new Date().toISOString();
  const startAt = parseDate(item.start_date);
  const endAt = parseDate(item.end_date);
  const expired = isExpired(endAt);

  // Determine status
  let status: string;
  if (expired) status = 'expired';
  else if (item.status === 'upcoming') status = 'pending';
  else status = item.status === 'active' ? 'active' : 'inactive';

  // Determine type
  const sourceType = item.code ? 'coupon' : 'deal';

  const raw = item as unknown as Record<string, unknown>;

  const title = item.title?.trim() ?? 'Untitled';
  const externalId = `mo_${item.id}`;
  const merchantName = item.campaign_name ?? item.category ?? 'Unknown Merchant';

  const dedupeInput = `${externalId}|${title}|${item.code ?? ''}|${item.discount_value ?? ''}|${endAt ?? ''}`;
  const hash = createHash('sha256').update(dedupeInput).digest('hex');

  return {
    source: 'masoffer',
    source_type: sourceType,
    external_id: externalId,
    title,
    slug: toSlug(title),
    description: item.description ?? null,
    merchant_name: merchantName,
    merchant_id: item.campaign_id ? String(item.campaign_id) : null,
    category: item.category ?? null,
    destination_url: item.link ?? null,
    tracking_url: item.link ?? null,
    coupon_code: item.code ?? null,
    discount_type: item.discount_type ?? null,
    discount_value: parseDiscountValue(item.discount_value),
    max_discount: parseDiscountValue(item.max_discount),
    min_order_value: parseDiscountValue(item.min_purchase),
    currency: 'VND',
    start_at: startAt ? `${startAt}T00:00:00Z` : null,
    end_at: endAt ? `${endAt}T23:59:59Z` : null,
    status: status as NormalisedOffer['status'],
    terms: item.terms ?? null,
    image_url: item.image_url ?? item.logo_url ?? null,
    confidence_score: computeConfidence(item),
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: raw,
    normalized_hash: hash,
  };
}
