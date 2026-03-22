// =============================================================================
// Public Voucher Resolution Service
// Production-grade orchestrator for public voucher resolution
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  PublicVoucherResolveRequest,
  PublicVoucherResolveResponse,
  PublicApiWarning,
} from '../types.js';
import { PUBLIC_API, PERFORMANCE, ERROR_CODES } from '../constants.js';
import { validatePublicShopeeLinkInput, normalizePublicInput } from '../validation/publicInputValidation.js';
import {
  getPublicResolutionCache,
  setPublicResolutionCache,
  buildPublicResolutionCacheKey,
  tryAcquireInflightRequest,
  releaseInflightRequest,
} from '../cache/publicResolutionCache.js';
import { evaluatePublicRateLimit } from '../rateLimit/publicRateLimitGuard.js';
import { serializePublicVoucherResolveResponse, buildNoMatchExplanation } from '../serialization/publicResponseSerializer.js';
import { resolveBestVoucherForShopeeUrl } from '../../voucherEngine/service/voucherResolutionService.js';
import { trackPublicResolution } from '../analytics/publicAnalyticsEvents.js';
import { logger } from '../../utils/logger.js';
import {
  recordSourceFailure,
  recordSourceSuccess,
  isSourceAvailable,
  getAllSourceHealth,
} from '../resilience/sourceHealthTracker.js';
import type { ResolvedVoucher, VoucherCandidate } from '../../voucherEngine/types.js';

/**
 * Bridge adapter that maps the voucher engine's internal types to the
 * InternalVoucher format expected by serializePublicVoucherResolveResponse.
 */
function adaptEngineResult(result: {
  hasMatch: boolean;
  bestVoucher: ResolvedVoucher | null;
  candidates: VoucherCandidate[];
  explanation: { summary?: string; tips?: string[] };
  processingTimeMs: number;
  resolvedAt?: Date;
}) {
  return {
    success: result.hasMatch,
    bestMatch: result.bestVoucher
      ? {
          id: result.bestVoucher.id,
          code: result.bestVoucher.code ?? '',
          title: result.bestVoucher.title,
          discountType: result.bestVoucher.discountType ?? 'percentage',
          discountValue: result.bestVoucher.discountValue ?? 0,
          minSpend: result.bestVoucher.minimumSpend,
          maxDiscount: result.bestVoucher.maxDiscountValue,
          endDate: result.bestVoucher.expiresAt ?? new Date(),
          scope: result.bestVoucher.scope,
          applicableCategoryIds: [] as string[],
          applicableShopIds: [] as string[],
        }
      : undefined,
    candidates: result.candidates.map((c, i) => ({
      voucher: {
        id: c.voucher.id,
        code: c.voucher.voucherCode ?? '',
        title: c.voucher.voucherTitle,
        discountType: c.voucher.discountType ?? 'percentage',
        discountValue: c.voucher.discountValue ?? 0,
        minSpend: c.voucher.minimumSpend,
        maxDiscount: c.voucher.maxDiscountValue,
        endDate: c.voucher.endsAt ?? new Date(),
        scope: c.voucher.appliesToScope,
        applicableCategoryIds: c.voucher.categoryId ? [c.voucher.categoryId] : [],
        applicableShopIds: c.voucher.shopId ? [c.voucher.shopId] : [],
      },
      rank: i + 1,
    })),
    explanation: result.explanation.summary,
    processingTimeMs: result.processingTimeMs,
  };
}
import {
  beginPhase,
  logPipelineCompletion,
  logPipelineError,
  PipelinePhase,
} from '../instrumentation/resolvePipelineLogger.js';

export interface ResolveVoucherOptions {
  /** Skip cache lookup */
  skipCache?: boolean;
  /** Skip rate limiting */
  skipRateLimit?: boolean;
  /** Custom client info */
  clientInfo?: {
    ip?: string;
    userAgent?: string;
    platform?: 'web' | 'mobile' | 'api';
  };
  /** Request timeout override */
  timeoutMs?: number;
  /** Enable debug mode (includes pipeline phases in response) */
  debug?: boolean;
}

/**
 * Main resolution function for public API.
 * All phases are instrumented with structured logging.
 */
export async function resolveVoucherForPublicInput(
  request: PublicVoucherResolveRequest,
  options?: ResolveVoucherOptions
): Promise<PublicVoucherResolveResponse> {
  const startTime = Date.now();
  const requestId = request.requestId || uuidv4();
  const phases: Array<{ phase: PipelinePhase; durationMs?: number; error?: string }> = [];

  function trackPhase(phase: PipelinePhase, fn: () => Promise<void>): Promise<void> {
    const end = beginPhase(requestId, phase, { requestId });
    return fn().then(
      () => { end(true); phases.push({ phase, durationMs: Date.now() - startTime }); },
      (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        end(false, msg);
        phases.push({ phase, durationMs: Date.now() - startTime, error: msg });
      }
    );
  }

  let normalizedInput = '';
  let cacheKey = '';
  let result: PublicVoucherResolveResponse;

  try {
    // ── 1. Validate input ──────────────────────────────────────────────────
    const endValidate = beginPhase(requestId, 'validate_input', { requestId });
    const validation = validatePublicShopeeLinkInput(request.input);
    if (!validation.valid) {
      endValidate(false, 'validation_failed');
      logger.warn({ requestId, errors: validation.errors }, 'Invalid input');
      return buildErrorResponse(requestId, 'invalid_input', validation.errors.map((e) => e.message).join('; '));
    }
    endValidate(true);

    // ── 2. Check rate limit ───────────────────────────────────────────────
    const endRateLimit = beginPhase(requestId, 'check_rate_limit', { requestId });
    if (!options?.skipRateLimit) {
      const rateLimitDecision = await evaluatePublicRateLimit({
        ip: options?.clientInfo?.ip,
        requestId,
      });
      if (!rateLimitDecision.allowed) {
        endRateLimit(false, 'rate_limited');
        logger.warn({ requestId }, 'Rate limited');
        return buildRateLimitResponse(requestId, rateLimitDecision);
      }
    }
    endRateLimit(true);

    // ── 3. Normalize input ────────────────────────────────────────────────
    const endNormalize = beginPhase(requestId, 'normalize_input', { requestId });
    normalizedInput = normalizePublicInput(validation.sanitizedInput);
    cacheKey = buildPublicResolutionCacheKey(normalizedInput);
    endNormalize(true);

    // ── 4. Request-level dedupe ───────────────────────────────────────────
    const endDedupe = beginPhase(requestId, 'cache_lookup', { requestId, cacheKey });
    const dedupe = tryAcquireInflightRequest(normalizedInput, requestId);
    if (dedupe.alreadyInFlight) {
      endDedupe(true);
      logger.info({ requestId, existingRequestId: dedupe.existingRequestId }, 'Request deduplicated');
      releaseInflightRequest(normalizedInput);
      return buildDeduplicatedResponse(requestId);
    }

    // ── 5. Cache lookup (fast path) ───────────────────────────────────────
    if (!options?.skipCache) {
      const cachedResponse = getPublicResolutionCache(normalizedInput);
      if (cachedResponse) {
        endDedupe(true);
        logger.debug({ requestId, cacheKey }, 'Cache hit');
        releaseInflightRequest(normalizedInput);
        trackPublicResolution({ requestId, status: cachedResponse.status, latencyMs: Date.now() - startTime, servedFromCache: true });
        if (options?.debug) addDebugToResponse(cachedResponse, phases);
        return cachedResponse;
      }
    }
    endDedupe(true);

    // ── 6. Source health check ────────────────────────────────────────────
    const endSourceHealth = beginPhase(requestId, 'source_health_check', { requestId });
    const sourceHealthStates = Object.fromEntries(getAllSourceHealth().map((s) => [s.sourceId, s.state]));
    endSourceHealth(true);

    // ── 7. Primary resolution with health tracking ───────────────────────
    const endResolve = beginPhase(requestId, 'resolve_primary', { requestId });
    result = await resolveVoucherWithHealthTracking(normalizedInput, request, options);
    endResolve(result.status === 'error', result.status === 'error' ? 'resolve_failed' : undefined);

    // ── 8. Supabase-only fallback if all sources are down ─────────────────
    if (result.status === 'error') {
      const supabaseAvailable = isSourceAvailable('supabase');
      const engineAvailable = isSourceAvailable('voucher_engine');
      if (!supabaseAvailable && !engineAvailable) {
        recordSourceFailure('voucher_engine', 'ALL_SOURCES_UNAVAILABLE');
        logger.warn({ requestId }, 'All sources unavailable — returning graceful no_match');
        result = buildGracefulNoMatchResponse(requestId, [
          { code: ERROR_CODES.SOURCE_UNHEALTHY, message: 'Tất cả nguồn dữ liệu tạm thời không khả dụng.', severity: 'warning' },
        ]);
      }
    }

    // ── 9. Cache set ───────────────────────────────────────────────────────
    const endCacheSet = beginPhase(requestId, 'cache_set', { requestId, cacheKey });
    if (result.status === 'success' || result.status === 'no_match') {
      const ttl = result.status === 'success' ? 300 : 600;
      setPublicResolutionCache(normalizedInput, result, ttl);
    }
    endCacheSet(true);

    // ── 10. Release dedupe slot ───────────────────────────────────────────
    releaseInflightRequest(normalizedInput);

    // ── 11. Track analytics ────────────────────────────────────────────────
    trackPublicResolution({ requestId, status: result.status, latencyMs: Date.now() - startTime, servedFromCache: false });

    // ── 12. Add debug info if enabled ─────────────────────────────────────
    if (options?.debug) addDebugToResponse(result, phases);

    const totalLatencyMs = Date.now() - startTime;
    logPipelineCompletion(requestId, {
      status: result.status,
      totalLatencyMs,
      servedFromCache: false,
      cacheHit: false,
      candidateCount: result.candidates.length,
      bestMatchId: result.bestMatch?.voucherId,
      phases: phases.map((p) => ({ ...p, requestId })),
      warnings: result.warnings.map((w) => w.code),
      sourceHealthStates,
    });

    return result;
  } catch (error) {
    const totalLatencyMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ requestId, error }, 'Resolution failed');
    releaseInflightRequest(normalizedInput);
    trackPublicResolution({ requestId, status: 'error', latencyMs: totalLatencyMs, servedFromCache: false, error: msg });
    logPipelineError(requestId, error, 'resolve_primary', { requestId });

    return buildErrorResponse(requestId, 'error', msg);
  }
}

// =============================================================================
// Internal resolution with health tracking
// =============================================================================

/**
 * Resolve voucher with source health tracking.
 * Records success/failure per source for circuit breaker.
 */
async function resolveVoucherWithHealthTracking(
  normalizedInput: string,
  request: PublicVoucherResolveRequest,
  options?: ResolveVoucherOptions
): Promise<PublicVoucherResolveResponse> {
  const requestId = request.requestId || uuidv4();
  const startTime = Date.now();

  const timeoutMs = options?.timeoutMs ?? PERFORMANCE.MAX_ACCEPTABLE_LATENCY_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const engineResult = await resolveBestVoucherForShopeeUrl({
        url: normalizedInput,
        maxCandidates: request.limit ?? PUBLIC_API.DEFAULT_CANDIDATE_LIMIT,
      });

      clearTimeout(timer);

      // Record source success
      recordSourceSuccess('voucher_engine');
      recordSourceSuccess('supabase');

      // Compute confidence score
      const confidenceScore = computeConfidenceScore(engineResult);

      // Determine data freshness
      const dataFreshness = inferDataFreshness(engineResult);

      const response = serializePublicVoucherResolveResponse(
        {
          ...adaptEngineResult({
            hasMatch: engineResult.hasMatch,
            bestVoucher: engineResult.bestVoucher,
            candidates: engineResult.candidates,
            explanation: engineResult.explanation,
            processingTimeMs: Date.now() - startTime,
          }),
        },
        requestId,
        false
      );

      // Enrich with new fields
      response.confidenceScore = confidenceScore;
      response.matchedSource = 'voucher_engine';
      response.dataFreshness = dataFreshness;

      if (response.status === 'no_match' && !response.explanation) {
        response.explanation = buildNoMatchExplanation();
      }

      return response;
    } catch (err) {
      lastError = err;
      const isAbort = err instanceof DOMException && err.name === 'AbortException';
      const isFetchError = err instanceof TypeError && err.message.toLowerCase().includes('fetch');

      if (isAbort) {
        recordSourceFailure('voucher_engine', 'TIMEOUT');
        logger.warn({ requestId, normalizedInput }, 'Resolution timeout');
        break; // don't retry timeouts
      } else if (isFetchError) {
        recordSourceFailure('voucher_engine', 'CONNECTION_REFUSED');
        logger.warn({ requestId, normalizedInput }, 'Connection refused');
        break; // don't retry connection errors
      } else {
        recordSourceFailure('voucher_engine', 'DOWNSTREAM_BAD_RESPONSE');
        // On unexpected errors, retry once
        if (attempt === 0) {
          logger.warn({ requestId, normalizedInput, error: err }, 'Resolution failed, retrying once');
          continue;
        }
        break;
      }
    }
  }

  // All retries exhausted — throw so caller can handle
  throw lastError ?? new Error('Resolution failed after retries');
}

// =============================================================================
// Confidence & freshness helpers
// =============================================================================

function computeConfidenceScore(result: { success: boolean; bestMatch?: unknown; candidates?: unknown[] }): number {
  if (!result.success) return 0;
  if (!result.bestMatch) return 0.3; // no best match but candidates exist
  const candidates = result.candidates ?? [];
  if (candidates.length === 0) return 0.2;
  if (candidates.length >= 3) return 0.9;
  if (candidates.length >= 1) return 0.75;
  return 0.6;
}

function inferDataFreshness(result: { resolvedAt?: Date }): 'live' | 'recent' | 'stale' | 'unknown' {
  if (!result.resolvedAt) return 'unknown';
  const fetchedAt = result.resolvedAt.getTime();
  const ageMs = Date.now() - fetchedAt;
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours < 1) return 'live';
  if (ageHours < 24) return 'recent';
  return 'stale';
}

// =============================================================================
// Response builders
// =============================================================================

function buildDeduplicatedResponse(requestId: string): PublicVoucherResolveResponse {
  return {
    requestId,
    status: 'error',
    bestMatch: null,
    candidates: [],
    performance: {
      totalLatencyMs: 0,
      servedFromCache: false,
      resolvedAt: new Date().toISOString(),
    },
    explanation: {
      summary: 'Yêu cầu đang được xử lý.',
      tips: ['Vui lòng chờ một chút rồi thử lại.'],
    },
    warnings: [{ code: ERROR_CODES.REQUEST_DEDUPED, message: 'Request deduplicated — already in flight.', severity: 'info' }],
    confidenceScore: 0,
    dataFreshness: 'unknown',
  };
}

function buildGracefulNoMatchResponse(
  requestId: string,
  warnings: PublicApiWarning[]
): PublicVoucherResolveResponse {
  return {
    requestId,
    status: 'no_match',
    bestMatch: null,
    candidates: [],
    performance: {
      totalLatencyMs: 0,
      servedFromCache: false,
      resolvedAt: new Date().toISOString(),
    },
    explanation: {
      summary: 'Không tìm thấy voucher phù hợp cho sản phẩm này.',
      tips: [
        'Thử sản phẩm khác.',
        'Kiểm tra lại link sản phẩm.',
        'Dịch vụ có thể tạm thời gián đoạn. Vui lòng thử lại sau vài phút.',
      ],
    },
    warnings,
    confidenceScore: 0,
    dataFreshness: 'unknown',
  };
}

function buildErrorResponse(
  requestId: string,
  status: PublicVoucherResolveResponse['status'],
  message: string
): PublicVoucherResolveResponse {
  return {
    requestId,
    status,
    bestMatch: null,
    candidates: [],
    performance: {
      totalLatencyMs: 0,
      servedFromCache: false,
      resolvedAt: new Date().toISOString(),
    },
    explanation: status === 'no_match' ? buildNoMatchExplanation() : null,
    warnings: [{ code: ERROR_CODES.INTERNAL_ERROR, message, severity: 'warning' }],
    confidenceScore: 0,
    dataFreshness: 'unknown',
  };
}

function buildRateLimitResponse(
  requestId: string,
  rateLimit: {
    allowed: boolean;
    status: string;
    remaining: number;
    resetAt: string;
    retryAfterSeconds?: number;
  }
): PublicVoucherResolveResponse {
  return {
    requestId,
    status: 'rate_limited',
    bestMatch: null,
    candidates: [],
    performance: {
      totalLatencyMs: 0,
      servedFromCache: false,
      resolvedAt: new Date().toISOString(),
    },
    explanation: {
      summary: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
      tips: ['Chờ một chút rồi thử lại.'],
    },
    warnings: [
      {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: `Thử lại sau ${rateLimit.retryAfterSeconds || 60} giây`,
        severity: 'warning',
      },
    ],
    confidenceScore: 0,
    dataFreshness: 'unknown',
  };
}

function addDebugToResponse(
  response: PublicVoucherResolveResponse,
  phases: Array<{ phase: PipelinePhase; durationMs?: number; error?: string }>
): void {
  const sourceHealthStates = Object.fromEntries(getAllSourceHealth().map((s) => [s.sourceId, s.state]));
  response.debug = {
    phases: phases.map((p) => ({ phase: p.phase, durationMs: p.durationMs ?? 0, error: p.error })),
    sourceHealthStates,
  };
}

// =============================================================================
// Fast path (cache only)
// =============================================================================

export async function resolveVoucherFastPath(
  input: string,
  options?: ResolveVoucherOptions
): Promise<PublicVoucherResolveResponse | null> {
  const requestId = uuidv4();
  const validation = validatePublicShopeeLinkInput(input);
  if (!validation.valid) return null;
  const normalizedInput = normalizePublicInput(validation.sanitizedInput);
  const cachedResponse = getPublicResolutionCache(normalizedInput);
  if (cachedResponse) {
    logger.debug({ requestId }, 'Fast path cache hit');
    return cachedResponse;
  }
  return null;
}

// =============================================================================
// Fallback path (voucher engine, no cache)
// =============================================================================

export async function resolveVoucherFallbackPath(
  input: string,
  request: PublicVoucherResolveRequest,
  options?: ResolveVoucherOptions
): Promise<PublicVoucherResolveResponse> {
  const requestId = request.requestId || uuidv4();
  const startTime = Date.now();

  try {
    const engineResult = await resolveBestVoucherForShopeeUrl({
      url: input,
      maxCandidates: request.limit || PUBLIC_API.DEFAULT_CANDIDATE_LIMIT,
    });

    const response = serializePublicVoucherResolveResponse(
      {
        ...adaptEngineResult({
          hasMatch: engineResult.hasMatch,
          bestVoucher: engineResult.bestVoucher,
          candidates: engineResult.candidates,
          explanation: engineResult.explanation,
          processingTimeMs: Date.now() - startTime,
        }),
      },
      requestId,
      false
    );

    if (response.status === 'no_match' && !response.explanation) {
      response.explanation = buildNoMatchExplanation();
    }

    return response;
  } catch (error) {
    logger.error({ requestId, input, error }, 'Fallback resolution failed');
    throw error;
  }
}
