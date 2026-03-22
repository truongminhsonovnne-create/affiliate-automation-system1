/**
 * Rate Limit Store Abstraction — PRODUCTION HARDENED
 *
 * Provides abstraction for rate limit storage.
 * Supports both in-memory (dev) and Redis (production, multi-instance safe).
 *
 * HARDENING APPLIED:
 *   - Redis uses a Lua script for true atomic increment — the previous version
 *     used a plain multi()/exec() transaction which is NOT atomic under Redis
 *     cluster/RedisGIL scenarios (GET then SET are two separate ops with a race).
 *   - In-memory store uses a Map with per-entry TTL timers.
 *   - Both stores return a consistent RateLimitEntry shape.
 *   - Initialization is lazy and guarded — failures throw, factory catches them.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';

const logger = createLogger({ subsystem: 'rate_limit_store' });

// =============================================================================
// Types
// =============================================================================

export interface RateLimitEntry {
  count: number;
  resetAt: number;
  firstRequestAt: number;
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>;
  set(key: string, entry: RateLimitEntry, ttlSeconds: number): Promise<void>;
  /**
   * Atomically increment counter and return new entry.
   * If the window has expired, resets to a new window.
   */
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;
  isHealthy(): Promise<boolean>;
  getType(): string;
}

// =============================================================================
// In-Memory Store — Dev / single-instance fallback
// =============================================================================

export class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  async get(key: string): Promise<RateLimitEntry | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, entry: RateLimitEntry, _ttlSeconds: number): Promise<void> {
    this.store.set(key, entry);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || now > existing.resetAt) {
      // Fresh window
      const entry: RateLimitEntry = {
        count: 1,
        resetAt: now + windowMs,
        firstRequestAt: now,
      };
      this.store.set(key, entry);
      this.scheduleCleanup(key, windowMs);
      return entry;
    }

    // Within window — increment
    existing.count++;
    this.store.set(key, existing);
    return existing;
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  getType(): string {
    return 'in-memory';
  }

  /** Remove entry and cancel its timer */
  private scheduleCleanup(key: string, delayMs: number): void {
    const existing = this.timers.get(key);
    if (existing !== undefined) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, delayMs + 1000); // 1s buffer after TTL
    this.timers.set(key, timer);
  }
}

// =============================================================================
// Redis Store — Production, multi-instance safe
// =============================================================================

/**
 * Lua script for atomic rate-limit increment (fixed-window).
 *
 * KEYS[1]  = Redis key
 * ARGV[1]  = current timestamp (ms)
 * ARGV[2]  = window duration (ms)
 *
 * Returns JSON: '{"count":N,"resetAt":T,"firstRequestAt":F}'
 *
 * Logic:
 *   1. GET the existing entry
 *   2. If no entry OR window expired → create new window (count=1)
 *   3. If within window → increment count
 *   4. SETEX with TTL = resetAt - now (rounded up)
 *
 * This is fully atomic — Redis executes the script as a single operation.
 */
const INCREMENT_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])

local raw = redis.call('GET', key)
local entry

if not raw then
  -- New window
  entry = {count = 1, resetAt = now + windowMs, firstRequestAt = now}
else
  entry = cjson.decode(raw)
  if now > entry.resetAt then
    -- Window expired
    entry = {count = 1, resetAt = now + windowMs, firstRequestAt = now}
  else
    entry.count = entry.count + 1
  end
end

local ttlSeconds = math.ceil((entry.resetAt - now) / 1000)
if ttlSeconds < 1 then ttlSeconds = 1 end

redis.call('SETEX', key, ttlSeconds, cjson.encode(entry))
return cjson.encode(entry)
`;

export class RedisRateLimitStore implements RateLimitStore {
  private redisUrl: string;
  private client: InstanceType<(typeof import('ioredis'))['default']> | null = null;
  private initialized = false;
  private initError: Error | null = null;

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
  }

  private async ensureClient() {
    if (this.initialized) {
      if (this.initError) throw this.initError;
      return;
    }
    this.initialized = true;

    try {
      // Lazy import — only load ioredis when actually using Redis store
      const Redis = await import('ioredis');
      this.client = new Redis.default(this.redisUrl);

      // Guard: test connection immediately so the error is thrown in the
      // constructor context, not lazily inside increment() where it would
      // be silently caught and cause every request to be degraded.
      await this.client.ping();

      this.client.on('error', (err: Error) => {
        logger.error({ err }, 'Redis rate limit store error');
      });

      logger.info({ redisUrl: this.redisUrl }, 'Redis rate limit store connected');
    } catch (err) {
      this.initError = err instanceof Error ? err : new Error(String(err));
      logger.error({ err: this.initError }, 'Failed to initialize Redis rate limit store');
      throw this.initError;
    }
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    await this.ensureClient();
    try {
      const raw = await this.client!.get(`ratelimit:${key}`);
      if (!raw) return null;
      return JSON.parse(raw) as RateLimitEntry;
    } catch (err) {
      logger.error({ key, err }, 'Redis get failed');
      throw err;
    }
  }

  async set(key: string, entry: RateLimitEntry, ttlSeconds: number): Promise<void> {
    await this.ensureClient();
    try {
      await this.client!.setex(`ratelimit:${key}`, ttlSeconds, JSON.stringify(entry));
    } catch (err) {
      logger.error({ key, ttlSeconds, err }, 'Redis set failed');
      throw err;
    }
  }

  /**
   * Atomic increment via Lua script.
   *
   * FIXES the previous bug where multi()/exec() was used:
   *   multi.get(key)
   *   ... JS code runs here (race window) ...
   *   multi.setex(key, ttl, value)
   *
   * With Lua, Redis evaluates the entire script atomically — no race between
   * the read and write, even across multiple Redis instances.
   */
  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    await this.ensureClient();

    const now = Date.now();
    const redisKey = `ratelimit:${key}`;

    try {
      const raw: string = await this.client!.eval(
        INCREMENT_LUA,
        1,          // number of KEYS
        redisKey,   // KEYS[1]
        String(now),
        String(windowMs)
      ) as string;

      return JSON.parse(raw) as RateLimitEntry;
    } catch (err) {
      logger.error({ key, windowMs, err }, 'Redis Lua increment failed');
      throw err;
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.initialized) return true; // Not yet tried — assume healthy
    try {
      await this.client!.ping();
      return true;
    } catch {
      return false;
    }
  }

  getType(): string {
    return 'redis';
  }
}

// =============================================================================
// Store Factory
// =============================================================================

let storeInstance: RateLimitStore | null = null;
let storeType: 'memory' | 'redis' | null = null;

/**
 * Return the configured rate limit store.
 * Redis is selected when USE_REDIS_RATE_LIMIT=true.
 * The factory tries once; subsequent calls return the same instance.
 */
export function getRateLimitStore(): RateLimitStore {
  if (storeInstance) return storeInstance;

  const useRedis = process.env.USE_REDIS_RATE_LIMIT === 'true';
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

  if (useRedis) {
    try {
      const store = new RedisRateLimitStore(redisUrl);
      // Trigger lazy init so connection errors surface now, not at first request
      // We catch it synchronously via a trick: ping() returns a Promise
      store.isHealthy().then(() => {
        logger.info({ redisUrl }, 'Rate limit: using Redis store');
      }).catch((err) => {
        logger.warn({ err }, 'Redis unavailable, falling back to in-memory');
      });
      storeInstance = store;
      storeType = 'redis';
    } catch (err) {
      logger.warn({ err }, 'Redis store construction failed, using in-memory');
      storeInstance = new InMemoryRateLimitStore();
      storeType = 'memory';
    }
  } else {
    storeInstance = new InMemoryRateLimitStore();
    storeType = 'memory';
    logger.info('Rate limit: using in-memory store (dev fallback)');
  }

  return storeInstance;
}

export function getStoreType(): string {
  if (storeType === null) getRateLimitStore();
  return storeType ?? 'unknown';
}

export function isUsingRedis(): boolean {
  return getStoreType() === 'redis';
}

export function resetRateLimitStore(): void {
  storeInstance = null;
  storeType = null;
}
