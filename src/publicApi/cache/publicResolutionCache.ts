// =============================================================================
// Public Resolution Cache
// Production-grade in-memory cache for ultra-fast voucher resolution
// =============================================================================

import { PublicVoucherResolveResponse } from '../types.js';
import { CACHE_CONFIG, FAST_PATH } from '../constants.js';
import { logger } from '../../utils/logger.js';

export interface CacheEntry {
  /** Cached response */
  response: PublicVoucherResolveResponse;
  /** When this entry was cached */
  cachedAt: Date;
  /** Cache TTL in seconds */
  ttlSeconds: number;
  /** Number of hits */
  hits: number;
}

// In-memory cache (in production, use Redis)
const cache = new Map<string, CacheEntry>();

/**
 * Build a stable cache key from request input
 */
export function buildPublicResolutionCacheKey(input: string): string {
  // Normalize input for cache key
  const normalized = input.toLowerCase().trim();
  // Remove trailing slashes and fragments
  const cleaned = normalized.replace(/[\/]+$/, '').split('#')[0];
  // Create hash-like key
  const hash = Buffer.from(cleaned).toString('base64').replace(/[/+=]/g, '').substring(0, 32);

  return `${CACHE_CONFIG.KEY_PREFIX}${hash}`;
}

/**
 * Get cached resolution if available and valid
 */
export function getPublicResolutionCache(
  input: string
): PublicVoucherResolveResponse | null {
  const cacheKey = buildPublicResolutionCacheKey(input);
  const entry = cache.get(cacheKey);

  if (!entry) {
    logger.debug({ cacheKey }, 'Cache miss');
    return null;
  }

  // Check if cache entry is still valid
  const now = Date.now();
  const cachedTime = entry.cachedAt.getTime();
  const ttlMs = entry.ttlSeconds * 1000;

  if (now - cachedTime > ttlMs) {
    // Cache entry expired
    cache.delete(cacheKey);
    logger.debug({ cacheKey, age: now - cachedTime }, 'Cache expired');
    return null;
  }

  // Update hit count and return cached response
  entry.hits++;

  // Add cache metadata to response
  const response = {
    ...entry.response,
    performance: {
      ...entry.response.performance,
      servedFromCache: true,
      cacheTtlSeconds: Math.max(0, Math.floor((ttlMs - (now - cachedTime)) / 1000)),
    },
    cache: {
      hit: true,
      cacheKey,
      ttlSeconds: Math.max(0, Math.floor((ttlMs - (now - cachedTime)) / 1000)),
      cachedAt: entry.cachedAt.toISOString(),
    },
  };

  logger.debug({ cacheKey, hits: entry.hits }, 'Cache hit');
  return response;
}

/**
 * Set cache entry for a resolution response
 */
export function setPublicResolutionCache(
  input: string,
  response: PublicVoucherResolveResponse,
  ttlSeconds: number = CACHE_CONFIG.DEFAULT_TTL_SECONDS
): void {
  const cacheKey = buildPublicResolutionCacheKey(input);

  // Enforce max cache size
  if (cache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
    // Remove oldest entry
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
      logger.warn({ evictedKey: oldestKey }, 'Cache size limit reached, evicted oldest entry');
    }
  }

  const entry: CacheEntry = {
    response,
    cachedAt: new Date(),
    ttlSeconds,
    hits: 0,
  };

  cache.set(cacheKey, entry);
  logger.debug({ cacheKey, ttlSeconds }, 'Cache set');
}

/**
 * Invalidate cache entries matching a pattern
 */
export function invalidatePublicResolutionCache(pattern?: string): number {
  if (!pattern) {
    // Clear all
    const size = cache.size;
    cache.clear();
    logger.info({ cleared: size }, 'All public resolution cache cleared');
    return size;
  }

  // Clear matching entries
  let count = 0;
  for (const key of cache.keys()) {
    if (key.includes(pattern.replace(/\*/g, ''))) {
      cache.delete(key);
      count++;
    }
  }

  logger.info({ pattern, count }, 'Public resolution cache invalidated');
  return count;
}

/**
 * Get cache statistics
 */
export function getPublicResolutionCacheStats(): {
  size: number;
  hitRate: number;
  totalHits: number;
  oldestEntry: string | null;
  newestEntry: string | null;
} {
  let totalHits = 0;
  let oldestTime = Date.now();
  let newestTime = 0;
  let oldestKey: string | null = null;
  let newestKey: string | null = null;

  for (const [key, entry] of cache) {
    totalHits += entry.hits;
    if (entry.cachedAt.getTime() < oldestTime) {
      oldestTime = entry.cachedAt.getTime();
      oldestKey = key;
    }
    if (entry.cachedAt.getTime() > newestTime) {
      newestTime = entry.cachedAt.getTime();
      newestKey = key;
    }
  }

  return {
    size: cache.size,
    hitRate: totalHits > 0 ? totalHits / (cache.size || 1) : 0,
    totalHits,
    oldestEntry: oldestKey,
    newestEntry: newestKey,
  };
}

/**
 * Check if fast path is eligible for a request
 */
export function evaluateFastPathEligibility(input: string): {
  eligible: boolean;
  reason?: string;
  estimatedLatencyMs: number;
} {
  // Check if input is valid for fast path
  if (!input || input.length < PUBLIC_API.MIN_INPUT_LENGTH) {
    return {
      eligible: false,
      reason: 'Input too short',
      estimatedLatencyMs: FAST_PATH.LATENCY_BUDGET_MS,
    };
  }

  if (input.length > PUBLIC_API.MAX_INPUT_LENGTH) {
    return {
      eligible: false,
      reason: 'Input too long',
      estimatedLatencyMs: FAST_PATH.LATENCY_BUDGET_MS,
    };
  }

  // Check if there's a cache hit
  const cached = getPublicResolutionCache(input);
  if (cached) {
    return {
      eligible: true,
      estimatedLatencyMs: 10, // Very fast for cache hit
    };
  }

  return {
    eligible: true,
    estimatedLatencyMs: FAST_PATH.LATENCY_BUDGET_MS,
  };
}

// Import needed constants
import { PUBLIC_API } from '../constants.js';
