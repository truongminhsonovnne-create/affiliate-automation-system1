/**
 * Retry Policy Module
 *
 * Handles retry/backoff decisions for failed publish jobs
 */

import type {
  RetryDecision,
  RetryContext,
  BackoffPolicy,
  PublisherAdapterResponse,
} from './types.js';
import {
  RETRY_DEFAULTS,
  DEFAULT_BACKOFF_POLICY,
  getChannelMaxRetries,
  getChannelBackoffDelay,
  isErrorRetryable,
  isErrorPermanent,
  ERROR_CATEGORIES,
} from './constants.js';
import { debug, info } from '../../utils/logger.js';

// ============================================
// Retry Decision
// ============================================

/**
 * Decide whether to retry a failed publish job
 */
export function decidePublishRetry(
  errorOrResult: PublisherAdapterResponse,
  context: RetryContext,
  options?: {
    maxRetries?: number;
    backoffPolicy?: BackoffPolicy;
    customPolicy?: (context: RetryContext, error: PublisherAdapterResponse) => RetryDecision;
  }
): RetryDecision {
  const { jobId, channel, attemptNumber } = context;

  const maxRetries = options?.maxRetries ?? getChannelMaxRetries(channel);
  const backoffPolicy = options?.backoffPolicy ?? DEFAULT_BACKOFF_POLICY;

  debug('Deciding retry', {
    jobId,
    channel,
    attemptNumber,
    maxRetries,
    success: errorOrResult.success,
    errorCategory: errorOrResult.errorCategory,
  });

  // If successful, no retry needed
  if (errorOrResult.success) {
    return {
      shouldRetry: false,
    };
  }

  // Check if max retries reached
  if (attemptNumber >= maxRetries) {
    debug('Max retries reached', { jobId, attemptNumber, maxRetries });

    return {
      shouldRetry: false,
      maxRetriesReached: true,
      errorCategory: errorOrResult.errorCategory ?? 'permanent',
    };
  }

  // Use custom policy if provided
  if (options?.customPolicy) {
    return options.customPolicy(context, errorOrResult);
  }

  // Determine error category
  const errorCategory = errorOrResult.errorCategory ?? categorizeError(errorOrResult);

  // Check if error is retryable
  if (!isErrorRetryable(errorCategory)) {
    debug('Error not retryable', { jobId, errorCategory });

    return {
      shouldRetry: false,
      errorCategory,
    };
  }

  // Check for rate limiting - longer backoff
  if (errorCategory === ERROR_CATEGORIES.RATE_LIMIT) {
    const backoffDelay = computeRetryBackoff(attemptNumber, {
      ...backoffPolicy,
      baseDelayMs: backoffPolicy.baseDelayMs * 3, // 3x longer for rate limits
    });

    const nextRetryAt = new Date(Date.now() + backoffDelay);

    info('Rate limited, scheduling retry', {
      jobId,
      attemptNumber,
      nextRetryAt,
      delayMs: backoffDelay,
    });

    return {
      shouldRetry: true,
      shouldRetryImmediately: false,
      nextRetryAt,
      errorCategory,
    };
  }

  // Transient or external errors - retry with standard backoff
  if (errorCategory === ERROR_CATEGORIES.TRANSIENT || errorCategory === ERROR_CATEGORIES.EXTERNAL) {
    const backoffDelay = computeRetryBackoff(attemptNumber, backoffPolicy);
    const nextRetryAt = new Date(Date.now() + backoffDelay);

    debug('Scheduling retry', {
      jobId,
      attemptNumber,
      nextRetryAt,
      delayMs: backoffDelay,
    });

    return {
      shouldRetry: true,
      shouldRetryImmediately: attemptNumber === 0,
      nextRetryAt,
      errorCategory,
    };
  }

  // Default: don't retry unknown error categories
  return {
    shouldRetry: false,
    errorCategory,
  };
}

/**
 * Compute retry backoff delay with exponential backoff and optional jitter
 */
export function computeRetryBackoff(
  attemptCount: number,
  options?: {
    baseDelayMs?: number;
    maxDelayMs?: number;
    multiplier?: number;
    jitter?: boolean;
  }
): number {
  const baseDelay = options?.baseDelayMs ?? RETRY_DEFAULTS.DEFAULT_BASE_DELAY_MS;
  const maxDelay = options?.maxDelayMs ?? RETRY_DEFAULTS.DEFAULT_MAX_DELAY_MS;
  const multiplier = options?.multiplier ?? RETRY_DEFAULTS.DEFAULT_MULTIPLIER;
  const useJitter = options?.jitter ?? RETRY_DEFAULTS.DEFAULT_JITTER;

  // Exponential backoff: base * (multiplier ^ attemptCount)
  let delay = baseDelay * Math.pow(multiplier, attemptCount);

  // Cap at max delay
  delay = Math.min(delay, maxDelay);

  // Add jitter to prevent thundering herd
  if (useJitter) {
    const jitterAmount = delay * 0.1; // 10% jitter
    const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
    delay = Math.max(0, delay + jitter);
  }

  return Math.round(delay);
}

/**
 * Check if a failure is retryable
 */
export function isRetryablePublishFailure(
  errorOrResult: PublisherAdapterResponse,
  _context?: RetryContext
): boolean {
  const category = errorOrResult.errorCategory ?? categorizeError(errorOrResult);
  return isErrorRetryable(category);
}

// ============================================
// Error Categorization
// ============================================

/**
 * Categorize an error based on response
 */
function categorizeError(response: PublisherAdapterResponse): 'transient' | 'validation' | 'permanent' | 'rate_limit' | 'external' {
  // If error category is already set, use it
  if (response.errorCategory) {
    return response.errorCategory;
  }

  // Map error codes to categories
  const errorCode = response.errorCode?.toUpperCase() ?? '';

  if (errorCode.includes('VALIDATION') || errorCode.includes('PAYLOAD')) {
    return ERROR_CATEGORIES.VALIDATION;
  }

  if (errorCode.includes('RATE_LIMIT') || errorCode.includes('THROTTLE')) {
    return ERROR_CATEGORIES.RATE_LIMIT;
  }

  if (errorCode.includes('TIMEOUT')) {
    return ERROR_CATEGORIES.TRANSIENT;
  }

  if (errorCode.includes('NETWORK') || errorCode.includes('CONNECTION')) {
    return ERROR_CATEGORIES.TRANSIENT;
  }

  if (errorCode.includes('AUTH') || errorCode.includes('PERMISSION')) {
    return ERROR_CATEGORIES.PERMANENT;
  }

  // Check error message for common patterns
  const message = response.errorMessage?.toLowerCase() ?? '';

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return ERROR_CATEGORIES.RATE_LIMIT;
  }

  if (message.includes('invalid') || message.includes('missing required')) {
    return ERROR_CATEGORIES.VALIDATION;
  }

  if (message.includes('not found') || message.includes('does not exist')) {
    return ERROR_CATEGORIES.VALIDATION;
  }

  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return ERROR_CATEGORIES.PERMANENT;
  }

  // Default to external for unknown errors
  return ERROR_CATEGORIES.EXTERNAL;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get recommended max retries for a channel
 */
export function getRecommendedMaxRetries(channel: string): number {
  return getChannelMaxRetries(channel as any);
}

/**
 * Get recommended base backoff for a channel
 */
export function getRecommendedBackoff(channel: string): number {
  return getChannelBackoffDelay(channel as any);
}

/**
 * Calculate next retry time based on policy
 */
export function calculateNextRetryTime(
  attemptNumber: number,
  channel: string,
  options?: {
    backoffPolicy?: BackoffPolicy;
  }
): Date {
  const baseDelay = getRecommendedBackoff(channel);
  const delay = computeRetryBackoff(attemptNumber, {
    ...(options?.backoffPolicy ?? DEFAULT_BACKOFF_POLICY),
    baseDelayMs: baseDelay,
  });

  return new Date(Date.now() + delay);
}
