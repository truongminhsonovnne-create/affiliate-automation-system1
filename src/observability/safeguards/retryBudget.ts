/**
 * Retry Budget Guard
 *
 * Production-grade retry budget implementation to prevent retry storms
 * and ensure fair resource allocation across operations.
 */

import { createLogger } from '../logger/structuredLogger.js';
import type { RetryBudgetState, RetryBudgetConfig } from '../types.js';
import {
  DEFAULT_RETRY_BUDGET_CONFIG,
  RETRY_BUDGET_CONFIGS,
} from '../constants.js';
import { incrementCounter } from '../metrics/inMemoryMetrics.js';
import { SAFEGUARD_METRICS } from '../metrics/metricNames.js';

const logger = createLogger({ subsystem: 'retry_budget' });

/** Retry budget states per operation */
const budgets: Map<string, RetryBudgetState> = new Map();

/** Retry budget configurations */
const configs: Map<string, RetryBudgetConfig> = new Map();

/** Window tracking */
const windowTracking: Map<string, { count: number; resetAt: string }> = new Map();

/**
 * Get or create config for an operation
 */
function getConfig(operation: string): RetryBudgetConfig {
  let config = configs.get(operation);
  if (!config) {
    config = RETRY_BUDGET_CONFIGS[operation] || {
      ...DEFAULT_RETRY_BUDGET_CONFIG,
      name: operation,
    };
    configs.set(operation, config);
  }
  return config;
}

/**
 * Get or create budget state for an operation
 */
function getOrCreateBudget(operation: string): RetryBudgetState {
  let budget = budgets.get(operation);
  if (!budget) {
    const config = getConfig(operation);
    budget = {
      operation,
      available: true,
      remainingRetries: config.maxRetries,
      usedInWindow: 0,
    };
    budgets.set(operation, budget);
  }
  return budget;
}

/**
 * Get retry budget state
 */
export function getRetryBudget(operation: string): RetryBudgetState {
  return getOrCreateBudget(operation);
}

/**
 * Get all retry budget states
 */
export function getAllRetryBudgets(): RetryBudgetState[] {
  return Array.from(budgets.values());
}

/**
 * Check if retry is available within budget
 */
export function canRetry(operation: string): boolean {
  const budget = getOrCreateBudget(operation);
  const config = getConfig(operation);
  const now = new Date();

  // Check window reset
  const window = windowTracking.get(operation);
  if (window) {
    const resetAt = new Date(window.resetAt);
    if (now >= resetAt) {
      // Window expired, reset
      budget.usedInWindow = 0;
      budget.remainingRetries = config.maxRetries;
      windowTracking.delete(operation);
      logger.debug(`Retry window reset for ${operation}`);
    }
  }

  // Check budget
  if (budget.usedInWindow >= config.maxRetriesPerWindow) {
    budget.available = false;
    logger.warn(`Retry budget exhausted for ${operation}`, {
      used: budget.usedInWindow,
      max: config.maxRetriesPerWindow,
    });
    incrementCounter(SAFEGUARD_METRICS.RETRY_BUDGET_EXHAUSTED, { operation });
    return false;
  }

  if (budget.remainingRetries <= 0) {
    budget.available = false;
    logger.warn(`No retries remaining for ${operation}`, {
      remaining: budget.remainingRetries,
    });
    incrementCounter(SAFEGUARD_METRICS.RETRY_BUDGET_EXHAUSTED, { operation });
    return false;
  }

  budget.available = true;
  return true;
}

/**
 * Consume a retry from the budget
 */
export function consumeRetry(operation: string): boolean {
  const budget = getOrCreateBudget(operation);
  const config = getConfig(operation);

  if (!canRetry(operation)) {
    return false;
  }

  budget.remainingRetries--;
  budget.usedInWindow++;

  // Initialize or update window tracking
  const now = new Date();
  const window = windowTracking.get(operation);

  if (!window || new Date(window.resetAt) <= now) {
    // Start new window
    const resetAt = new Date(now.getTime() + config.budgetWindowMs);
    windowTracking.set(operation, {
      count: 1,
      resetAt: resetAt.toISOString(),
    });
    budget.windowResetAt = resetAt.toISOString();
  } else {
    window.count++;
  }

  incrementCounter(SAFEGUARD_METRICS.RETRY_ATTEMPTS, { operation });

  logger.debug(`Retry consumed for ${operation}`, {
    remaining: budget.remainingRetries,
    usedInWindow: budget.usedInWindow,
  });

  return true;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateRetryDelay(
  operation: string,
  attemptNumber: number
): number {
  const config = getConfig(operation);

  // Exponential backoff
  const baseDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attemptNumber - 1);

  // Cap at max delay
  const delay = Math.min(baseDelay, config.maxDelayMs);

  // Add jitter
  const jitter = delay * config.jitterFactor * (Math.random() * 2 - 1);
  const finalDelay = Math.max(0, Math.round(delay + jitter));

  return finalDelay;
}

/**
 * Execute with retry budget protection
 */
export async function executeWithRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    onRetry?: (attempt: number, delay: number) => void;
    onExhausted?: () => void;
  }
): Promise<T> {
  const config = getConfig(operation);
  const maxAttempts = options?.maxAttempts || config.maxRetries;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Check budget before each attempt (except first)
    if (attempt > 1 && !canRetry(operation)) {
      logger.error(`Retry budget exhausted for ${operation} at attempt ${attempt}`);
      options?.onExhausted?.();
      throw new Error(`Retry budget exhausted for ${operation}`);
    }

    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;

      // Check if it's a retryable error
      const error = err as Error & { retryable?: boolean };
      if (!error.retryable && attempt < maxAttempts) {
        // Non-retryable error, don't retry
        throw err;
      }

      if (attempt < maxAttempts) {
        // Calculate delay
        const delay = calculateRetryDelay(operation, attempt);
        logger.warn(`Retry attempt ${attempt}/${maxAttempts} for ${operation}`, {
          delay,
          error: lastError.message,
        });

        // Consume retry budget
        consumeRetry(operation);

        // Call onRetry callback
        options?.onRetry?.(attempt, delay);

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  if (lastError) {
    throw lastError;
  }
  throw new Error(`All retries exhausted for ${operation}`);
}

/**
 * Execute with retry budget protection (sync version)
 */
export function executeWithRetrySync<T>(
  operation: string,
  fn: () => T,
  options?: {
    maxAttempts?: number;
    onRetry?: (attempt: number, delay: number) => void;
    onExhausted?: () => void;
  }
): T {
  const config = getConfig(operation);
  const maxAttempts = options?.maxAttempts || config.maxRetries;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1 && !canRetry(operation)) {
      logger.error(`Retry budget exhausted for ${operation} at attempt ${attempt}`);
      options?.onExhausted?.();
      throw new Error(`Retry budget exhausted for ${operation}`);
    }

    try {
      return fn();
    } catch (err) {
      lastError = err as Error;

      const error = err as Error & { retryable?: boolean };
      if (!error.retryable && attempt < maxAttempts) {
        throw err;
      }

      if (attempt < maxAttempts) {
        const delay = calculateRetryDelay(operation, attempt);
        logger.warn(`Retry attempt ${attempt}/${maxAttempts} for ${operation}`, {
          delay,
          error: lastError.message,
        });

        consumeRetry(operation);
        options?.onRetry?.(attempt, delay);

        // Sync sleep (not ideal but sometimes necessary)
        const start = Date.now();
        while (Date.now() - start < delay) {
          // Busy wait (in production, consider async version)
        }
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error(`All retries exhausted for ${operation}`);
}

/**
 * Reset retry budget for an operation
 */
export function resetRetryBudget(operation: string): void {
  const config = getConfig(operation);
  const budget = getOrCreateBudget(operation);

  budget.remainingRetries = config.maxRetries;
  budget.usedInWindow = 0;
  budget.available = true;
  budget.windowResetAt = undefined;

  windowTracking.delete(operation);

  logger.info(`Retry budget reset for ${operation}`);
}

/**
 * Reset all retry budgets
 */
export function resetAllRetryBudgets(): void {
  for (const operation of budgets.keys()) {
    resetRetryBudget(operation);
  }
}
