// =============================================================================
// Public Performance Policy
// Performance helpers for public-facing flow
// =============================================================================

import { PERFORMANCE } from '../../publicApi/constants';

/**
 * Performance budget for public pages
 */
export const publicPerformanceBudget = {
  /** Maximum FCP (First Contentful Paint) in ms */
  maxFCP: 1000,

  /** Maximum LCP (Largest Contentful Paint) in ms */
  maxLCP: 2000,

  /** Maximum TTI (Time to Interactive) in ms */
  maxTTI: 3000,

  /** Target API response time in ms */
  targetApiResponse: PERFORMANCE.FAST_PATH_TARGET_MS,

  /** Maximum API response time in ms */
  maxApiResponse: PERFORMANCE.MAX_ACCEPTABLE_LATENCY_MS,
};

/**
 * Get performance budget
 */
export function getPublicPerformanceBudget() {
  return publicPerformanceBudget;
}

/**
 * Evaluate if API latency is acceptable
 */
export function evaluatePublicResolutionLatency(latencyMs: number): {
  acceptable: boolean;
  category: 'fast' | 'acceptable' | 'slow';
} {
  if (latencyMs <= PERFORMANCE.FAST_PATH_TARGET_MS) {
    return { acceptable: true, category: 'fast' };
  }

  if (latencyMs <= PERFORMANCE.FALLBACK_TARGET_MS) {
    return { acceptable: true, category: 'acceptable' };
  }

  return { acceptable: false, category: 'slow' };
}

/**
 * Build performance hints for UI
 */
export function buildPerformanceHints(latencyMs: number): {
  showLoading: boolean;
  loadingMessage: string;
  showSkeleton: boolean;
} {
  const { category } = evaluatePublicResolutionLatency(latencyMs);

  switch (category) {
    case 'fast':
      return {
        showLoading: false,
        loadingMessage: '',
        showSkeleton: false,
      };
    case 'acceptable':
      return {
        showLoading: true,
        loadingMessage: 'Đang tìm mã...',
        showSkeleton: true,
      };
    case 'slow':
      return {
        showLoading: true,
        loadingMessage: 'Vui lòng chờ...',
        showSkeleton: true,
      };
  }
}
