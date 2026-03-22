/**
 * TikTok Shop Data Acquisition Foundation - Constants
 * Production-grade constants for data acquisition, enrichment, and source readiness
 */

// ============================================================================
// Acquisition Configuration
// ============================================================================

export const TIKTOK_SHOP_ACQUISITION_CONFIG = {
  // Batch processing
  DEFAULT_BATCH_SIZE: 100,
  MAX_BATCH_SIZE: 1000,
  MIN_BATCH_SIZE: 10,

  // Timeouts (in milliseconds)
  DEFAULT_ACQUISITION_TIMEOUT: 30000,
  MAX_ACQUISITION_TIMEOUT: 120000,
  SOURCE_HEALTH_CHECK_TIMEOUT: 5000,

  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  EXPONENTIAL_BACKOFF: true,

  // Run limits
  MAX_ITEMS_PER_RUN: 10000,
  MAX_RUN_DURATION_MS: 300000, // 5 minutes

  // Data limits
  MAX_RAW_DATA_SIZE_KB: 512,
  MAX_NORMALIZED_FIELD_COUNT: 100,
} as const;

// ============================================================================
// Source Readiness Thresholds
// ============================================================================

export const TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS = {
  // Health scores
  HEALTHY_THRESHOLD: 0.8,
  DEGRADED_THRESHOLD: 0.5,
  UNHEALTHY_THRESHOLD: 0.3,

  // Readiness scores
  READY_THRESHOLD: 0.8,
  PROCEED_CAUTIOUSLY_THRESHOLD: 0.5,
  HOLD_THRESHOLD: 0.3,

  // Blocker limits
  MAX_CRITICAL_BLOCKERS: 0,
  MAX_HIGH_BLOCKERS: 0,
  MAX_WARNING_COUNT: 5,

  // Quality thresholds
  MIN_QUALITY_SCORE: 0.6,
  GOOD_QUALITY_SCORE: 0.8,

  // Support level thresholds
  SUPPORTED_MIN_SCORE: 0.8,
  PARTIAL_MIN_SCORE: 0.5,
} as const;

// ============================================================================
// Enrichment Quality Thresholds
// ============================================================================

export const TIKTOK_SHOP_ENRICHMENT_QUALITY_THRESHOLDS = {
  // Required field coverage
  MIN_PRODUCT_FIELDS_COVERED: 0.7,
  MIN_SELLER_FIELDS_COVERED: 0.6,
  MIN_CATEGORY_FIELDS_COVERED: 0.5,
  MIN_PRICE_FIELDS_COVERED: 0.8,

  // Quality scores
  EXCELLENT_ENRICHMENT: 0.9,
  GOOD_ENRICHMENT: 0.7,
  ACCEPTABLE_ENRICHMENT: 0.5,
  POOR_ENRICHMENT: 0.3,

  // Gap severity thresholds
  CRITICAL_FIELD_MISSING: true,
  HIGH_FIELD_MISSING_PCT: 0.3,
  MEDIUM_FIELD_MISSING_PCT: 0.5,
} as const;

// ============================================================================
// Freshness Configuration
// ============================================================================

export const TIKTOK_SHOP_FRESHNESS_CONFIG = {
  // TTL for different data types (in seconds)
  PRODUCT_SNAPSHOT_TTL: 3600, // 1 hour
  ENRICHMENT_TTL: 7200, // 2 hours
  PROMOTION_TTL: 1800, // 30 minutes
  CONTEXT_TTL: 3600, // 1 hour

  // Staleness thresholds
  FRESH_THRESHOLD_SECONDS: 1800, // 30 minutes
  STALE_THRESHOLD_SECONDS: 3600, // 1 hour
  EXPIRED_THRESHOLD_SECONDS: 86400, // 24 hours

  // Auto-refresh
  AUTO_REFRESH_ENABLED: false,
  AUTO_REFRESH_THRESHOLD_SECONDS: 2700, // 45 minutes
} as const;

// ============================================================================
// Snapshot Retention
// ============================================================================

export const TIKTOK_SHOP_SNAPSHOT_RETENTION = {
  // Retention periods (in days)
  PRODUCT_SNAPSHOT_RETENTION_DAYS: 7,
  ENRICHMENT_RETENTION_DAYS: 14,
  PROMOTION_RETENTION_DAYS: 3,
  ACQUISITION_RUN_RETENTION_DAYS: 30,
  READINESS_REVIEW_RETENTION_DAYS: 90,

  // Cleanup thresholds
  MAX_SNAPSHOTS_PER_REFERENCE: 10,
  MAX_SNAPSHOTS_TOTAL: 100000,
} as const;

// ============================================================================
// Normalization Configuration
// ============================================================================

export const TIKTOK_SHOP_NORMALIZATION_CONFIG = {
  // Field mappings
  REQUIRED_PRODUCT_FIELDS: ['productId', 'productTitle', 'price'],
  REQUIRED_SELLER_FIELDS: ['sellerId', 'sellerName'],
  REQUIRED_CATEGORY_FIELDS: ['categoryId'],
  REQUIRED_PRICE_FIELDS: ['price', 'currency'],

  // Validation rules
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_PRICE_VALUE: 1000000,
  MIN_PRICE_VALUE: 0,

  // Normalization options
  TRIM_STRINGS: true,
  NORMALIZE_PRICES: true,
  NORMALIZE_CURRENCY: true,
  NORMALIZE_CATEGORY_PATH: true,
} as const;

// ============================================================================
// Context Field Definitions
// ============================================================================

export const TIKTOK_SHOP_CONTEXT_FIELDS = {
  PRODUCT: [
    'productId',
    'productTitle',
    'productDescription',
    'productUrl',
    'rating',
    'reviewCount',
    'salesCount',
    'images',
    'videos',
    'tags',
    'stockStatus',
    'stockQuantity',
  ],
  SELLER: [
    'sellerId',
    'sellerName',
    'sellerRating',
    'sellerFollowerCount',
    'sellerVerified',
    'sellerJoinDate',
    'sellerTotalProducts',
  ],
  CATEGORY: [
    'categoryId',
    'categoryName',
    'categoryPath',
    'categoryLevel',
    'parentCategoryId',
  ],
  PRICE: [
    'price',
    'currency',
    'originalPrice',
    'discountPercentage',
    'minPurchaseQuantity',
    'maxPurchaseQuantity',
  ],
  PROMOTION: [
    'promotionId',
    'promotionType',
    'discountValue',
    'discountType',
    'minPurchaseAmount',
    'maxDiscountAmount',
    'applicableCategories',
    'applicableProducts',
    'stackable',
    'validFrom',
    'validUntil',
  ],
} as const;

// ============================================================================
// Promotion Source Configuration
// ============================================================================

export const TIKTOK_SHOP_PROMOTION_SOURCE_CONFIG = {
  // Supported promotion types
  SUPPORTED_PROMOTION_TYPES: [
    'flash_sale',
    'bundle_deal',
    'voucher',
    'free_shipping',
    'discount',
    'buy_one_get_one',
    'seasonal',
    'new_user',
    'member',
  ],

  // Compatibility requirements
  MIN_COMPATIBLE_FIELDS: 5,
  REQUIRED_PROMOTION_FIELDS: ['promotionId', 'promotionType', 'discountValue'],

  // Quality thresholds
  MIN_PROMOTION_QUALITY_SCORE: 0.5,
  GOOD_PROMOTION_QUALITY_SCORE: 0.7,
} as const;

// ============================================================================
// Source Type Definitions
// ============================================================================

export const TIKTOK_SHOP_SOURCE_TYPES = {
  MANUAL: {
    key: 'manual_sample',
    name: 'Manual Sample',
    description: 'Manually curated sample data for testing and development',
    supportLevel: 'partial',
  },
  FILE: {
    key: 'import_file',
    name: 'Import File',
    description: 'JSON/CSV file import for bulk data loading',
    supportLevel: 'unsupported',
  },
  TIKTOK_API_PRODUCT: {
    key: 'tiktok_api_product',
    name: 'TikTok Product API',
    description: 'Official TikTok Shop Product API',
    supportLevel: 'unavailable',
  },
  TIKTOK_API_PROMOTION: {
    key: 'tiktok_api_promotion',
    name: 'TikTok Promotion API',
    description: 'Official TikTok Shop Promotion API',
    supportLevel: 'unavailable',
  },
  TIKTOK_WEB_SCRAPER: {
    key: 'tiktok_web_scraper',
    name: 'Web Scraper',
    description: 'Web scraping for TikTok Shop data',
    supportLevel: 'unavailable',
  },
  TIKTOK_AFFILIATE_API: {
    key: 'tiktok_affiliate_api',
    name: 'TikTok Affiliate API',
    description: 'TikTok Affiliate/Partner API access',
    supportLevel: 'unavailable',
  },
} as const;

// ============================================================================
// Logging & Observability
// ============================================================================

export const TIKTOK_SHOP_DATA_OBSERVABILITY = {
  // Log levels
  DEFAULT_LOG_LEVEL: 'info',
  DEBUG_LOG_LEVEL: 'debug',

  // Event types
  EVENTS: {
    ACQUISITION_START: 'tiktok_shop.acquisition.start',
    ACQUISITION_COMPLETE: 'tiktok_shop.acquisition.complete',
    ACQUISITION_FAILED: 'tiktok_shop.acquisition.failed',
    NORMALIZATION_COMPLETE: 'tiktok_shop.normalization.complete',
    ENRICHMENT_COMPLETE: 'tiktok_shop.enrichment.complete',
    SOURCE_HEALTH_CHECK: 'tiktok_shop.source.health_check',
    READINESS_REVIEW: 'tiktok_shop.readiness.review',
    BACKLOG_CREATED: 'tiktok_shop.backlog.created',
    BACKLOG_COMPLETED: 'tiktok_shop.backlog.completed',
  },

  // Metrics
  METRICS: {
    SOURCE_HEALTH_COUNTER: 'tiktok_shop_source_health_total',
    ACQUISITION_RUN_COUNTER: 'tiktok_shop_acquisition_runs_total',
    NORMALIZED_RECORDS_COUNTER: 'tiktok_shop_normalized_records_total',
    ENRICHED_RECORDS_COUNTER: 'tiktok_shop_enriched_records_total',
    BLOCKER_COUNTER: 'tiktok_shop_blockers_total',
    WARNING_COUNTER: 'tiktok_shop_warnings_total',
    FRESHNESS_COUNTER: 'tiktok_shop_freshness_issues_total',
  },
} as const;

// ============================================================================
// Default Source Configs
// ============================================================================

export const TIKTOK_SHOP_DEFAULT_SOURCE_CONFIGS = {
  manual_sample: {
    batchSize: 50,
    timeout: 10000,
    retryAttempts: 1,
    enabled: true,
  },
  import_file: {
    batchSize: 100,
    timeout: 30000,
    retryAttempts: 2,
    enabled: false,
    supportedFormats: ['json', 'csv'],
  },
  tiktok_api_product: {
    batchSize: 100,
    timeout: 30000,
    retryAttempts: 3,
    enabled: false,
    apiVersion: 'v1',
  },
  tiktok_api_promotion: {
    batchSize: 50,
    timeout: 30000,
    retryAttempts: 3,
    enabled: false,
    apiVersion: 'v1',
  },
  tiktok_web_scraper: {
    batchSize: 20,
    timeout: 60000,
    retryAttempts: 2,
    enabled: false,
    userAgent: 'TikTokShopBot/1.0',
  },
  tiktok_affiliate_api: {
    batchSize: 100,
    timeout: 30000,
    retryAttempts: 3,
    enabled: false,
    apiVersion: 'v1',
  },
} as const;
