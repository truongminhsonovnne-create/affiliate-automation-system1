/**
 * Public Deals API Client — Browser-safe client for the discovery pages.
 *
 * All requests go through /api/public/v1/deals (Next.js route) so the
 * Supabase anon key and query logic stay server-side.
 */

export interface DealCard {
  id: string;
  external_id: string;
  source: string;
  source_label: string;
  source_type: string;
  title: string;
  merchant_name: string;
  merchant_id: string | null;
  category: string | null;
  deal_subtype: string | null;
  description: string | null;
  discount_type: string | null;
  discount_value: number | null;
  min_order_value: number | null;
  max_discount: number | null;
  coupon_code: string | null;
  destination_url: string | null;
  tracking_url: string | null;
  terms: string | null;
  image_url: string | null;
  start_at: string | null;
  end_at: string | null;
  status: string;
  confidence_score: number | null;
  hotness_score: number | null;
  url_quality_score: number | null;
  freshness_score: number | null;
  is_pushsale: boolean | null;
  is_exclusive: boolean | null;
  synced_at: string | null;
  source_name: string;
  badge_text: string | null;
  expiry_label: string | null;
  synced_at_label: string | null;
}

export interface DealsApiResponse {
  deals: DealCard[];
  total: number;
  limit: number;
  offset: number;
}

export interface DealsQueryOptions {
  source?: string;
  status?: string;
  category?: string;
  deal_type?: string;
  deal_subtype?: string;
  sort?: 'hot' | 'new' | 'expiring' | 'quality' | 'random';
  limit?: number;
  offset?: number;
  expiring_within_days?: number;
  include_expired?: boolean;
  merchant?: string;
}

const DEFAULT_OPTIONS: DealsQueryOptions = {
  source: 'all',
  status: 'active',
  sort: 'hot',
  limit: 20,
  offset: 0,
  include_expired: false,
};

/**
 * Fetch deals from the public API route.
 */
export async function fetchDeals(options: DealsQueryOptions = {}): Promise<DealsApiResponse> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const params = new URLSearchParams();

  if (opts.source && opts.source !== 'all') params.set('source', opts.source);
  if (opts.status && opts.status !== 'all') params.set('status', opts.status);
  if (opts.category) params.set('category', opts.category);
  if (opts.deal_type) params.set('deal_type', opts.deal_type);
  if (opts.deal_subtype) params.set('deal_subtype', opts.deal_subtype);
  if (opts.sort && opts.sort !== 'hot') params.set('sort', opts.sort);
  if (opts.limit && opts.limit !== 20) params.set('limit', String(opts.limit));
  if (opts.offset && opts.offset !== 0) params.set('offset', String(opts.offset));
  if (opts.expiring_within_days) params.set('expiring_within_days', String(opts.expiring_within_days));
  if (opts.include_expired) params.set('include_expired', 'true');
  if (opts.merchant) params.set('merchant', opts.merchant);

  const url = `/api/public/v1/deals${params.size > 0 ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    next: { revalidate: 120 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch deals: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<DealsApiResponse>;
}

/**
 * Fetch hot deals (default discovery page).
 */
export async function fetchHotDeals(limit = 20, offset = 0): Promise<DealsApiResponse> {
  return fetchDeals({ sort: 'hot', limit, offset });
}

/**
 * Fetch deals expiring within N days.
 */
export async function fetchExpiringDeals(withinDays = 7, limit = 20, offset = 0): Promise<DealsApiResponse> {
  return fetchDeals({
    sort: 'expiring',
    expiring_within_days: withinDays,
    include_expired: false,
    limit,
    offset,
  });
}

/**
 * Fetch deals by source network.
 */
export async function fetchDealsBySource(
  source: 'masoffer' | 'accesstrade',
  options: Omit<DealsQueryOptions, 'source'> = {}
): Promise<DealsApiResponse> {
  return fetchDeals({ ...options, source });
}

/**
 * Format discount value for display.
 */
export function formatDiscount(discountType: string | null, discountValue: number | null): string {
  if (!discountType || discountValue == null) return '';
  switch (discountType) {
    case 'percent':   return `${discountValue}%`;
    case 'fixed':     return `${discountValue.toLocaleString('vi-VN')}đ`;
    case 'free_shipping': return 'Freeship';
    default:          return `${discountValue}`;
  }
}

/**
 * Format min order value for display.
 */
export function formatMinSpend(value: number | null): string {
  if (value == null || value <= 0) return '';
  return `Đơn từ ${value.toLocaleString('vi-VN')}đ`;
}

/**
 * Copy deal coupon code to clipboard and return success.
 */
export async function copyCouponCode(code: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    // Fallback
    const el = document.createElement('textarea');
    el.value = code;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  }
}

/**
 * Open deal URL in new tab (via tracking URL if available, else destination).
 */
export function openDealLink(deal: DealCard): void {
  const url = deal.tracking_url ?? deal.destination_url;
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// ── Affiliate Redirect URLs ─────────────────────────────────────────────────────

/**
 * Encode a deal ID to base64url (URL-safe, no padding).
 * This is the inverse of decodeDealId in the server-side links module.
 */
export function encodeDealId(dealId: string): string {
  return Buffer.from(dealId)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Build the internal redirect URL for a deal.
 * When the user clicks "Mua ngay" / "Lấy mã", they go through our
 * redirect endpoint which logs the click and then 302-redirects to the
 * real affiliate tracking link.
 *
 * Route: /api/public/redirect?d=<encoded-dealId>&s=<source-short>
 *   s: 'at' = accesstrade, 'mo' = masoffer
 */
export function buildAffiliateRedirectUrl(deal: DealCard): string | null {
  if (!deal.tracking_url && !deal.destination_url) return null;

  const encodedId = encodeDealId(deal.id);
  const src = deal.source === 'accesstrade' ? 'at' : 'mo';
  return `/api/public/redirect?d=${encodedId}&s=${src}`;
}

/**
 * Navigate to the affiliate redirect URL (new tab).
 * Use this instead of openDealLink() when the deal has a tracking_url
 * and you want to earn affiliate commission on the click.
 */
export function clickDealAffiliate(deal: DealCard): void {
  const url = buildAffiliateRedirectUrl(deal);
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
