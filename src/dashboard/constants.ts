/**
 * Dashboard Constants
 *
 * Default values, limits, and configuration for dashboard layer.
 * No magic numbers should be hardcoded in query logic.
 */

// =============================================================================
// PAGINATION DEFAULTS
// =============================================================================

/** Default page size for list endpoints */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum page size to prevent abuse */
export const MAX_PAGE_SIZE = 100;

/** Minimum page size */
export const MIN_PAGE_SIZE = 1;

/** Default page number */
export const DEFAULT_PAGE = 1;

// =============================================================================
// SORTING CONFIGURATION
// =============================================================================

/** Default sort direction */
export const DEFAULT_SORT_DIRECTION: 'asc' | 'desc' = 'desc';

/** Default sort field for activities */
export const DEFAULT_ACTIVITY_SORT_FIELD = 'created_at';

/** Allowed sort fields per resource */
export const ALLOWED_SORT_FIELDS = {
  // Product
  products: ['created_at', 'updated_at', 'title', 'price', 'status'] as const,

  // Crawl jobs
  crawlJobs: ['created_at', 'started_at', 'completed_at', 'status', 'items_found', 'duration'] as const,

  // Publish jobs
  publishJobs: ['created_at', 'scheduled_at', 'published_at', 'priority', 'status', 'attempt_count'] as const,

  // AI content
  aiContents: ['created_at', 'completed_at', 'status', 'quality_score'] as const,

  // Dead letters
  deadLetters: ['created_at', 'last_attempt_at', 'status', 'attempt_count', 'error_category'] as const,

  // Workers
  workers: ['last_seen_at', 'identity', 'type', 'status'] as const,

  // Activity
  activities: ['timestamp', 'created_at', 'severity', 'type'] as const,
} as const;

// =============================================================================
// TIME RANGE DEFAULTS
// =============================================================================

/** Default time range for dashboard queries */
export const DEFAULT_TIME_RANGE: '24h' = '24h';

/** Time range options in milliseconds */
export const TIME_RANGE_MS = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
} as const;

/** Default custom time range start (7 days ago) */
export const DEFAULT_TIME_RANGE_START_DAYS = 7;

// =============================================================================
// ACTIVITY & TRENDS
// =============================================================================

/** Default limit for recent activities */
export const DEFAULT_ACTIVITY_LIMIT = 50;

/** Maximum activity items to fetch */
export const MAX_ACTIVITY_LIMIT = 200;

/** Default trend bucket size */
export const DEFAULT_TREND_BUCKET_SIZE: 'hour' | 'day' = 'day';

/** Trend buckets for different time ranges */
export const TREND_BUCKET_CONFIG = {
  '1h': 'minute',
  '6h': 'hour',
  '24h': 'hour',
  '7d': 'day',
  '30d': 'day',
} as const;

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

/** Default cache TTL in seconds */
export const DEFAULT_CACHE_TTL_SECONDS = 60;

/** Cache TTL for different query types */
export const CACHE_TTL_SECONDS = {
  overview: 30,
  health: 10,
  queueSummary: 30,
  trends: 300, // 5 minutes
  activity: 15,
  list: 15,
  detail: 30,
} as const;

/** Maximum cache age before forcing refresh */
export const MAX_CACHE_AGE_SECONDS = 300;

// =============================================================================
// STALE DATA THRESHOLDS
// =============================================================================

/** Threshold for worker to be considered stale (in ms) */
export const WORKER_STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/** Threshold for critical worker stale (in ms) */
export const WORKER_CRITICAL_STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

/** Threshold for job to be considered stuck (in ms) */
export const JOB_STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/** Threshold for critical stuck job (in ms) */
export const JOB_CRITICAL_STUCK_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/** Threshold for activity to be considered recent (in ms) */
export const RECENT_ACTIVITY_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

// =============================================================================
// SEARCH CONFIGURATION
// =============================================================================

/** Maximum search query length */
export const MAX_SEARCH_QUERY_LENGTH = 200;

/** Minimum search query length */
export const MIN_SEARCH_QUERY_LENGTH = 2;

/** Search debounce ms (for frontend) */
export const SEARCH_DEBOUNCE_MS = 300;

// =============================================================================
// FAILURE INSIGHTS
// =============================================================================

/** Maximum failure reasons to show */
export const MAX_FAILURE_REASONS = 10;

/** Maximum errors per hotspot to store */
export const MAX_HOTSPOT_ERRORS = 5;

/** Failure aggregation window (in days) */
export const FAILURE_AGGREGATION_DAYS = 7;

// =============================================================================
// API CONFIGURATION
// =============================================================================

/** API version */
export const DASHBOARD_API_VERSION = '1.0.0';

/** Correlation ID prefix */
export const DASHBOARD_CORRELATION_PREFIX = 'dash';

/** Default headers for API responses */
export const DEFAULT_RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
} as const;

// =============================================================================
// STATUS MAPPINGS
// =============================================================================

/** Map database status to dashboard status */
export const STATUS_MAPPINGS = {
  // Crawl jobs
  crawlJob: {
    pending: 'pending',
    running: 'inProgress',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'cancelled',
  } as const,

  // Publish jobs
  publishJob: {
    pending: 'pending',
    ready: 'pending',
    scheduled: 'pending',
    publishing: 'inProgress',
    published: 'completed',
    failed: 'failed',
    retry_scheduled: 'pending',
    cancelled: 'cancelled',
  } as const,

  // AI content
  aiContent: {
    pending: 'pending',
    processing: 'processing',
    completed: 'completed',
    failed: 'failed',
  } as const,

  // Workers
  worker: {
    active: 'active',
    idle: 'idle',
    stale: 'stale',
    offline: 'offline',
  } as const,
} as const;

// =============================================================================
// ERROR CODES
// =============================================================================

/** Dashboard-specific error codes */
export const DASHBOARD_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_QUERY: 'INVALID_QUERY',
  TIMEOUT: 'TIMEOUT',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// =============================================================================
// QUERY LIMITS
// =============================================================================

/** Maximum filters per query */
export const MAX_FILTERS = 20;

/** Maximum date range days */
export const MAX_DATE_RANGE_DAYS = 90;

/** Minimum date range days */
export const MIN_DATE_RANGE_DAYS = 1;
