/**
 * Resolve Cache — In-memory TTL cache for normalized input keys.
 *
 * Cache key = hash(normalized_input + sort params)
 * Cache entry = resolved result (from Supabase or enrich path)
 *
 * Does NOT depend on enrich backend — cache hits from Supabase-only
 * results are valid and should be served directly.
 */

interface CacheEntry {
  result: unknown;
  cachedAt: number;
  resolveMode: string;
  sourceCount: number;
}

const _cache = new Map<string, CacheEntry>();

const TTL_MS = 60_000; // 1 minute
const MAX_SIZE = 1000;

function hashKey(input: string): string {
  // Simple djb2-like hash — fast, good enough for cache key
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i);
  }
  return `r:${(h >>> 0).toString(36)}`;
}

export function buildCacheKey(normalized: {
  platform: string;
  shopId: string | null;
  itemId: string | null;
  originalUrl: string;
}): string {
  const composite = [
    normalized.platform,
    normalized.shopId ?? '',
    normalized.itemId ?? '',
    normalized.originalUrl.slice(0, 200),
  ].join('|');
  return hashKey(composite);
}

export function getFromCache(key: string): CacheEntry | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry;
}

export function setCache(
  key: string,
  result: unknown,
  resolveMode: string,
  sourceCount: number
): void {
  // Evict oldest if full
  if (_cache.size >= MAX_SIZE && !_cache.has(key)) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of _cache) {
      if (v.cachedAt < oldestTime) {
        oldestTime = v.cachedAt;
        oldestKey = k;
      }
    }
    if (oldestKey) _cache.delete(oldestKey);
  }
  _cache.set(key, { result, cachedAt: Date.now(), resolveMode, sourceCount });
}

export function getCacheStats(): { size: number; hitRate: number; totalHits: number } {
  return { size: _cache.size, hitRate: 0, totalHits: 0 };
}
