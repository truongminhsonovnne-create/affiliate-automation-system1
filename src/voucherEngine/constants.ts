/**
 * Voucher Engine Constants
 *
 * Default values and configuration for the voucher engine.
 */

// =============================================================================
// Cache Configuration
// =============================================================================

/** Default cache TTL in seconds (15 minutes) */
export const DEFAULT_CACHE_TTL_SECONDS = 900;

/** Maximum cache TTL in seconds (1 hour) */
export const MAX_CACHE_TTL_SECONDS = 3600;

/** Minimum cache TTL in seconds (1 minute) */
export const MIN_CACHE_TTL_SECONDS = 60;

/** Cache key prefix */
export const CACHE_KEY_PREFIX = 'voucher_resolution';

/** Default cache strategy */
export const DEFAULT_CACHE_STRATEGY = 'memory_with_persistence' as const;

// =============================================================================
// Scoring Weights
// =============================================================================

/** Weight for applicability score in final ranking (0-1) */
export const WEIGHT_APPLICABILITY = 0.35;

/** Weight for value score in final ranking (0-1) */
export const WEIGHT_VALUE = 0.35;

/** Weight for freshness score in final ranking (0-1) */
export const WEIGHT_FRESHNESS = 0.15;

/** Weight for priority score in final ranking (0-1) */
export const WEIGHT_PRIORITY = 0.15;

/** Maximum ranking score */
export const MAX_RANKING_SCORE = 100;

/** Minimum ranking score threshold */
export const MIN_RANKING_SCORE_THRESHOLD = 10;

// =============================================================================
// Eligibility Thresholds
// =============================================================================

/** Minimum eligibility score to be considered eligible (0-1) */
export const MIN_ELIGIBILITY_SCORE = 0.5;

/** Critical severity threshold */
export const CRITICAL_SEVERITY_THRESHOLD = 0.3;

/** Warning severity threshold */
export const WARNING_SEVERITY_THRESHOLD = 0.7;

/** Minimum applicability certainty (0-1) */
export const MIN_APPLICABILITY_CERTAINTY = 0.6;

/** Minimum scope precision for exact match (0-1) */
export const MIN_SCOPE_PRECISION_EXACT = 0.95;

/** Minimum scope precision for category match (0-1) */
export const MIN_SCOPE_PRECISION_CATEGORY = 0.7;

/** Minimum scope precision for shop match (0-1) */
export const MIN_SCOPE_PRECISION_SHOP = 0.8;

// =============================================================================
// Ranking Configuration
// =============================================================================

/** Default number of candidates to return */
export const DEFAULT_MAX_CANDIDATES = 5;

/** Maximum number of candidates to return */
export const MAX_CANDIDATES = 20;

/** Minimum candidates for fallback */
export const MIN_FALLBACK_CANDIDATES = 3;

/** Ranking freshness decay factor (per day) */
export const FRESHNESS_DECAY_FACTOR = 0.02;

/** Days until voucher is considered stale */
export const VOUCHER_STALE_DAYS = 7;

/** Days until voucher is considered fresh */
export const VOUCHER_FRESH_DAYS = 1;

// =============================================================================
// Fallback Configuration
// =============================================================================

/** Include fallback vouchers when no exact match */
export const DEFAULT_INCLUDE_FALLBACK = true;

/** Fallback candidate count */
export const DEFAULT_FALLBACK_COUNT = 3;

/** Fallback minimum score threshold */
export const FALLBACK_MIN_SCORE = 5;

// =============================================================================
// Resolution Configuration
// =============================================================================

/** Default resolution timeout in milliseconds */
export const DEFAULT_RESOLUTION_TIMEOUT_MS = 5000;

/** Maximum resolution timeout in milliseconds */
export const MAX_RESOLUTION_TIMEOUT_MS = 30000;

/** Minimum resolution timeout in milliseconds */
export const MIN_RESOLUTION_TIMEOUT_MS = 1000;

// =============================================================================
// URL Normalization
// =============================================================================

/** Default URL normalization mode */
export const DEFAULT_URL_NORMALIZE_MODE = 'strict' as const;

/** Remove tracking parameters */
export const URL_REMOVE_TRACKING_PARAMS = true;

/** Default tracking params to remove */
export const DEFAULT_TRACKING_PARAMS_TO_REMOVE = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'ref',
  'spm',
];

/** Shopee URL patterns to normalize */
export const SHOPEE_URL_PATTERNS = [
  /https?:\/\/(www\.)?shopee\.vn\/[^/]+\/i\.(\d+)\.(\d+)/i,
  /https?:\/\/(www\.)?shopee\.vn\/product\/\d+\/\d+/i,
  /https?:\/\/shopee\.vn\/[^/]+\/i\.\d+\.\d+/i,
];

// =============================================================================
// Explainability Configuration
// =============================================================================

/** Default explanation verbosity */
export const DEFAULT_EXPLANATION_VERBOSITY = 'standard' as const;

/** Include detailed reasons in explanation */
export const DEFAULT_INCLUDE_DETAILED_REASONS = true;

/** Include tradeoffs in explanation */
export const DEFAULT_INCLUDE_TRADEOFFS = true;

/** Maximum explanation tips */
export const MAX_EXPLANATION_TIPS = 5;

/** Maximum failed rules to include */
export const MAX_FAILED_RULES_IN_EXPLANATION = 5;

// =============================================================================
// Validation Limits
// =============================================================================

/** Maximum URL length */
export const MAX_URL_LENGTH = 2048;

/** Minimum URL length */
export const MIN_URL_LENGTH = 10;

/** Maximum product title length for context */
export const MAX_PRODUCT_TITLE_LENGTH = 500;

/** Maximum category path depth */
export const MAX_CATEGORY_PATH_DEPTH = 5;

// =============================================================================
// Logging & Metrics
// =============================================================================

/** Enable detailed ranking trace */
export const ENABLE_RANKING_TRACE = true;

/** Enable eligibility debug info */
export const ENABLE_ELIGIBILITY_DEBUG = false;

/** Default log level */
export const DEFAULT_LOG_LEVEL = 'info' as const;

// =============================================================================
// Persistence / TTL Lifecycle
// =============================================================================

/**
 * Resolution result TTL in Redis (seconds).
 * Also used as default for the DB expires_at column.
 * 30 min – long enough for async workers, short enough to auto-clean stale results.
 */
export const RESOLUTION_RESULT_TTL_SECONDS = 1800; // 30 min

/** Maximum allowed result TTL (cap for user-specified overrides) */
export const MAX_RESOLUTION_RESULT_TTL_SECONDS = 86400; // 24 h

/** Minimum allowed result TTL */
export const MIN_RESOLUTION_RESULT_TTL_SECONDS = 60; // 1 min

/** Pending/processing request expiry in DB (worker stall detection) */
export const REQUEST_EXPIRY_PENDING_SECONDS = 300; // 5 min

/** Completed request TTL in DB */
export const REQUEST_EXPIRY_COMPLETED_SECONDS = 2592000; // 30 days

/** Failed request TTL in DB */
export const REQUEST_EXPIRY_FAILED_SECONDS = 604800; // 7 days

/** Expired request TTL in DB */
export const REQUEST_EXPIRY_EXPIRED_SECONDS = 86400; // 1 day

// =============================================================================
// Database Configuration
// =============================================================================

/** Database request batch size */
export const DB_REQUEST_BATCH_SIZE = 100;

/** Database connection pool size */
export const DB_POOL_SIZE = 10;

/** Database query timeout in seconds */
export const DB_QUERY_TIMEOUT_SECONDS = 10;

// =============================================================================
// Product Context Configuration
// =============================================================================

/** Minimum confidence for product context */
export const MIN_PRODUCT_CONTEXT_CONFIDENCE = 0.5;

/** Default product context source priority */
export const PRODUCT_CONTEXT_SOURCE_PRIORITY = [
  'crawler',
  'url',
  'catalog',
  'inferred',
] as const;

/** Include price in product context */
export const INCLUDE_PRICE_IN_CONTEXT = true;

/** Include image in product context */
export const INCLUDE_IMAGE_IN_CONTEXT = true;

// =============================================================================
// Voucher Catalog Configuration
// =============================================================================

/** Default voucher sort order */
export const DEFAULT_VOUCHER_SORT_ORDER = 'priority_desc' as const;

/** Include expired vouchers for debugging */
export const INCLUDE_EXPIRED_VOUCHERS = false;

/** Default voucher platform filter */
export const DEFAULT_VOUCHER_PLATFORM = 'shopee' as const;

/** Maximum vouchers to load per platform */
export const MAX_VOUCHERS_PER_PLATFORM = 1000;

/** Minimum vouchers to consider for matching */
export const MIN_VOUCHERS_FOR_MATCHING = 10;

// =============================================================================
// Platform-Specific Configuration
// =============================================================================

/** Platform-specific settings */
export const PLATFORM_CONFIG: Record<string, {
  name: string;
  supported: boolean;
  urlPatterns: RegExp[];
  categoryDepth: number;
  priority: number;
}> = {
  shopee: {
    name: 'Shopee',
    supported: true,
    urlPatterns: SHOPEE_URL_PATTERNS,
    categoryDepth: 4,
    priority: 1,
  },
  lazada: {
    name: 'Lazada',
    supported: false,
    urlPatterns: [/https?:\/\/(www\.)?lazada\.vn\/.*/i],
    categoryDepth: 4,
    priority: 2,
  },
  tiki: {
    name: 'Tiki',
    supported: false,
    urlPatterns: [/https?:\/\/(www\.)?tiki\.vn\/.*/i],
    categoryDepth: 3,
    priority: 3,
  },
  tiktok: {
    name: 'TikTok Shop',
    supported: false,
    urlPatterns: [/https?:\/\/shop\.tiktok\.com\/.*/i],
    categoryDepth: 3,
    priority: 4,
  },
  general: {
    name: 'General',
    supported: true,
    urlPatterns: [],
    categoryDepth: 0,
    priority: 99,
  },
};

// =============================================================================
// API Configuration
// =============================================================================

/** API version */
export const API_VERSION = 'v1';

/** API base path */
export const API_BASE_PATH = `/api/${API_VERSION}`;

/** Voucher API path */
export const VOUCHER_API_PATH = `${API_BASE_PATH}/voucher`;

/** Default API response format */
export const DEFAULT_API_RESPONSE_FORMAT = 'json' as const;

// =============================================================================
// Error Messages
// =============================================================================

export const ERROR_MESSAGES = {
  INVALID_URL: 'Invalid product URL provided',
  UNSUPPORTED_PLATFORM: 'Platform not supported for voucher resolution',
  PRODUCT_RESOLUTION_FAILED: 'Failed to resolve product from URL',
  CONTEXT_LOAD_FAILED: 'Failed to load product context',
  CATALOG_LOAD_FAILED: 'Failed to load voucher catalog',
  ELIGIBILITY_EVAL_FAILED: 'Failed to evaluate voucher eligibility',
  RANKING_FAILED: 'Failed to rank voucher candidates',
  CACHE_ERROR: 'Cache operation failed',
  PERSISTENCE_ERROR: 'Failed to persist resolution result',
  TIMEOUT: 'Resolution timed out',
  INTERNAL_ERROR: 'Internal server error',
} as const;

// =============================================================================
// Success Messages
// =============================================================================

export const SUCCESS_MESSAGES = {
  RESOLUTION_COMPLETE: 'Voucher resolution completed successfully',
  CACHE_HIT: 'Resolution served from cache',
  EXACT_MATCH: 'Exact voucher match found',
  CATEGORY_MATCH: 'Category-level voucher match found',
  SHOP_MATCH: 'Shop-specific voucher match found',
  FALLBACK_MATCH: 'Fallback voucher recommendation provided',
  NO_MATCH: 'No matching voucher found',
} as const;
