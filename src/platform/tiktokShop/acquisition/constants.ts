/**
 * TikTok Shop Acquisition Layer - Constants
 * Production-grade constants for discovery and detail extraction
 */

// ============================================================================
// Discovery Configuration
// ============================================================================

export const TIKTOK_SHOP_DISCOVERY_CONFIG = {
  // Batch sizes
  DEFAULT_BATCH_SIZE: 50,
  MAX_BATCH_SIZE: 200,
  MIN_BATCH_SIZE: 10,

  // Discovery limits
  MAX_CANDIDATES_PER_JOB: 1000,
  MAX_DISCOVERY_TIME_MS: 300000, // 5 minutes
  MAX_CONCURRENT_DISCOVERY: 2,

  // Candidate processing
  DEDUP_WINDOW_MS: 86400000, // 24 hours
  CONFIDENCE_THRESHOLD: 0.5,
} as const;

// ============================================================================
// Detail Extraction Configuration
// ============================================================================

export const TIKTOK_SHOP_DETAIL_CONFIG = {
  // Batch sizes
  DEFAULT_BATCH_SIZE: 20,
  MAX_BATCH_SIZE: 100,
  MIN_BATCH_SIZE: 5,

  // Extraction limits
  MAX_DETAIL_TIME_MS: 120000, // 2 minutes
  MAX_CONCURRENT_DETAIL: 3,
  MAX_RETRIES: 3,

  // Extraction timeouts
  PAGE_LOAD_TIMEOUT_MS: 30000,
  NAVIGATION_TIMEOUT_MS: 60000,
  EXTRACTION_TIMEOUT_MS: 15000,
} as const;

// ============================================================================
// Runtime Safety Configuration
// ============================================================================

export const TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG = {
  // Concurrency
  MAX_CONCURRENT_SESSIONS: 3,
  MAX_CONCURRENT_REQUESTS: 5,

  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 10,
  MAX_REQUESTS_PER_HOUR: 200,
  MAX_REQUESTS_PER_DAY: 1000,

  // Delays
  DEFAULT_REQUEST_DELAY_MS: 3000,
  MIN_REQUEST_DELAY_MS: 1000,
  MAX_REQUEST_DELAY_MS: 30000,
  PAGE_LOAD_DELAY_MS: 2000,
  SCROLL_DELAY_MS: 1000,

  // Session
  SESSION_TIMEOUT_MS: 600000, // 10 minutes
  SESSION_RECYCLE_AFTER_REQUESTS: 50,
  IDLE_SESSION_TIMEOUT_MS: 300000, // 5 minutes

  // Navigation
  MAX_NAVIGATION_RETRIES: 2,
  NAVIGATION_BACKOFF_MS: 5000,
} as const;

// ============================================================================
// Retry & Backoff Configuration
// ============================================================================

export const TIKTOK_SHOP_RETRY_CONFIG = {
  // Retry limits
  MAX_RETRIES: 3,
  MAX_NAVIGATION_RETRIES: 2,
  MAX_EXTRACTION_RETRIES: 3,

  // Backoff
  INITIAL_BACKOFF_MS: 1000,
  MAX_BACKOFF_MS: 60000,
  BACKOFF_MULTIPLIER: 2,
  BACKOFF_JITTER: 0.1,

  // Retryable errors
  RETRYABLE_ERRORS: [
    'timeout',
    'navigation',
    'network',
    'temporary',
  ],

  // Non-retryable
  NON_RETRYABLE_ERRORS: [
    'invalid_reference',
    'unsupported',
    'authentication',
    'authorization',
  ],
} as const;

// ============================================================================
// Extraction Quality Thresholds
// ============================================================================

export const TIKTOK_SHOP_EXTRACTION_QUALITY_THRESHOLDS = {
  // Overall scores
  EXCELLENT: 0.9,
  GOOD: 0.7,
  ACCEPTABLE: 0.5,
  POOR: 0.3,

  // Field-specific
  TITLE_COVERAGE: 0.8,
  SELLER_COVERAGE: 0.6,
  PRICE_COVERAGE: 0.8,
  CATEGORY_COVERAGE: 0.5,
  PROMOTION_COVERAGE: 0.4,
  MEDIA_COVERAGE: 0.5,

  // Evidence
  MIN_EVIDENCE_FIELDS: 5,
  EVIDENCE_COMPLETENESS: 0.6,
} as const;

// ============================================================================
// Selector Fragility Thresholds
// ============================================================================

export const TIKTOK_SHOP_SELECTOR_FRAGILITY_THRESHOLDS = {
  // Fragility scores
  STABLE: 0.2,
  MODERATE: 0.5,
  FRAGILE: 0.7,
  VERY_FRAGILE: 0.9,

  // Detection
  DYNAMIC_SELECTOR_WEIGHT: 0.3,
  GENERIC_SELECTOR_WEIGHT: 0.2,
  PARTIAL_SELECTOR_WEIGHT: 0.4,
} as const;

// ============================================================================
// Runtime Health Thresholds
// ============================================================================

export const TIKTOK_SHOP_RUNTIME_HEALTH_THRESHOLDS = {
  // Health scores
  HEALTHY: 0.8,
  DEGRADED: 0.5,
  UNHEALTHY: 0.3,

  // Metrics
  MIN_SUCCESS_RATE: 0.8,
  MAX_ERROR_RATE: 0.2,
  MAX_RESPONSE_TIME_MS: 10000,
  MAX_CONSECUTIVE_FAILURES: 3,

  // Degradation
  DEGRADED_SUCCESS_RATE: 0.6,
  DEGRADED_ERROR_RATE: 0.4,
  DEGRADED_RESPONSE_TIME_MS: 20000,
} as const;

// ============================================================================
// Governance Configuration
// ============================================================================

export const TIKTOK_SHOP_GOVERNANCE_CONFIG = {
  // Scaling
  INITIAL_CONCURRENCY: 1,
  MAX_CONCURRENCY: 5,
  SCALE_UP_THRESHOLD: 0.9,
  SCALE_DOWN_THRESHOLD: 0.5,

  // Pause conditions
  PAUSE_ON_HEALTH_BELOW: 0.3,
  PAUSE_ON_ERROR_RATE_ABOVE: 0.3,
  PAUSE_ON_CONSECUTIVE_FAILURES: 5,

  // Throttle conditions
  THROTTLE_ON_HEALTH_BELOW: 0.6,
  THROTTLE_ON_ERROR_RATE_ABOVE: 0.15,

  // Cooldowns
  PAUSE_COOLDOWN_MS: 300000, // 5 minutes
  THROTTLE_COOLDOWN_MS: 60000, // 1 minute

  // Daily limits
  MAX_DISCOVERY_JOBS_PER_DAY: 10,
  MAX_DETAIL_JOBS_PER_DAY: 100,
} as const;

// ============================================================================
// TikTok Shop URL Patterns
// ============================================================================

export const TIKTOK_SHOP_URL_PATTERNS = {
  // Product pages
  PRODUCT_PAGE: [
    /shop\.tiktok\.com\/@[\w-]+\/product\/[\w-]+/,
    /tiktok\.com\/shop\/@[\w-]+\/[\w-]+/,
  ],

  // Category pages
  CATEGORY_PAGE: [
    /shop\.tiktok\.com\/category\/[\w-]+/,
    /tiktok\.com\/shop\/category\/[\w-]+/,
  ],

  // Search
  SEARCH_PAGE: [
    /shop\.tiktok\.com\/search\?q=[\w-]+/,
    /tiktok\.com\/shop\/search\?q=[\w-]+/,
  ],

  // Seller pages
  SELLER_PAGE: [
    /shop\.tiktok\.com\/@[\w-]+/,
    /tiktok\.com\/shop\/@[\w-]+/,
  ],
} as const;

// ============================================================================
// Default Seed Sets
// ============================================================================

export const TIKTOK_SHOP_DEFAULT_SEEDS = {
  CURATED_URLS: [
    {
      seedType: 'curated_url' as const,
      seedValue: 'https://shop.tiktok.com/category/electronics',
      metadata: { category: 'electronics' },
    },
    {
      seedType: 'curated_url' as const,
      seedValue: 'https://shop.tiktok.com/category/beauty',
      metadata: { category: 'beauty' },
    },
    {
      seedType: 'curated_url' as const,
      seedValue: 'https://shop.tiktok.com/category/fashion',
      metadata: { category: 'fashion' },
    },
  ],
} as const;

// ============================================================================
// Logging & Observability
// ============================================================================

export const TIKTOK_SHOP_ACQUISITION_OBSERVABILITY = {
  // Log levels
  DEFAULT_LOG_LEVEL: 'info',
  DEBUG_LOG_LEVEL: 'debug',

  // Event types
  EVENTS: {
    DISCOVERY_START: 'tiktok_shop.discovery.start',
    DISCOVERY_COMPLETE: 'tiktok_shop.discovery.complete',
    DISCOVERY_FAILED: 'tiktok_shop.discovery.failed',
    CANDIDATE_EXTRACTED: 'tiktok_shop.discovery.candidate_extracted',
    CANDIDATE_DEDUPED: 'tiktok_shop.discovery.candidate_deduped',
    DETAIL_START: 'tiktok_shop.detail.start',
    DETAIL_COMPLETE: 'tiktok_shop.detail.complete',
    DETAIL_FAILED: 'tiktok_shop.detail.failed',
    EXTRACTION_QUALITY: 'tiktok_shop.detail.quality',
    RUNTIME_HEALTH: 'tiktok_shop.runtime.health',
    RUNTIME_PAUSE: 'tiktok_shop.runtime.pause',
    RUNTIME_THROTTLE: 'tiktok_shop.runtime.throttle',
    FAILURE_CLASSIFIED: 'tiktok_shop.failure.classified',
    RETRY_DECISION: 'tiktok_shop.retry.decision',
  },

  // Metrics
  METRICS: {
    DISCOVERY_JOBS_TOTAL: 'tiktok_shop_discovery_jobs_total',
    CANDIDATES_DISCOVERED_TOTAL: 'tiktok_shop_candidates_discovered_total',
    CANDIDATES_DEDUPED_TOTAL: 'tiktok_shop_candidates_deduped_total',
    DETAIL_JOBS_TOTAL: 'tiktok_shop_detail_jobs_total',
    DETAIL_EXTRACTIONS_TOTAL: 'tiktok_shop_detail_extractions_total',
    EXTRACTION_QUALITY_SCORE: 'tiktok_shop_extraction_quality_score',
    FAILURES_TOTAL: 'tiktok_shop_failures_total',
    RUNTIME_HEALTH_SCORE: 'tiktok_shop_runtime_health_score',
    PAUSE_COUNT: 'tiktok_shop_pause_count',
    THROTTLE_COUNT: 'tiktok_shop_throttle_count',
  },
} as const;
