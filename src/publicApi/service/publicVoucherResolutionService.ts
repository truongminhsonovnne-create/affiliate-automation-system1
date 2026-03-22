// =============================================================================
// Public Voucher Resolution Service
// Production-grade orchestrator for public voucher resolution
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  PublicVoucherResolveRequest,
  PublicVoucherResolveResponse,
} from '../types.js';
import { PUBLIC_API, PERFORMANCE } from '../constants.js';
import { validatePublicShopeeLinkInput, normalizePublicInput } from '../validation/publicInputValidation.js';
import { getPublicResolutionCache, setPublicResolutionCache, buildPublicResolutionCacheKey } from '../cache/publicResolutionCache.js';
import { evaluatePublicRateLimit } from '../rateLimit/publicRateLimitGuard.js';
import { serializePublicVoucherResolveResponse, buildNoMatchExplanation } from '../serialization/publicResponseSerializer.js';
import { resolveVoucherForProduct } from '../../voucherEngine/service/voucherResolutionService.js';
import { trackPublicResolution } from '../analytics/publicAnalyticsEvents.js';
import { logger } from '../../utils/logger.js';

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
}

/**
 * Main resolution function for public API
 */
export async function resolveVoucherForPublicInput(
  request: PublicVoucherResolveRequest,
  options?: ResolveVoucherOptions
): Promise<PublicVoucherResolveResponse> {
  const startTime = Date.now();
  const requestId = request.requestId || uuidv4();

  // 1. Validate input
  const validation = validatePublicShopeeLinkInput(request.input);
  if (!validation.valid) {
    logger.warn({ requestId, input: request.input, errors: validation.errors }, 'Invalid input');

    return buildErrorResponse(
      requestId,
      'invalid_input',
      validation.errors.map((e) => e.message).join('; ')
    );
  }

  // 2. Check rate limit (unless skipped)
  // NOTE: If called from the HTTP layer, publicRateLimitMiddleware already checked
  // this. Skipping here prevents a double-check. The middleware is the authoritative
  // layer; direct service calls (e.g. from CLI scripts) always go through this.
  if (!options?.skipRateLimit) {
    const rateLimitDecision = await evaluatePublicRateLimit({
      ip: options?.clientInfo?.ip,
      requestId,
    });

    if (!rateLimitDecision.allowed) {
      logger.warn({ requestId, rateLimit: rateLimitDecision }, 'Rate limited');

      return buildRateLimitResponse(requestId, rateLimitDecision);
    }
  }

  // 3. Normalize input
  const normalizedInput = normalizePublicInput(validation.sanitizedInput);

  // 4. Try fast path first (cache lookup)
  if (!options?.skipCache) {
    const cachedResponse = getPublicResolutionCache(normalizedInput);
    if (cachedResponse) {
      logger.debug({ requestId, cacheKey: buildPublicResolutionCacheKey(normalizedInput) }, 'Cache hit');

      // Track analytics
      trackPublicResolution({
        requestId,
        status: cachedResponse.status,
        latencyMs: Date.now() - startTime,
        servedFromCache: true,
      });

      return cachedResponse;
    }
  }

  // 5. Fallback to voucher engine
  try {
    const result = await resolveVoucherWithFallback(normalizedInput, request, options);

    // 6. Cache successful results
    if (result.status === 'success' || result.status === 'no_match') {
      setPublicResolutionCache(normalizedInput, result, PUBLIC_API.DEFAULT_CANDIDATE_LIMIT > 0 ? 300 : 600);
    }

    // Track analytics
    trackPublicResolution({
      requestId,
      status: result.status,
      latencyMs: Date.now() - startTime,
      servedFromCache: false,
    });

    return result;
  } catch (error) {
    logger.error({ requestId, error }, 'Resolution failed');

    // Track error
    trackPublicResolution({
      requestId,
      status: 'error',
      latencyMs: Date.now() - startTime,
      servedFromCache: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return buildErrorResponse(
      requestId,
      'error',
      error instanceof Error ? error.message : 'Resolution failed'
    );
  }
}

/**
 * Fast path resolution (cache only)
 */
export async function resolveVoucherFastPath(
  input: string,
  options?: ResolveVoucherOptions
): Promise<PublicVoucherResolveResponse | null> {
  const startTime = Date.now();
  const requestId = uuidv4();

  // Validate and normalize
  const validation = validatePublicShopeeLinkInput(input);
  if (!validation.valid) {
    return null;
  }

  const normalizedInput = normalizePublicInput(validation.sanitizedInput);

  // Try cache
  const cachedResponse = getPublicResolutionCache(normalizedInput);
  if (cachedResponse) {
    logger.debug({ requestId }, 'Fast path cache hit');
    return cachedResponse;
  }

  return null;
}

/**
 * Fallback path resolution (voucher engine)
 */
export async function resolveVoucherFallbackPath(
  input: string,
  request: PublicVoucherResolveRequest,
  options?: ResolveVoucherOptions
): Promise<PublicVoucherResolveResponse> {
  const requestId = request.requestId || uuidv4();
  const startTime = Date.now();

  try {
    // Call voucher engine
    const engineResult = await resolveVoucherForProduct({
      productUrl: input,
      limit: request.limit || PUBLIC_API.DEFAULT_CANDIDATE_LIMIT,
    });

    // Serialize result
    const response = serializePublicVoucherResolveResponse(
      {
        success: engineResult.success,
        bestMatch: engineResult.bestMatch,
        candidates: engineResult.candidates || [],
        explanation: engineResult.explanation,
        processingTimeMs: Date.now() - startTime,
      },
      requestId,
      false
    );

    // Add no-match explanation if needed
    if (response.status === 'no_match' && !response.explanation) {
      response.explanation = buildNoMatchExplanation();
    }

    return response;
  } catch (error) {
    logger.error({ requestId, input, error }, 'Fallback resolution failed');
    throw error;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function resolveVoucherWithFallback(
  normalizedInput: string,
  request: PublicVoucherResolveRequest,
  options?: ResolveVoucherOptions
): Promise<PublicVoucherResolveResponse> {
  const requestId = request.requestId || uuidv4();
  const startTime = Date.now();

  try {
    // Call voucher engine with timeout
    const timeoutMs = options?.timeoutMs || PERFORMANCE.MAX_ACCEPTABLE_LATENCY_MS;

    const engineResult = await Promise.race([
      resolveVoucherForProduct({
        productUrl: normalizedInput,
        limit: request.limit || PUBLIC_API.DEFAULT_CANDIDATE_LIMIT,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Resolution timeout')), timeoutMs)
      ),
    ]);

    // Serialize result
    const response = serializePublicVoucherResolveResponse(
      {
        success: engineResult.success,
        bestMatch: engineResult.bestMatch,
        candidates: engineResult.candidates || [],
        explanation: engineResult.explanation,
        processingTimeMs: Date.now() - startTime,
      },
      requestId,
      false
    );

    // Add no-match explanation if needed
    if (response.status === 'no_match' && !response.explanation) {
      response.explanation = buildNoMatchExplanation();
    }

    return response;
  } catch (error) {
    logger.error({ requestId, normalizedInput, error }, 'Voucher resolution failed');
    throw error;
  }
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
    warnings: [
      {
        code: 'ERROR',
        message,
        severity: 'warning',
      },
    ],
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
        code: 'RATE_LIMITED',
        message: `Thử lại sau ${rateLimit.retryAfterSeconds || 60} giây`,
        severity: 'warning',
      },
    ],
  };
}
