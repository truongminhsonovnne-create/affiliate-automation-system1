/**
 * Redis Client for Voucher Engine
 *
 * Thin wrapper around ioredis for:
 *  - Resolution result JSON storage (short TTL, high throughput)
 *  - Idempotency key deduplication
 *
 * All keys are prefixed with `ve:` (voucher-engine) to avoid collisions.
 */

import Redis from 'ioredis';
import { logger } from '../../utils/logger';

// ── Singleton ─────────────────────────────────────────────────────────────────

let _client: Redis | null = null;
let _connected = false;

export function getRedisClient(): Redis | null {
  if (_client) return _client;

  const url = process.env.VOUCHER_REDIS_URL ?? process.env.REDIS_URL;
  if (!url) return null;

  try {
    _client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
    });

    _client.on('connect', () => {
      _connected = true;
      logger.info('[Redis] Connected');
    });

    _client.on('error', (err) => {
      _connected = false;
      logger.warn({ err }, '[Redis] Connection error');
    });

    _client.on('close', () => {
      _connected = false;
    });

    return _client;
  } catch (err) {
    logger.warn({ err }, '[Redis] Failed to initialise client');
    return null;
  }
}

/** Returns true when Redis is available and connected */
export function isRedisAvailable(): boolean {
  return _connected && _client !== null;
}

// ── Key builders ───────────────────────────────────────────────────────────────

/** Key prefix for all voucher-engine keys */
const VE = 've';

/** Result key: full resolution result JSON (TTL = resolution result TTL) */
export function resultKey(requestId: string): string {
  return `${VE}:result:${requestId}`;
}

/** Idempotency key: dedup on exact same URL+platform within window */
export function idempotencyKey(url: string, platform: string): string {
  return `${VE}:idemp:${platform}:${url}`;
}

// ── Result operations (TTL-managed JSON) ─────────────────────────────────────

/**
 * Store a full resolution result in Redis with TTL.
 * TTL = min(requested TTL, MAX_RESOLUTION_RESULT_TTL_SECONDS)
 */
export async function setResolutionResult(
  requestId: string,
  result: unknown,
  ttlSeconds?: number
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const ttl = Math.min(
    ttlSeconds ?? DEFAULT_RESOLUTION_RESULT_TTL_SECONDS,
    MAX_RESOLUTION_RESULT_TTL_SECONDS
  );

  try {
    await client.setex(resultKey(requestId), ttl, JSON.stringify(result));
  } catch (err) {
    logger.warn({ err, requestId }, '[Redis] Failed to SET resolution result');
  }
}

/**
 * Retrieve a full resolution result from Redis.
 * Returns null if missing or expired.
 */
export async function getResolutionResult<T = unknown>(
  requestId: string
): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const raw = await client.get(resultKey(requestId));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn({ err, requestId }, '[Redis] Failed to GET resolution result');
    return null;
  }
}

/**
 * Mark a request as "processing" with TTL.
 * Workers claim ownership of in-flight requests to prevent duplicate work.
 */
export async function setProcessingLock(
  requestId: string,
  workerId: string,
  ttlSeconds = 60
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const key = `${VE}:lock:${requestId}`;
    const result = await client.set(key, workerId, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (err) {
    logger.warn({ err, requestId }, '[Redis] Failed to SET processing lock');
    return false;
  }
}

/**
 * Release the processing lock (when worker finishes or errors).
 */
export async function releaseProcessingLock(
  requestId: string,
  workerId: string
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    const key = `${VE}:lock:${requestId}`;
    const current = await client.get(key);
    if (current === workerId) {
      await client.del(key);
    }
  } catch (err) {
    logger.warn({ err, requestId }, '[Redis] Failed to release processing lock');
  }
}

// ── Idempotency ───────────────────────────────────────────────────────────────

/**
 * Set idempotency key with TTL to prevent duplicate processing.
 * Returns true if this is a new (non-duplicate) request.
 */
export async function setIdempotencyKey(
  url: string,
  platform: string,
  requestId: string,
  ttlSeconds = 30
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return true; // Allow through if Redis unavailable

  try {
    const key = idempotencyKey(url, platform);
    const result = await client.set(key, requestId, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (err) {
    logger.warn({ err, url, platform }, '[Redis] Idempotency check failed, allowing request');
    return true;
  }
}

/**
 * Get the requestId for an existing idempotency key.
 */
export async function getIdempotencyKey(
  url: string,
  platform: string
): Promise<string | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    return await client.get(idempotencyKey(url, platform));
  } catch (err) {
    return null;
  }
}

// ── Constants (imported from constants.ts – duplicated here to avoid circular) ──

const DEFAULT_RESOLUTION_RESULT_TTL_SECONDS = 1800; // 30 minutes
const MAX_RESOLUTION_RESULT_TTL_SECONDS = 86400;    // 24 hours max
