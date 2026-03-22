/**
 * Voucher Resolution Cache
 *
 * Handles caching of voucher resolution results.
 */

import {
  VoucherCacheEntry,
  VoucherResolutionResult,
  SupportedVoucherPlatform,
  ProductFingerprint,
} from '../types';
import {
  DEFAULT_CACHE_TTL_SECONDS,
  MAX_CACHE_TTL_SECONDS,
  CACHE_KEY_PREFIX,
} from '../constants';

/**
 * Cache options
 */
export interface CacheOptions {
  ttlSeconds?: number;
  forceRefresh?: boolean;
}

/**
 * In-memory cache store (production would use Redis)
 */
const memoryCache = new Map<string, VoucherCacheEntry>();

/**
 * Build cache key from input
 */
export function buildVoucherResolutionCacheKey(
  url: string,
  platform: SupportedVoucherPlatform,
  options?: { includeOptions?: boolean }
): string {
  // Create deterministic key from URL
  const urlHash = hashString(url.toLowerCase().trim());
  return `${CACHE_KEY_PREFIX}:${platform}:${urlHash}`;
}

/**
 * Get cached resolution result
 */
export function getCachedVoucherResolution(
  cacheKey: string,
  options?: CacheOptions
): VoucherResolutionResult | null {
  const entry = memoryCache.get(cacheKey);

  if (!entry) {
    return null;
  }

  // Check if expired
  if (entry.expiresAt < new Date()) {
    // Clean up expired entry
    memoryCache.delete(cacheKey);
    return null;
  }

  // Update hit stats
  entry.hitCount++;
  entry.lastHitAt = new Date();

  return entry.result;
}

/**
 * Set cached resolution result
 */
export function setCachedVoucherResolution(
  cacheKey: string,
  result: VoucherResolutionResult,
  options?: CacheOptions
): void {
  const ttl = Math.min(
    options?.ttlSeconds ?? DEFAULT_CACHE_TTL_SECONDS,
    MAX_CACHE_TTL_SECONDS
  );

  const expiresAt = new Date(Date.now() + ttl * 1000);

  const entry: VoucherCacheEntry = {
    cacheKey,
    platform: result.platform,
    normalizedUrl: result.productContext.normalizedUrl,
    productFingerprint: {
      platform: result.platform,
      urlHash: hashString(result.productContext.normalizedUrl),
    },
    result,
    expiresAt,
    createdAt: new Date(),
    hitCount: 1,
    lastHitAt: new Date(),
  };

  memoryCache.set(cacheKey, entry);
}

/**
 * Invalidate cache entry
 */
export function invalidateVoucherResolutionCache(
  cacheKey: string,
  options?: CacheOptions
): boolean {
  return memoryCache.delete(cacheKey);
}

/**
 * Invalidate all cache entries for a platform
 */
export function invalidatePlatformCache(
  platform: SupportedVoucherPlatform,
  options?: CacheOptions
): number {
  let count = 0;

  for (const [key, entry] of memoryCache.entries()) {
    if (entry.platform === platform) {
      memoryCache.delete(key);
      count++;
    }
  }

  return count;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalEntries: number;
  expiredEntries: number;
  totalHits: number;
  avgHitCount: number;
  platformBreakdown: Record<string, number>;
} {
  const now = new Date();
  let totalHits = 0;
  let expiredCount = 0;
  const platformCounts: Record<string, number> = {};

  for (const entry of memoryCache.values()) {
    if (entry.expiresAt < now) {
      expiredCount++;
    }
    totalHits += entry.hitCount;
    platformCounts[entry.platform] = (platformCounts[entry.platform] || 0) + 1;
  }

  const totalEntries = memoryCache.size;
  const avgHitCount = totalEntries > 0 ? totalHits / totalEntries : 0;

  return {
    totalEntries,
    expiredEntries: expiredCount,
    totalHits,
    avgHitCount,
    platformBreakdown: platformCounts,
  };
}

/**
 * Clean up expired cache entries
 */
export function cleanupExpiredCache(): number {
  const now = new Date();
  let cleaned = 0;

  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt < now) {
      memoryCache.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Clear all cache
 */
export function clearVoucherCache(): number {
  const count = memoryCache.size;
  memoryCache.clear();
  return count;
}

/**
 * Check if cache is enabled
 */
export function isCacheEnabled(): boolean {
  return true;
}

/**
 * Get cache entry metadata
 */
export function getCacheEntryMetadata(
  cacheKey: string
): {
  exists: boolean;
  expiresAt: Date | null;
  hitCount: number;
  lastHitAt: Date | null;
} | null {
  const entry = memoryCache.get(cacheKey);

  if (!entry) {
    return null;
  }

  return {
    exists: true,
    expiresAt: entry.expiresAt,
    hitCount: entry.hitCount,
    lastHitAt: entry.lastHitAt,
  };
}

// =============================================================================
// Private Helper Functions
// =============================================================================

/**
 * Simple hash function for cache keys
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Preload cache from database (for production)
 */
export async function preloadCacheFromDatabase(
  platform: SupportedVoucherPlatform
): Promise<number> {
  // Placeholder: In production, this would load recent resolutions from DB
  return 0;
}

/**
 * Persist cache to database (for production)
 */
export async function persistCacheToDatabase(): Promise<number> {
  // Placeholder: In production, this would persist cache entries to DB
  return 0;
}
