/**
 * Public API HTTP Middleware - Rate Limiting - HARDENED VERSION
 *
 * HARDENING APPLIED:
 *   - evaluatePublicRateLimit is now async (critical bug fix — was calling
 *     an async function without await, so every request got a rejected Promise)
 *   - Retry-After header uses integer seconds (RFC 6585), not ISO timestamp
 *   - Rate limit headers use correct semantics: Limit = maxRequests, Remaining = remaining
 *   - clientIdentity is typed properly (not `any`)
 *   - Degraded mode logs with warn level, not silently
 */

import type { Request, Response, NextFunction } from 'express';
import { evaluatePublicRateLimit, getPolicyForRoute } from '../../rateLimit/publicRateLimitGuard.js';
import { resolveClientIdentity, getIdentityLogSafe, type ClientIdentity } from '../../rateLimit/clientIdentity.js';
import { logger } from '../../../utils/logger.js';

// Extend Express Request to include our typed clientIdentity
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Request {
    clientIdentity?: ClientIdentity;
  }
}

/**
 * Rate limiting middleware for public API
 * Must be registered with `app.use()` (not `app.get()`) to intercept all methods.
 */
export async function publicRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Resolve client identity securely
  const identity = resolveClientIdentity(req);
  const policy = getPolicyForRoute(req.path);

  // Evaluate rate limit — MUST await (the function is now async)
  const decision = await evaluatePublicRateLimit({
    ip: identity.ip,
    path: req.path,
  });

  // ---- Set standard rate limit response headers ----
  // X-RateLimit-Limit: maximum requests allowed in the window
  res.setHeader('X-RateLimit-Limit', String(policy.maxRequests));
  // X-RateLimit-Remaining: requests left in current window
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, decision.remaining)));
  // X-RateLimit-Reset: Unix timestamp when the window resets (integer, not ISO)
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(new Date(decision.resetAt).getTime() / 1000)));
  // X-RateLimit-Policy: which tier is applied (useful for debugging)
  res.setHeader('X-RateLimit-Policy', policy.tier);

  // ---- Degraded mode: store unavailable ----
  if (decision.degraded) {
    logger.warn(
      {
        identity: getIdentityLogSafe(identity),
        path: req.path,
        tier: policy.tier,
      },
      'Rate limiting degraded — store unavailable, request allowed'
    );
    // Allow the request but log it. Downstream should be aware.
  }

  // ---- Hard block: rate limit exceeded ----
  if (decision.status === 'hard_blocked') {
    logger.warn(
      {
        identity: getIdentityLogSafe(identity),
        path: req.path,
        tier: policy.tier,
        remaining: decision.remaining,
        retryAfter: decision.retryAfterSeconds,
      },
      'Rate limit hard blocked'
    );

    // Retry-After MUST be an integer (seconds) per RFC 6585
    const retryAfter = decision.retryAfterSeconds ?? Math.ceil(policy.windowSeconds / 2);
    res.setHeader('Retry-After', String(retryAfter));

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
        retryAfter,
      },
    });
    return;
  }

  // ---- Soft block: approaching limit ----
  if (decision.status === 'soft_blocked') {
    logger.debug(
      {
        identity: getIdentityLogSafe(identity),
        path: req.path,
        tier: policy.tier,
        remaining: decision.remaining,
      },
      'Rate limit soft blocked'
    );

    // Continue but alert the client
    res.setHeader('X-RateLimit-Warning', 'approaching_limit');
  }

  // Attach typed identity to request for downstream use
  req.clientIdentity = identity;

  next();
}

/**
 * Quick rate limit check endpoint (for health/status probes).
 * This is a read-only check — it does NOT increment the counter.
 */
export async function rateLimitHealthCheck(req: Request, res: Response): Promise<void> {
  const identity = resolveClientIdentity(req);
  const policy = getPolicyForRoute(req.path);

  const decision = await evaluatePublicRateLimit({
    ip: identity.ip,
    path: req.path,
  });

  res.status(200).json({
    allowed: decision.allowed,
    status: decision.status,
    remaining: decision.remaining,
    resetAt: decision.resetAt,
    policy: policy.tier,
    degraded: decision.degraded,
  });
}
