// =============================================================================
// Public Caching Strategy
// Caching strategy for public-facing responses
// =============================================================================

import { CACHE_CONFIG } from '../../publicApi/constants';

/**
 * Build caching plan for a response
 */
export function buildPublicCachingPlan(isCacheHit: boolean): {
  shouldCache: boolean;
  cacheDuration: number;
  cacheControl: string;
} {
  if (isCacheHit) {
    // Short cache for cached responses
    return {
      shouldCache: false, // Already cached client-side
      cacheDuration: 0,
      cacheControl: 'no-cache',
    };
  }

  // Cache new responses
  return {
    shouldCache: true,
    cacheDuration: CACHE_CONFIG.DEFAULT_TTL_SECONDS,
    cacheControl: `public, max-age=${CACHE_CONFIG.DEFAULT_TTL_SECONDS}, s-maxage=${CACHE_CONFIG.DEFAULT_TTL_SECONDS}`,
  };
}

/**
 * Resolve caching headers for response
 */
export function resolvePublicResponseCachingHeaders(isCacheHit: boolean): Record<string, string> {
  const plan = buildPublicCachingPlan(isCacheHit);

  return {
    'Cache-Control': plan.cacheControl,
    'X-Cache-Status': isCacheHit ? 'HIT' : 'MISS',
  };
}

/**
 * Check if request is eligible for fast path
 */
export function evaluateFastPathEligibility(
  inputLength: number,
  cacheAvailable: boolean
): {
  eligible: boolean;
  reason?: string;
} {
  // Must have valid input
  if (inputLength < 5) {
    return { eligible: false, reason: 'Input too short' };
  }

  // If cache available, fast path eligible
  if (cacheAvailable) {
    return { eligible: true };
  }

  return { eligible: true, reason: 'Cache not available, using standard path' };
}
