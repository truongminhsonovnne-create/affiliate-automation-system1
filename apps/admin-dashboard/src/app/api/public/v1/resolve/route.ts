/**
 * Hybrid Voucher Resolution API Route — /api/public/v1/resolve
 *
 * Architecture: resolve_requests (Supabase) → GET polling contract
 *
 * POST pipeline:
 *   1. Parse body + resolve requestId
 *   2. Validate input
 *   3. [PERSIST] Insert pending record to resolve_requests table
 *      - MUST succeed; throws 503 on DB error so the client never
 *        submits a requestId that will immediately 404 on GET
 *   4. Normalize + cache lookup
 *   5. Supabase query + rank + optional enrich
 *   6. [UPDATE] Write final status back to resolve_requests
 *   7. Return response
 *
 * GET pipeline:
 *   1. Validate requestId
 *   2. Look up resolve_requests by request_id (Supabase-first, persistent)
 *   3. If found → return real status with createdAt/resolvedAt
 *   4. If not found → REQUEST_NOT_FOUND (not SERVICE_UNAVAILABLE)
 *   5. No in-memory state used — fully serverless-compatible
 *
 * HTTP status codes:
 *   200 — success, no_match, or terminal state
 *   202 — pending/processing (keep polling)
 *   400 — invalid input or malformed requestId
 *   503 — only when persistence fails (Supabase down during POST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { validateInput } from '@/lib/public/resolve-normalize';
import type { NormalizedInput } from '@/lib/public/resolve-normalize';
import {
  rankOffers,
  assessCandidates,
  extractAlternatives,
  buildBestMatch,
} from '@/lib/public/resolve-ranking';
import type { RankedOffer, DbOffer } from '@/lib/public/resolve-ranking';
import { buildCacheKey, getFromCache, setCache } from '@/lib/public/resolve-cache';

// ── Env ───────────────────────────────────────────────────────────────────────

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? '';
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// ── Guard: fail fast at request time if env is missing ────────────────────────
function requireSupabaseEnv(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    const missing: string[] = [];
    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(`MISSING_SUPABASE_ENV: missing ${missing.join(', ')}. Check your environment configuration.`);
  }
  return { url: SUPABASE_URL, key: SUPABASE_SERVICE_KEY };
}

// ── Supabase client ───────────────────────────────────────────────────────────

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  const { url, key } = requireSupabaseEnv();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Logging ──────────────────────────────────────────────────────────────────

type LogLevel = 'info' | 'warn' | 'error';

function log(
  level: LogLevel,
  code: string,
  meta: Record<string, unknown>
): void {
  // Never log secrets
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (!['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_URL', 'key', 'token'].some(
      s => k.toLowerCase().includes(s.toLowerCase())
    )) {
      safe[k] = v;
    }
  }
  const entry = { ts: new Date().toISOString(), level, route: '/api/public/v1/resolve', code, ...safe };
  if (level === 'error') console.error(JSON.stringify(entry));
  else if (level === 'warn') console.warn(JSON.stringify(entry));
  else console.info(JSON.stringify(entry));
}

// ── Persistence helpers ──────────────────────────────────────────────────────

/**
 * Insert a pending record to resolve_requests.
 * MUST succeed — caller MUST throw 503 if this fails.
 * Returns the request_id on success.
 */
async function createResolveRequest(record: {
  requestId: string;
  platform: string;
  rawUrl: string;
  normalizedUrl: string;
}): Promise<string> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('resolve_requests')
    .insert({
      request_id: record.requestId,
      platform: record.platform,
      raw_url: record.rawUrl,
      normalized_url: record.normalizedUrl,
      status: 'pending',
      requested_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    .select('request_id')
    .single();

  if (error) {
    // Log full error server-side only (never to client)
    // Common error codes to help diagnose:
    //   42P01 = relation "resolve_requests" does not exist (table not migrated)
    //   28000 / 28P01 = invalid credentials
    //   ECONNREFUSED = network unreachable
    log('error', 'PERSIST_INSERT_FAILED', {
      requestId: record.requestId,
      platform: record.platform,
      pgError: error.message,
      pgCode: error.code ?? 'N/A',
      pgDetails: error.details ?? null,
    });
    throw new Error(`PERSIST_INSERT_FAILED: ${error.message} [${error.code ?? 'NO_CODE'}]`);
  }

  log('info', 'REQUEST_CREATED', {
    requestId: record.requestId,
    platform: record.platform,
  });
  return (data as { request_id: string }).request_id;
}

/**
 * Update a resolve_requests record with final status.
 * Non-fatal — logs but never throws.
 */
async function updateResolveRequest(
  requestId: string,
  status: string,
  options: {
    hasMatch?: boolean;
    bestVoucherId?: string;
    bestVoucherCode?: string;
    errorMessage?: string;
    durationMs?: number;
  } = {}
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('resolve_requests')
    .update({
      status,
      resolved_at: new Date().toISOString(),
      has_match: options.hasMatch ?? null,
      best_voucher_id: options.bestVoucherId ?? null,
      best_voucher_code: options.bestVoucherCode ?? null,
      error_message: options.errorMessage ?? null,
      duration_ms: options.durationMs ?? null,
    })
    .eq('request_id', requestId);

  if (error) {
    log('error', 'PERSIST_UPDATE_FAILED', {
      requestId,
      status,
      pgError: error.message,
    });
  } else {
    log('info', 'REQUEST_UPDATED', { requestId, status, hasMatch: options.hasMatch ?? null });
  }
}

/**
 * Look up a resolve_requests record by request_id.
 * Returns null only if the row genuinely does not exist.
 * Throws on actual DB errors (network, auth, etc.).
 */
async function lookupResolveRequest(
  requestId: string
): Promise<{
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  durationMs: number | null;
  hasMatch: boolean | null;
  errorMessage: string | null;
} | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('resolve_requests')
    .select(
      'status, requested_at, resolved_at, duration_ms, has_match, error_message'
    )
    .eq('request_id', requestId)
    .maybeSingle();

  if (error) {
    log('error', 'PERSIST_LOOKUP_FAILED', {
      requestId,
      pgError: error.message,
      pgCode: error.code,
    });
    throw new Error(`PERSIST_LOOKUP_FAILED: ${error.message}`);
  }

  if (!data) return null;

  const d = data as Record<string, unknown>;
  log('info', 'REQUEST_LOOKUP_HIT', { requestId, status: d.status as string });
  return {
    status: d.status as string,
    createdAt: d.requested_at as string,
    resolvedAt: (d.resolved_at as string | null) ?? null,
    durationMs: (d.duration_ms as number | null) ?? null,
    hasMatch: (d.has_match as boolean | null) ?? null,
    errorMessage: (d.error_message as string | null) ?? null,
  };
}

// ── Phase timing ──────────────────────────────────────────────────────────────

interface PhaseTimings {
  normalize: number;
  persist: number;
  cacheHit: number;
  supabaseQuery: number;
  ranking: number;
  enrich: number;
  total: number;
}

// ── Supabase offer query ──────────────────────────────────────────────────────

interface SupabaseResult {
  offers: DbOffer[];
  found: boolean;
  freshness: 'live' | 'recent' | 'stale' | 'unknown';
  error?: string;
}

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
    const sbQuery = sb
      .from('offers')
      .select('*')
      .order('confidence_score', { ascending: false, nulls: 'last' })
      .order('synced_at', { ascending: false, nulls: 'last' })
      .limit(20);

    // Build filter conditions
    const conditions: string[] = ['status.eq.active'];
    if (normalized.shopId) {
      // Flat or() list — no extra parens. Supabase expects: "col1.eq.val1,col2.eq.val2"
      conditions.push(`merchant_id.eq.${normalized.shopId}`);
      conditions.push('merchant_id.is.null');
    }

    // Only call .or() when there are additional conditions beyond status.
    // Without shopId the status filter alone is sufficient.
    const { data, error } = conditions.length > 1
      ? await sbQuery.or(conditions.join(','))
      : await sbQuery;

    const queryTime = Date.now() - phaseStart - t0;

    if (error) {
      log('error', 'SUPABASE_QUERY_FAILED', { requestId, platform: normalized.platform, error: error.message, queryTimeMs: queryTime });
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
      const isClientError = res.status >= 400 && res.status < 500;
      log('warn', isClientError ? 'ENRICH_BACKEND_REJECTED' : 'ENRICH_BACKEND_UNAVAILABLE', {
        requestId,
        status: res.status,
        latencyMs,
      });
      return { enriched: false, skipReason: `HTTP_${res.status}`, latencyMs };
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
    const isTimeout = err instanceof DOMException && err.name === 'AbortException';
    log('warn', isTimeout ? 'ENRICH_TIMEOUT' : 'ENRICH_ERROR', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
      isTimeout,
      latencyMs,
    });
    return { enriched: false, skipReason: isTimeout ? 'TIMEOUT' : 'FETCH_ERROR', latencyMs };
  }
}

// ── Response builders ─────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  masoffer: 'MasOffer',
  accesstrade: 'AccessTrade',
  ecomobi: 'Ecomobi',
};

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
    warnings.push({ code: 'ENRICHED', message: 'Kết quả được bổ sung từ nguồn nâng cao.', severity: 'info' });
  }
  if (top?.confidenceLevel === 'low') {
    warnings.push({ code: 'LOW_CONFIDENCE_RESULT', message: 'Kết quả có độ tin cậy thấp — nên kiểm tra kỹ trước khi dùng.', severity: 'warning' });
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
    dataFreshness: top?.offer.synced_at ? computeFreshness(top.offer.synced_at) : 'unknown',
    explanation: buildExplanation(bestMatch, top, alternatives.length),
    warnings,
    _meta: { resolveMode, enrichAttempted: !!INTERNAL_API_URL, enrichEnriched: enrich.enriched, totalOffers: ranked.length },
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
        : [{ code: 'OPTIONAL_ENRICH_SKIPPED', message: 'INTERNAL_API_URL không được cấu hình. Kết quả chỉ từ cơ sở dữ liệu.', severity: 'info' }],
    _meta: { resolveMode: enrich.enriched ? 'enrich_only_fallback' : 'no_match', enrichAttempted: !!INTERNAL_API_URL, enrichEnriched: enrich.enriched, totalOffers: 0 },
  };
}

function buildExplanation(
  bestMatch: ReturnType<typeof buildBestMatch>,
  top: RankedOffer | undefined,
  altCount: number
): { summary: string; tips: string[] } {
  const tips: string[] = [];
  if (!bestMatch) return { summary: 'Không tìm thấy voucher phù hợp.', tips };

  if (bestMatch.code) tips.push(`Nhập mã ${bestMatch.code} khi thanh toán`);
  else tips.push('Voucher tự động áp dụng — không cần nhập mã');
  if (bestMatch.minSpend) tips.push(`Áp dụng cho đơn từ ${bestMatch.minSpend}`);
  if (bestMatch.maxDiscount) tips.push(`Giảm tối đa ${bestMatch.maxDiscount}`);
  if (top?.offer.is_exclusive) tips.push('Ưu đãi độc quyền từ đối tác');
  if (altCount > 0) tips.push(`Có ${altCount} lựa chọn khác bên dưới`);

  const summaryParts: string[] = [];
  if (bestMatch.minSpend) summaryParts.push(`Đơn từ ${bestMatch.minSpend}`);
  if (bestMatch.discountValue) summaryParts.push(`Giảm ${bestMatch.discountValue}`);

  return { summary: summaryParts.join(' · ') || 'Tìm thấy voucher phù hợp.', tips };
}

// ── Request ID helpers ─────────────────────────────────────────────────────────

const MIN_REQUEST_ID_LENGTH = 8;

function resolveRequestId(clientRequestId: unknown, xClientRequestId: string | null): string {
  if (xClientRequestId && xClientRequestId.length >= MIN_REQUEST_ID_LENGTH) return xClientRequestId;
  if (typeof clientRequestId === 'string' && clientRequestId.length >= MIN_REQUEST_ID_LENGTH) return clientRequestId;
  return randomBytes(12).toString('hex');
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const totalStart = Date.now();
  const phases: PhaseTimings = {
    normalize: 0,
    persist: 0,
    cacheHit: 0,
    supabaseQuery: 0,
    ranking: 0,
    enrich: 0,
    total: 0,
  };

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
      { requestId: rid, status: 'invalid_input', code: 'INVALID_JSON', warnings: [{ code: 'INVALID_JSON', message: 'Yêu cầu không hợp lệ.', severity: 'warning' }] },
      { status: 400 }
    );
  }

  const { input: rawInput, requestId: bodyRequestId } = body as { input?: unknown; requestId?: unknown };
  const requestId = resolveRequestId(bodyRequestId, xClientRequestId);
  log('info', 'RESOLVE_START', { requestId, totalMs: 0 });

  // ── 2. Normalize input ────────────────────────────────────────────────────
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

  // ── 3. Persist pending request — graceful degradation if DB is down ──────
  const persistStart = Date.now();
  let persistSucceeded = false;
  try {
    await createResolveRequest({
      requestId,
      platform: normalized.platform,
      rawUrl: normalized.originalUrl,
      normalizedUrl: normalized.cleanUrl,
    });
    persistSucceeded = true;
    phases.persist = Date.now() - persistStart;
  } catch (persistErr) {
    phases.total = Date.now() - totalStart;
    phases.persist = Date.now() - persistStart;
    const errMsg = persistErr instanceof Error ? persistErr.message : String(persistErr);
    const isMissingEnv = errMsg.includes('MISSING_SUPABASE_ENV');

    // Log with more context so the operator can diagnose
    log('error', 'PERSISTENCE_FAILED', {
      requestId,
      error: errMsg,
      isMissingEnv,
      persistMs: phases.persist,
      totalMs: phases.total,
    });

    if (isMissingEnv) {
      return NextResponse.json(
        {
          requestId,
          status: 'error',
          bestMatch: null,
          candidates: [],
          performance: { totalLatencyMs: phases.total, phaseTimings: phases, servedFromCache: false, resolvedAt: new Date().toISOString() },
          explanation: { summary: 'Cấu hình dịch vụ chưa hoàn chỉnh.', tips: ['Vui lòng liên hệ quản trị viên để cấu hình Supabase.'] },
          warnings: [{ code: 'CONFIGURATION_ERROR', message: 'Dịch vụ chưa được cấu hình đầy đủ. Vui lòng liên hệ quản trị viên.', severity: 'warning' }],
        },
        { status: 503 }
      );
    }

    // Non-fatal persistence failure: continue the resolution without DB persistence.
    // The response is returned directly without a polling contract.
    // Supabase query still runs, so results are still available.
    log('warn', 'PERSISTENCE_SKIPPED_GRACEFUL', {
      requestId,
      error: errMsg,
    });
  }
  if (persistSucceeded) {
    log('info', 'REQUEST_PERSISTED', { requestId, persistMs: phases.persist });
  }

  // ── 4. Cache lookup ────────────────────────────────────────────────────────
  const cacheStart = Date.now();
  const cacheKey = buildCacheKey(normalized);
  const cached = getFromCache(cacheKey);
  phases.cacheHit = Date.now() - cacheStart;

  if (cached) {
    phases.total = Date.now() - totalStart;
    log('info', 'CACHE_HIT', { requestId, cacheKey, totalMs: phases.total });
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
    const cachedStatus = cachedData.status === 'success' ? 'succeeded' : 'no_match';
    const topMatch = cachedData.bestMatch as Record<string, unknown> | null;
    await updateResolveRequest(requestId, cachedStatus, {
      hasMatch: cachedStatus === 'succeeded',
      bestVoucherId: topMatch?.id as string | undefined,
      bestVoucherCode: topMatch?.code as string | undefined,
      durationMs: phases.total,
    });
    return NextResponse.json(cachedResponse, { status: 200 });
  }

  // ── 5. Supabase query ─────────────────────────────────────────────────────
  const supabaseStart = Date.now();
  const dbResult = await querySupabase(normalized, supabaseStart, requestId);
  phases.supabaseQuery = Date.now() - supabaseStart;

  if (dbResult.error && !dbResult.found) {
    phases.total = Date.now() - totalStart;
    log('error', 'FULL_RESOLVE_UNAVAILABLE', { requestId, supabaseError: dbResult.error, totalMs: phases.total });
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

  // ── 6. Rank candidates ─────────────────────────────────────────────────────
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

  // ── 7. Optional enrich ────────────────────────────────────────────────────
  const enrichStart = Date.now();
  let enrichResult: EnrichResult = { enriched: false, latencyMs: 0 };

  if ((assessment === 'enrich_recommended' || assessment === 'no_result') && INTERNAL_API_URL) {
    enrichResult = await tryEnrich(normalized, ranked, enrichStart, requestId);
  }
  phases.enrich = Date.now() - enrichStart;
  phases.total = Date.now() - totalStart;

  // ── 8. Build response ─────────────────────────────────────────────────────
  let response: Record<string, unknown>;

  if (ranked.length === 0 && !enrichResult.enriched) {
    response = buildNoMatchResponse(phases, enrichResult, requestId);
  } else {
    if (enrichResult.enriched && enrichResult.confidenceBoost) {
      const merged = ranked.map((r, i) =>
        i === 0 ? { ...r, score: r.score + enrichResult.confidenceBoost! * 50 } : r
      );
      response = buildSuccessResponse(merged, enrichResult, phases, resolveMode, requestId);
    } else {
      response = buildSuccessResponse(ranked, enrichResult, phases, resolveMode, requestId);
    }
  }

  // ── 9. Cache the result ──────────────────────────────────────────────────
  setCache(cacheKey, response, resolveMode, ranked.length);

  // ── 10. Update persistent record with final status ───────────────────────
  const hasMatch = (response.status === 'success');
  const topMatch = response.bestMatch as Record<string, unknown> | null;
  await updateResolveRequest(requestId, hasMatch ? 'succeeded' : 'no_match', {
    hasMatch,
    bestVoucherId: topMatch?.id as string | undefined,
    bestVoucherCode: topMatch?.code as string | undefined,
    durationMs: phases.total,
  });

  // ── 11. Log completion ──────────────────────────────────────────────────
  log('info', 'RESOLVE_COMPLETE', {
    requestId,
    resolveMode,
    totalMs: phases.total,
    supabaseMs: phases.supabaseQuery,
    enrichMs: phases.enrich,
    rankedCount: ranked.length,
    confidenceScore: response.confidenceScore,
    enriched: enrichResult.enriched,
    platform: normalized.platform,
    shopId: normalized.shopId,
  });

  return NextResponse.json(response, { status: 200 });
}

// ── GET ───────────────────────────────────────────────────────────────────────

/** Map DB status → polling contract resolutionStatus strings */
function mapDbStatus(status: string): string {
  switch (status) {
    case 'pending':    return 'pending';
    case 'processing': return 'processing';
    case 'succeeded':  return 'succeeded';
    case 'no_match':  return 'no_match';
    case 'failed':    return 'failed';
    case 'expired':   return 'expired';
    default:           return 'unknown';
  }
}

/** Terminal statuses — no more polling needed */
function isTerminalStatus(status: string): boolean {
  return status === 'succeeded' || status === 'no_match' || status === 'failed' || status === 'expired' || status === 'completed';
}

/**
 * Extract resolutionStatus from the upstream voucher engine response.
 */
function extractUpstreamStatus(data: Record<string, unknown> | null): string {
  if (!data) return 'unknown';
  if (typeof data.status === 'string') return data.status;
  if (typeof data.resolutionStatus === 'string') return data.resolutionStatus;
  if (typeof data.success === 'boolean') {
    if (!data.success && data.error) return 'failed';
    if (data.success && data.data) return 'succeeded';
  }
  if (typeof data.has_match === 'boolean') return data.has_match ? 'succeeded' : 'no_match';
  return 'unknown';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('requestId');

  // Validate requestId format
  if (!requestId || requestId.trim().length < 8) {
    log('warn', 'GET_INVALID_REQUEST_ID', { requestId: requestId ?? 'null' });
    return NextResponse.json(
      { error: 'INVALID_REQUEST_ID', code: 'INVALID_REQUEST_ID', message: 'requestId must be at least 8 characters.' },
      { status: 400 }
    );
  }

  // ── 1. Primary: look up resolve_requests (Supabase) ──────────────────────
  let dbRecord: {
    status: string;
    createdAt: string;
    resolvedAt: string | null;
    durationMs: number | null;
    hasMatch: boolean | null;
    errorMessage: string | null;
  } | null = null;
  let lookupError: Error | null = null;

  try {
    dbRecord = await lookupResolveRequest(requestId);
  } catch (err) {
    lookupError = err instanceof Error ? err : new Error(String(err));
  }

  if (dbRecord) {
    log('info', 'GET_REQUEST_HIT', { requestId, status: dbRecord.status });

    const resolutionStatus = mapDbStatus(dbRecord.status);
    const terminal = isTerminalStatus(dbRecord.status);

    return NextResponse.json(
      {
        requestId,
        httpStatus: terminal ? 200 : 202,
        resolutionStatus,
        createdAt: dbRecord.createdAt,
        resolvedAt: dbRecord.resolvedAt,
        durationMs: dbRecord.durationMs,
        hasMatch: dbRecord.hasMatch,
        errorCode: dbRecord.errorMessage ? 'RESOLUTION_FAILED' : null,
        message: dbRecord.errorMessage ?? null,
      },
      { status: terminal ? 200 : 202 }
    );
  }

  // DB genuinely has no record for this requestId
  log('info', 'REQUEST_LOOKUP_MISS', { requestId });

  // ── 2. Fallback: voucher engine via INTERNAL_API_URL ──────────────────────
  if (INTERNAL_API_URL) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const upstreamRes = await fetch(
        `${INTERNAL_API_URL}/api/v1/voucher/resolve/${encodeURIComponent(requestId)}`,
        { method: 'GET', headers: { 'Accept': 'application/json', 'X-Client-Request-Id': requestId }, signal: controller.signal }
      );

      clearTimeout(timer);

      const upstreamBody = await upstreamRes.json().catch(() => null) as Record<string, unknown> | null;

      log('info', 'GET_UPSTREAM_RESPONSE', { requestId, upstreamStatus: upstreamRes.status });

      if (upstreamRes.status === 200) {
        const resolutionStatus = extractUpstreamStatus(upstreamBody);
        const resolvedAt = (upstreamBody?.resolved_at ?? upstreamBody?.resolvedAt) as string | null ?? null;
        const durationMs = (upstreamBody?.duration_ms ?? upstreamBody?.durationMs) as number | null ?? null;
        const createdAt = (upstreamBody?.requested_at ?? upstreamBody?.created_at) as string | null ?? null;

        return NextResponse.json(
          {
            requestId,
            httpStatus: 200,
            resolutionStatus,
            createdAt: createdAt ?? new Date().toISOString(),
            resolvedAt,
            durationMs,
            data: upstreamBody ?? null,
          },
          { status: 200 }
        );
      }

      if (upstreamRes.status === 202) {
        const upstreamData = upstreamBody as Record<string, unknown> | null;
        return NextResponse.json(
          {
            requestId,
            httpStatus: 202,
            resolutionStatus: (upstreamData?.status as string) ?? 'processing',
            createdAt: (upstreamData?.created_at as string | null) ?? new Date().toISOString(),
            resolvedAt: null,
            durationMs: null,
          },
          { status: 202 }
        );
      }

      // 404 or 400 from voucher engine → genuinely not found
      log('warn', 'GET_UPSTREAM_NOT_FOUND', { requestId, upstreamStatus: upstreamRes.status });
      return NextResponse.json(
        {
          requestId,
          httpStatus: 200,
          resolutionStatus: 'not_found',
          createdAt: null,
          resolvedAt: null,
          durationMs: null,
          errorCode: 'REQUEST_NOT_FOUND',
          message: 'Yêu cầu đã hết hạn hoặc không tồn tại. Vui lòng gửi yêu cầu mới.',
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
    }
  }

  // Neither DB nor voucher engine has this request.
  // This is a genuine not_found — NOT a service outage.
  log('warn', 'GET_REQUEST_NOT_FOUND', { requestId, lookupError: lookupError?.message ?? null });
  return NextResponse.json(
    {
      requestId,
      httpStatus: 200,
      resolutionStatus: 'not_found',
      createdAt: null,
      resolvedAt: null,
      durationMs: null,
      errorCode: 'REQUEST_NOT_FOUND',
      message: 'Yêu cầu đã hết hạn hoặc không tồn tại. Vui lòng gửi yêu cầu mới.',
    },
    { status: 200 }
  );
}
