/**
 * Voucher Cache Repository
 *
 * Production-grade cache abstraction for voucher catalog cache entries.
 *
 * Storage tier:
 *   Redis (production)  – TTL-managed, shared across instances, durable enough
 *   In-memory (dev fallback) – single-process only, lost on restart
 *
 * Use Redis when VOUCHER_REDIS_URL is set; falls back to in-memory otherwise.
 *
 * TTL strategy:
 *   Catalog cache entries: 5 minutes (catalog is refreshed frequently)
 *   Product context cache:  15 minutes
 *   Resolution cache:      managed by voucherResolutionCache.ts (30 min)
 */

import { getRedisClient } from '../redis/redisClient';
import { VoucherCacheEntry } from '../types';
import { logger } from '../../utils/logger';

// ── Interface ─────────────────────────────────────────────────────────────────

export interface VoucherCacheRepository {
  get(key: string): Promise<VoucherCacheEntry | null>;
  set(key: string, entry: Omit<VoucherCacheEntry, 'createdAt'>): Promise<void>;
  delete(key: string): Promise<boolean>;
  deleteByPlatform(platform: string): Promise<number>;
  deleteExpired(): Promise<number>;
  getStats(): Promise<{ total: number; expired: number }>;
}

// ── Redis Implementation ────────────────────────────────────────────────────────

export class RedisCacheRepository implements VoucherCacheRepository {
  private readonly keyPrefix = 've:cache:';
  private readonly defaultTtlSeconds = 300; // 5 minutes

  private redis() { return getRedisClient(); }

  async get(key: string): Promise<VoucherCacheEntry | null> {
    const client = this.redis();
    if (!client) return null;

    try {
      const raw = await client.get(`${this.keyPrefix}${key}`);
      if (!raw) return null;

      const entry = JSON.parse(raw) as VoucherCacheEntry;
      if (new Date(entry.expiresAt) < new Date()) {
        await this.delete(key);
        return null;
      }

      return entry;
    } catch (err) {
      logger.warn({ err, key }, '[VoucherCacheRepo] Redis get failed');
      return null;
    }
  }

  async set(key: string, entry: Omit<VoucherCacheEntry, 'createdAt'>): Promise<void> {
    const client = this.redis();
    if (!client) return;

    const full: VoucherCacheEntry = {
      ...entry,
      createdAt: new Date(),
    };

    const ttlSeconds = entry.expiresAt
      ? Math.max(1, Math.ceil((new Date(entry.expiresAt).getTime() - Date.now()) / 1000))
      : this.defaultTtlSeconds;

    try {
      await client.setex(
        `${this.keyPrefix}${key}`,
        ttlSeconds,
        JSON.stringify(full)
      );
    } catch (err) {
      logger.warn({ err, key }, '[VoucherCacheRepo] Redis set failed');
    }
  }

  async delete(key: string): Promise<boolean> {
    const client = this.redis();
    if (!client) return false;

    try {
      const result = await client.del(`${this.keyPrefix}${key}`);
      return result === 1;
    } catch (err) {
      logger.warn({ err, key }, '[VoucherCacheRepo] Redis delete failed');
      return false;
    }
  }

  async deleteByPlatform(platform: string): Promise<number> {
    const client = this.redis();
    if (!client) return 0;

    try {
      const keys = await client.keys(`${this.keyPrefix}*`);
      let count = 0;

      for (const key of keys) {
        const raw = await client.get(key);
        if (!raw) continue;

        try {
          const entry = JSON.parse(raw) as VoucherCacheEntry;
          if (entry.platform === platform) {
            await client.del(key);
            count++;
          }
        } catch { /* ignore parse errors */ }
      }

      return count;
    } catch (err) {
      logger.warn({ err, platform }, '[VoucherCacheRepo] Redis deleteByPlatform failed');
      return 0;
    }
  }

  async deleteExpired(): Promise<number> {
    // Redis TTL handles expiry automatically — this is a no-op.
    // Kept for interface compatibility.
    return 0;
  }

  async getStats(): Promise<{ total: number; expired: number }> {
    const client = this.redis();
    if (!client) return { total: 0, expired: 0 };

    try {
      const keys = await client.keys(`${this.keyPrefix}*`);
      const now = Date.now();
      let expired = 0;

      for (const key of keys.slice(0, 1000)) { // sample up to 1000 for perf
        const ttl = await client.ttl(key);
        if (ttl < 0) expired++;
      }

      return { total: keys.length, expired };
    } catch (err) {
      logger.warn({ err }, '[VoucherCacheRepo] Redis getStats failed');
      return { total: 0, expired: 0 };
    }
  }
}

// ── In-Memory Fallback ────────────────────────────────────────────────────────

/**
 * In-memory fallback — only for local dev without Redis.
 * NOT durable — data is lost on process restart.
 */
export class InMemoryCacheRepository implements VoucherCacheRepository {
  private cache = new Map<string, VoucherCacheEntry>();

  async get(key: string): Promise<VoucherCacheEntry | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (new Date(entry.expiresAt) < new Date()) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: Omit<VoucherCacheEntry, 'createdAt'>): Promise<void> {
    this.cache.set(key, { ...entry, createdAt: new Date() });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async deleteByPlatform(platform: string): Promise<number> {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.platform === platform) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  async deleteExpired(): Promise<number> {
    let count = 0;
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  async getStats(): Promise<{ total: number; expired: number }> {
    const now = new Date();
    let expired = 0;
    for (const entry of this.cache.values()) {
      if (entry.expiresAt < now) expired++;
    }
    return { total: this.cache.size, expired };
  }

  clear(): void { this.cache.clear(); }
}

// ── Factory ─────────────────────────────────────────────────────────────────

let _instance: VoucherCacheRepository | null = null;

export function createCacheRepository(): VoucherCacheRepository {
  if (_instance) return _instance;

  const redis = getRedisClient();
  if (redis) {
    logger.info('[VoucherCacheRepo] Using Redis store');
    _instance = new RedisCacheRepository();
  } else {
    logger.warn('[VoucherCacheRepo] Redis unavailable — using in-memory store (NOT durable)');
    _instance = new InMemoryCacheRepository();
  }

  return _instance;
}

export function resetCacheRepository(): void {
  _instance = null;
}
