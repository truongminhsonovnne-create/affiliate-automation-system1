/**
 * Operator Actions - Constants & Default Values
 * Centralized configuration for operator action behaviors
 */

// =============================================================================
// ACTION TIMEOUT DEFAULTS
// =============================================================================

/** Default timeout for action mutations (in milliseconds) */
export const ACTION_TIMEOUT_MS = 30000;

/** Extended timeout for long-running operations */
export const ACTION_LONG_RUNNING_TIMEOUT_MS = 120000;

/** Timeout for specific action types */
export const ACTION_TIMEOUT_BY_TYPE: Record<string, number> = {
  RETRY_PUBLISH_JOB: 30000,
  CANCEL_PUBLISH_JOB: 15000,
  UNLOCK_PUBLISH_JOB: 10000,
  REQUEUE_DEAD_LETTER: 30000,
  RESOLVE_DEAD_LETTER: 15000,
  TRIGGER_FLASH_SALE_CRAWL: 120000,
  TRIGGER_SEARCH_CRAWL: 120000,
  TRIGGER_AI_ENRICHMENT: 90000,
  TRIGGER_PUBLISH_PREPARATION: 60000,
  TRIGGER_PUBLISHER_RUN: 120000,
};

// =============================================================================
// CONFIRMATION DEFAULTS
// =============================================================================

/** Default confirmation variant by severity */
export const CONFIRMATION_VARIANTS = {
  info: 'default',
  warning: 'warning',
  destructive: 'destructive',
  critical: 'destructive',
} as const;

/** Default confirm button labels */
export const DEFAULT_CONFIRM_LABELS = {
  RETRY_PUBLISH_JOB: 'Retry Job',
  CANCEL_PUBLISH_JOB: 'Cancel Job',
  UNLOCK_PUBLISH_JOB: 'Unlock Job',
  REQUEUE_DEAD_LETTER: 'Requeue',
  RESOLVE_DEAD_LETTER: 'Mark Resolved',
  TRIGGER_FLASH_SALE_CRAWL: 'Start Crawl',
  TRIGGER_SEARCH_CRAWL: 'Start Crawl',
  TRIGGER_AI_ENRICHMENT: 'Start Enrichment',
  TRIGGER_PUBLISH_PREPARATION: 'Start Preparation',
  TRIGGER_PUBLISHER_RUN: 'Start Publisher',
} as const;

/** Default cancel button labels */
export const DEFAULT_CANCEL_LABELS = {
  RETRY_PUBLISH_JOB: 'Cancel',
  CANCEL_PUBLISH_JOB: 'Keep Job',
  UNLOCK_PUBLISH_JOB: 'Cancel',
  REQUEUE_DEAD_LETTER: 'Cancel',
  RESOLVE_DEAD_LETTER: 'Cancel',
  TRIGGER_FLASH_SALE_CRAWL: 'Cancel',
  TRIGGER_SEARCH_CRAWL: 'Cancel',
  TRIGGER_AI_ENRICHMENT: 'Cancel',
  TRIGGER_PUBLISH_PREPARATION: 'Cancel',
  TRIGGER_PUBLISHER_RUN: 'Cancel',
} as const;

// =============================================================================
// CLICK PROTECTION & DEBOUNCE
// =============================================================================

/** Duration to disable button after click (ms) */
export const CLICK_LOCK_DURATION_MS = 2000;

/** Debounce duration for rapid clicks (ms) */
export const CLICK_DEBOUNCE_MS = 500;

/** Duration to show loading state (ms) - prevents flash */
export const MIN_LOADING_DISPLAY_MS = 500;

// =============================================================================
// TOAST CONFIGURATION
// =============================================================================

/** Toast display duration by type (ms) */
export const TOAST_DURATION_MS = {
  success: 4000,
  error: 8000,
  warning: 6000,
  info: 4000,
} as const;

/** Whether to persist certain toast types */
export const TOAST_PERSISTENT_TYPES = ['error', 'critical'] as const;

// =============================================================================
// MUTATION CONCURRENCY
// =============================================================================

/** Maximum concurrent mutations of the same type */
export const MAX_CONCURRENT_MUTATIONS = 3;

/** Whether to queue or reject concurrent mutations */
export const CONCURRENT_MUTATION_STRATEGY: 'queue' | 'reject' | 'debounce' = 'debounce';

// =============================================================================
// DESTRUCTIVE ACTION STYLING
// =============================================================================

/** Actions considered destructive (require extra confirmation) */
export const DESTRUCTIVE_ACTIONS = new Set([
  'CANCEL_PUBLISH_JOB',
  'UNLOCK_PUBLISH_JOB',
  'RESOLVE_DEAD_LETTER',
]);

/** Actions requiring typing confirmation */
export const TYPING_CONFIRMATION_ACTIONS = new Set([
  'CANCEL_PUBLISH_JOB',
]);

/** Text that must be typed for confirmation */
export const TYPING_CONFIRMATION_TEXTS: Record<string, string> = {
  CANCEL_PUBLISH_JOB: 'CANCEL',
};

// =============================================================================
// QUERY INVALIDATION
// =============================================================================

/** Default delay before invalidating queries after mutation (ms) */
export const INVALIDATION_DELAY_MS = 500;

/** Query keys to invalidate by action type */
export const INVALIDATION_SCOPES: Record<string, string[]> = {
  RETRY_PUBLISH_JOB: ['publish-jobs', 'publish-job', 'dashboard-overview'],
  CANCEL_PUBLISH_JOB: ['publish-jobs', 'publish-job', 'dashboard-overview', 'activity'],
  UNLOCK_PUBLISH_JOB: ['publish-jobs', 'publish-job'],
  REQUEUE_DEAD_LETTER: ['dead-letters', 'dead-letter', 'dashboard-overview'],
  RESOLVE_DEAD_LETTER: ['dead-letters', 'dead-letter', 'dashboard-overview', 'activity'],
  TRIGGER_FLASH_SALE_CRAWL: ['crawl-jobs', 'dashboard-overview', 'activity'],
  TRIGGER_SEARCH_CRAWL: ['crawl-jobs', 'dashboard-overview', 'activity'],
  TRIGGER_AI_ENRICHMENT: ['products', 'enrichment-jobs', 'dashboard-overview', 'activity'],
  TRIGGER_PUBLISH_PREPARATION: ['publish-jobs', 'preparation-jobs', 'dashboard-overview'],
  TRIGGER_PUBLISHER_RUN: ['publish-jobs', 'publisher-runs', 'dashboard-overview', 'activity'],
};

// =============================================================================
// BULK ACTION LIMITS
// =============================================================================

/** Maximum number of items for bulk operations */
export const BULK_ACTION_MAX_ITEMS = 50;

/** Minimum number of items to show bulk action option */
export const BULK_ACTION_MIN_ITEMS = 2;

// =============================================================================
// SAFE REFRESH DELAYS
// =============================================================================

/** Delay before auto-refresh after action (ms) */
export const AUTO_REFRESH_DELAY_MS = 2000;

/** Maximum auto-refresh attempts */
export const MAX_AUTO_REFRESH_ATTEMPTS = 3;

// =============================================================================
// ERROR MESSAGES
// =============================================================================

/** User-friendly error messages */
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'The request could not be validated. Please check your input.',
  CONFLICT: 'The target has changed since you last viewed it. Please refresh and try again.',
  NOT_FOUND: 'The target entity could not be found. It may have been deleted.',
  DEPENDENCY_FAILURE: 'A required dependency is unavailable. Please try again later.',
  TIMEOUT: 'The operation took too long. Please try again.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please contact support if this persists.',
  UNSAFE_OPERATION: 'This operation cannot be performed due to safety checks.',
  RATE_LIMITED: 'Too many requests. Please wait before trying again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNKNOWN_ERROR: 'An unknown error occurred.',
} as const;

// =============================================================================
// SUCCESS MESSAGES
// =============================================================================

/** Success messages by action type */
export const SUCCESS_MESSAGES = {
  RETRY_PUBLISH_JOB: 'Publish job has been queued for retry.',
  CANCEL_PUBLISH_JOB: 'Publish job has been cancelled.',
  UNLOCK_PUBLISH_JOB: 'Publish job has been unlocked.',
  REQUEUE_DEAD_LETTER: 'Item has been requeued for processing.',
  RESOLVE_DEAD_LETTER: 'Dead letter has been marked as resolved.',
  TRIGGER_FLASH_SALE_CRAWL: 'Flash sale crawl has been started.',
  TRIGGER_SEARCH_CRAWL: 'Search crawl has been started.',
  TRIGGER_AI_ENRICHMENT: 'AI enrichment has been started.',
  TRIGGER_PUBLISH_PREPARATION: 'Publish preparation has been started.',
  TRIGGER_PUBLISHER_RUN: 'Publisher run has been started.',
} as const;

// =============================================================================
// AUDIT NOTICES
// =============================================================================

/** Audit notices to display in UI */
export const AUDIT_NOTICES = {
  default: 'This action will be recorded in the audit log.',
  destructive: 'This action is irreversible and will be logged for compliance.',
  manual_run: 'This manual operation will be tracked in the activity log.',
} as const;

// =============================================================================
// ACTION LABELS & DESCRIPTIONS
// =============================================================================

/** Display labels for action types */
export const ACTION_LABELS: Record<string, string> = {
  RETRY_PUBLISH_JOB: 'Retry',
  CANCEL_PUBLISH_JOB: 'Cancel',
  UNLOCK_PUBLISH_JOB: 'Unlock',
  REQUEUE_DEAD_LETTER: 'Requeue',
  RESOLVE_DEAD_LETTER: 'Resolve',
  TRIGGER_FLASH_SALE_CRAWL: 'Flash Sale Crawl',
  TRIGGER_SEARCH_CRAWL: 'Search Crawl',
  TRIGGER_AI_ENRICHMENT: 'AI Enrichment',
  TRIGGER_PUBLISH_PREPARATION: 'Prepare Publish',
  TRIGGER_PUBLISHER_RUN: 'Run Publisher',
} as const;

/** Full descriptions for action types */
export const ACTION_DESCRIPTIONS: Record<string, string> = {
  RETRY_PUBLISH_JOB: 'Retry publishing this job from where it left off',
  CANCEL_PUBLISH_JOB: 'Cancel this publish job immediately',
  UNLOCK_PUBLISH_JOB: 'Force unlock a stale publish job',
  REQUEUE_DEAD_LETTER: 'Requeue this item for processing',
  RESOLVE_DEAD_LETTER: 'Mark this dead letter as resolved',
  TRIGGER_FLASH_SALE_CRAWL: 'Manually trigger a flash sale crawl',
  TRIGGER_SEARCH_CRAWL: 'Manually trigger a product search crawl',
  TRIGGER_AI_ENRICHMENT: 'Trigger AI enrichment for products',
  TRIGGER_PUBLISH_PREPARATION: 'Start publish preparation process',
  TRIGGER_PUBLISHER_RUN: 'Start the publisher to publish content',
} as const;

// =============================================================================
// PUBLISH JOB STATES
// =============================================================================

/** Publish job states */
export const PUBLISH_JOB_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  STALE: 'stale',
} as const;

// =============================================================================
// DEAD LETTER STATES
// =============================================================================

/** Dead letter states */
export const DEAD_LETTER_STATES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  RESOLVED: 'resolved',
  REQUEUED: 'requeued',
} as const;

// =============================================================================
// GUARD CONFIGURATION
// =============================================================================

/** Guard warning thresholds */
export const GUARD_CONFIG = {
  STALE_JOB_THRESHOLD_HOURS: 24,
  MAX_RETRY_COUNT: 5,
  MAX_CANCEL_COUNT: 3,
} as const;
