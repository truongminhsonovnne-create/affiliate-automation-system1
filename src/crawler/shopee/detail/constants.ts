/**
 * Shopee Detail Extraction - Constants
 *
 * Default configuration values for Shopee product detail extraction.
 */

// ============================================
// Timeout Constants
// ============================================

export const DETAIL_TIMEOUT = {
  /** Navigation timeout (30 seconds) */
  NAVIGATION: 30000,

  /** Page load timeout (15 seconds) */
  PAGE_LOAD: 15000,

  /** Extraction timeout (20 seconds) */
  EXTRACTION: 20000,

  /** Post-navigation settle delay (2 seconds) */
  PAGE_SETTLE: 2000,

  /** Post-click settle delay (1.5 seconds) */
  POST_CLICK_SETTLE: 1500,
} as const;

// ============================================
// Retry Constants
// ============================================

export const DETAIL_RETRY = {
  /** Maximum extraction attempts */
  MAX_ATTEMPTS: 3,

  /** Base backoff delay (1 second) */
  BACKOFF_BASE: 1000,

  /** Maximum backoff delay (5 seconds) */
  BACKOFF_MAX: 5000,

  /** Retry on these error types */
  RETRYABLE_ERRORS: [
    'navigation_failed',
    'timeout',
    'page_invalid',
  ] as const,
} as const;

// ============================================
// Extraction Limits
// ============================================

export const DETAIL_LIMITS = {
  /** Maximum images to extract */
  MAX_IMAGES: 20,

  /** Minimum images required for valid extraction */
  MIN_IMAGES: 1,

  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 50000,

  /** Minimum title length */
  MIN_TITLE_LENGTH: 3,

  /** Maximum title length */
  MAX_TITLE_LENGTH: 500,
} as const;

// ============================================
// Validation Thresholds
// ============================================

export const DETAIL_VALIDATION = {
  /** Minimum required fields for success */
  MIN_REQUIRED_FIELDS: ['title', 'price', 'productUrl'],

  /** Fields that affect quality score */
  QUALITY_FIELDS: [
    'title',
    'price',
    'images',
    'seller',
    'rating',
    'soldCount',
    'description',
  ],

  /** Critical fields - missing = partial */
  CRITICAL_FIELDS: ['title', 'price', 'productUrl'],

  /** Warning threshold for quality score */
  QUALITY_WARNING_THRESHOLD: 70,

  /** Success threshold for quality score */
  QUALITY_SUCCESS_THRESHOLD: 50,
} as const;

// ============================================
// Selector Wait Durations
// ============================================

export const DETAIL_SELECTOR_WAIT = {
  /** Wait for title (5 seconds) */
  TITLE: 5000,

  /** Wait for price (5 seconds) */
  PRICE: 5000,

  /** Wait for images (3 seconds) */
  IMAGES: 3000,

  /** Wait for seller (3 seconds) */
  SELLER: 3000,

  /** Wait for description (2 seconds) */
  DESCRIPTION: 2000,
} as const;

// ============================================
// Media Handling
// ============================================

export const MEDIA = {
  /** Image URL patterns to filter */
  FILTER_PATTERNS: [
    'data:image',
    'placeholder',
    'loading',
    'spinner',
  ],

  /** Minimum image URL length */
  MIN_IMAGE_URL_LENGTH: 20,

  /** Image URL similarity threshold for dedup */
  IMAGE_DEDUP_THRESHOLD: 0.95,
} as const;

// ============================================
// URL Validation
// ============================================

export const URL_PATTERNS_DETAIL = {
  /** Shopee product URL pattern */
  PRODUCT_URL_PATTERN: /shopee\.vn\/[^i]+\.i\.(\d+)/i,

  /** Alternative product ID pattern */
  PRODUCT_ID_ALT_PATTERN: /\/product\/(\d+)/i,

  /** Shopee domain */
  SHOPEE_DOMAIN: 'shopee.vn',

  /** HTTPS prefix */
  HTTPS_PREFIX: 'https://',
} as const;

// ============================================
// Price Parsing
// ============================================

export const PRICE_PARSING_DETAIL = {
  /** VND symbol */
  VND_SYMBOL: '₫',

  /** Remove patterns */
  REMOVE_PATTERNS: ['₫', ' ', 'VNĐ', 'VND', 'đ'],

  /** Discount pattern */
  DISCOUNT_PATTERN: /-(\d+)%/,

  /** Price range separator */
  PRICE_SEPARATOR: ' - ',
} as const;

// ============================================
// Logging
// ============================================

export const DETAIL_LOGGING = {
  /** Log prefix */
  PREFIX: '[ShopeeDetail]',

  /** Include selectors in debug */
  INCLUDE_SELECTORS: false,

  /** Max message length */
  MAX_MESSAGE_LENGTH: 300,
} as const;

// ============================================
// Quality Scoring
// ============================================

export const QUALITY_SCORE = {
  /** Field weights for quality scoring */
  FIELD_WEIGHTS: {
    title: 20,
    price: 20,
    images: 15,
    seller: 10,
    rating: 10,
    soldCount: 5,
    description: 10,
    badges: 5,
    category: 5,
  } as const,

  /** Penalty for missing field */
  MISSING_FIELD_PENALTY: 10,

  /** Penalty for empty field */
  EMPTY_FIELD_PENALTY: 5,
} as const;
