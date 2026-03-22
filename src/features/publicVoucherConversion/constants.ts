// =============================================================================
// Public Voucher Conversion Constants
// Production-grade constants for conversion UX
// =============================================================================

// =============================================================================
// Action Timing
// =============================================================================

export const ACTION_TIMING = {
  /** How long to show copy success feedback (ms) */
  COPY_SUCCESS_DURATION: 2000,

  /** How long to show button loading state (ms) */
  BUTTON_LOADING_TIMEOUT: 5000,

  /** Debounce for copy button (ms) */
  COPY_DEBOUNCE: 300,

  /** Delay before showing success feedback (ms) */
  FEEDBACK_SHOW_DELAY: 100,

  /** Transition duration for result cards (ms) */
  RESULT_TRANSITION_DURATION: 200,
} as const;

// =============================================================================
// Display Limits
// =============================================================================

export const DISPLAY_LIMITS = {
  /** Maximum candidates to display */
  MAX_CANDIDATES: 3,

  /** Maximum explanation tips to show */
  MAX_TIPS: 3,

  /** Maximum explanation summary length (characters) */
  MAX_SUMMARY_LENGTH: 120,

  /** Maximum tip length (characters) */
  MAX_TIP_LENGTH: 80,
} as const;

// =============================================================================
// Confidence Thresholds
// =============================================================================

export const CONFIDENCE = {
  /** Exact match confidence level */
  EXACT_THRESHOLD: 0.95,

  /** High confidence threshold */
  HIGH_THRESHOLD: 0.75,

  /** Medium confidence threshold */
  MEDIUM_THRESHOLD: 0.5,

  /** Low confidence threshold */
  LOW_THRESHOLD: 0.3,
} as const;

// =============================================================================
// Copywriting
// =============================================================================

export const COPYWRITING = {
  // Primary actions
  COPY_BUTTON: 'Sao chép',
  COPIED_BUTTON: '✓ Đã chép',
  OPEN_SHOPEE_BUTTON: 'Mua ngay',

  // Labels
  BEST_VOUCHER_LABEL: 'Mã giảm giá tốt nhất',
  ALTERNATIVE_LABEL: 'Các lựa chọn khác',
  FALLBACK_LABEL: 'Gợi ý',

  // Confidence badges
  EXACT_BADGE: '✓ Chính xác',
  HIGH_BADGE: '✓ Phù hợp',
  MEDIUM_BADGE: 'Tốt',
  LOW_BADGE: 'Thay thế',

  // No match
  NO_MATCH_TITLE: 'Không tìm thấy voucher',
  NO_MATCH_MESSAGE: 'Không có voucher nào phù hợp với sản phẩm này.',
  NO_MATCH_SUGGESTION: 'Thử sản phẩm khác hoặc kiểm tra lại link.',
  TRY_AGAIN: 'Thử lại',

  // Explanations
  EXACT_MATCH_SUMMARY: 'Đây là voucher chính xác cho sản phẩm này.',
  HIGH_MATCH_SUMMARY: 'Voucher phù hợp nhất cho sản phẩm này.',
  FALLBACK_SUMMARY: 'Không tìm thấy voucher chính xác. Đây là gợi ý thay thế.',

  // Tips
  TIP_USE_CODE: 'Sử dụng mã này khi thanh toán.',
  TIP_MIN_SPEND: 'Áp dụng đơn tối thiểu.',
  TIP_VALIDITY: 'Hãy kiểm tra kỹ điều kiện.',

  // Trust
  TRUST_SIGNALS: {
    VERIFIED: 'Đã kiểm tra',
    TESTED: 'Đã thử nghiệm',
    WORKING: 'Hoạt động',
  },
} as const;

// =============================================================================
// Layout
// =============================================================================

export const LAYOUT = {
  /** Mobile breakpoint */
  MOBILE_BREAKPOINT: 640,

  /** Tablet breakpoint */
  TABLET_BREAKPOINT: 768,

  /** Desktop breakpoint */
  DESKTOP_BREAKPOINT: 1024,

  /** Spacing scale */
  SPACING: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  /** Border radius */
  RADIUS: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
} as const;

// =============================================================================
// CTA Priority
// =============================================================================

export const CTA_PRIORITY = {
  /** Primary action is copy */
  PRIMARY_COPY: 'copy' as const,

  /** Primary action is open shopee */
  PRIMARY_OPEN: 'open_shopee' as const,
};

// =============================================================================
// Errors
// =============================================================================

export const ERROR_MESSAGES = {
  COPY_FAILED: 'Không thể sao chép. Vui lòng thử lại.',
  OPEN_FAILED: 'Không thể mở Shopee. Vui lòng thử lại.',
  RESOLUTION_FAILED: 'Đã xảy ra lỗi. Vui lòng thử lại.',
  NETWORK_ERROR: 'Lỗi mạng. Vui lòng kiểm tra kết nối.',
  RATE_LIMITED: 'Bạn thao tác quá nhanh. Vui lòng chờ một chút.',
  INVALID_LINK: 'Link không hợp lệ. Vui lòng nhập link sản phẩm Shopee.',
};

// =============================================================================
// Trust Signals
// =============================================================================

export const TRUST_SIGNALS = {
  /** Show verified badge */
  SHOW_VERIFIED: true,

  /** Show tested count */
  SHOW_TESTED: false,

  /** Show working indicator */
  SHOW_WORKING: true,
} as const;

// =============================================================================
// Mobile Optimization
// =============================================================================

export const MOBILE_OPTIMIZATION = {
  /** Larger touch targets on mobile */
  TOUCH_TARGET_MIN: 44,

  /** Simplified layout on mobile */
  SIMPLIFIED_LAYOUT_BELOW: 480,

  /** Hide candidates on very small screens */
  HIDE_CANDIDATES_BELOW: 400,
} as const;
