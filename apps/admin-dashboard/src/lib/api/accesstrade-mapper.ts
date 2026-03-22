/**
 * AccessTrade → NormalisedOffer Mapper
 *
 * Maps raw AccessTrade API deals to the shared NormalisedOffer schema.
 * Used by the sync orchestrator within admin-dashboard.
 */

import { createHash } from 'crypto';

interface AccessTradeDeal {
  id: number;
  campaign_id: number;
  campaign_name: string;
  title: string;
  description?: string;
  type: string;
  discount_value: number;
  discount_type: 'percent' | 'fixed';
  code?: string;
  min_order_value?: number;
  max_discount?: number;
  start_date: string;
  end_date: string;
  status: string;
  tracking_url?: string;
  is_exclusive?: boolean;
  usage_limit?: number;
  uses_remaining?: number;
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

function computeConfidence(deal: AccessTradeDeal): number {
  let score = 0.30;

  if (deal.status === 'active') score += 0.20;
  else if (deal.status === 'expired') score -= 0.05;

  if (deal.code && deal.code.length >= 3) score += 0.15;
  else if (deal.code) score += 0.05;

  if (deal.discount_value > 0) score += 0.10;

  if (deal.tracking_url) score += 0.10;

  if (deal.end_date) {
    const endDate = new Date(deal.end_date);
    if (endDate > new Date()) score += 0.05;
  }

  if (deal.is_exclusive) score += 0.05;

  return Math.min(score, 1.0);
}

export function mapDealToOffer(
  deal: AccessTradeDeal,
  raw: Record<string, unknown>
): Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'> {
  const now = new Date().toISOString();
  const expired = deal.status === 'expired' ||
    (deal.end_date ? new Date(deal.end_date) < new Date() : false);

  const dedupeInput = [
    `at_deal_${deal.id}`,
    deal.title,
    deal.code ?? '',
    deal.discount_value,
    deal.end_date ?? '',
  ].join('|');
  const hash = createHash('sha256').update(dedupeInput).digest('hex');

  return {
    source: 'accesstrade',
    source_type: deal.type ?? 'voucher',
    external_id: `at_deal_${deal.id}`,
    title: deal.title?.trim() ?? 'Untitled',
    slug: toSlug(deal.title ?? 'untitled'),
    description: deal.description ?? null,
    merchant_name: deal.campaign_name ?? 'Unknown Merchant',
    merchant_id: String(deal.campaign_id),
    category: null,
    destination_url: deal.tracking_url ?? null,
    tracking_url: deal.tracking_url ?? null,
    coupon_code: deal.code ?? null,
    discount_type: deal.discount_type ?? null,
    discount_value: deal.discount_value ?? null,
    max_discount: deal.max_discount ?? null,
    min_order_value: deal.min_order_value ?? null,
    currency: 'VND',
    start_at: deal.start_date ? `${deal.start_date}T00:00:00Z` : null,
    end_at: deal.end_date ? `${deal.end_date}T23:59:59Z` : null,
    status: expired ? 'expired' : deal.status === 'active' ? 'active' : 'inactive',
    terms: null,
    image_url: null,
    confidence_score: computeConfidence(deal),
    last_seen_at: now,
    first_seen_at: now,
    synced_at: now,
    raw_payload_jsonb: raw,
    normalized_hash: hash,
  };
}
