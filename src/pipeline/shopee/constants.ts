/**
 * Shopee Pipeline - Constants
 *
 * Default configuration values for Shopee crawl pipeline orchestration.
 */

// ============================================
// Discovery Limits
// ============================================

export const PIPELINE_DISCOVERY = {
  /** Maximum discovery items to process */
  DEFAULT_MAX_ITEMS: 100,

  /** Absolute maximum items */
  ABSOLUTE_MAX_ITEMS: 500,

  /** Minimum items to consider successful */
  MIN_ITEMS_SUCCESS: 5,
} as const;

// ============================================
// Detail Extraction Limits
// ============================================

export const PIPELINE_DETAIL = {
  /** Maximum detail items to process per run */
  DEFAULT_MAX_ITEMS: 50,

  /** Absolute maximum items */
  ABSOLUTE_MAX_ITEMS: 200,

  /** Default concurrent workers */
  DEFAULT_CONCURRENT_WORKERS: 3,

  /** Maximum concurrent workers */
  MAX_CONCURRENT_WORKERS: 5,

  /** Minimum concurrent workers */
  MIN_CONCURRENT_WORKERS: 1,

  /** Detail extraction timeout (ms) */
  EXTRACTION_TIMEOUT: 30000,

  /** Detail settle delay (ms) */
  SETTLE_DELAY: 1500,
} as const;

// ============================================
// Retry Configuration
// ============================================

export const PIPELINE_RETRY = {
  /** Maximum retry attempts for detail extraction */
  DEFAULT_DETAIL_RETRY: 2,

  /** Maximum retry attempts */
  MAX_DETAIL_RETRY: 3,

  /** Base backoff delay (ms) */
  BACKOFF_BASE: 1000,

  /** Maximum backoff delay (ms) */
  BACKOFF_MAX: 5000,
} as const;

// ============================================
// Quality Gate Thresholds
// ============================================

export const PIPELINE_QUALITY = {
  /** Minimum quality score to persist (0-100) */
  MIN_QUALITY_SCORE: 50,

  /** Strict quality score threshold */
  STRICT_QUALITY_SCORE: 70,

  /** Critical fields that must exist */
  CRITICAL_FIELDS: [
    'title',
    'productUrl',
    'price',
  ],

  /** Important fields for quality */
  IMPORTANT_FIELDS: [
    'externalProductId',
    'images',
    'seller',
  ],

  /** Minimum images required */
  MIN_IMAGES: 1,

  /** Minimum title length */
  MIN_TITLE_LENGTH: 5,
} as const;

// ============================================
// Persistence Configuration
// ============================================

export const PIPELINE_PERSISTENCE = {
  /** Batch size for persistence */
  BATCH_SIZE: 10,

  /** Maximum batch size */
  MAX_BATCH_SIZE: 50,

  /** Enable upsert by default */
  DEFAULT_UPSERT: true,

  /** Prefer new record if quality is better */
  PREFER_BETTER_QUALITY: true,
} as const;

// ============================================
// Browser Configuration
// ============================================

export const PIPELINE_BROWSER = {
  /** Browser timeout (ms) */
  TIMEOUT: 30000,

  /** Page settle delay (ms) */
  PAGE_SETTLE_DELAY: 2000,

  /** Enable stealth by default */
  DEFAULT_HEADLESS: true,
} as const;

// ============================================
// Timeouts
// ============================================

export const PIPELINE_TIMEOUT = {
  /** Overall pipeline timeout (10 minutes) */
  PIPELINE_TIMEOUT: 600000,

  /** Stage timeout (5 minutes) */
  STAGE_TIMEOUT: 300000,

  /** Discovery timeout (3 minutes) */
  DISCOVERY_TIMEOUT: 180000,

  /** Persistence timeout (2 minutes) */
  PERSISTENCE_TIMEOUT: 120000,
} as const;

// ============================================
// Logging
// ============================================

export const PIPELINE_LOGGING = {
  /** Log prefix */
  PREFIX: '[ShopeePipeline]',

  /** Include counters in logs */
  INCLUDE_COUNTERS: true,

  /** Include URLs in debug logs (be careful with PII) */
  INCLUDE_URLS: false,

  /** Max message length */
  MAX_MESSAGE_LENGTH: 500,
} as const;

// ============================================
// Partial Success Thresholds
// ============================================

export const PIPELINE_PARTIAL_SUCCESS = {
  /** Minimum success rate for partial success */
  MIN_SUCCESS_RATE: 0.3,

  /** Minimum items processed for partial success */
  MIN_ITEMS_PROCESSED: 1,
} as const;

// ============================================
// Cleanup Configuration
// ============================================

export const PIPELINE_CLEANUP = {
  /** Enable automatic cleanup */
  AUTO_CLEANUP: true,

  /** Cleanup timeout (ms) */
  CLEANUP_TIMEOUT: 10000,
} as const;
