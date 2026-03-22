/**
 * Growth Surface Cache
 *
 * Caching layer for growth pages
 * - Fast reads for shop/category pages
 * - Stale policy
 * - Cache key building
 */

import type { GrowthSurfaceType } from '../types/index.js';
import { CACHE_TTL, STALE_THRESHOLDS } from '../constants/index.js';

// ============================================================================
// In-Memory Cache (simplified - replace with Redis in production)
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  staleAfter: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

// ============================================================================
// Cache Key Building
// ============================================================================

/**
 * Build cache key for growth surface
 */
export function buildGrowthSurfaceCacheKey(
  surfaceType: GrowthSurfaceType,
  slug: string,
  options?: {
    locale?: string;
    variant?: string;
  }
): string {
  const locale = options?.locale || 'vi';
  const variant = options?.variant || 'default';

  return `growth:${surfaceType}:${locale}:${variant}:${slug}`;
}

/**
 * Build shop landing cache key
 */
export function buildShopLandingCacheKey(
  shopSlug: string,
  options?: { locale?: string }
): string {
  return buildGrowthSurfaceCacheKey('shop', shopSlug, options);
}

/**
 * Build category landing cache key
 */
export function buildCategoryLandingCacheKey(
  categorySlug: string,
  options?: { locale?: string }
): string {
  return buildGrowthSurfaceCacheKey('category', categorySlug, options);
}

/**
 * Build tool explainer cache key
 */
export function buildToolExplainerCacheKey(
  toolSlug: string,
  options?: { locale?: string }
): string {
  return buildGrowthSurfaceCacheKey('tool_explainer', toolSlug, options);
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Get cached growth surface data
 */
export async function getCachedGrowthSurface<T>(
  cacheKey: string
): Promise<T | null> {
  const entry = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;

  if (!entry) {
    return null;
  }

  const now = Date.now();

  // Check if completely expired
  if (now > entry.timestamp + entry.ttl * 1000) {
    memoryCache.delete(cacheKey);
    return null;
  }

  // Return data even if stale (serve stale while revalidating in background)
  return entry.data;
}

/**
 * Set cached growth surface data
 */
export async function setCachedGrowthSurface<T>(
  cacheKey: string,
  data: T,
  ttlSeconds: number,
  staleAfterSeconds?: number
): Promise<void> {
  const now = Date.now();
  const staleAfter = staleAfterSeconds || Math.floor(ttlSeconds * 0.8);

  const entry: CacheEntry<T> = {
    data,
    timestamp: now,
    ttl: ttlSeconds,
    staleAfter: now + staleAfter * 1000,
  };

  memoryCache.set(cacheKey, entry);
}

/**
 * Check if cached data is stale
 */
export function isCacheStale(cacheKey: string): boolean {
  const entry = memoryCache.get(cacheKey);

  if (!entry) {
    return true;
  }

  return Date.now() > entry.staleAfter;
}

/**
 * Get cache metadata
 */
export function getCacheMetadata(cacheKey: string): {
  exists: boolean;
  age: number;
  isStale: boolean;
  ttlRemaining: number;
} | null {
  const entry = memoryCache.get(cacheKey);

  if (!entry) {
    return null;
  }

  const now = Date.now();
  const age = now - entry.timestamp;
  const ttlRemaining = Math.max(0, (entry.timestamp + entry.ttl * 1000) - now);

  return {
    exists: true,
    age,
    isStale: now > entry.staleAfter,
    ttlRemaining,
  };
}

// ============================================================================
// Cache Invalidation
// ============================================================================

/**
 * Invalidate cache for a specific growth surface
 */
export async function invalidateGrowthSurfaceCache(
  surfaceType: GrowthSurfaceType,
  slug: string
): Promise<void> {
  // Build all possible cache keys for this surface
  const locales = ['vi', 'en'];
  const variants = ['default'];

  for (const locale of locales) {
    for (const variant of variants) {
      const key = buildGrowthSurfaceCacheKey(surfaceType, slug, { locale, variant });
      memoryCache.delete(key);
    }
  }
}

/**
 * Invalidate all shop caches
 */
export async function invalidateAllShopCaches(): Promise<number> {
  let count = 0;

  for (const key of memoryCache.keys()) {
    if (key.startsWith('growth:shop:')) {
      memoryCache.delete(key);
      count++;
    }
  }

  return count;
}

/**
 * Invalidate all category caches
 */
export async function invalidateAllCategoryCaches(): Promise<number> {
  let count = 0;

  for (const key of memoryCache.keys()) {
    if (key.startsWith('growth:category:')) {
      memoryCache.delete(key);
      count++;
    }
  }

  return count;
}

/**
 * Invalidate all tool explainer caches
 */
export async function invalidateAllToolExplainerCaches(): Promise<number> {
  let count = 0;

  for (const key of memoryCache.keys()) {
    if (key.startsWith('growth:tool_explainer:')) {
      memoryCache.delete(key);
      count++;
    }
  }

  return count;
}

/**
 * Invalidate all growth surface caches
 */
export async function invalidateAllGrowthSurfaceCaches(): Promise<number> {
  let count = 0;

  for (const key of memoryCache.keys()) {
    if (key.startsWith('growth:')) {
      memoryCache.delete(key);
      count++;
    }
  }

  return count;
}

// ============================================================================
// Cache Statistics
// ============================================================================

/**
 * Get cache statistics
 */
export function getGrowthSurfaceCacheStats(): {
  totalEntries: number;
  byType: Record<string, number>;
  staleEntries: number;
} {
  const byType: Record<string, number> = {};
  let staleEntries = 0;

  for (const [key, entry] of memoryCache.entries()) {
    // Extract type from key
    const parts = key.split(':');
    if (parts.length >= 2) {
      const type = parts[1];
      byType[type] = (byType[type] || 0) + 1;
    }

    // Check if stale
    if (Date.now() > entry.staleAfter) {
      staleEntries++;
    }
  }

  return {
    totalEntries: memoryCache.size,
    byType,
    staleEntries,
  };
}

// ============================================================================
// Cache Warming
// ============================================================================

/**
 * Warm cache for popular surfaces
 * In production, this would pre-fetch popular shops/categories
 */
export async function warmGrowthSurfaceCache(
  surfaces: Array<{
    type: GrowthSurfaceType;
    slug: string;
    dataLoader: () => Promise<unknown>;
  }>
): Promise<void> {
  for (const surface of surfaces) {
    try {
      const data = await surface.dataLoader();
      const ttl = getTtlForSurfaceType(surface.type);

      const cacheKey = buildGrowthSurfaceCacheKey(surface.type, surface.slug);
      await setCachedGrowthSurface(cacheKey, data, ttl);
    } catch (error) {
      console.error(`Failed to warm cache for ${surface.type}/${surface.slug}:`, error);
    }
  }
}

/**
 * Get TTL for surface type
 */
function getTtlForSurfaceType(surfaceType: GrowthSurfaceType): number {
  switch (surfaceType) {
    case GrowthSurfaceType.SHOP:
      return CACHE_TTL.SHOP_LANDING_SHORT;
    case GrowthSurfaceType.CATEGORY:
      return CACHE_TTL.CATEGORY_LANDING_SHORT;
    case GrowthSurfaceType.TOOL_EXPLAINER:
      return CACHE_TTL.TOOL_EXPLAINER;
    default:
      return CACHE_TTL.STATIC_CONTENT;
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Clean up stale cache entries
 */
export function cleanupStaleCacheEntries(): number {
  let cleaned = 0;
  const now = Date.now();

  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.timestamp + entry.ttl * 1000) {
      memoryCache.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}
