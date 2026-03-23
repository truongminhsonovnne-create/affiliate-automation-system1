/**
 * Hybrid Voucher Resolution API Route — /api/public/v1/resolve
 *
 * Architecture: Supabase-first, INTERNAL_API_URL as optional enrich layer.
 *
 * Pipeline:
 *   1. normalizeInput     — validate + extract shop/item IDs
 *   2. querySupabase     — ranked candidates from DB
 *   3. rankCandidates     — rule-based scoring
 *   4. decide             — sufficient? → return | enrich recommended? → call enrich
 *   5. optional enrich     — INTERNAL_API_URL call (5s timeout, failures ignored)
 *   6. build response     — always returns a useful response
 *
 * HTTP status codes:
 *   200 — success (found or no_match)
 *   400 — invalid input
 *   503 — only when Supabase itself is down AND no fallback possible
 *
 * INTERNAL_API_URL is NOT a hard requirement. Missing env or enrich failure
 * never causes a 503 if Supabase path returned usable data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { validateInput } from '@/lib/public/resolve-normalize';
import type { NormalizedInput } from '@/lib/public/resolve-normalize';
import {
  rankOffers,
  assessCandidates,
  computeConfidence,
  extractAlternatives,
  buildBestMatch,
} from '@/lib/public/resolve-ranking';
import type { RankedOffer, DbOffer } from '@/lib/public/resolve-ranking';
import { buildCacheKey, getFromCache, setCache } from '@/lib/public/resolve-cache';

// ── Env ───────────────────────────────────────────────────────────────────────

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? '';
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// ── Supabase client ───────────────────────────────────────────────────────────

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('MISSING_SUPABASE_ENV: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Phase timing ──────────────────────────────────────────────────────────────

interface PhaseTimings {
  normalize: number;
  cacheHit: number;
  supabaseQuery: number;
  ranking: number;
  enrich: number;
  total: number;
}

// ── Supabase query ───────────────────────────────────────────────────────────

interface SupabaseResult {
  offers: DbOffer[];
  found: boolean;
  freshness: 'live' | 'recent' | 'stale' | 'unknown';
  error?: string;
}

/**
 * Query offers from Supabase with ranking filters.
 * Orders by confidence_score desc to support the ranking layer above it.
 */
async function querySupabase(
  normalized: NormalizedInput,
  phaseStart: number,
  requestId: string
): Promise<SupabaseResult> {
  const t0 = Date.now() - phaseStart;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { offers: [], found: false, freshness: 'unknown', error: 'MISSING_SUPABASE_ENV' };
  }

  try {
    const sb = getSupabase();
    const conditions: string[] = ['status.eq.active'];

    if (normalized.shopId) {
      // Specific shop offers first, then broad promotions
      conditions.push(`(merchant_id.eq.${normalized.shopId},merchant_id.is.null)`);
    }

    const { data, error } = await sb
      .from('offers')
      .select('*')
      .or(conditions.join(','))
      .order('confidence_score', { ascending: false, nulls: 'last' })
      .order('synced_at', { ascending: false, nulls: 'last' })
      .limit(20);

    const queryTime = Date.now() - phaseStart - t0;

    if (error) {
      log('error', 'SUPABASE_QUERY_FAILED', {
        requestId,
        platform: normalized.platform,
        error: error.message,
        queryTimeMs: queryTime,
      });
      return { offers: [], found: false, freshness: 'unknown', error: error.message };
    }

    const offers = (data ?? []) as DbOffer[];
    const freshness = computeFreshness(offers[0]?.synced_at);

    log('info', offers.length > 0 ? 'SUPABASE_MATCH_FOUND' : 'SUPABASE_NO_MATCH', {
      requestId,
      platform: normalized.platform,
      shopId: normalized.shopId,
      itemId: normalized.itemId,
      offerCount: offers.length,
      freshness,
      queryTimeMs: queryTime,
    });

    return { offers, found: offers.length > 0, freshness };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log('error', 'SUPABASE_UNEXPECTED_ERROR', { requestId, platform: normalized.platform, error: msg });
    return { offers: [], found: false, freshness: 'unknown', error: msg };
  }
}

function computeFreshness(syncedAt: string | null | undefined): 'live' | 'recent' | 'stale' | 'unknown' {
  if (!syncedAt) return 'unknown';
  const ageHours = (Date.now() - new Date(syncedAt).getTime()) / (1000 * 60 * 60);
  if (ageHours < 1) return 'live';
  if (ageHours < 24) return 'recent';
  return ageHours < 72 ? 'stale' : 'stale';
}

// ── Optional enrich ───────────────────────────────────────────────────────────

interface EnrichResult {
  enriched: boolean;
  skipReason?: string;
  confidenceBoost?: number;
  sourceOverride?: string;
  latencyMs: number;
}

const ENRICH_TIMEOUT_MS = 5_000;

async function tryEnrich(
  input: NormalizedInput,
  ranked: RankedOffer[],
  phaseStart: number,
  requestId: string
): Promise<EnrichResult> {
  const t0 = Date.now();

  if (!INTERNAL_API_URL) {
    log('warn', 'OPTIONAL_ENRICH_SKIPPED', { requestId, reason: 'MISSING_INTERNAL_API_URL' });
    return { enriched: false, skipReason: 'MISSING_INTERNAL_API_URL', latencyMs: Date.now() - t0 };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ENRICH_TIMEOUT_MS);

    const res = await fetch(`${INTERNAL_API_URL}/api/public/v1/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Request-Id': requestId,
      },
      body: JSON.stringify({ input: input.originalUrl, requestId }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const latencyMs = Date.now() - t0;

    if (!res.ok) {
      // Distinguish validation errors (4xx) from infrastructure errors (5xx)
      const isClientError = res.status >= 400 && res.status < 500;
      log('warn', isClientError ? 'ENRICH_BACKEND_REJECTED' : 'ENRICH_BACKEND_UNAVAILABLE', {
        requestId,
        status: res.status,
        latencyMs,
      });
      // Don't treat 4xx as service unavailability — just skip enrich
      return {
        enriched: false,
        skipReason: `HTTP_${res.status}`,
        latencyMs,
      };
    }

    const data = await res.json() as Record<string, unknown>;

    log('info', 'ENRICH_SUCCESS', {
      requestId,
      confidenceBoost: data.confidenceScore,
      matchedSource: data.matchedSource,
      latencyMs,
    });

    return {
      enriched: true,
      confidenceBoost: typeof data.confidenceScore === 'number' ? data.confidenceScore : undefined,
      sourceOverride: typeof data.matchedSource === 'string' ? data.matchedSource : undefined,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - t0;
    const isTimeout =
      err instanceof DOMException && err.name === 'AbortException';
    log('warn', isTimeout ? 'ENRICH_TIMEOUT' : 'ENRICH_ERROR', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
      isTimeout,
      latencyMs,
    });
    return {
      enriched: false,
      skipReason: isTimeout ? 'TIMEOUT' : 'FETCH_ERROR',
      latencyMs,
    };
  }
}

// ── Response building ─────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  masoffer: 'MasOffer',
  accesstrade: 'AccessTrade',
  ecomobi: 'Ecomobi',
};

interface PerformanceMeta {
  totalLatencyMs: number;
  phaseTimings: PhaseTimings;
  servedFromCache: boolean;
  resolvedAt: string;
}

function buildSuccessResponse(
  ranked: RankedOffer[],
  enrich: EnrichResult,
  timings: PhaseTimings,
  resolveMode: string,
  requestId: string
): Record<string, unknown> {
  const top = ranked[0];
  const bestMatch = buildBestMatch(ranked);
  const alternatives = extractAlternatives(ranked);
  const confidenceBoost = enrich.confidenceBoost ?? 0;
  const sourceConf = top?.offer.confidence_score ?? 0.5;
  const topScore = top?.score ?? 0;
  const normalizedScore = Math.min(topScore / 100, 1);
  const finalConfidence = Math.max(normalizedScore, sourceConf, confidenceBoost);
  const matchedSource = enrich.sourceOverride
    ?? SOURCE_LABELS[top?.offer.source ?? '']
    ?? top?.offer.source
    ?? 'Unknown';

  const warnings: Array<{ code: string; message: string; severity: 'info' | 'warning' }> = [];
  if (enrich.enriched) {
    warnings.push({
      code: 'ENRICHED',
      message: 'Kết quả được bổ sung từ nguồn nâng cao.',
      severity: 'info',
    });
  }
  if (top?.confidenceLevel === 'low') {
    warnings.push({
      code: 'LOW_CONFIDENCE_RESULT',
      message: 'Kết quả có độ tin cậy thấp — nên kiểm tra kỹ trước khi dùng.',
      severity: 'warning',
    });
  }
  if (enrich.skipReason && enrich.skipReason !== 'MISSING_INTERNAL_API_URL') {
    warnings.push({
      code: enrich.skipReason.startsWith('HTTP_') ? 'ENRICH_BACKEND_UNAVAILABLE' : 'ENRICH_SKIPPED',
      message: `Tính năng bổ sung tạm thời không khả dụng. Kết quả cơ bản vẫn chính xác.`,
      severity: 'info',
    });
  }

  return {
    requestId,
    status: 'success',
    bestMatch,
    candidates: alternatives,
    performance: {
      totalLatencyMs: timings.total,
      phaseTimings: timings,
      servedFromCache: false,
      resolvedAt: new Date().toISOString(),
    },
    confidenceScore: Math.round(finalConfidence * 100) / 100,
    matchedSource,
    dataFreshness: top?.offer.synced_at
      ? computeFreshness(top.offer.synced_at)
      : 'unknown',
    explanation: buildExplanation(bestMatch, top, alternatives.length),
    warnings,
    _meta: {
      resolveMode,
      enrichAttempted: !!INTERNAL_API_URL,
      enrichEnriched: enrich.enriched,
      enrichSkipReason: enrich.skipReason,
      enrichLatencyMs: enrich.latencyMs,
      totalOffers: ranked.length,
    },
  };
}

function buildNoMatchResponse(
  timings: PhaseTimings,
  enrich: EnrichResult,
  requestId: string
): Record<string, unknown> {
  return {
    requestId,
    status: 'no_match',
    bestMatch: null,
    candidates: [],
    performance: {
      totalLatencyMs: timings.total,
      phaseTimings: timings,
      servedFromCache: false,
      resolvedAt: new Date().toISOString(),
    },
    dataFreshness: 'unknown',
    explanation: {
      summary: 'Chưa tìm thấy voucher phù hợp cho sản phẩm này.',
      tips: [
        'Thử kiểm tra lại link sản phẩm cụ thể.',
        'Voucher có thể chưa được cập nhật cho sản phẩm này.',
        'Sản phẩm có thể không nằm trong chương trình khuyến mãi hiện tại.',
      ],
    },
    warnings: enrich.enriched
      ? []
      : INTERNAL_API_URL
        ? []
        : [{
            code: 'OPTIONAL_ENRICH_SKIPPED',
            message: 'INTERNAL_API_URL không được cấu hình. Kết quả chỉ từ cơ sở dữ liệu.',
            severity: 'info',
          }],
    _meta: {
      resolveMode: enrich.enriched ? 'enrich_only_fallback' : 'no_match',
      enrichAttempted: !!INTERNAL_API_URL,
      enrichEnriched: enrich.enriched,
      totalOffers: 0,
    },
  };
}

function buildExplanation(
  bestMatch: ReturnType<typeof buildBestMatch>,
  top: RankedOffer | undefined,
  altCount: number
): { summary: string; tips: string[] } {
  const tips: string[] = [];
  if (!bestMatch) return { summary: 'Không tìm thấy voucher phù hợp.', tips };

  if (bestMatch.code) {
    tips.push(`Nhập mã ${bestMatch.code} khi thanh toán`);
  } else {
    tips.push('Voucher tự động áp dụng — không cần nhập mã');
  }
  if (bestMatch.minSpend) tips.push(`Áp dụng cho đơn từ ${bestMatch.minSpend}`);
  if (bestMatch.maxDiscount) tips.push(`Giảm tối đa ${bestMatch.maxDiscount}`);
  if (top?.offer.is_exclusive) tips.push('Ưu đãi độc quyền từ đối tác');
  if (altCount > 0) tips.push(`Có ${altCount} lựa chọn khác bên dưới`);

  const summaryParts: string[] = [];
  if (bestMatch.minSpend) summaryParts.push(`Đơn từ ${bestMatch.minSpend}`);
  if (bestMatch.discountValue) summaryParts.push(`Giảm ${bestMatch.discountValue}`);

  return {
    summary: summaryParts.join(' · ') || 'Tìm thấy voucher phù hợp.',
    tips,
  };
}

// ── Server logging ─────────────────────────────────────────────────────────────

type LogLevel = 'info' | 'warn' | 'error';

function log(
  level: LogLevel,
  code: string,
  meta: Record<string, unknown>
): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    route: '/api/public/v1/resolve',
    code,
    ...meta,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.info(JSON.stringify(entry));
  }
}

// ── Request ID helpers ─────────────────────────────────────────────────────────

/** Minimum length for a valid requestId (matches downstream validation) */
const MIN_REQUEST_ID_LENGTH = 8;

/**
 * Resolve the canonical requestId for this request:
 * - If client sent a valid requestId (>=8 chars), use it.
 * - Otherwise generate a server-side one.
 */
function resolveRequestId(clientRequestId: unknown, xClientRequestId: string | null): string {
  // Client-provided via header (highest priority — came from the UI layer)
  if (xClientRequestId && xClientRequestId.length >= MIN_REQUEST_ID_LENGTH) {
    return xClientRequestId;
  }
  // Client-provided via body
  if (typeof clientRequestId === 'string' && clientRequestId.length >= MIN_REQUEST_ID_LENGTH) {
    return clientRequestId;
  }
  // Generate server-side
  return randomBytes(12).toString('hex');
}

// ── Main route handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const totalStart = Date.now();
  const phases: PhaseTimings = {
    normalize: 0,
    cacheHit: 0,
    supabaseQuery: 0,
    ranking: 0,
    enrich: 0,
    total: 0,
  };

  // Resolve requestId first so every log entry has it
  const xClientRequestId = request.headers.get('X-Client-Request-Id') ?? null;

  // ── 1. Parse body ─────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    phases.total = Date.now() - totalStart;
    const rid = resolveRequestId(undefined, xClientRequestId);
    log('error', 'INVALID_JSON', { requestId: rid, totalMs: phases.total });
    return NextResponse.json(
      {
        requestId: rid,
        status: 'invalid_input',
        code: 'INVALID_JSON',
        warnings: [{ code: 'INVALID_JSON', message: 'Yêu cầu không hợp lệ.', severity: 'warning' }],
      },
      { status: 400 }
    );
  }

  const { input: rawInput, requestId: bodyRequestId } = body as { input?: unknown; requestId?: unknown };

  // Always have a valid requestId — client-provided if valid, server-generated otherwise
  const requestId = resolveRequestId(bodyRequestId, xClientRequestId);

  log('info', 'RESOLVE_START', { requestId, totalMs: 0 });

  // ── 2. Normalize input ─────────────────────────────────────────────────────
  const normalizeStart = Date.now();
  const validation = validateInput(rawInput);
  phases.normalize = Date.now() - normalizeStart;

  if (!validation.valid) {
    phases.total = Date.now() - totalStart;
    log('warn', 'INVALID_INPUT', { requestId, code: validation.code, message: validation.message, totalMs: phases.total });
    return NextResponse.json(
      {
        requestId,
        status: 'invalid_input',
        bestMatch: null,
        candidates: [],
        performance: { totalLatencyMs: phases.total, phaseTimings: phases, servedFromCache: false, resolvedAt: new Date().toISOString() },
        explanation: { summary: 'Link không hợp lệ.', tips: ['Vui lòng nhập link sản phẩm Shopee, Lazada, Tiki, TikTok hợp lệ.'] },
        warnings: [{ code: validation.code, message: validation.message, severity: 'warning' }],
      },
      { status: 400 }
    );
  }

  const normalized = validation.normalized;

  // ── 3. Cache lookup ────────────────────────────────────────────────────────
  const cacheStart = Date.now();
  const cacheKey = buildCacheKey(normalized);
  const cached = getFromCache(cacheKey);
  phases.cacheHit = Date.now() - cacheStart;

  if (cached) {
    phases.total = Date.now() - totalStart;
    log('info', 'CACHE_HIT', { requestId, cacheKey, totalMs: phases.total });
    // Always ensure requestId is present in cached response
    const cachedData = cached.result as Record<string, unknown>;
    const cachedResponse = {
      ...cachedData,
      requestId: cachedData.requestId || requestId,
      performance: {
        ...(cachedData.performance as Record<string, unknown>),
        totalLatencyMs: phases.total,
        servedFromCache: true,
        resolvedAt: new Date().toISOString(),
      },
    };
    return NextResponse.json(cachedResponse, { status: 200 });
  }

  // ── 4. Supabase query ──────────────────────────────────────────────────────
  const supabaseStart = Date.now();
  const dbResult = await querySupabase(normalized, supabaseStart, requestId);
  phases.supabaseQuery = Date.now() - supabaseStart;

  // CRITICAL: only 503 when Supabase itself fails AND we have no data
  if (dbResult.error && !dbResult.found) {
    phases.total = Date.now() - totalStart;
    log('error', 'FULL_RESOLVE_UNAVAILABLE', {
      requestId,
      supabaseError: dbResult.error,
      totalMs: phases.total,
    });
    return NextResponse.json(
      {
        requestId,
        status: 'error',
        bestMatch: null,
        candidates: [],
        performance: { totalLatencyMs: phases.total, phaseTimings: phases, servedFromCache: false, resolvedAt: new Date().toISOString() },
        explanation: { summary: 'Dịch vụ tạm thời gián đoạn.', tips: ['Vui lòng thử lại trong giây lát.'] },
        warnings: [{ code: 'FULL_RESOLVE_UNAVAILABLE', message: 'Không thể truy vấn dữ liệu. Vui lòng thử lại sau.', severity: 'warning' }],
      },
      { status: 503 }
    );
  }

  // ── 5. Rank candidates ─────────────────────────────────────────────────────
  const rankingStart = Date.now();
  const ranked = rankOffers(dbResult.offers, { shopId: normalized.shopId, itemId: normalized.itemId });
  phases.ranking = Date.now() - rankingStart;

  const assessment = assessCandidates(ranked);
  let resolveMode: string;

  if (assessment === 'sufficient') {
    resolveMode = 'supabase_only';
  } else if (assessment === 'enrich_recommended' && INTERNAL_API_URL) {
    resolveMode = 'supabase_plus_enrich';
  } else if (assessment === 'no_result' && INTERNAL_API_URL) {
    resolveMode = 'enrich_only_fallback';
  } else {
    resolveMode = assessment === 'no_result' ? 'no_match' : 'supabase_only';
  }

  // ── 6. Optional enrich ─────────────────────────────────────────────────────
  const enrichStart = Date.now();
  let enrichResult: EnrichResult = { enriched: false, latencyMs: 0 };

  if ((assessment === 'enrich_recommended' || assessment === 'no_result') && INTERNAL_API_URL) {
    enrichResult = await tryEnrich(normalized, ranked, enrichStart, requestId);
  }
  phases.enrich = Date.now() - enrichStart;
  phases.total = Date.now() - totalStart;

  // ── 7. Build response ──────────────────────────────────────────────────────
  let response: Record<string, unknown>;

  if (ranked.length === 0 && !enrichResult.enriched) {
    response = buildNoMatchResponse(phases, enrichResult, requestId);
  } else {
    // Re-rank after potential enrich (enrich could have boosted confidence)
    if (enrichResult.enriched && enrichResult.confidenceBoost) {
      // Merge enriched score back into top offer for display
      const merged = ranked.map((r, i) =>
        i === 0 ? { ...r, score: r.score + enrichResult.confidenceBoost! * 50 } : r
      );
      response = buildSuccessResponse(merged, enrichResult, phases, resolveMode, requestId);
    } else {
      response = buildSuccessResponse(ranked, enrichResult, phases, resolveMode, requestId);
    }
  }

  // ── 8. Cache the result ────────────────────────────────────────────────────
  setCache(cacheKey, response, resolveMode, ranked.length);

  // ── 9. Log final decision ─────────────────────────────────────────────────
  log('info', 'RESOLVE_COMPLETE', {
    requestId,
    resolveMode,
    totalMs: phases.total,
    supabaseMs: phases.supabaseQuery,
    enrichMs: phases.enrich,
    rankedCount: ranked.length,
    confidenceScore: response.confidenceScore,
    enriched: enrichResult.enriched,
    enrichSkipReason: enrichResult.skipReason,
    platform: normalized.platform,
    shopId: normalized.shopId,
  });

  return NextResponse.json(response, { status: 200 });
}

// ── GET: poll for async resolution status ───────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('requestId');

  // Map missing or too-short requestId → 400 (not 503)
  if (!requestId || requestId.trim().length < 8) {
    log('warn', 'GET_INVALID_REQUEST_ID', { requestId: requestId ?? 'null' });
    return NextResponse.json(
      {
        error: 'INVALID_REQUEST_ID',
        code: 'INVALID_REQUEST_ID',
        message: 'requestId must be at least 8 characters.',
      },
      { status: 400 }
    );
  }

  // Attempt to call internal backend (voucher engine) for real status
  if (INTERNAL_API_URL) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const upstreamRes = await fetch(
        `${INTERNAL_API_URL}/api/v1/voucher/resolve/${encodeURIComponent(requestId)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Client-Request-Id': requestId,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timer);

      // Map upstream HTTP status → our polling contract
      // Upstream: 200 = done, 202 = in-flight, 404 = not found, 400 = bad request
      const upstreamBody = await upstreamRes.json().catch(() => null) as Record<string, unknown> | null;

      log('info', 'GET_RESOLVE_UPSTREAM', {
        requestId,
        upstreamStatus: upstreamRes.status,
      });

      if (upstreamRes.status === 200) {
        // Request completed — extract status
        const upstreamData = upstreamBody as Record<string, unknown> | null;
        const resolutionStatus = extractUpstreamStatus(upstreamData);
        const resolvedAt = upstreamData?.resolved_at as string | null
          ?? upstreamData?.resolvedAt as string | null
          ?? null;
        const durationMs = upstreamData?.duration_ms as number | null
          ?? upstreamData?.durationMs as number | null
          ?? null;

        return NextResponse.json(
          {
            requestId,
            httpStatus: 200,
            resolutionStatus,
            createdAt: upstreamData?.requested_at as string | null
              ?? upstreamData?.created_at as string | null
              ?? new Date().toISOString(),
            resolvedAt,
            durationMs,
            data: upstreamData ?? null,
          },
          { status: 200 }
        );
      }

      if (upstreamRes.status === 202) {
        // Request still in flight — return polling status
        const upstreamData = upstreamBody as Record<string, unknown> | null;
        return NextResponse.json(
          {
            requestId,
            httpStatus: 202,
            resolutionStatus: (upstreamData?.status as string) ?? 'processing',
            createdAt: upstreamData?.created_at as string | null ?? new Date().toISOString(),
            resolvedAt: null,
            durationMs: null,
          },
          { status: 202 }
        );
      }

      if (upstreamRes.status === 404) {
        // Request not found
        log('warn', 'GET_REQUEST_NOT_FOUND', { requestId });
        return NextResponse.json(
          {
            requestId,
            httpStatus: 200,  // Treat as terminal — don't keep polling forever
            resolutionStatus: 'not_found',
            createdAt: null,
            resolvedAt: null,
            durationMs: null,
            errorCode: 'REQUEST_NOT_FOUND',
            message: 'Request not found or has expired.',
          },
          { status: 200 }
        );
      }

      if (upstreamRes.status === 400) {
        // Validation error from upstream
        return NextResponse.json(
          {
            error: 'INVALID_REQUEST_ID',
            code: 'INVALID_REQUEST_ID',
            message: 'Invalid requestId format.',
          },
          { status: 400 }
        );
      }

      // Upstream 5xx — treat as retryable failure
      log('warn', 'GET_UPSTREAM_ERROR', { requestId, status: upstreamRes.status });
      return NextResponse.json(
        {
          requestId,
          httpStatus: 200,  // Don't surface 5xx to polling client
          resolutionStatus: 'failed',
          createdAt: null,
          resolvedAt: null,
          durationMs: null,
          errorCode: 'UPSTREAM_ERROR',
          message: `Upstream service error (${upstreamRes.status}).`,
        },
        { status: 200 }
      );
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'AbortException';
      log('warn', isTimeout ? 'GET_UPSTREAM_TIMEOUT' : 'GET_UPSTREAM_ERROR', {
        requestId,
        error: err instanceof Error ? err.message : String(err),
        isTimeout,
      });
      // Fall through to stub on error — don't fail the polling
    }
  }

  // No INTERNAL_API_URL configured or upstream call failed.
  // Return stub so polling client doesn't hang — but never return null status.
  log('warn', 'GET_RESOLVE_STUB', {
    requestId,
    reason: INTERNAL_API_URL ? 'UPSTREAM_UNAVAILABLE' : 'NO_INTERNAL_API_URL',
  });
  return NextResponse.json(
    {
      requestId,
      httpStatus: 200,
      resolutionStatus: 'unknown',
      createdAt: null,
      resolvedAt: null,
      durationMs: null,
      errorCode: 'SERVICE_UNAVAILABLE',
      message: 'Status lookup unavailable. Submit a new resolve request.',
    },
    { status: 200 }
  );
}

/**
 * Extract resolutionStatus from the upstream voucher engine response.
 * Handles both the voucher engine format and legacy formats.
 */
function extractUpstreamStatus(data: Record<string, unknown> | null): string {
  if (!data) return 'unknown';

  // Primary: `status` field (from voucher engine serializer)
  if (typeof data.status === 'string') return data.status;

  // Secondary: `resolutionStatus` field
  if (typeof data.resolutionStatus === 'string') return data.resolutionStatus;

  // Tertiary: from `success` boolean
  if (typeof data.success === 'boolean') {
    if (!data.success && data.error) return 'failed';
    if (data.success && data.data) return 'succeeded';
  }

  // Quaternary: `has_match` boolean
  if (typeof data.has_match === 'boolean') {
    return data.has_match ? 'succeeded' : 'no_match';
  }

  return 'unknown';
}
