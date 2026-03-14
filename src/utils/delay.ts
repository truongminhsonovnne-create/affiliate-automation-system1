/**
 * Delay Utilities for Shopee Crawler
 *
 * Provides functions for managing delays to avoid detection
 * and simulate human-like behavior.
 */

import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

/** Positive number schema */
const positiveNumberSchema = z.number().positive();

// ============================================
// Core Functions
// ============================================

/**
 * Sleep for a specified number of milliseconds.
 *
 * @param ms - Milliseconds to sleep (must be positive)
 * @returns Promise that resolves after the delay
 * @throws ZodError if ms is not a positive number
 *
 * @example
 * await sleep(1000); // Sleep for 1 second
 */
export function sleep(ms: number): Promise<void> {
  // Validate input
  positiveNumberSchema.parse(ms);

  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random number between min and max.
 * Handles min > max by swapping values automatically.
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random number between min and max
 * @throws ZodError if min or max is not a positive number
 *
 * @example
 * randomBetween(1, 10);  // Returns random between 1-10
 * randomBetween(10, 1);  // Still returns random between 1-10 (auto-swap)
 */
export function randomBetween(min: number, max: number): number {
  // Validate inputs
  positiveNumberSchema.parse(min);
  positiveNumberSchema.parse(max);

  // Handle min > max by swapping
  const actualMin = Math.min(min, max);
  const actualMax = Math.max(min, max);

  // Generate random number in range [min, max]
  return Math.floor(Math.random() * (actualMax - actualMin + 1)) + actualMin;
}

/**
 * Sleep for a random duration between min and max milliseconds.
 * Handles min > max by swapping values automatically.
 *
 * @param min - Minimum delay in milliseconds (default: 500)
 * @param max - Maximum delay in milliseconds (default: 1500)
 * @returns Promise that resolves after random delay
 * @throws ZodError if min or max is not a positive number
 *
 * @example
 * await randomDelay(1000, 2000); // Sleep 1-2 seconds randomly
 * await randomDelay(2000, 1000); // Still sleeps 1-2 seconds (auto-swap)
 */
export async function randomDelay(min: number = 500, max: number = 1500): Promise<void> {
  // Validate inputs
  positiveNumberSchema.parse(min);
  positiveNumberSchema.parse(max);

  // Calculate random delay
  const delay = randomBetween(min, max);

  return new Promise((resolve) => setTimeout(resolve, delay));
}

// ============================================
// Specialized Delay Functions
// ============================================

/**
 * Default delay range for crawler actions
 */
export const DEFAULT_DELAY = {
  MIN: 500,
  MAX: 1500,
} as const;

/**
 * Delay range for page loads
 */
export const PAGE_LOAD_DELAY = {
  MIN: 2000,
  MAX: 5000,
} as const;

/**
 * Delay range for rate limiting
 */
export const RATE_LIMIT_DELAY = {
  MIN: 3000,
  MAX: 5000,
} as const;

/**
 * Sleep for default random delay (500-1500ms)
 */
export async function wait(): Promise<void> {
  return randomDelay(DEFAULT_DELAY.MIN, DEFAULT_DELAY.MAX);
}

/**
 * Sleep for page load delay (2000-5000ms)
 */
export async function waitForPageLoad(): Promise<void> {
  return randomDelay(PAGE_LOAD_DELAY.MIN, PAGE_LOAD_DELAY.MAX);
}

/**
 * Sleep for rate limiting (3000-5000ms)
 */
export async function waitForRateLimit(): Promise<void> {
  return randomDelay(RATE_LIMIT_DELAY.MIN, RATE_LIMIT_DELAY.MAX);
}

// ============================================
// Advanced Delay Functions
// ============================================

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * Sleep with exponential backoff.
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Promise that resolves after exponential delay
 *
 * @example
 * // For attempt 0: ~1000ms, attempt 1: ~2000ms, attempt 2: ~4000ms
 * await exponentialBackoff(2, { maxRetries: 5, baseDelayMs: 1000, maxDelayMs: 30000 });
 */
export async function exponentialBackoff(
  attempt: number,
  config: RetryConfig = { maxRetries: 5, baseDelayMs: 1000, maxDelayMs: 30000 }
): Promise<void> {
  const { baseDelayMs, maxDelayMs } = config;

  // Calculate exponential delay: base * 2^attempt
  const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);

  // Add jitter (±10%) to avoid predictable patterns
  const jitter = delay * 0.1;
  const finalDelay = delay + randomBetween(-jitter, jitter);

  return sleep(Math.max(0, finalDelay));
}

/**
 * Create a debounced version of a function.
 *
 * @param fn - Function to debounce
 * @param waitMs - Milliseconds to wait before executing
 * @returns Debounced function
 *
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Searching:', query);
 * }, 300);
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, waitMs);
  };
}

/**
 * Create a throttled version of a function.
 *
 * @param fn - Function to throttle
 * @param limitMs - Milliseconds to wait between executions
 * @returns Throttled function
 *
 * @example
 * const throttledScroll = throttle(() => {
 *   console.log('Scroll detected');
 * }, 100);
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= limitMs) {
      lastCall = now;
      fn(...args);
    }
  };
}

// ============================================
// Type Exports
// ============================================

export type { RetryConfig };
