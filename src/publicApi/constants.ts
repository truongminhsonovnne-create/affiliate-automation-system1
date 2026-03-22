// =============================================================================
// Public API Constants
// Production-grade constants for public product API
// =============================================================================

// =============================================================================
// API Configuration
// =============================================================================

export const PUBLIC_API = {
  /** API version */
  VERSION: 'v1',

  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT_MS: 5000,

  /** Maximum input length (characters) */
  MAX_INPUT_LENGTH: 2000,

  /** Minimum input length */
  MIN_INPUT_LENGTH: 5,

  /** Default number of candidates to return */
  DEFAULT_CANDIDATE_LIMIT: 3,

  /** Maximum candidates to return */
  MAX_CANDIDATE_LIMIT: 10,
} as const;

// =============================================================================
// Fast Path Configuration
// =============================================================================

export const FAST_PATH = {
  /** Fast path cache TTL in seconds (5 minutes) */
  CACHE_TTL_SECONDS: 300,

  /** Hot cache threshold in seconds */
  HOT_CACHE_THRESHOLD_SECONDS: 60,

  /** Maximum age for fast-path cache in seconds */
  MAX_CACHE_AGE_SECONDS: 3600,

  /** Fast path latency budget in milliseconds */
  LATENCY_BUDGET_MS: 100,

  /** Enable fast path by default */
  ENABLED: true,
} as const;

// =============================================================================
// Rate Limiting
// =============================================================================

export const RATE_LIMIT = {
  /** Default maximum requests per window */
  DEFAULT_MAX_REQUESTS: 100,

  /** Default window size in seconds (1 hour) */
  DEFAULT_WINDOW_SECONDS: 3600,

  /** Soft block enabled */
  SOFT_BLOCK_ENABLED: true,

  /** Soft block at 80% of limit */
  SOFT_BLOCK_THRESHOLD: 0.8,

  /** IP-based rate limiting */
  IP_BASED_ENABLED: true,

  /** Request ID based limiting for auth users */
  REQUEST_ID_BASED_ENABLED: true,
} as const;

// =============================================================================
// Performance Thresholds
// =============================================================================

export const PERFORMANCE = {
  /** Target latency for fast path (ms) */
  FAST_PATH_TARGET_MS: 100,

  /** Target latency for fallback path (ms) */
  FALLBACK_TARGET_MS: 2000,

  /** Maximum acceptable latency (ms) */
  MAX_ACCEPTABLE_LATENCY_MS: 5000,

  /** Slow query threshold (ms) */
  SLOW_QUERY_THRESHOLD_MS: 1000,

  /** Cache hit latency bonus */
  CACHE_HIT_LATENCY_BONUS_MS: 50,
} as const;

// =============================================================================
// Cache Configuration
// =============================================================================

export const CACHE_CONFIG = {
  /** Cache key prefix */
  KEY_PREFIX: 'public:resolution:',

  /** Cache key separator */
  KEY_SEPARATOR: ':',

  /** Default TTL in seconds */
  DEFAULT_TTL_SECONDS: 300,

  /** Extended TTL in seconds for stable products */
  EXTENDED_TTL_SECONDS: 1800,

  /** Maximum cache size */
  MAX_CACHE_SIZE: 10000,

  /** Cache invalidation pattern */
  INVALIDATION_PATTERN: 'public:resolution:*',
} as const;

// =============================================================================
// Analytics Event Names
// =============================================================================

export const ANALYTICS_EVENTS = {
  // User actions
  PASTE_LINK_SUBMITTED: 'public.paste_link.submitted',
  PASTE_LINK_PASTED: 'public.paste_link.pasted',
  PASTE_LINK_SUBMIT_CLICKED: 'public.paste_link.submit_clicked',

  // Resolution
  VOUCHER_RESOLVE_STARTED: 'public.voucher.resolve.started',
  VOUCHER_RESOLVED: 'public.voucher.resolved',
  VOUCHER_RESOLVE_FAILED: 'public.voucher.resolve.failed',
  VOUCHER_NO_MATCH: 'public.voucher.no_match',

  // User interactions
  VOUCHER_COPIED: 'public.voucher.copied',
  OPEN_SHOPEE_CLICKED: 'public.shopee.opened',

  // Errors
  RESOLUTION_ERROR: 'public.resolution.error',
  INPUT_VALIDATION_ERROR: 'public.input.validation_error',
  RATE_LIMIT_EXCEEDED: 'public.rate_limit.exceeded',
} as const;

// =============================================================================
// Explanation Configuration
// =============================================================================

export const EXPLANATION = {
  /** Maximum summary length (characters) */
  MAX_SUMMARY_LENGTH: 150,

  /** Maximum tips count */
  MAX_TIPS_COUNT: 3,

  /** Maximum tip length (characters) */
  MAX_TIP_LENGTH: 100,

  /** Default tip for no match */
  NO_MATCH_TIP: 'Không tìm thấy voucher phù hợp. Thử sản phẩm khác.',

  /** Default tip for multiple candidates */
  MULTIPLE_CANDIDATES_TIP: 'Có nhiều lựa chọn. Chọn mã phù hợp nhất!',

  /** Default explanation for best match */
  BEST_MATCH_EXPLANATION: 'Đây là voucher tốt nhất cho sản phẩm này.',
} as const;

// =============================================================================
// Response Formatting
// =============================================================================

export const RESPONSE_FORMAT = {
  /** Date format for API responses */
  DATE_FORMAT: 'ISO',

  /** Currency format */
  CURRENCY_LOCALE: 'vi-VN',

  /** Currency symbol */
  CURRENCY_SYMBOL: '₫',

  /** Discount percentage suffix */
  PERCENTAGE_SUFFIX: '%',

  /** Fixed amount suffix */
  FIXED_AMOUNT_PREFIX: '₫',

  /** Free shipping text */
  FREE_SHIPPING_TEXT: 'Miễn phí vận chuyển',
} as const;

// =============================================================================
// Error Codes
// =============================================================================

export const ERROR_CODES = {
  // Input errors
  INVALID_INPUT: 'INVALID_INPUT',
  INPUT_TOO_SHORT: 'INPUT_TOO_SHORT',
  INPUT_TOO_LONG: 'INPUT_TOO_LONG',
  INVALID_URL_FORMAT: 'INVALID_URL_FORMAT',
  UNSUPPORTED_PLATFORM: 'UNSUPPORTED_PLATFORM',

  // Resolution errors
  NO_VOUCHER_FOUND: 'NO_VOUCHER_FOUND',
  RESOLUTION_FAILED: 'RESOLUTION_FAILED',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_SOFT_BLOCK: 'RATE_LIMIT_SOFT_BLOCK',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

// =============================================================================
// User-Facing Messages
// =============================================================================

export const USER_MESSAGES = {
  // Success messages
  VOUCHER_FOUND: 'Tìm thấy voucher!',
  BEST_VOUCHER: 'Voucher tốt nhất',

  // No match messages
  NO_VOUCHER: 'Không tìm thấy voucher',
  NO_VOUCHER_DESCRIPTION: 'Không có voucher nào phù hợp với sản phẩm này.',

  // Input messages
  ENTER_LINK: 'Dán link sản phẩm Shopee vào đây',
  PASTE_LINK: 'Dán link sản phẩm...',
  SUBMIT_BUTTON: 'Tìm mã giảm giá',

  // Action messages
  COPY_CODE: 'Sao chép mã',
  COPIED: 'Đã sao chép!',
  OPEN_SHOPEE: 'Mua ngay',

  // Error messages
  INVALID_LINK: 'Link không hợp lệ',
  INVALID_LINK_DESCRIPTION: 'Vui lòng nhập link sản phẩm Shopee hợp lệ.',
  TRY_AGAIN: 'Thử lại',
  ERROR_OCCURRED: 'Đã xảy ra lỗi',
  ERROR_DESCRIPTION: 'Đã có lỗi xảy ra. Vui lòng thử lại sau.',

  // Rate limit messages
  TOO_MANY_REQUESTS: 'Quá nhiều yêu cầu',
  RATE_LIMIT_DESCRIPTION: 'Bạn đã thao tác quá nhanh. Vui lòng chờ một chút.',
} as const;

// =============================================================================
// Trust & Safety
// =============================================================================

export const TRUST_SAFETY = {
  /** Maximum requests per IP per minute for anonymous users */
  ANONYMOUS_RATE_LIMIT: 10,

  /** Maximum requests per session per hour */
  SESSION_RATE_LIMIT: 100,

  /** Suspicious input patterns to detect */
  SUSPICIOUS_PATTERNS: [
    /script/i,
    /javascript:/i,
    /on\w+=/i,
    /<[^>]*>/i,
  ],

  /** Blocked input patterns */
  BLOCKED_PATTERNS: [
    /eval\s*\(/i,
    /expression\s*\(/i,
  ],
} as const;

// =============================================================================
// SEO & Metadata
// =============================================================================

export const SEO_METADATA = {
  SITE_NAME: 'Shopee Voucher Finder',
  SITE_DESCRIPTION: 'Tìm mã giảm giá Shopee nhanh nhất - Dán link, lấy mã, mua ngay',

  HOME_TITLE: 'Tìm Mã Giảm Giá Shopee Miễn Phí',
  HOME_DESCRIPTION: 'Dán link sản phẩm Shopee để tìm mã giảm giá tốt nhất. Nhanh, miễn phí, không quảng cáo.',

  RESULT_TITLE: 'Mã Giảm Giá - Shopee Voucher Finder',
  RESULT_DESCRIPTION: 'Các mã giảm giá tốt nhất cho sản phẩm này.',
} as const;
