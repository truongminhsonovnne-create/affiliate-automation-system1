/**
 * Hybrid Voucher Resolution API Route — /api/public/v1/resolve
 *
 * Architecture: Supabase-first, INTERNAL_API_URL as optional enrich layer.
 *
 * Flow:
 *   1. Normalize input (extract shop_id / item_id from URL)
 *   2. Query Supabase offers table — ranking by confidence_score + recency
 *   3. Build bestMatch + candidates from DB result
 *   4. (Optional) Call INTERNAL_API_URL to enrich with additional data
 *   5. Fallback: return DB result even if INTERNAL_API_URL is unavailable
 *   6. Only 503 if Supabase itself fails (true unavailability)
 *
 * INTERNAL_API_URL is NOT a hard requirement for the happy path.
 */

import { NextRequest, NextResponse } from 'next/server';

// ── Supabase client ───────────────────────────────────────────────────────────

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Input normalization ────────────────────────────────────────────────────────

interface NormalizedInput {
  platform: 'shopee' | 'lazada' | 'tiki' | 'tiktok' | 'unknown';
  shopId: string | null;
  itemId: string | null;
  originalUrl: string;
}

/**
 * Extract platform + shop/item IDs from a product URL.
 * Handles: shopee.vn, lazada.vn, tiki.vn, tiktok.com
 */
function normalizeInput(raw: string): NormalizedInput {
  const url = raw.trim();
  const lower = url.toLowerCase();

  const result: NormalizedInput = {
    platform: 'unknown',
    shopId: null,
    itemId: null,
    originalUrl: url,
  };

  if (lower.includes('shopee')) {
    result.platform = 'shopee';
    // https://shopee.vn/.../SOME_ID
    // or ?shopId=XXX&itemId=YYY
    const pathMatch = url.match(/-i\.(\d+)\.(\d+)/);
    if (pathMatch) {
      result.shopId = pathMatch[1];
      result.itemId = pathMatch[2];
    } else {
      const qsShop = url.match(/[?&]shopid=(\d+)/i);
      const qsItem = url.match(/[?&]itemid=(\d+)/i);
      if (qsShop) result.shopId = qsShop[1];
      if (qsItem) result.itemId = qsItem[1];
    }
  } else if (lower.includes('lazada')) {
    result.platform = 'lazada';
    // https://www.lazada.vn/products/.../SKU_ID
    const skuMatch = url.match(/(\d+)\.html/i);
    if (skuMatch) result.itemId = skuMatch[1];
    const shopMatch = url.match(/[?&]shop(?:_id|Id)=(\d+)/i);
    if (shopMatch) result.shopId = shopMatch[1];
  } else if (lower.includes('tiki')) {
    result.platform = 'tiki';
    // https://tiki.vn/.../p123456.html
    const pMatch = url.match(/\/p(\d+)/);
    if (pMatch) result.itemId = pMatch[1];
  } else if (lower.includes('tiktok')) {
    result.platform = 'tiktok';
    // https://tiktok.com/@shop/item/123
    const itemMatch = url.match(/\/item\/(\d+)/);
    const shopMatch = url.match(/@([^/]+)/);
    if (itemMatch) result.itemId = itemMatch[1];
    if (shopMatch) result.shopId = shopMatch[1];
  }

  return result;
}

// ── Supabase query + ranking ───────────────────────────────────────────────────

interface DbOffer {
  id: string;
  external_id: string;
  source: string;
  source_type: string;
  title: string;
  merchant_name: string;
  merchant_id: string | null;
  category: string | null;
  deal_subtype: string | null;
  coupon_code: string | null;
  discount_type: string | null;
  discount_value: number | null;
  max_discount: number | null;
  min_order_value: number | null;
  destination_url: string | null;
  terms: string | null;
  image_url: string | null;
  start_at: string | null;
  end_at: string | null;
  status: string;
  confidence_score: number;
  hotness_score: number | null;
  url_quality_score: number | null;
  freshness_score: number | null;
  is_pushsale: boolean | null;
  is_exclusive: boolean | null;
  synced_at: string | null;
}

interface QueryResult {
  offers: DbOffer[];
  found: boolean;
  freshness: 'live' | 'recent' | 'stale' | 'unknown';
}

/**
 * Query Supabase for matching offers.
 * Matches by shop_id first, then falls back to broad promotions.
 * Orders by confidence_score desc, then recency.
 */
async function querySupabase(normalized: NormalizedInput): Promise<QueryResult> {
  const sb = getSupabase();

  try {
    // Build filter conditions
    // Prefer offers that match the specific shop/item
    // Also include broad promotions (shop_id IS NULL or generic)
    const conditions: string[] = [`status.eq.active`];

    if (normalized.shopId) {
      // Match specific shop OR broad promotions
      conditions.push(
        `(merchant_id.eq.${normalized.shopId},merchant_id.is.null)`
      );
    }

    if (normalized.itemId) {
      // Some sources store item-level IDs in external_id or category
      conditions.push(
        `or(external_id.ilike.%${normalized.itemId}%,category.ilike.%${normalized.itemId}%)`
      );
    }

    const query = sb
      .from('offers')
      .select('*')
      .or(conditions.join(','))
      .order('confidence_score', { ascending: false, nulls: 'last' })
      .order('hotness_score', { ascending: false, nulls: 'last' })
      .order('synced_at', { ascending: false, nulls: 'last' })
      .limit(20);

    const { data, error } = await query;

    if (error) {
      console.error('[resolve/supabase] Query error:', error.message);
      throw error;
    }

    const offers = (data ?? []) as DbOffer[];

    if (offers.length === 0) {
      return { offers: [], found: false, freshness: 'unknown' };
    }

    // Determine data freshness from synced_at
    const freshness = computeFreshness(offers[0]?.synced_at);

    return { offers, found: true, freshness };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[resolve/supabase] Unexpected error:', msg);
    throw err;
  }
}

function computeFreshness(syncedAt: string | null | undefined): 'live' | 'recent' | 'stale' | 'unknown' {
  if (!syncedAt) return 'unknown';
  const ageHours = (Date.now() - new Date(syncedAt).getTime()) / (1000 * 60 * 60);
  if (ageHours < 1) return 'live';
  if (ageHours < 24) return 'recent';
  if (ageHours < 72) return 'stale';
  return 'stale';
}

// ── Response building ──────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  masoffer: 'MasOffer',
  accesstrade: 'AccessTrade',
  ecomobi: 'Ecomobi',
};

const DISCOUNT_TYPE_MAP: Record<string, string> = {
  percent: 'percentage',
  percentage: 'percentage',
  fixed: 'fixed_amount',
  fixed_amount: 'fixed_amount',
  free_shipping: 'free_shipping',
  buy_x_get_y: 'buy_x_get_y',
};

interface CandidateRow {
  code: string;
  discountText: string;
  rank: number;
  voucherId: string;
  reason: string;
}

function buildDiscountText(offer: DbOffer): string {
  if (!offer.discount_type && offer.discount_value == null) {
    return 'Khuyến mãi';
  }
  switch (offer.discount_type) {
    case 'percent':
      return `${offer.discount_value}%`;
    case 'fixed':
      return `${(offer.discount_value ?? 0).toLocaleString('vi-VN')}đ`;
    case 'free_shipping':
      return 'Freeship';
    default:
      return offer.discount_value != null ? `${offer.discount_value}%` : 'Khuyến mãi';
  }
}

function buildDiscountType(discountType: string | null): string {
  if (!discountType) return 'percentage';
  return DISCOUNT_TYPE_MAP[discountType] ?? 'percentage';
}

function buildMinSpend(minOrderValue: number | null): string | null {
  if (minOrderValue == null) return null;
  return `${minOrderValue.toLocaleString('vi-VN')}đ`;
}

function buildHeadline(offer: DbOffer): string {
  const parts: string[] = [];
  if (offer.discount_type === 'free_shipping') {
    parts.push('Miễn phí vận chuyển');
  } else if (offer.discount_value != null) {
    if (offer.discount_type === 'percent') {
      parts.push(`Giảm ${offer.discount_value}%`);
    } else {
      parts.push(`Giảm ${offer.discount_value.toLocaleString('vi-VN')}đ`);
    }
  }
  if (offer.coupon_code) {
    parts.push(`Mã: ${offer.coupon_code}`);
  }
  if (offer.merchant_name) {
    parts.push(`từ ${offer.merchant_name}`);
  }
  return parts.join(' · ') || 'Ưu đãi hấp dẫn';
}

function buildCandidates(offers: DbOffer[]): CandidateRow[] {
  return offers.slice(0, 10).map((offer, index) => ({
    code: offer.coupon_code ?? '',
    discountText: buildDiscountText(offer),
    rank: index + 1,
    voucherId: offer.external_id,
    reason: buildSelectionReason(offer, index),
  }));
}

function buildBestMatch(offers: DbOffer[], matchedSource: string): {
  voucherId: string;
  code: string;
  discountType: string;
  discountValue: string;
  minSpend: string | null;
  maxDiscount: string | null;
  validUntil: string;
  headline: string;
  applicableCategories: string[];
} | null {
  if (offers.length === 0) return null;
  const top = offers[0];
  return {
    voucherId: top.external_id,
    code: top.coupon_code ?? '',
    discountType: buildDiscountType(top.discount_type),
    discountValue: top.discount_value != null ? `${top.discount_value}%` : '',
    minSpend: buildMinSpend(top.min_order_value),
    maxDiscount: top.max_discount != null ? `${top.max_discount.toLocaleString('vi-VN')}đ` : null,
    validUntil: top.end_at ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    headline: buildHeadline(top),
    applicableCategories: top.category ? [top.category] : [],
  };
}

function buildSelectionReason(offer: DbOffer, rank: number): string {
  const sourceLabel = SOURCE_LABELS[offer.source] ?? offer.source;
  const parts: string[] = [sourceLabel];

  if (offer.confidence_score >= 0.8) parts.push('Độ tin cậy cao');
  else if (offer.confidence_score >= 0.5) parts.push('Độ tin cậy trung bình');

  if (offer.is_exclusive) parts.push('Ưu đãi độc quyền');
  if (offer.is_pushsale) parts.push('Flash sale');

  if (rank === 0) parts.push('Lựa chọn tốt nhất');
  else parts.push(`#${rank + 1} trong danh sách`);

  return parts.join(' · ');
}

// ── Enrich from INTERNAL_API_URL (optional) ───────────────────────────────────

interface EnrichResult {
  enriched: boolean;
  confidenceBoost?: number;
  sourceOverride?: string;
}

const INTERNAL_API_URL = process.env.INTERNAL_API_URL;
const ENRICH_TIMEOUT_MS = 5_000;

/**
 * Optional enrich step — calls INTERNAL_API_URL if configured.
 * Failures here are silently ignored (DB result is still returned).
 */
async function enrichFromInternalApi(
  input: string,
  dbOffers: DbOffer[]
): Promise<EnrichResult> {
  if (!INTERNAL_API_URL || dbOffers.length === 0) {
    return { enriched: false };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ENRICH_TIMEOUT_MS);

    const res = await fetch(`${INTERNAL_API_URL}/api/public/v1/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ input }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[resolve/enrich] Internal API returned ${res.status}, ignoring`);
      return { enriched: false };
    }

    const data = await res.json() as Record<string, unknown>;
    // If enrich provides better candidates, they can boost confidence
    if (data.confidenceScore != null && typeof data.confidenceScore === 'number') {
      return {
        enriched: true,
        confidenceBoost: data.confidenceScore as number,
        sourceOverride: (data.matchedSource as string | undefined) ?? undefined,
      };
    }

    return { enriched: false };
  } catch {
    // Silently ignore enrich failures — DB result is the source of truth
    return { enriched: false };
  }
}

// ── Input validation ───────────────────────────────────────────────────────────

function validateInput(raw: unknown): NormalizedInput | { valid: false; message: string } {
  if (typeof raw !== 'string') return { valid: false, message: 'Input must be a string' };
  if (raw.trim().length < 10) return { valid: false, message: 'Link quá ngắn' };
  if (raw.length > 2000) return { valid: false, message: 'Link quá dài' };
  return normalizeInput(raw);
}

// ── Main route handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const start = Date.now();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        requestId: '',
        status: 'invalid_input',
        bestMatch: null,
        candidates: [],
        performance: {
          totalLatencyMs: Date.now() - start,
          servedFromCache: false,
          resolvedAt: new Date().toISOString(),
        },
        explanation: {
          summary: 'Yêu cầu không hợp lệ.',
          tips: ['Vui lòng nhập link sản phẩm Shopee, Lazada, Tiki hợp lệ.'],
        },
        warnings: [{ code: 'INVALID_INPUT', message: 'Invalid JSON body', severity: 'warning' }],
      },
      { status: 400 }
    );
  }

  const { input: rawInput } = body as { input?: unknown };

  const validation = validateInput(rawInput);
  if (!('platform' in validation)) {
    return NextResponse.json(
      {
        requestId: '',
        status: 'invalid_input',
        bestMatch: null,
        candidates: [],
        performance: {
          totalLatencyMs: Date.now() - start,
          servedFromCache: false,
          resolvedAt: new Date().toISOString(),
        },
        explanation: {
          summary: 'Link không hợp lệ.',
          tips: ['Vui lòng nhập link sản phẩm Shopee, Lazada, Tiki, TikTok hợp lệ.'],
        },
        warnings: [{ code: 'INVALID_INPUT', message: validation.message, severity: 'warning' }],
      },
      { status: 400 }
    );
  }

  const normalized = validation;
  let enrichResult: EnrichResult = { enriched: false };

  // ── Step 1: Supabase query (the primary path) ──────────────────────────────
  let dbResult: QueryResult;
  try {
    dbResult = await querySupabase(normalized);
  } catch (err) {
    // Supabase is truly unavailable — this is the only case for 503
    const msg = err instanceof Error ? err.message : 'Database unavailable';
    console.error('[resolve] Critical: Supabase query failed:', msg);
    return NextResponse.json(
      {
        requestId: '',
        status: 'error',
        bestMatch: null,
        candidates: [],
        performance: {
          totalLatencyMs: Date.now() - start,
          servedFromCache: false,
          resolvedAt: new Date().toISOString(),
        },
        explanation: {
          summary: 'Dịch vụ tạm thời gián đoạn.',
          tips: ['Vui lòng thử lại trong giây lát.'],
        },
        warnings: [{ code: 'DATABASE_ERROR', message: msg, severity: 'warning' }],
      },
      { status: 503 }
    );
  }

  // ── Step 2: Build response from DB result ─────────────────────────────────
  const { offers, found, freshness } = dbResult;

  if (!found || offers.length === 0) {
    // Still attempt enrich even on no_match — internal API might have data we don't
    if (INTERNAL_API_URL) {
      // Fire-and-forget enrich for potential enrichment on next request
      enrichFromInternalApi(normalized.originalUrl, []).catch(() => {});
    }

    return NextResponse.json({
      requestId: '',
      status: 'no_match',
      bestMatch: null,
      candidates: [],
      performance: {
        totalLatencyMs: Date.now() - start,
        servedFromCache: false,
        resolvedAt: new Date().toISOString(),
      },
      dataFreshness: freshness,
      explanation: {
        summary: 'Chưa tìm thấy voucher phù hợp cho sản phẩm này.',
        tips: [
          'Thử kiểm tra lại link sản phẩm.',
          'Voucher có thể chưa được cập nhật cho sản phẩm này.',
          'Có thể sản phẩm không nằm trong chương trình khuyến mãi.',
        ],
      },
      warnings: [],
    });
  }

  // ── Step 3: Optional enrich from INTERNAL_API_URL ──────────────────────────
  // Fire this in parallel — don't block the response
  enrichFromInternalApi(normalized.originalUrl, offers)
    .then((result) => { enrichResult = result; })
    .catch(() => {});

  // ── Step 4: Build final response ──────────────────────────────────────────
  const bestMatch = buildBestMatch(offers, SOURCE_LABELS[offers[0]?.source] ?? 'Unknown');
  const candidates = buildCandidates(offers);
  const confidenceBoost = enrichResult.confidenceBoost;
  const finalConfidence = confidenceBoost != null
    ? Math.max(offers[0]?.confidence_score ?? 0, confidenceBoost)
    : (offers[0]?.confidence_score ?? 0.5);
  const matchedSource = enrichResult.sourceOverride ?? SOURCE_LABELS[offers[0]?.source] ?? offers[0]?.source;

  return NextResponse.json({
    requestId: '',
    status: 'success',
    bestMatch,
    candidates,
    performance: {
      totalLatencyMs: Date.now() - start,
      servedFromCache: false,
      resolvedAt: new Date().toISOString(),
    },
    confidenceScore: Math.round(finalConfidence * 100) / 100,
    matchedSource,
    dataFreshness: freshness,
    explanation: buildExplanation(bestMatch, offers),
    warnings: enrichResult.enriched
      ? [{ code: 'ENRICHED', message: 'Kết quả đã được bổ sung từ nguồn nâng cao.', severity: 'info' }]
      : [],
  });
}

// ── Explanation builder ────────────────────────────────────────────────────────

function buildExplanation(
  bestMatch: ReturnType<typeof buildBestMatch>,
  offers: DbOffer[]
): { summary: string; tips: string[] } {
  if (!bestMatch) {
    return {
      summary: 'Không tìm thấy voucher phù hợp.',
      tips: ['Thử dùng link sản phẩm cụ thể thay vì link danh mục.'],
    };
  }

  const parts: string[] = [];
  if (bestMatch.minSpend) {
    parts.push(`Áp dụng cho đơn từ ${bestMatch.minSpend}`);
  }
  if (bestMatch.maxDiscount) {
    parts.push(`Giảm tối đa ${bestMatch.maxDiscount}`);
  }
  if (offers[0]?.is_exclusive) {
    parts.push('Ưu đãi độc quyền từ đối tác');
  }

  const tips: string[] = [];
  if (!bestMatch.code) {
    tips.push('Voucher tự động áp dụng — không cần nhập mã');
  } else {
    tips.push(`Nhập mã ${bestMatch.code} khi thanh toán`);
  }

  return {
    summary: parts.join(' · ') || 'Tìm thấy voucher phù hợp cho sản phẩm này.',
    tips,
  };
}
