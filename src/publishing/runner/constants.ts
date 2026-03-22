/**
 * Publisher Runner Constants
 *
 * All default values, thresholds, and configuration constants
 */

import type { PublisherChannel, BackoffPolicy } from './types.js';

// ============================================
// Worker Configuration
// ============================================

/**
 * Default worker configuration
 */
export const WORKER_DEFAULTS = {
  DEFAULT_WORKER_ID: 'publisher-worker',
  DEFAULT_WORKER_NAME: 'Publisher Worker',
  DEFAULT_POLL_INTERVAL_MS: 5000,
  DEFAULT_POLL_BATCH_SIZE: 10,
  DEFAULT_CLAIM_BATCH_SIZE: 20,
} as const;

// ============================================
// Job Selection Configuration
// ============================================

/**
 * Job selection defaults
 */
export const SELECTION_DEFAULTS = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200,
  DEFAULT_PRIORITY_MIN: 0,
  DEFAULT_PRIORITY_MAX: 100,
  STALE_LOCK_THRESHOLD_MS: 300000, // 5 minutes
  RETRY_ENABLED: true,
} as const;

// ============================================
// Lock/Claim Configuration
// ============================================

/**
 * Lock/claim defaults
 */
export const LOCK_DEFAULTS = {
  DEFAULT_LOCK_DURATION_MS: 300000, // 5 minutes
  MIN_LOCK_DURATION_MS: 60000, // 1 minute
  MAX_LOCK_DURATION_MS: 600000, // 10 minutes
  STALE_LOCK_RECOVERY_ENABLED: true,
  LOCK_REFRESH_INTERVAL_MS: 60000, // 1 minute
} as const;

// ============================================
// Retry Configuration
// ============================================

/**
 * Default retry configuration
 */
export const RETRY_DEFAULTS = {
  DEFAULT_MAX_RETRIES: 3,
  MAX_RETRIES_LIMIT: 10,
  DEFAULT_BASE_DELAY_MS: 60000, // 1 minute
  DEFAULT_MAX_DELAY_MS: 3600000, // 1 hour
  DEFAULT_MULTIPLIER: 2,
  DEFAULT_JITTER: true,
  RETRYABLE_ERROR_CATEGORIES: ['transient', 'rate_limit', 'external'] as const,
  NON_RETRYABLE_ERROR_CATEGORIES: ['validation', 'permanent'] as const,
} as const;

/**
 * Default backoff policy
 */
export const DEFAULT_BACKOFF_POLICY: BackoffPolicy = {
  baseDelayMs: RETRY_DEFAULTS.DEFAULT_BASE_DELAY_MS,
  maxDelayMs: RETRY_DEFAULTS.DEFAULT_MAX_DELAY_MS,
  multiplier: RETRY_DEFAULTS.DEFAULT_MULTIPLIER,
  jitter: RETRY_DEFAULTS.DEFAULT_JITTER,
};

// ============================================
// Execution Configuration
// ============================================

/**
 * Execution defaults
 */
export const EXECUTION_DEFAULTS = {
  DEFAULT_TIMEOUT_MS: 30000, // 30 seconds
  MIN_TIMEOUT_MS: 5000,
  MAX_TIMEOUT_MS: 300000, // 5 minutes
  DEFAULT_CONCURRENCY: 5,
  MAX_CONCURRENCY: 20,
  DRY_RUN_DEFAULT: false,
} as const;

// ============================================
// Error Categories
// ============================================

/**
 * Error category mappings
 */
export const ERROR_CATEGORIES = {
  TRANSIENT: 'transient' as const,
  VALIDATION: 'validation' as const,
  PERMANENT: 'permanent' as const,
  RATE_LIMIT: 'rate_limit' as const,
  EXTERNAL: 'external' as const,
};

/**
 * Map HTTP status codes to error categories
 */
export const HTTP_STATUS_ERROR_CATEGORIES: Record<number, string> = {
  400: ERROR_CATEGORIES.VALIDATION,
  401: ERROR_CATEGORIES.PERMANENT,
  403: ERROR_CATEGORIES.PERMANENT,
  404: ERROR_CATEGORIES.VALIDATION,
  429: ERROR_CATEGORIES.RATE_LIMIT,
  500: ERROR_CATEGORIES.EXTERNAL,
  502: ERROR_CATEGORIES.TRANSIENT,
  503: ERROR_CATEGORIES.TRANSIENT,
  504: ERROR_CATEGORIES.TRANSIENT,
};

/**
 * Error codes
 */
export const ERROR_CODES = {
  ADAPTER_ERROR: 'ADAPTER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  PAYLOAD_ERROR: 'PAYLOAD_ERROR',
  CAPABILITY_ERROR: 'CAPABILITY_ERROR',
  LOCK_ERROR: 'LOCK_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// ============================================
// Channel Configuration
// ============================================

/**
 * Per-channel execution timeouts
 */
export const CHANNEL_TIMEOUTS: Record<PublisherChannel, number> = {
  tiktok: 45000, // 45 seconds
  facebook: 30000, // 30 seconds
  website: 15000, // 15 seconds
};

/**
 * Per-channel max retries
 */
export const CHANNEL_MAX_RETRIES: Record<PublisherChannel, number> = {
  tiktok: 3,
  facebook: 3,
  website: 2,
};

/**
 * Per-channel base backoff delays (in ms)
 */
export const CHANNEL_BACKOFF_DELAYS: Record<PublisherChannel, number> = {
  tiktok: 120000, // 2 minutes
  facebook: 60000, // 1 minute
  website: 30000, // 30 seconds
};

// ============================================
// Result Thresholds
// ============================================

/**
 * Partial failure thresholds
 */
export const THRESHOLD_DEFAULTS = {
  MIN_SUCCESS_RATE: 0.5, // 50%
  MAX_FAILURE_RATE: 0.5, // 50%
  CRITICAL_FAILURE_RATE: 0.8, // 80%
} as const;

// ============================================
// Logging Configuration
// ============================================

/**
 * Logging configuration
 */
export const RUNNER_LOG_CONFIG = {
  LOG_JOB_SELECTION: true,
  LOG_JOB_CLAIMING: true,
  LOG_ADAPTER_EXECUTION: true,
  LOG_LIFECYCLE_UPDATES: true,
  LOG_RETRY_DECISIONS: true,
  LOG_BATCH_PROGRESS: true,
} as const;

// ============================================
// Utility Functions
// ============================================

/**
 * Get timeout for a channel
 */
export function getChannelTimeout(channel: PublisherChannel): number {
  return CHANNEL_TIMEOUTS[channel] ?? EXECUTION_DEFAULTS.DEFAULT_TIMEOUT_MS;
}

/**
 * Get max retries for a channel
 */
export function getChannelMaxRetries(channel: PublisherChannel): number {
  return CHANNEL_MAX_RETRIES[channel] ?? RETRY_DEFAULTS.DEFAULT_MAX_RETRIES;
}

/**
 * Get backoff delay for a channel
 */
export function getChannelBackoffDelay(channel: PublisherChannel): number {
  return CHANNEL_BACKOFF_DELAYS[channel] ?? RETRY_DEFAULTS.DEFAULT_BASE_DELAY_MS;
}

/**
 * Check if error is retryable
 */
export function isErrorRetryable(errorCategory: string): boolean {
  return RETRY_DEFAULTS.RETRYABLE_ERROR_CATEGORIES.includes(
    errorCategory as typeof RETRY_DEFAULTS.RETRYABLE_ERROR_CATEGORIES[number]
  );
}

/**
 * Check if error is permanent
 */
export function isErrorPermanent(errorCategory: string): boolean {
  return RETRY_DEFAULTS.NON_RETRYABLE_ERROR_CATEGORIES.includes(
    errorCategory as typeof RETRY_DEFAULTS.NON_RETRYABLE_ERROR_CATEGORIES[number]
  );
}
