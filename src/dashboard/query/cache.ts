/**
 * Dashboard Cache
 *
 * Production-grade caching layer for dashboard read queries.
 * Optional - can be disabled for debugging or when not needed.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import type { DashboardCacheEntry, DashboardCacheOptions } from '../types.js';
import {
  DEFAULT_CACHE_TTL_SECONDS,
  CACHE_TTL_SECONDS,
  MAX_CACHE_AGE_SECONDS,
} from '../constants.js';

const logger = createLogger({ subsystem: 'dashboard_cache' });

/** In-memory cache storage */
interface CacheStorage {
  entries: Map<string, DashboardCacheEntry<unknown>>;
  tags: Map<string, Set<string>>;
}

/** Global cache instance */
let globalCache: CacheStorage | null = null;

/** Cache configuration */
export interface DashboardCacheConfig {
  enabled: boolean;
  defaultTtl: number;
  maxEntries: number;
}

/** Default cache configuration */
const DEFAULT_CONFIG: DashboardCacheConfig = {
  enabled: process.env.DASHBOARD_CACHE_ENABLED !== 'false',
  defaultTtl: DEFAULT_CACHE_TTL_SECONDS,
  maxEntries: 1000,
};

/** Current configuration */
let currentConfig: DashboardCacheConfig = { ...DEFAULT_CONFIG };

/**
 * Initialize cache storage
 */
function getCacheStorage(): CacheStorage {
  if (!globalCache) {
    globalCache = {
      entries: new Map(),
      tags: new Map(),
    };
  }
  return globalCache;
}

/**
 * Configure cache
 */
export function configureDashboardCache(config: Partial<DashboardCacheConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  logger.info('Dashboard cache configured', { config: currentConfig });
}

/**
 * Get cache configuration
 */
export function getDashboardCacheConfig(): DashboardCacheConfig {
  return { ...currentConfig };
}

/**
 * Check if cache is enabled
 */
export function isDashboardCacheEnabled(): boolean {
  return currentConfig.enabled;
}

/**
 * Generate cache key from options
 */
export function generateCacheKey(
  prefix: string,
  params: Record<string, unknown>
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}:${JSON.stringify(params[k])}`)
    .join('|');

  return `${prefix}:${sorted}`;
}

/**
 * Get cached result
 */
export function getCachedDashboardResult<T>(
  key: string,
  options?: DashboardCacheOptions
): { hit: boolean; data?: T } {
  if (!isDashboardCacheEnabled()) {
    return { hit: false };
  }

  const storage = getCacheStorage();
  const entry = storage.entries.get(key) as DashboardCacheEntry<T> | undefined;

  if (!entry) {
    logger.debug('Cache miss', { key });
    return { hit: false };
  }

  const now = Date.now();
  const ttl = (options?.ttl ?? currentConfig.defaultTtl) * 1000;

  // Check if expired
  if (now > entry.expiresAt) {
    storage.entries.delete(key);
    logger.debug('Cache expired', { key });
    return { hit: false };
  }

  logger.debug('Cache hit', { key, age: now - entry.cachedAt });
  return { hit: true, data: entry.data };
}

/**
 * Set cached result
 */
export function setCachedDashboardResult<T>(
  key: string,
  data: T,
  options?: DashboardCacheOptions
): void {
  if (!isDashboardCacheEnabled()) {
    return;
  }

  const storage = getCacheStorage();
  const ttl = (options?.ttl ?? currentConfig.defaultTtl) * 1000;
  const now = Date.now();

  // Evict old entries if cache is full
  if (storage.entries.size >= currentConfig.maxEntries) {
    evictOldestEntries(storage, Math.floor(currentConfig.maxEntries * 0.1));
  }

  const entry: DashboardCacheEntry<T> = {
    data,
    expiresAt: now + ttl,
    cachedAt: now,
  };

  storage.entries.set(key, entry);

  // Handle tags if provided
  if (options?.key) {
    // Could implement tag-based invalidation here
  }

  logger.debug('Cache set', { key, ttl });
}

/**
 * Invalidate cache entry
 */
export function invalidateDashboardCache(
  patternOrKey: string,
  options?: { pattern?: boolean }
): number {
  const storage = getCacheStorage();
  let invalidated = 0;

  if (options?.pattern) {
    // Pattern-based invalidation
    const regex = new RegExp(patternOrKey);
    for (const key of storage.entries.keys()) {
      if (regex.test(key)) {
        storage.entries.delete(key);
        invalidated++;
      }
    }
  } else {
    // Exact key invalidation
    if (storage.entries.delete(patternOrKey)) {
      invalidated = 1;
    }
  }

  if (invalidated > 0) {
    logger.info('Cache invalidated', { patternOrKey, count: invalidated });
  }

  return invalidated;
}

/**
 * Invalidate cache by tags
 */
export function invalidateDashboardCacheByTags(tags: string[]): number {
  const storage = getCacheStorage();
  let invalidated = 0;

  for (const tag of tags) {
    const keys = storage.tags.get(tag);
    if (keys) {
      for (const key of keys) {
        if (storage.entries.delete(key)) {
          invalidated++;
        }
      }
      storage.tags.delete(tag);
    }
  }

  if (invalidated > 0) {
    logger.info('Cache invalidated by tags', { tags, count: invalidated });
  }

  return invalidated;
}

/**
 * Clear all dashboard cache
 */
export function clearDashboardCache(): void {
  const storage = getCacheStorage();
  const size = storage.entries.size;
  storage.entries.clear();
  storage.tags.clear();
  logger.info('Dashboard cache cleared', { entriesCleared: size });
}

/**
 * Get cache statistics
 */
export function getDashboardCacheStats(): {
  enabled: boolean;
  entries: number;
  maxEntries: number;
  hitRate: number;
  oldestEntry?: number;
  newestEntry?: number;
} {
  const storage = getCacheStorage();
  const now = Date.now();

  let hits = 0;
  let totalAge = 0;
  let oldest: number | undefined;
  let newest: number | undefined;

  for (const entry of storage.entries.values()) {
    const age = now - entry.cachedAt;
    totalAge += age;

    if (oldest === undefined || age > now - oldest) {
      oldest = entry.cachedAt;
    }
    if (newest === undefined || age < now - newest) {
      newest = entry.cachedAt;
    }
  }

  return {
    enabled: isDashboardCacheEnabled(),
    entries: storage.entries.size,
    maxEntries: currentConfig.maxEntries,
    hitRate: storage.entries.size > 0 ? 0 : 0, // Would need hit/miss tracking
    oldestEntry: oldest,
    newestEntry: newest,
  };
}

/**
 * Evict oldest entries from cache
 */
function evictOldestEntries(storage: CacheStorage, count: number): void {
  const entries = Array.from(storage.entries.entries());

  // Sort by cachedAt (oldest first)
  entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);

  // Remove oldest count entries
  const toRemove = entries.slice(0, count);
  for (const [key] of toRemove) {
    storage.entries.delete(key);
  }

  logger.debug('Evicted oldest cache entries', { count });
}

/**
 * Create cache key for specific query types
 */
export const CacheKeys = {
  overview: (timeRange?: string) => generateCacheKey('overview', { timeRange }),
  health: () => 'health:current',
  queueSummary: () => 'queue:summary',
  trends: (metric: string, timeRange: string, bucket: string) =>
    generateCacheKey('trends', { metric, timeRange, bucket }),
  activity: (timeRange: string, limit: number) =>
    generateCacheKey('activity', { timeRange, limit }),
  list: (resource: string, filters: Record<string, unknown>) =>
    generateCacheKey(`list:${resource}`, filters),
  detail: (resource: string, id: string) =>
    `detail:${resource}:${id}`,
};

/**
 * Get TTL for specific query types
 */
export function getCacheTTL(category: keyof typeof CACHE_TTL_SECONDS): number {
  return CACHE_TTL_SECONDS[category] ?? currentConfig.defaultTtl;
}

/**
 * Create cache wrapper for dashboard queries
 */
export function createDashboardCache() {
  return {
    get: getCachedDashboardResult,
    set: setCachedDashboardResult,
    invalidate: invalidateDashboardCache,
    invalidateByTags: invalidateDashboardCacheByTags,
    clear: clearDashboardCache,
    stats: getDashboardCacheStats,
    keys: CacheKeys,
    getTTL: getCacheTTL,
    isEnabled: isDashboardCacheEnabled,
  };
}

/**
 * Default cache instance
 */
export const dashboardCache = createDashboardCache();
