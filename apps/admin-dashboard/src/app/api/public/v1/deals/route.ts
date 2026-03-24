/**
 * Public Deals API — /api/public/v1/deals
 *
 * MUST be dynamically rendered — reads query params and queries Supabase at request time.
 */
export const dynamic = 'force-dynamic';
 *
 * Server-side route that queries Supabase directly and returns
 * deal cards for the discovery pages.
 *
 * This is intentionally server-side so the Supabase anon key and
 * any filtering logic stays out of the browser bundle.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Supabase client (server-side only) ───────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DealsQueryParams {
  source?: string;          // 'masoffer' | 'accesstrade' | 'all' (default)
  status?: string;          // 'active' (default) | 'all'
  category?: string;        // e.g. 'shopee', 'lazada', 'tiki', 'fashion:discount'
  deal_type?: string;       // 'deal' | 'voucher' | 'coupon' | 'campaign' | 'promotion'
  deal_subtype?: string;    // 'flash_sale' | 'pushsale' | 'coupon' | 'voucher' | ...
  sort?: string;            // 'hot' | 'new' | 'expiring' | 'quality' | 'random' (default: 'hot')
  limit?: string;           // 1–100, default 20
  offset?: string;          // pagination offset, default 0
  expiring_within_days?: string; // filter deals expiring within N days (for /expiring page)
  include_expired?: string; // 'true' to include expired (default false)
  merchant?: string;        // partial merchant name match
}

export interface DealCardDto {
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
  /** Human-readable source name */
  source_name: string;
  /** Parsed discount badge text, e.g. "50%" or "Freeship" */
  badge_text: string | null;
  /** How long until expiry, e.g. "Còn 2 ngày" */
  expiry_label: string | null;
  /** ISO date string of when data was last synced */
  synced_at_label: string | null;
}

export interface DealsResponse {
  deals: DealCardDto[];
  total: number;
  limit: number;
  offset: number;
  query: DealsQueryParams;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  masoffer: 'MasOffer',
  accesstrade: 'AccessTrade',
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseIntParam(val: string | undefined, fallback: number, min: number, max: number): number {
  if (!val) return fallback;
  const n = parseInt(val, 10);
  if (isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function computeBadgeText(discountType: string | null, discountValue: number | null): string | null {
  if (!discountType) return null;
  switch (discountType) {
    case 'percent':   return discountValue != null ? `${discountValue}%` : 'Giảm %';
    case 'fixed':    return discountValue != null ? `${discountValue.toLocaleString('vi-VN')}đ` : 'Giảm giá';
    case 'free_shipping': return 'Freeship';
    case 'buy_x_get_y':   return 'Mua X tặng Y';
    default:         return discountValue != null ? `${discountValue}%` : 'Khuyến mãi';
  }
}

function computeExpiryLabel(endAt: string | null): string | null {
  if (!endAt) return null;
  const expiry = new Date(endAt).getTime();
  const now = Date.now();
  const diffMs = expiry - now;
  if (diffMs <= 0) return 'Đã hết hạn';
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return `Còn ${mins} phút`;
  }
  if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    return `Còn ${hours} giờ`;
  }
  const days = Math.floor(diffHours / 24);
  if (days === 1) return 'Còn 1 ngày';
  if (days < 7) return `Còn ${days} ngày`;
  if (days < 30) return `Còn ${days} ngày`;
  return null; // Too far — don't show
}

function computeSyncedAtLabel(syncedAt: string | null): string | null {
  if (!syncedAt) return null;
  const sync = new Date(syncedAt).getTime();
  const diffMs = Date.now() - sync;
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 1) return 'Vừa cập nhật';
  if (diffHours < 24) return `Cập nhật ${Math.floor(diffHours)} giờ trước`;
  const days = Math.floor(diffHours / 24);
  return `Cập nhật ${days} ngày trước`;
}

function toDto(row: Record<string, unknown>): DealCardDto {
  return {
    id: String(row.id ?? ''),
    external_id: String(row.external_id ?? ''),
    source: String(row.source ?? ''),
    source_label: SOURCE_LABELS[String(row.source ?? '')] ?? String(row.source ?? ''),
    source_type: String(row.source_type ?? ''),
    title: String(row.title ?? ''),
    merchant_name: String(row.merchant_name ?? ''),
    merchant_id: row.merchant_id as string | null,
    category: row.category as string | null,
    deal_subtype: row.deal_subtype as string | null,
    description: row.description as string | null,
    discount_type: row.discount_type as string | null,
    discount_value: row.discount_value as number | null,
    min_order_value: row.min_order_value as number | null,
    max_discount: row.max_discount as number | null,
    coupon_code: row.coupon_code as string | null,
    destination_url: row.destination_url as string | null,
    tracking_url: row.tracking_url as string | null,
    terms: row.terms as string | null,
    image_url: row.image_url as string | null,
    start_at: row.start_at as string | null,
    end_at: row.end_at as string | null,
    status: String(row.status ?? ''),
    confidence_score: row.confidence_score as number | null,
    hotness_score: row.hotness_score as number | null,
    url_quality_score: row.url_quality_score as number | null,
    freshness_score: row.freshness_score as number | null,
    is_pushsale: row.is_pushsale as boolean | null,
    is_exclusive: row.is_exclusive as boolean | null,
    synced_at: row.synced_at as string | null,
    source_name: SOURCE_LABELS[String(row.source ?? '')] ?? String(row.source ?? ''),
    badge_text: computeBadgeText(row.discount_type as string | null, row.discount_value as number | null),
    expiry_label: computeExpiryLabel(row.end_at as string | null),
    synced_at_label: computeSyncedAtLabel(row.synced_at as string | null),
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const params: DealsQueryParams = {
      source:         searchParams.get('source') ?? 'all',
      status:         searchParams.get('status') ?? 'active',
      category:       searchParams.get('category') ?? undefined,
      deal_type:      searchParams.get('deal_type') ?? undefined,
      deal_subtype:   searchParams.get('deal_subtype') ?? undefined,
      sort:           searchParams.get('sort') ?? 'hot',
      limit:          searchParams.get('limit') ?? String(DEFAULT_LIMIT),
      offset:         searchParams.get('offset') ?? '0',
      expiring_within_days: searchParams.get('expiring_within_days') ?? undefined,
      include_expired: searchParams.get('include_expired') ?? 'false',
      merchant:       searchParams.get('merchant') ?? undefined,
    };

    const limit = parseIntParam(params.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = parseIntParam(params.offset, 0, 0, 10000);

    const sb = getSupabase();

    // ── Build query ────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = sb.from('offers').select('*', { count: 'exact', head: false });

    // Source filter
    if (params.source && params.source !== 'all') {
      query = query.eq('source', params.source);
    }

    // Status filter
    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    } else {
      // Default: only active
      query = query.eq('status', 'active');
    }

    // Exclude expired unless requested
    if (params.include_expired !== 'true') {
      query = query.or(`end_at.is.null,end_at.gt.${new Date().toISOString()}`);
    }

    // Category filter (partial match on category field)
    if (params.category) {
      query = query.ilike('category', `%${params.category}%`);
    }

    // Deal type filter (source_type)
    if (params.deal_type) {
      query = query.eq('source_type', params.deal_type);
    }

    // Deal subtype filter
    if (params.deal_subtype) {
      query = query.eq('deal_subtype', params.deal_subtype);
    }

    // Merchant name partial match
    if (params.merchant) {
      query = query.ilike('merchant_name', `%${params.merchant}%`);
    }

    // Expiring within N days
    if (params.expiring_within_days) {
      const days = parseInt(params.expiring_within_days, 10);
      if (!isNaN(days) && days > 0) {
        const now = new Date();
        const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        query = query
          .gte('end_at', now.toISOString())
          .lte('end_at', future.toISOString());
      }
    }

    // ── Sorting ─────────────────────────────────────────────────────────────────
    switch (params.sort) {
      case 'hot':
        query = (query as any)
          .order('hotness_score', { ascending: false, nulls: 'last' })
          .order('confidence_score', { ascending: false, nulls: 'last' })
          .order('end_at', { ascending: true, nulls: 'last' });
        break;
      case 'new':
        query = (query as any).order('synced_at', { ascending: false, nulls: 'last' });
        break;
      case 'expiring':
        // Expiring soonest first
        query = (query as any)
          .order('end_at', { ascending: true, nulls: 'last' })
          .order('synced_at', { ascending: false, nulls: 'last' });
        break;
      case 'quality':
        query = (query as any)
          .order('confidence_score', { ascending: false, nulls: 'last' })
          .order('hotness_score', { ascending: false, nulls: 'last' });
        break;
      case 'random':
        query = query.order('id', { ascending: false }); // pseudo-random via id desc
        break;
      default:
        query = (query as any).order('hotness_score', { ascending: false, nulls: 'last' });
    }

    // ── Pagination ───────────────────────────────────────────────────────────────
    query = query.range(offset, offset + limit - 1);

    // ── Execute ──────────────────────────────────────────────────────────────────
    const { data, error, count } = await query;

    if (error) {
      console.error('[/api/public/v1/deals] Supabase error:', error);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: 'Không thể truy vấn dữ liệu. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    const deals = rows.map(toDto);
    const total = count ?? rows.length;

    const response: DealsResponse = {
      deals,
      total,
      limit,
      offset,
      query: params,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/public/v1/deals] Unhandled error:', message);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Đã xảy ra lỗi nội bộ. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
