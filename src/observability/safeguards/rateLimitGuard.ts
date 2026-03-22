/**
 * Rate Limit Guard
 *
 * Production-grade rate limiting with sliding window algorithm
 * for protecting external APIs and internal resources.
 */

import { createLogger } from '../logger/structuredLogger.js';
import type { RateLimitState, RateLimitConfig } from '../types.js';
import {
  DEFAULT_RATE_LIMIT_CONFIG,
  RATE_LIMIT_CONFIGS,
} from '../constants.js';
import { incrementCounter } from '../metrics/inMemoryMetrics.js';
import { SAFEGUARD_METRICS } from '../metrics/metricNames.js';

const logger = createLogger({ subsystem: 'rate_limit' });

/** Rate limit states per resource */
const limits: Map<string, RateLimitState> = new Map();

/** Rate limit configurations */
const configs: Map<string, RateLimitConfig> = new Map();

/** Request timestamps for sliding window */
const requestWindows: Map<string, number[]> = new Map();

/**
 * Get or create config for a resource
 */
function getConfig(name: string): RateLimitConfig {
  let config = configs.get(name);
  if (!config) {
    config = RATE_LIMIT_CONFIGS[name] || {
      ...DEFAULT_RATE_LIMIT_CONFIG,
      name,
    };
    configs.set(name, config);
  }
  return config;
}

/**
 * Clean old requests from sliding window
 */
function cleanWindow(name: string): void {
  const config = getConfig(name);
  const window = requestWindows.get(name);
  if (!window) return;

  const now = Date.now();
  const cutoff = now - config.windowMs;

  // Remove old timestamps
  const valid = window.filter(ts => ts > cutoff);
  requestWindows.set(name, valid);
}

/**
 * Get rate limit state
 */
export function getRateLimit(name: string): RateLimitState {
  const config = getConfig(name);
  const now = new Date();

  // Clean old requests
  cleanWindow(name);

  const window = requestWindows.get(name) || [];
  const current = window.length;
  const remaining = Math.max(0, config.maxRequests - current);

  let state = limits.get(name);
  if (!state) {
    state = {
      name,
      current,
      max: config.maxRequests,
      remaining,
      resetAt: new Date(now.getTime() + config.windowMs).toISOString(),
      blocked: false,
    };
    limits.set(name, state);
  }

  state.current = current;
  state.remaining = remaining;
  state.resetAt = new Date(now.getTime() + config.windowMs).toISOString();

  return state;
}

/**
 * Get all rate limit states
 */
export function getAllRateLimits(): RateLimitState[] {
  return Array.from(limits.values());
}

/**
 * Check if request is allowed
 */
export function isAllowed(name: string): boolean {
  const state = getRateLimit(name);

  if (state.blocked) {
    // Check if block has expired
    if (state.blockedUntil && new Date(state.blockedUntil) <= new Date()) {
      // Unblock
      state.blocked = false;
      state.blockedUntil = undefined;
      logger.info(`Rate limit ${name} unblocked`);
    } else {
      return false;
    }
  }

  return state.remaining > 0;
}

/**
 * Record a request
 */
export function recordRequest(name: string): boolean {
  const config = getConfig(name);
  const state = getRateLimit(name);

  if (state.blocked) {
    incrementCounter(SAFEGUARD_METRICS.RATE_LIMIT_BLOCKED, { resource: name });
    return false;
  }

  if (state.remaining <= 0) {
    // Block if configured
    if (config.blockDurationMs) {
      state.blocked = true;
      state.blockedUntil = new Date(Date.now() + config.blockDurationMs).toISOString();
      logger.warn(`Rate limit ${name} blocked until ${state.blockedUntil}`);
      incrementCounter(SAFEGUARD_METRICS.RATE_LIMIT_BLOCKED, { resource: name });
    }
    incrementCounter(SAFEGUARD_METRICS.RATE_LIMIT_EXCEEDED, { resource: name });
    return false;
  }

  // Record timestamp
  const now = Date.now();
  const window = requestWindows.get(name) || [];
  window.push(now);
  requestWindows.set(name, window);

  // Update state
  state.current = window.length;
  state.remaining = Math.max(0, config.maxRequests - window.length);

  return true;
}

/**
 * Execute with rate limiting
 */
export async function executeWithRateLimit<T>(
  name: string,
  fn: () => Promise<T>,
  options?: {
    wait?: boolean;
    fallback?: () => Promise<T>;
  }
): Promise<T> {
  if (isAllowed(name)) {
    recordRequest(name);
    return fn();
  }

  // Rate limited
  if (options?.wait) {
    // Wait for rate limit to reset
    const state = getRateLimit(name);
    const resetTime = new Date(state.resetAt).getTime();
    const waitTime = Math.max(0, resetTime - Date.now());

    logger.info(`Rate limit ${name}: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Retry
    if (isAllowed(name)) {
      recordRequest(name);
      return fn();
    }
  }

  if (options?.fallback) {
    logger.info(`Rate limit ${name}: executing fallback`);
    return options.fallback();
  }

  throw new Error(`Rate limit exceeded for ${name}`);
}

/**
 * Execute with rate limiting (sync version)
 */
export function executeWithRateLimitSync<T>(
  name: string,
  fn: () => T,
  options?: {
    fallback?: () => T;
  }
): T {
  if (isAllowed(name)) {
    recordRequest(name);
    return fn();
  }

  if (options?.fallback) {
    logger.info(`Rate limit ${name}: executing fallback`);
    return options.fallback();
  }

  throw new Error(`Rate limit exceeded for ${name}`);
}

/**
 * Wait for rate limit to become available
 */
export async function waitForRateLimit(name: string): Promise<void> {
  const state = getRateLimit(name);
  const resetTime = new Date(state.resetAt).getTime();
  const waitTime = Math.max(0, resetTime - Date.now());

  if (waitTime > 0) {
    logger.info(`Rate limit ${name}: waiting ${waitTime}ms for reset`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

/**
 * Reset rate limit for a resource
 */
export function resetRateLimit(name: string): void {
  requestWindows.delete(name);

  const state = limits.get(name);
  if (state) {
    state.current = 0;
    state.remaining = state.max;
    state.blocked = false;
    state.blockedUntil = undefined;
  }

  logger.info(`Rate limit reset for ${name}`);
}

/**
 * Reset all rate limits
 */
export function resetAllRateLimits(): void {
  requestWindows.clear();
  for (const state of limits.values()) {
    state.current = 0;
    state.remaining = state.max;
    state.blocked = false;
    state.blockedUntil = undefined;
  }
}

/**
 * Get rate limit health status
 */
export function getRateLimitHealth(): {
  ok: number;
  warning: number;
  critical: number;
} {
  let ok = 0;
  let warning = 0;
  let critical = 0;

  for (const state of limits.values()) {
    const usagePercent = (state.current / state.max) * 100;

    if (state.blocked || usagePercent >= 100) {
      critical++;
    } else if (usagePercent >= 80) {
      warning++;
    } else {
      ok++;
    }
  }

  return { ok, warning, critical };
}
