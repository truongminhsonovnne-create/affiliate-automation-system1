/**
 * Control Plane Constants
 *
 * Centralized configuration for the admin control plane.
 */

import type { AdminRole, AdminActionType } from './types.js';

// =============================================================================
// PAGINATION
// =============================================================================

/** Default page size */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum page size allowed */
export const MAX_PAGE_SIZE = 100;

/** Minimum page size */
export const MIN_PAGE_SIZE = 1;

// =============================================================================
// TIME WINDOWS
// =============================================================================

/** Default time window for queries (in ms) */
export const DEFAULT_QUERY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Maximum time window for queries (in ms) */
export const MAX_QUERY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/** Default recent items limit */
export const DEFAULT_RECENT_LIMIT = 50;

// =============================================================================
// ADMIN ACTION TIMEOUTS
// =============================================================================

/** Default action timeout in ms */
export const DEFAULT_ACTION_TIMEOUT_MS = 30000;

/** Long-running action timeout in ms */
export const LONG_RUNNING_ACTION_TIMEOUT_MS = 120000;

// =============================================================================
// STALE LOCK HANDLING
// =============================================================================

/** Threshold for stale lock detection (in ms) */
export const STALE_LOCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/** Threshold for critical stale lock (in ms) */
export const CRITICAL_STALE_LOCK_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

/** Maximum age for orphaned job detection (in ms) */
export const ORPHANED_JOB_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// =============================================================================
// ROLE PERMISSIONS
// =============================================================================

/** Allowed roles list */
export const ALLOWED_ADMIN_ROLES: AdminRole[] = [
  'readonly_observer',
  'operator',
  'admin',
  'super_admin',
];

/** Default role for requests without actor */
export const DEFAULT_ADMIN_ROLE: AdminRole = 'operator';

/** Actions that require super_admin */
export const SUPER_ADMIN_ACTIONS: AdminActionType[] = [
  'publishing.job.unlock',
];

/** Actions that require admin or above */
export const ADMIN_ACTIONS: AdminActionType[] = [
  'publishing.job.retry',
  'publishing.job.cancel',
  'dead_letter.requeue',
  'dead_letter.resolve',
  'admin.actions.read',
];

/** Actions that require operator or above */
export const OPERATOR_ACTIONS: AdminActionType[] = [
  'crawl.flash_sale.trigger',
  'crawl.search.trigger',
  'ai.enrich.product',
  'ai.enrich.batch',
  'publishing.prepare',
  'publishing.run',
];

// =============================================================================
// DRY-RUN POLICY
// =============================================================================

/** Default dry-run policy */
export const DEFAULT_DRY_RUN = false;

/** Actions that support dry-run */
export const DRY_RUN_SUPPORTED_ACTIONS: AdminActionType[] = [
  'crawl.flash_sale.trigger',
  'crawl.search.trigger',
  'publishing.prepare',
  'publishing.run',
  'publishing.job.retry',
];

// =============================================================================
// CORRELATION ID
// =============================================================================

/** Correlation ID header name */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/** Request ID header name */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Default correlation ID prefix */
export const DEFAULT_CORRELATION_PREFIX = 'cp';

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/** Enable audit logging by default */
export const AUDIT_LOGGING_ENABLED = true;

/** Maximum payload size for audit logging (bytes) */
export const MAX_AUDIT_PAYLOAD_SIZE = 64000;

/** Audit logging flush interval */
export const AUDIT_FLUSH_INTERVAL_MS = 5000;

// =============================================================================
// API RESPONSE
// =============================================================================

/** API version */
export const API_VERSION = 'v1';

/** Response version */
export const RESPONSE_VERSION = '1.0.0';

// =============================================================================
// GUARD SETTINGS
// =============================================================================

/** Enable operational guards by default */
export const GUARDS_ENABLED = true;

/** Maximum concurrent manual crawls */
export const MAX_CONCURRENT_CRAWLS = 5;

/** Maximum batch size for AI enrichment */
export const MAX_AI_BATCH_SIZE = 50;

/** Maximum products for publish preparation */
export const MAX_PUBLISH_PREPARE_BATCH = 100;

/** Maximum jobs for publisher run */
export const MAX_PUBLISHER_RUN_JOBS = 50;

/** Require reason for destructive actions */
export const REQUIRE_REASON_FOR_DESTRUCTIVE = true;

/** Destructive action types */
export const DESTRUCTIVE_ACTIONS: AdminActionType[] = [
  'publishing.job.cancel',
  'publishing.job.unlock',
  'dead_letter.requeue',
  'dead_letter.resolve',
];

// =============================================================================
// ERROR CODES
// =============================================================================

/** Error codes */
export const ERROR_CODES = {
  // Validation errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Authorization errors (4xx)
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',

  // Not found errors (4xx)
  NOT_FOUND: 'NOT_FOUND',
  TARGET_NOT_FOUND: 'TARGET_NOT_FOUND',

  // Conflict errors (4xx)
  CONFLICT: 'CONFLICT',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  DUPLICATE_ACTION: 'DUPLICATE_ACTION',
  ALREADY_IN_STATE: 'ALREADY_IN_STATE',

  // Safety errors (4xx)
  UNSAFE_OPERATION: 'UNSAFE_OPERATION',
  GUARD_REJECTED: 'GUARD_REJECTED',
  SAFETY_VIOLATION: 'SAFETY_VIOLATION',

  // Dependency errors (5xx)
  DEPENDENCY_FAILURE: 'DEPENDENCY_FAILURE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Internal errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNHANDLED_ERROR: 'UNHANDLED_ERROR',

  // Timeout errors (5xx)
  TIMEOUT: 'TIMEOUT',
  ACTION_TIMEOUT: 'ACTION_TIMEOUT',
} as const;

// =============================================================================
// VALIDATION LIMITS
// =============================================================================

/** Maximum URL length */
export const MAX_URL_LENGTH = 2048;

/** Maximum keyword length */
export const MAX_KEYWORD_LENGTH = 200;

/** Maximum reason length */
export const MAX_REASON_LENGTH = 500;

/** Maximum resolution length */
export const MAX_RESOLUTION_LENGTH = 1000;

/** Product ID validation pattern */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
