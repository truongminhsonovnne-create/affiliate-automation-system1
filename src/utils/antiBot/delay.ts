/**
 * Anti-Bot Delay Utilities
 *
 * Provides human-like delay functions with randomization and jitter.
 */

import { z } from 'zod';
import type { RandomDelayOptions, RandomDelayResult } from './types.js';
import { DELAY_DEFAULTS, JITTER_DEFAULTS } from './constants.js';

// ============================================
// Validation Schemas
// ============================================

const positiveNumberSchema = z.number().positive();

const delayOptionsSchema = z.object({
  label: z.string().optional(),
  logger: z.object({
    info: z.function(),
    warn: z.function(),
    debug: z.function(),
    error: z.function(),
  }).optional(),
  abortSignal: z.object({
    aborted: z.boolean(),
    addEventListener: z.function(),
    removeEventListener: z.function(),
  }).nullable().optional(),
  enableJitter: z.boolean().default(true),
  jitterPercent: z.number().min(0).max(1).default(0.1),
});

// ============================================
// Core Delay Functions
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
 * randomBetween(10, 1); // Still returns random between 1-10 (auto-swap)
 */
export function randomBetween(min: number, max: number): number {
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
 * @param min - Minimum delay in milliseconds (default: 100)
 * @param max - Maximum delay in milliseconds (default: 300)
 * @param options - Additional options
 * @returns Promise that resolves after random delay with result metadata
 * @throws ZodError if min or max is not a positive number
 *
 * @example
 * await randomDelay(1000, 2000); // Sleep 1-2 seconds randomly
 * await randomDelay(2000, 1000); // Still sleeps 1-2 seconds (auto-swap)
 */
export async function randomDelay(
  min: number = DELAY_DEFAULTS.MIN,
  max: number = DELAY_DEFAULTS.MAX,
  options: RandomDelayOptions = {}
): Promise<RandomDelayResult> {
  // Validate inputs
  positiveNumberSchema.parse(min);
  positiveNumberSchema.parse(max);

  // Parse and validate options
  const opts = delayOptionsSchema.parse(options);

  // Check abort signal
  if (opts.abortSignal?.aborted) {
    return {
      actualDelayMs: 0,
      jitterApplied: false,
      aborted: true,
    };
  }

  // Calculate random delay
  const baseDelay = randomBetween(min, max);

  // Apply jitter if enabled
  let actualDelay = baseDelay;
  let jitterApplied = false;

  if (opts.enableJitter !== false) {
    const jitterAmount = baseDelay * (opts.jitterPercent ?? JITTER_DEFAULTS.PERCENT);
    const jitter = randomBetween(-jitterAmount, jitterAmount);
    actualDelay = Math.max(0, baseDelay + jitter);
    jitterApplied = true;
  }

  // Set up abort listener
  let aborted = false;
  if (opts.abortSignal) {
    const abortHandler = () => {
      aborted = true;
    };
    opts.abortSignal.addEventListener('abort', abortHandler);

    // Sleep with ability to interrupt
    await Promise.race([
      sleep(actualDelay),
      new Promise<void>((_, reject) => {
        const checkAbort = setInterval(() => {
          if (opts.abortSignal?.aborted) {
            clearInterval(checkAbort);
            reject(new Error('Aborted'));
          }
        }, 50);
      }),
    ]).catch(() => {
      // Ignore abort error
    }).finally(() => {
      opts.abortSignal?.removeEventListener('abort', abortHandler);
    });
  } else {
    await sleep(actualDelay);
  }

  // Log if label provided
  if (opts.label && opts.logger) {
    opts.logger.debug(`Delay: ${actualDelay}ms${jitterApplied ? ' (jitter)' : ''}`, {
      label: opts.label,
      baseDelay,
      actualDelay,
      jitterApplied,
    });
  }

  const abortStatus = opts.abortSignal?.aborted;

  return {
    actualDelayMs: Math.round(actualDelay),
    jitterApplied,
    aborted: aborted || (abortStatus === true),
  };
}

/**
 * Sleep for page load delay (default: 1.5-3 seconds)
 *
 * @param options - Delay options
 */
export async function pageLoadDelay(options: RandomDelayOptions = {}): Promise<RandomDelayResult> {
  return randomDelay(
    DELAY_DEFAULTS.PAGE_LOAD_MIN,
    DELAY_DEFAULTS.PAGE_LOAD_MAX,
    { ...options, label: options.label ?? 'page-load' }
  );
}

/**
 * Sleep for action delay (default: 200-600ms)
 *
 * @param options - Delay options
 */
export async function actionDelay(options: RandomDelayOptions = {}): Promise<RandomDelayResult> {
  return randomDelay(
    DELAY_DEFAULTS.ACTION_MIN,
    DELAY_DEFAULTS.ACTION_MAX,
    { ...options, label: options.label ?? 'action' }
  );
}

/**
 * Sleep for rate limiting (default: 3 seconds)
 *
 * @param options - Delay options
 */
export async function rateLimitDelay(options: RandomDelayOptions = {}): Promise<RandomDelayResult> {
  return randomDelay(
    DELAY_DEFAULTS.RATE_LIMIT,
    DELAY_DEFAULTS.RATE_LIMIT + 1000,
    { ...options, label: options.label ?? 'rate-limit' }
  );
}
