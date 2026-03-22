/**
 * Rate Limiter for Admin Auth
 * 
 * Simple in-memory rate limiting for login attempts.
 * Blocks after 5 failed attempts in 15 minutes.
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Check if request should be rate limited
 */
export function isRateLimited(identifier: string): { limited: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No previous attempts
  if (!entry) {
    return { limited: false };
  }

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { limited: true, retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) };
  }

  // Window expired, reset
  if (now - entry.firstAttempt > WINDOW_MS) {
    rateLimitStore.delete(identifier);
    return { limited: false };
  }

  // Still within window
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    return { limited: true, retryAfter: BLOCK_DURATION_MS / 1000 };
  }

  return { limited: false };
}

/**
 * Record a failed attempt
 */
export function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
      blockedUntil: null,
    });
    return;
  }

  entry.attempts++;
}

/**
 * Record a successful attempt - reset counter
 */
export function recordSuccess(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get rate limit info for display
 */
export function getRateLimitInfo(identifier: string): { attempts: number; maxAttempts: number; remaining: number } {
  const entry = rateLimitStore.get(identifier);
  const attempts = entry?.attempts ?? 0;
  return {
    attempts,
    maxAttempts: MAX_ATTEMPTS,
    remaining: Math.max(0, MAX_ATTEMPTS - attempts),
  };
}
