// =============================================================================
// Public Resolution Events
// Production-grade operational events for public resolution
// =============================================================================

import { logger } from '../../utils/logger.js';

/**
 * Record public API request received
 */
export function recordPublicApiRequestReceived(inputLength: number): void {
  logger.info({ inputLength, event: 'public.api.request_received' }, 'Public API request received');
}

/**
 * Record public resolution started
 */
export function recordPublicResolutionStarted(requestId: string, input: string): void {
  logger.info({ requestId, inputLength: input.length, event: 'public.resolution.started' }, 'Public resolution started');
}

/**
 * Record public resolution completed
 */
export function recordPublicResolutionCompleted(
  requestId: string,
  status: string,
  latencyMs: number,
  candidatesCount: number
): void {
  logger.info(
    { requestId, status, latencyMs, candidatesCount, event: 'public.resolution.completed' },
    'Public resolution completed'
  );
}

/**
 * Record public resolution failed
 */
export function recordPublicResolutionFailed(requestId: string, error: string): void {
  logger.error({ requestId, error, event: 'public.resolution.failed' }, 'Public resolution failed');
}

/**
 * Record public cache hit
 */
export function recordPublicCacheHit(requestId: string, cacheKey: string): void {
  logger.debug({ requestId, cacheKey, event: 'public.cache.hit' }, 'Public cache hit');
}

/**
 * Record public cache miss
 */
export function recordPublicCacheMiss(requestId: string, cacheKey: string): void {
  logger.debug({ requestId, cacheKey, event: 'public.cache.miss' }, 'Public cache miss');
}

/**
 * Record public rate limit
 */
export function recordPublicRateLimit(ip: string, requestId: string): void {
  logger.warn({ ip, requestId, event: 'public.rate_limit' }, 'Public rate limit applied');
}
