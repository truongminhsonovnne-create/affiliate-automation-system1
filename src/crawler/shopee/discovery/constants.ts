/**
 * Shopee Discovery Crawler - Constants
 *
 * Default configuration values for Shopee listing discovery.
 */

// ============================================
// Timeout Constants
// ============================================

export const DISCOVERY_TIMEOUT = {
  /** Navigation timeout (30 seconds) */
  NAVIGATION: 30000,

  /** Page load timeout (15 seconds) */
  PAGE_LOAD: 15000,

  /** Extraction timeout per batch (10 seconds) */
  EXTRACTION_BATCH: 10000,

  /** Single card extraction timeout (5 seconds) */
  EXTRACTION_SINGLE: 5000,

  /** Scroll round timeout (20 seconds) */
  SCROLL_ROUND: 20000,

  /** Total discovery timeout (3 minutes) */
  TOTAL_DISCOVERY: 180000,

  /** Post-navigation stabilization (2 seconds) */
  POST_NAVIGATION_STABILIZE: 2000,
} as const;

// ============================================
// Retry Constants
// ============================================

export const DISCOVERY_RETRY = {
  /** Maximum navigation retries */
  MAX_NAVIGATION: 3,

  /** Maximum extraction retries */
  MAX_EXTRACTION: 2,

  /** Maximum scroll retries */
  MAX_SCROLL: 2,

  /** Base delay for backoff (1 second) */
  BACKOFF_BASE: 1000,

  /** Maximum backoff delay (5 seconds) */
  BACKOFF_MAX: 5000,
} as const;

// ============================================
// Card Limits
// ============================================

export const CARD_LIMITS = {
  /** Default maximum cards to extract */
  DEFAULT_MAX_CARDS: 100,

  /** Absolute maximum cards */
  ABSOLUTE_MAX_CARDS: 500,

  /** Minimum cards to consider successful */
  MIN_CARDS_SUCCESS: 5,

  /** Cards batch size for extraction */
  BATCH_SIZE: 50,
} as const;

// ============================================
// Scroll Strategy Constants
// ============================================

export const SCROLL_STRATEGY = {
  /** Default maximum scroll rounds */
  DEFAULT_MAX_ROUNDS: 15,

  /** Absolute maximum scroll rounds */
  ABSOLUTE_MAX_ROUNDS: 30,

  /** Minimum cards to stop early */
  MIN_CARDS_TO_STOP: 20,

  /** Maximum plateau rounds before stopping */
  DEFAULT_PLATEAU_ROUNDS: 3,

  /** Plateau threshold (same card count) */
  PLATEAU_THRESHOLD: 5,

  /** Enable incremental detection */
  ENABLE_INCREMENTAL: true,
} as const;

// ============================================
// Scroll Config (for humanLikeScroll)
// ============================================

export const SCROLL_CONFIG = {
  /** Minimum scroll step (pixels) */
  MIN_STEP: 300,

  /** Maximum scroll step (pixels) */
  MAX_STEP: 600,

  /** Minimum delay between scrolls (ms) */
  MIN_DELAY: 500,

  /** Maximum delay between scrolls (ms) */
  MAX_DELAY: 1000,

  /** Stop at height percentage */
  STOP_AT_HEIGHT_PERCENT: 0.9,
} as const;

// ============================================
// Selector Wait Durations
// ============================================

export const SELECTOR_WAIT = {
  /** Wait for listing container (5 seconds) */
  LISTING_CONTAINER: 5000,

  /** Wait for product cards (3 seconds) */
  PRODUCT_CARDS: 3000,

  /** Wait for more button (2 seconds) */
  MORE_BUTTON: 2000,

  /** Wait after scroll (1 second) */
  AFTER_SCROLL: 1000,
} as const;

// ============================================
// Stabilization Delays
// ============================================

export const STABILIZATION = {
  /** Post-page load delay (2 seconds) */
  POST_PAGE_LOAD: 2000,

  /** Post-scroll delay (1.5 seconds) */
  POST_SCROLL: 1500,

  /** Post-action delay (500ms) */
  POST_ACTION: 500,
} as const;

// ============================================
// Deduplication Constants
// ============================================

export const DEDUPE = {
  /** Default dedupe strategy */
  DEFAULT_STRATEGY: 'url' as const,

  /** URL similarity threshold */
  URL_THRESHOLD: 0.9,

  /** Title + Image similarity threshold */
  TITLE_IMAGE_THRESHOLD: 0.85,

  /** Enable fuzzy matching */
  ENABLE_FUZZY: true,
} as const;

// ============================================
// Extraction Constants
// ============================================

export const EXTRACTION = {
  /** Enable fallback selectors */
  ENABLE_FALLBACK: true,

  /** Maximum fallback attempts */
  MAX_FALLBACK_ATTEMPTS: 2,

  /** Extract images in parallel */
  EXTRACT_IMAGES_PARALLEL: true,

  /** Timeout for image URL validation (5 seconds) */
  IMAGE_VALIDATION_TIMEOUT: 5000,
} as const;

// ============================================
// Validation Thresholds
// ============================================

export const VALIDATION = {
  /** Minimum title length */
  MIN_TITLE_LENGTH: 3,

  /** Maximum title length */
  MAX_TITLE_LENGTH: 500,

  /** Minimum price value */
  MIN_PRICE: 0,

  /** Maximum price value (100 million VND) */
  MAX_PRICE: 100000000,

  /** Minimum image URL length */
  MIN_IMAGE_URL_LENGTH: 10,

  /** Minimum product URL length */
  MIN_PRODUCT_URL_LENGTH: 10,

  /** Allow empty badges */
  ALLOW_EMPTY_BADGES: true,

  /** Strict mode disabled by default */
  STRICT_MODE_DEFAULT: false,
} as const;

// ============================================
// URL Patterns
// ============================================

export const URL_PATTERNS = {
  /** Flash Sale mobile URL */
  FLASH_SALE_MOBILE: 'https://shopee.vn/flash_sale',

  /** Flash Sale URL pattern */
  FLASH_SALE_PATTERN: /shopee\.vn\/flash_sale/i,

  /** Search URL base */
  SEARCH_BASE: 'https://shopee.vn/search',

  /** Search keyword pattern */
  SEARCH_KEYWORD_PATTERN: /keyword=([^&]+)/i,

  /** Product ID pattern from URL */
  PRODUCT_ID_PATTERN: /-i\.(\d+)/,

  /** Image CDN pattern */
  IMAGE_CDN_PATTERN: /cf\.shopee\.vn/,

  /** HTTPS prefix */
  HTTPS_PREFIX: 'https:',
} as const;

// ============================================
// Price Parsing
// ============================================

export const PRICE_PARSING = {
  /** VND currency symbol */
  VND_SYMBOL: '₫',

  /** Thousand separator */
  THOUSAND_SEPARATOR: '.',

  /** Remove patterns */
  REMOVE_PATTERNS: ['₫', ' ', 'VNĐ', 'VND'],

  /** Default currency if not parseable */
  DEFAULT_CURRENCY: 'VND',
} as const;

// ============================================
// Logging Constants
// ============================================

export const DISCOVERY_LOGGING = {
  /** Log prefix */
  PREFIX: '[ShopeeDiscovery]',

  /** Include selectors in debug logs */
  INCLUDE_SELECTORS: false,

  /** Include URLs in debug logs (be careful with PII) */
  INCLUDE_URLS: false,

  /** Maximum log message length */
  MAX_MESSAGE_LENGTH: 300,
} as const;
