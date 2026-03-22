/**
 * Voucher Resolution Persistence
 *
 * Dual-layer durable storage:
 *  1. Redis   – full JSON result, short TTL (see redisClient.ts)
 *  2. Postgres – request metadata & summary, long TTL + manual cleanup
 *
 * Read path  : DB metadata → Redis JSON (fallback to DB summary if Redis miss)
 * Write path : DB first (source of truth) → Redis (best-effort cache)
 */

import {
  VoucherResolutionRequest,
  VoucherResolutionResult,
  VoucherResolutionStatus,
  ProductReference,
} from '../types';

import {
  setResolutionResult,
  getResolutionResult,
} from '../redis/redisClient';

import {
  getSupabaseClient,
} from '../../db/supabaseClient';

import { logger } from '../../utils/logger';

import {
  REQUEST_EXPIRY_PENDING_SECONDS,
  REQUEST_EXPIRY_COMPLETED_SECONDS,
  REQUEST_EXPIRY_FAILED_SECONDS,
  REQUEST_EXPIRY_EXPIRED_SECONDS,
  RESOLUTION_RESULT_TTL_SECONDS,
} from '../constants';

/**
 * Persistence options
 */
export interface PersistenceOptions {
  idempotencyKey?: string;
  skipIfExists?: boolean;
}

// ── In-memory fallback (only used when DB/Redis is unavailable) ───────────────
// Allows the service to degrade gracefully in local dev or partial outages.
// Data in this map is NOT durable – it is purely for availability.

const requestStorage = new Map<string, VoucherResolutionRequest>();
const resultStorage = new Map<string, VoucherResolutionResult>();

/** Returns the correct TTL offset based on status */
function getExpiresAt(status: VoucherResolutionStatus): string {
  const now = new Date();
  switch (status) {
    case 'pending':
    case 'processing':
      now.setSeconds(now.getSeconds() + REQUEST_EXPIRY_PENDING_SECONDS);
      break;
    case 'succeeded':
    case 'cached':
      now.setSeconds(now.getSeconds() + REQUEST_EXPIRY_COMPLETED_SECONDS);
      break;
    case 'failed':
    case 'no_match':
      now.setSeconds(now.getSeconds() + REQUEST_EXPIRY_FAILED_SECONDS);
      break;
    case 'expired':
      now.setSeconds(now.getSeconds() + REQUEST_EXPIRY_EXPIRED_SECONDS);
      break;
  }
  return now.toISOString();
}

/** Extract product identifiers from a ProductReference */
function extractProductIdentifiers(ref: ProductReference): {
  productId: string | null;
  shopId: string | null;
  categoryPath: string[] | null;
} {
  if (ref.platform === 'shopee') {
    return {
      productId: ref.itemId ?? null,
      shopId: ref.shopId ?? null,
      categoryPath: ref.categoryPath ?? null,
    };
  }
  return {
    productId: ref.productId ?? null,
    shopId: ref.shopId ?? null,
    categoryPath: ref.categoryHints ?? [],
  };
}

/**
 * Create a new voucher resolution request
 *
 * Write path: Supabase (source of truth) first, then Redis (best-effort).
 * If Supabase is unavailable, falls back to in-memory map (non-durable).
 */
export async function createVoucherResolutionRequest(
  input: {
    platform: string;
    rawUrl: string;
    normalizedUrl: string;
    productReference: ProductReference;
    cacheKey?: string | null;
    cacheHit?: boolean;
    ipHash?: string;
    userAgent?: string;
  },
  options?: PersistenceOptions
): Promise<VoucherResolutionRequest> {
  const id = generateId();
  const now = new Date();
  const { productId, shopId, categoryPath } = extractProductIdentifiers(input.productReference);

  const request: VoucherResolutionRequest = {
    id,
    platform: input.platform as any,
    rawUrl: input.rawUrl,
    normalizedUrl: input.normalizedUrl,
    productReference: input.productReference,
    status: 'pending',
    cacheKey: input.cacheKey ?? null,
    cacheHit: input.cacheHit ?? false,
    requestedAt: now,
    resolvedAt: null,
    durationMs: null,
    errorMessage: null,
  };

  // Attempt DB write first (source of truth)
  await persistToSupabase(request, {
    productId,
    shopId,
    categoryPath,
  });

  // Also write to Redis (result will be stored later by completeVoucherResolutionRequest)
  // Here we just pre-warm an empty entry so the key exists
  await setResolutionResult(id, { status: 'pending', requestId: id }, REQUEST_EXPIRY_PENDING_SECONDS);

  // Memory fallback
  requestStorage.set(id, request);

  return request;
}

/**
 * Update request with resolution result.
 *
 * Write path:
 *  1. Supabase (metadata + result summary columns)
 *  2. Redis (full JSON result)
 *  3. Memory fallback (non-durable)
 */
export async function completeVoucherResolutionRequest(
  requestId: string,
  result: VoucherResolutionResult,
  options?: PersistenceOptions
): Promise<VoucherResolutionRequest> {
  const request = requestStorage.get(requestId);

  if (!request) {
    throw new Error(`Request not found: ${requestId}`);
  }

  // Determine final status
  const status: VoucherResolutionStatus = result.hasMatch ? 'succeeded' : 'no_match';
  const resolvedAt = new Date();
  const durationMs = resolvedAt.getTime() - request.requestedAt.getTime();

  const updatedRequest: VoucherResolutionRequest = {
    ...request,
    status,
    resolvedAt,
    durationMs,
    errorMessage: result.warnings?.length ? result.warnings[0].message : null,
  };

  // Persist full result JSON to Redis (TTL = result TTL)
  await setResolutionResult(requestId, result, RESOLUTION_RESULT_TTL_SECONDS);

  // Update Supabase metadata + summary columns
  await updateSupabaseRequest(updatedRequest, {
    hasMatch: result.hasMatch,
    matchType: result.matchType,
    bestVoucherId: result.bestVoucher?.id ?? null,
    bestVoucherCode: result.bestVoucher?.code ?? null,
    eligibleCount: result.eligibleCount,
    totalCandidates: result.totalCandidates,
  });

  // Memory fallback
  requestStorage.set(requestId, updatedRequest);
  resultStorage.set(requestId, result);

  return updatedRequest;
}

/**
 * Persist resolution result to Redis (primary storage for full JSON).
 * Supabase is updated via updateSupabaseRequest().
 *
 * @deprecated Use completeVoucherResolutionRequest() which handles both DB + Redis
 */
export async function persistVoucherResolutionResult(
  requestId: string,
  result: VoucherResolutionResult,
  options?: PersistenceOptions
): Promise<void> {
  await setResolutionResult(requestId, result, RESOLUTION_RESULT_TTL_SECONDS);
  resultStorage.set(requestId, result);
}

/**
 * Get resolution request by ID.
 *
 * Read path:
 *  1. In-memory fallback (fastest, non-durable)
 *  2. Supabase (durable, metadata only)
 *
 * Note: full result is in Redis – use getVoucherResolutionResult() separately.
 */
export async function getVoucherResolutionRequest(
  requestId: string
): Promise<VoucherResolutionRequest | null> {
  // 1. In-memory fallback
  const memory = requestStorage.get(requestId);
  if (memory) return memory;

  // 2. Supabase
  try {
    const sb = getSupabaseClient();
    if (!sb) return null;

    const { data, error } = await sb
      .from('voucher_resolution_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (error || !data) return null;

    return deserializeRequestRow(data);
  } catch (err) {
    logger.warn({ err, requestId }, '[Persistence] getVoucherResolutionRequest DB error');
    return null;
  }
}

/**
 * Get full resolution result by requestId.
 *
 * Read path:
 *  1. Redis (primary, full JSON with TTL)
 *  2. Supabase summary (fallback – only has has_match, best_voucher_code, etc.)
 *  3. In-memory fallback
 *
 * If only Supabase data is available, returns a partial result object with
 * `hasMatch` = false and the summary fields populated.
 */
export async function getVoucherResolutionResult(
  requestId: string
): Promise<VoucherResolutionResult | null> {
  // 1. Redis (primary)
  try {
    const redisResult = await getResolutionResult<VoucherResolutionResult>(requestId);
    if (redisResult) return redisResult;
  } catch { /* fall through */ }

  // 2. In-memory fallback
  const memory = resultStorage.get(requestId);
  if (memory) return memory;

  // 3. Supabase – reconstruct partial result from metadata
  try {
    const sb = getSupabaseClient();
    if (!sb) return null;

    const { data, error } = await sb
      .from('voucher_resolution_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (error || !data) return null;

    // Reconstruct a partial result from DB metadata
    return reconstructResultFromRow(data);
  } catch (err) {
    logger.warn({ err, requestId }, '[Persistence] getVoucherResolutionResult DB error');
    return null;
  }
}

/**
 * Mark request as failed (unrecoverable error).
 *
 * Write: Supabase + Redis + memory fallback.
 */
export async function failVoucherResolutionRequest(
  requestId: string,
  error: string
): Promise<VoucherResolutionRequest> {
  const request = requestStorage.get(requestId);

  if (!request) {
    throw new Error(`Request not found: ${requestId}`);
  }

  const resolvedAt = new Date();
  const durationMs = resolvedAt.getTime() - request.requestedAt.getTime();

  const updatedRequest: VoucherResolutionRequest = {
    ...request,
    status: 'failed',
    resolvedAt,
    durationMs,
    errorMessage: error,
  };

  // Supabase
  await updateSupabaseRequest(updatedRequest, {});

  // Redis – store error state
  await setResolutionResult(requestId, { status: 'failed', error }, REQUEST_EXPIRY_FAILED_SECONDS);

  // Memory
  requestStorage.set(requestId, updatedRequest);

  return updatedRequest;
}

/**
 * Mark request as served from cache.
 *
 * Write: Supabase + Redis + memory fallback.
 */
export async function cacheVoucherResolutionRequest(
  requestId: string,
  result: VoucherResolutionResult
): Promise<VoucherResolutionRequest> {
  const request = requestStorage.get(requestId);

  if (!request) {
    throw new Error(`Request not found: ${requestId}`);
  }

  const resolvedAt = new Date();
  const durationMs = resolvedAt.getTime() - request.requestedAt.getTime();

  const updatedRequest: VoucherResolutionRequest = {
    ...request,
    status: 'cached',
    resolvedAt,
    durationMs,
  };

  // Redis
  await setResolutionResult(requestId, result, RESOLUTION_RESULT_TTL_SECONDS);

  // Supabase
  await updateSupabaseRequest(updatedRequest, {
    hasMatch: result.hasMatch,
    matchType: result.matchType,
    bestVoucherId: result.bestVoucher?.id ?? null,
    bestVoucherCode: result.bestVoucher?.code ?? null,
    eligibleCount: result.eligibleCount,
    totalCandidates: result.totalCandidates,
  });

  // Memory
  requestStorage.set(requestId, updatedRequest);
  resultStorage.set(requestId, result);

  return updatedRequest;
}

/**
 * List recent resolution requests.
 *
 * Read path: Supabase → in-memory fallback.
 */
export async function listVoucherResolutionRequests(
  options?: {
    limit?: number;
    offset?: number;
    platform?: string;
    status?: VoucherResolutionStatus;
  }
): Promise<{ requests: VoucherResolutionRequest[]; total: number }> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  try {
    const sb = getSupabaseClient();
    if (sb) {
      let query = sb
        .from('voucher_resolution_requests')
        .select('*', { count: 'exact', head: false });

      if (options?.platform) {
        query = query.eq('platform', options.platform);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error, count } = await query
        .order('requested_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        return {
          requests: data.map(deserializeRequestRow),
          total: count ?? data.length,
        };
      }
    }
  } catch (err) {
    logger.warn({ err }, '[Persistence] listVoucherResolutionRequests DB error, using memory fallback');
  }

  // In-memory fallback
  let requests = Array.from(requestStorage.values());
  if (options?.platform) {
    requests = requests.filter((r) => r.platform === options.platform);
  }
  if (options?.status) {
    requests = requests.filter((r) => r.status === options.status);
  }
  requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

  return {
    requests: requests.slice(offset, offset + limit),
    total: requests.length,
  };
}

/**
 * Get resolution statistics.
 *
 * Read path: Supabase → in-memory fallback.
 */
export async function getResolutionStatistics(
  options?: { platform?: string; days?: number }
): Promise<{
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  noMatchRequests: number;
  avgDurationMs: number;
  cacheHitRate: number;
}> {
  try {
    const sb = getSupabaseClient();
    if (sb) {
      let query = sb
        .from('voucher_resolution_requests')
        .select('status, cache_hit, duration_ms', { count: 'exact' });

      if (options?.platform) {
        query = query.eq('platform', options.platform);
      }
      if (options?.days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - options.days);
        query = query.gte('requested_at', cutoff.toISOString());
      }

      const { data, error, count } = await query;

      if (!error && data) {
        const completed = data.filter((r) => r.status === 'succeeded' || r.status === 'cached');
        const failed = data.filter((r) => r.status === 'failed');
        const noMatch = data.filter((r) => r.status === 'no_match');
        const cacheHits = data.filter((r) => r.cache_hit);
        const durations = data
          .map((r) => r.duration_ms)
          .filter((d): d is number => d !== null && d !== undefined);

        const avgDuration = durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0;

        return {
          totalRequests: count ?? data.length,
          completedRequests: completed.length,
          failedRequests: failed.length,
          noMatchRequests: noMatch.length,
          avgDurationMs: Math.round(avgDuration),
          cacheHitRate: data.length > 0 ? cacheHits.length / data.length : 0,
        };
      }
    }
  } catch (err) {
    logger.warn({ err }, '[Persistence] getResolutionStatistics DB error, using memory fallback');
  }

  // In-memory fallback
  let requests = Array.from(requestStorage.values());
  if (options?.platform) {
    requests = requests.filter((r) => r.platform === options.platform);
  }
  if (options?.days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - options.days);
    requests = requests.filter((r) => r.requestedAt >= cutoff);
  }

  const completed = requests.filter((r) => r.status === 'succeeded' || r.status === 'cached');
  const failed = requests.filter((r) => r.status === 'failed');
  const noMatch = requests.filter((r) => r.status === 'no_match');
  const cacheHits = requests.filter((r) => r.cacheHit);

  const durations = completed
    .map((r) => r.durationMs)
    .filter((d): d is number => d !== null && d !== undefined);

  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  const cacheHitRate = requests.length > 0 ? cacheHits.length / requests.length : 0;

  return {
    totalRequests: requests.length,
    completedRequests: completed.length,
    failedRequests: failed.length,
    noMatchRequests: noMatch.length,
    avgDurationMs: Math.round(avgDuration),
    cacheHitRate,
  };
}

// =============================================================================
// Private Helper Functions
// =============================================================================

// =============================================================================
// Supabase Helpers
// =============================================================================

interface SupabaseRequestRow {
  id: string;
  platform: string;
  raw_url: string;
  normalized_url: string;
  status: string;
  cache_key: string | null;
  cache_hit: boolean;
  product_id: string | null;
  shop_id: string | null;
  category_path: string[] | null;
  has_match: boolean | null;
  match_type: string | null;
  best_voucher_id: string | null;
  best_voucher_code: string | null;
  eligible_count: number | null;
  total_candidates: number | null;
  error_message: string | null;
  requested_at: string;
  resolved_at: string | null;
  expires_at: string;
  duration_ms: number | null;
  created_at: string;
  updated_at: string;
}

function deserializeRequestRow(row: SupabaseRequestRow): VoucherResolutionRequest {
  return {
    id: row.id,
    platform: row.platform as any,
    rawUrl: row.raw_url,
    normalizedUrl: row.normalized_url,
    productReference: {
      platform: row.platform as any,
      productId: row.product_id,
      shopId: row.shop_id,
      keywords: [],
      categoryHints: row.category_path ?? [],
      normalizedUrl: row.normalized_url,
      extractedAt: new Date(row.requested_at),
    },
    status: row.status as any,
    cacheKey: row.cache_key,
    cacheHit: row.cache_hit,
    requestedAt: new Date(row.requested_at),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
    durationMs: row.duration_ms,
    errorMessage: row.error_message,
  };
}

function reconstructResultFromRow(row: SupabaseRequestRow): VoucherResolutionResult {
  return {
    requestId: row.id,
    platform: row.platform as any,
    hasMatch: row.has_match ?? false,
    matchType: (row.match_type ?? 'none') as any,
    bestVoucher: row.best_voucher_id
      ? {
          id: row.best_voucher_id,
          code: row.best_voucher_code,
          title: '',
          type: 'general' as any,
          discountType: null,
          discountValue: null,
          maxDiscountValue: null,
          minimumSpend: null,
          scope: 'all' as any,
          expiresAt: null,
          shopName: null,
          matchType: (row.match_type ?? 'none') as any,
          expectedValue: 0,
          applicabilityScore: 0,
          url: null,
        }
      : null,
    candidates: [],
    eligibleCount: row.eligible_count ?? 0,
    totalCandidates: row.total_candidates ?? 0,
    explanation: {
      hasMatch: row.has_match ?? false,
      bestMatchReason: null,
      candidateSummaries: [],
      fallbackRecommendation: null,
      noMatchReason: row.status === 'no_match' ? 'No eligible vouchers found' : row.error_message,
      tips: [],
    },
    rankingTrace: [],
    productContext: {
      platform: row.platform as any,
      productReference: {} as any,
      productId: row.product_id,
      shopId: row.shop_id,
      shopName: null,
      categoryId: null,
      categoryPath: row.category_path ?? [],
      title: null,
      price: null,
      originalPrice: null,
      imageUrl: null,
      normalizedUrl: row.normalized_url,
      sourceUrl: row.raw_url,
      confidence: 0,
      contextSource: 'url',
      extractedHints: [],
      metadata: {},
      loadedAt: new Date(row.requested_at),
    },
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : new Date(),
    resolutionDurationMs: row.duration_ms ?? 0,
    cached: row.status === 'cached',
    warnings: row.error_message
      ? [{ code: 'PERSISTENCE_FALLBACK', message: row.error_message, severity: 'medium' as const }]
      : [],
  };
}

async function persistToSupabase(
  request: VoucherResolutionRequest,
  identifiers: { productId: string | null; shopId: string | null; categoryPath: string[] | null }
): Promise<void> {
  try {
    const sb = getSupabaseClient();
    if (!sb) return;

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + REQUEST_EXPIRY_PENDING_SECONDS);

    const { error } = await sb.from('voucher_resolution_requests').insert({
      id: request.id,
      platform: request.platform,
      raw_url: request.rawUrl,
      normalized_url: request.normalizedUrl,
      status: 'pending',
      cache_key: request.cacheKey,
      cache_hit: request.cacheHit,
      product_id: identifiers.productId,
      shop_id: identifiers.shopId,
      category_path: identifiers.categoryPath,
      has_match: null,
      match_type: null,
      best_voucher_id: null,
      best_voucher_code: null,
      eligible_count: null,
      total_candidates: null,
      error_message: null,
      requested_at: request.requestedAt.toISOString(),
      resolved_at: null,
      expires_at: expiresAt.toISOString(),
      duration_ms: null,
    });

    if (error) {
      logger.warn({ err: error, requestId: request.id }, '[Persistence] Failed to persist to Supabase');
    }
  } catch (err) {
    logger.warn({ err, requestId: request.id }, '[Persistence] Exception persisting to Supabase');
  }
}

async function updateSupabaseRequest(
  request: VoucherResolutionRequest,
  resultSummary: {
    hasMatch?: boolean | null;
    matchType?: string | null;
    bestVoucherId?: string | null;
    bestVoucherCode?: string | null;
    eligibleCount?: number | null;
    totalCandidates?: number | null;
  }
): Promise<void> {
  try {
    const sb = getSupabaseClient();
    if (!sb) return;

    const expiresAt = getExpiresAt(request.status);

    const { error } = await sb
      .from('voucher_resolution_requests')
      .update({
        status: request.status,
        has_match: resultSummary.hasMatch ?? request.status === 'succeeded' || request.status === 'cached',
        match_type: resultSummary.matchType ?? null,
        best_voucher_id: resultSummary.bestVoucherId ?? null,
        best_voucher_code: resultSummary.bestVoucherCode ?? null,
        eligible_count: resultSummary.eligibleCount ?? null,
        total_candidates: resultSummary.totalCandidates ?? null,
        error_message: request.errorMessage,
        resolved_at: request.resolvedAt?.toISOString() ?? null,
        expires_at: expiresAt,
        duration_ms: request.durationMs,
      })
      .eq('id', request.id);

    if (error) {
      logger.warn({ err: error, requestId: request.id }, '[Persistence] Failed to update Supabase');
    }
  } catch (err) {
    logger.warn({ err, requestId: request.id }, '[Persistence] Exception updating Supabase');
  }
}

// =============================================================================
// Private Helper Functions
// =============================================================================

/**
 * Generate unique ID
 */
function generateId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
