/**
 * Retry Validation
 *
 * Validates retry logic and behavior for reliability testing.
 */

import type { ReliabilityCheckResult } from '../types';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

/**
 * Retry attempt record
 */
export interface RetryAttempt {
  attempt: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  delayMs: number;
}

/**
 * Retry validation result
 */
export interface RetryValidationResult {
  valid: boolean;
  attempts: RetryAttempt[];
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  errors: string[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Calculate retry delay
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff
  let delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);

  // Cap at max delay
  delay = Math.min(delay, config.maxDelayMs);

  // Add jitter
  if (config.jitter) {
    const jitterFactor = 0.5 + Math.random() * 0.5; // 50-100% of delay
    delay = Math.floor(delay * jitterFactor);
  }

  return delay;
}

/**
 * Validate retry delay progression
 */
export function validateRetryDelays(
  attempts: RetryAttempt[],
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < attempts.length; i++) {
    const currentDelay = attempts[i].delayMs;
    const expectedDelay = calculateRetryDelay(attempts[i].attempt, config);

    // Allow 20% tolerance
    const tolerance = expectedDelay * 0.2;
    const diff = Math.abs(currentDelay - expectedDelay);

    if (diff > tolerance) {
      warnings.push(
        `Attempt ${attempts[i].attempt}: delay ${currentDelay}ms differs from expected ${expectedDelay}ms`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate retry configuration
 */
export function validateRetryConfig(
  config: RetryConfig
): ReliabilityCheckResult {
  const errors: string[] = [];

  if (config.maxAttempts < 1) {
    errors.push('maxAttempts must be at least 1');
  }

  if (config.baseDelayMs < 0) {
    errors.push('baseDelayMs cannot be negative');
  }

  if (config.maxDelayMs < config.baseDelayMs) {
    errors.push('maxDelayMs must be >= baseDelayMs');
  }

  if (config.backoffMultiplier < 1) {
    errors.push('backoffMultiplier must be at least 1');
  }

  const start = Date.now();
  const passed = errors.length === 0;

  return {
    check: 'retry-config',
    passed,
    duration: Date.now() - start,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

/**
 * Simulate retry operation
 */
export async function simulateRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  shouldFail: boolean[] = [false, true] // First succeeds, then fails
): Promise<RetryValidationResult> {
  const attempts: RetryAttempt[] = [];
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const timestamp = new Date();
    const startTime = Date.now();

    try {
      // Check if this attempt should fail
      const failAttempt = attempt <= shouldFail.length ? shouldFail[attempt - 1] : false;

      if (failAttempt) {
        throw new Error(`Attempt ${attempt} simulated failure`);
      }

      const result = await operation();
      const delayMs = Date.now() - startTime;

      attempts.push({
        attempt,
        timestamp,
        success: true,
        delayMs,
      });

      return {
        valid: true,
        attempts,
        totalAttempts: attempts.length,
        successfulAttempts: 1,
        failedAttempts: attempts.length - 1,
        errors: [],
      };
    } catch (error) {
      const delayMs = Date.now() - startTime;
      lastError = (error as Error).message;

      attempts.push({
        attempt,
        timestamp,
        success: false,
        error: lastError,
        delayMs,
      });

      // Wait before next retry
      if (attempt < config.maxAttempts) {
        const waitTime = calculateRetryDelay(attempt, config);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  return {
    valid: false,
    attempts,
    totalAttempts: attempts.length,
    successfulAttempts: 0,
    failedAttempts: attempts.length,
    errors: [lastError ?? 'All retries failed'],
  };
}

/**
 * Validate retry behavior
 */
export function validateRetryBehavior(
  attempts: RetryAttempt[],
  config: RetryConfig
): {
  valid: boolean;
  results: ReliabilityCheckResult[];
} {
  const results: ReliabilityCheckResult[] = [];

  // Check max attempts respected
  const maxAttemptsCheck: ReliabilityCheckResult = {
    check: 'max-attempts-respected',
    passed: attempts.length <= config.maxAttempts,
    duration: 0,
    value: attempts.length,
    threshold: config.maxAttempts,
  };
  results.push(maxAttemptsCheck);

  // Check delays increase (backoff)
  let delaysIncrease = true;
  for (let i = 1; i < attempts.length; i++) {
    if (attempts[i].delayMs <= attempts[i - 1].delayMs) {
      delaysIncrease = false;
      break;
    }
  }

  const backoffCheck: ReliabilityCheckResult = {
    check: 'exponential-backoff',
    passed: delaysIncrease || attempts.length < 2,
    duration: 0,
    metric: delaysIncrease ? 'delays-increase' : 'delays-not-increasing',
  };
  results.push(backoffCheck);

  // Check max delay not exceeded
  const maxDelayExceeded = attempts.some((a) => a.delayMs > config.maxDelayMs);
  const maxDelayCheck: ReliabilityCheckResult = {
    check: 'max-delay-respected',
    passed: !maxDelayExceeded,
    duration: 0,
    value: Math.max(...attempts.map((a) => a.delayMs)),
    threshold: config.maxDelayMs,
  };
  results.push(maxDelayCheck);

  const valid = results.every((r) => r.passed);

  return { valid, results };
}

/**
 * Run retry validation test
 */
export async function runRetryValidationTest(
  operation: () => Promise<void>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  failUntilAttempt?: number
): Promise<RetryValidationResult> {
  const shouldFail: boolean[] = [];

  if (failUntilAttempt !== undefined) {
    for (let i = 1; i <= config.maxAttempts; i++) {
      shouldFail.push(i < failUntilAttempt);
    }
  }

  return simulateRetry(operation, config, shouldFail);
}

/**
 * Create retry config from options
 */
export function createRetryConfig(options?: Partial<RetryConfig>): RetryConfig {
  return {
    ...DEFAULT_RETRY_CONFIG,
    ...options,
  };
}
