// =============================================================================
// Public Resolution Metrics
// Production-grade metrics for public voucher resolution
// =============================================================================

import { logger } from '../../utils/logger.js';

// Simple in-memory metrics collector
const metrics: Map<string, number> = new Map();

/**
 * Increment a metric counter
 */
export function incrementMetric(name: string, value: number = 1): void {
  const current = metrics.get(name) || 0;
  metrics.set(name, current + value);
}

/**
 * Set a metric gauge value
 */
export function setMetric(name: string, value: number): void {
  metrics.set(name, value);
}

/**
 * Get current metric value
 */
export function getMetric(name: string): number {
  return metrics.get(name) || 0;
}

// =============================================================================
// Request Metrics
// =============================================================================

export const publicRequestMetrics = {
  /** Record total requests */
  recordRequest(): void {
    incrementMetric('public.api.requests.total');
  },

  /** Record successful resolution */
  recordSuccess(): void {
    incrementMetric('public.api.requests.success');
  },

  /** Record no match */
  recordNoMatch(): void {
    incrementMetric('public.api.requests.no_match');
  },

  /** Record failure */
  recordFailure(): void {
    incrementMetric('public.api.requests.failure');
  },

  /** Record invalid input */
  recordInvalidInput(): void {
    incrementMetric('public.api.requests.invalid_input');
  },

  /** Record rate limited */
  recordRateLimited(): void {
    incrementMetric('public.api.requests.rate_limited');
  },
};

// =============================================================================
// Cache Metrics
// =============================================================================

export const publicCacheMetrics = {
  /** Record cache hit */
  recordCacheHit(): void {
    incrementMetric('public.cache.hits');
    incrementMetric('public.cache.hit_ratio.denominator');
  },

  /** Record cache miss */
  recordCacheMiss(): void {
    incrementMetric('public.cache.misses');
    incrementMetric('public.cache.hit_ratio.denominator');
  },

  /** Get cache hit ratio */
  getCacheHitRatio(): number {
    const hits = getMetric('public.cache.hits');
    const misses = getMetric('public.cache.misses');
    const total = hits + misses;
    return total > 0 ? hits / total : 0;
  },
};

// =============================================================================
// Latency Metrics
// =============================================================================

export const publicLatencyMetrics = {
  /** Record latency in a bucket */
  recordLatency(latencyMs: number): void {
    if (latencyMs < 50) {
      incrementMetric('public.latency.bucket.0_50');
    } else if (latencyMs < 100) {
      incrementMetric('public.latency.bucket.50_100');
    } else if (latencyMs < 200) {
      incrementMetric('public.latency.bucket.100_200');
    } else if (latencyMs < 500) {
      incrementMetric('public.latency.bucket.200_500');
    } else if (latencyMs < 1000) {
      incrementMetric('public.latency.bucket.500_1000');
    } else {
      incrementMetric('public.latency.bucket.1000_plus');
    }
  },
};

// =============================================================================
// Conversion Metrics
// =============================================================================

export const publicConversionMetrics = {
  /** Record copy action */
  recordCopy(): void {
    incrementMetric('public.conversion.copy');
  },

  /** Record open shopee action */
  recordOpenShopee(): void {
    incrementMetric('public.conversion.open_shopee');
  },

  /** Record click through rate */
  getClickThroughRate(): number {
    const copies = getMetric('public.conversion.copy');
    const opens = getMetric('public.conversion.open_shopee');
    const total = copies + opens;
    return total > 0 ? opens / total : 0;
  },
};

/**
 * Get all public API metrics
 */
export function getPublicApiMetrics(): Record<string, number> {
  return {
    ...Object.fromEntries(metrics),
    cacheHitRatio: publicCacheMetrics.getCacheHitRatio(),
    clickThroughRate: publicConversionMetrics.getClickThroughRate(),
  };
}
