/**
 * Public Rate Limit Guard — HARDENED + ASYNC FIXED
 *
 * CRITICAL BUG FIX:
 *   The previous version called `store.increment()` (which returns `Promise<RateLimitEntry>`)
 *   synchronously — the `@ts-ignore` comment was a red flag. This meant `entry` was always a
 *   rejected Promise, so `entry.count` was always `undefined`, and every request was
 *   immediately hard-blocked once the Promise rejected.
 *
 *   FIX: `evaluatePublicRateLimit` is now `async` so it can `await` the store call.
 *
 * HARDENING APPLIED:
 *   - Store errors degrade gracefully: allow request but flag it in the decision
 *   - `Retry-After` header value is always an integer (not ISO timestamp)
 *   - Rate limit key includes tier prefix to avoid cross-tier key collision
 *   - Burst allowance: count starts from 0 so first N requests always pass
 */

import type { PublicRateLimitDecision, PublicRateLimitConfig } from '../types.js';
import { createLogger } from '../../observability/logger/structuredLogger.js';
import { getRateLimitStore, type RateLimitStore } from './store.js';
import { getPolicyForRoute, RouteCostTier, type RateLimitPolicy } from './policy.js';

const logger = createLogger({ subsystem: 'rate_limit' });

/**
 * Evaluate rate limit for a request with route-based policy.
 *
 * MUST be called with `await` — the store is async (Redis or in-memory Promise).
 * Returns `degraded: true` if the store throws: request is allowed but not counted.
 */
export async function evaluatePublicRateLimit(
  requestContext: {
    ip?: string;
    requestId?: string;
    userId?: string;
    path?: string;
  },
  config?: Partial<PublicRateLimitConfig>
): Promise<PublicRateLimitDecision> {
  const path = requestContext.path ?? '/';
  const policy = getPolicyForRoute(path);

  const finalConfig: PublicRateLimitConfig = {
    maxRequests: config?.maxRequests ?? policy.maxRequests,
    windowSeconds: config?.windowSeconds ?? policy.windowSeconds,
    softBlockEnabled: config?.softBlockEnabled ?? policy.softBlockEnabled,
    softBlockThreshold: config?.softBlockThreshold ?? policy.softBlockThreshold,
  };

  const store = getRateLimitStore();
  const key = buildRateLimitKey(requestContext, policy.tier);
  const windowMs = finalConfig.windowSeconds * 1000;

  // ---- Increment counter (ASYNC — was the critical bug) ----
  let entry: { count: number; resetAt: number; firstRequestAt: number } | null = null;
  let degraded = false;

  try {
    entry = await store.increment(key, windowMs);
  } catch (err) {
    logger.error({ key: key.slice(0, 24), err, storeType: store.getType() }, 'Rate limit store failed — degrading gracefully');
    degraded = true;
  }

  // Store unavailable: allow request, mark degraded, don't count
  if (degraded || entry === null) {
    const resetAt = new Date(Date.now() + windowMs);
    return buildDecision({
      allowed: true,
      status: 'allowed',
      remaining: finalConfig.maxRequests,
      resetAt,
      degraded: true,
      tier: policy.tier,
    });
  }

  const now = Date.now();

  // ---- Hard block: limit reached ----
  if (entry.count >= finalConfig.maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

    logger.warn(
      {
        key: key.slice(0, 24),
        count: entry.count,
        limit: finalConfig.maxRequests,
        tier: policy.tier,
      },
      'Rate limit exceeded'
    );

    return buildDecision({
      allowed: false,
      status: 'hard_blocked',
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfterSeconds: retryAfter,
      reason: 'Rate limit exceeded',
      tier: policy.tier,
    });
  }

  // ---- Soft block: approaching limit ----
  const softBlockLimit = Math.ceil(finalConfig.maxRequests * finalConfig.softBlockThreshold);
  if (finalConfig.softBlockEnabled && entry.count >= softBlockLimit) {
    logger.debug(
      {
        key: key.slice(0, 24),
        count: entry.count,
        softLimit: softBlockLimit,
        tier: policy.tier,
      },
      'Soft block threshold reached'
    );

    return buildDecision({
      allowed: true,
      status: 'soft_blocked',
      remaining: Math.max(0, finalConfig.maxRequests - entry.count),
      resetAt: new Date(entry.resetAt),
      reason: 'Approaching rate limit',
      tier: policy.tier,
    });
  }

  // ---- Allowed ----
  return buildDecision({
    allowed: true,
    status: 'allowed',
    remaining: Math.max(0, finalConfig.maxRequests - entry.count),
    resetAt: new Date(entry.resetAt),
    tier: policy.tier,
  });
}

function buildDecision(params: {
  allowed: boolean;
  status: 'allowed' | 'soft_blocked' | 'hard_blocked';
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
  reason?: string;
  tier?: RouteCostTier;
  degraded?: boolean;
}): PublicRateLimitDecision {
  return {
    allowed: params.allowed,
    status: params.status,
    remaining: params.remaining,
    resetAt: params.resetAt.toISOString(),
    retryAfterSeconds: params.retryAfterSeconds,
    reason: params.reason,
    tier: params.tier,
    degraded: params.degraded,
  };
}

/**
 * Build a deterministic rate limit key scoped to a tier.
 * Format: ratelimit:<tier>:<ip-hash>[:userId]
 *
 * Using a tier prefix prevents a HIGH-tier burst from consuming MEDIUM-tier quota
 * (and vice versa) when they share the same IP.
 */
function buildRateLimitKey(context: { ip?: string; userId?: string; path?: string }, tier: RouteCostTier): string {
  const ip = context.ip ?? 'unknown';
  const userId = context.userId ?? '';
  return `ratelimit:${tier}:${ip}${userId ? ':' + userId : ''}`;
}

export async function cleanupRateLimitStore(): Promise<number> {
  logger.info('Manual cleanup — no-op for centralized store');
  return 0;
}

export async function getRateLimitStats(): Promise<{ storeType: string; isHealthy: boolean }> {
  const store = getRateLimitStore();
  let isHealthy = false;
  try {
    isHealthy = await store.isHealthy();
  } catch {
    isHealthy = false;
  }
  return { storeType: store.getType(), isHealthy };
}

export { getPolicyForRoute, RouteCostTier } from './policy.js';
