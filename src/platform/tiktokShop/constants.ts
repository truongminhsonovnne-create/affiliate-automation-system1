/**
 * TikTok Shop Domain Layer Constants
 */

// ============================================================
// Reference Parsing Constants
// ============================================================

export const REFERENCE_PARSING_LIMITS = {
  MAX_INPUT_LENGTH: 2048,
  MAX_PROCESSING_TIME_MS: 1000,
  MIN_URL_LENGTH: 10,
  MAX_REDIRECT_DEPTH: 5,
} as const;

export const REFERENCE_CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9,
  MEDIUM: 0.7,
  LOW: 0.5,
} as const;

export const REFERENCE_URL_PATTERNS = {
  PRODUCT_DETAIL: [
    /shop\.tiktok\.com\/.*\/product\/(\d+)/i,
    /tiktok\.com\/@[\w.-]+\/product\/[\w.-]+-(\d+)/i,
  ],
  SHOP: [
    /shop\.tiktok\.com\/shop\/([\w-]+)/i,
    /tiktok\.com\/@([\w.-]+)/i,
  ],
  SHORT: [
    /vt\.tiktok\.com\/([\w-]+)/i,
    /tiktok\.com\/t\/([\w-]+)/i,
  ],
} as const;

// ============================================================
// Context Modeling Constants
// ============================================================

export const CONTEXT_REQUIRED_FIELDS = [
  'productId',
  'title',
  'seller',
  'price',
] as const;

export const CONTEXT_OPTIONAL_FIELDS = [
  'description',
  'category',
  'images',
  'inventory',
  'metadata',
] as const;

export const SELLER_TYPE_MAPPING: Record<string, 'official' | 'verified' | 'regular'> = {
  '1': 'official',
  '2': 'verified',
  '0': 'regular',
} as const;

// ============================================================
// Promotion Constants
// ============================================================

export const PROMOTION_TYPES = {
  DISCOUNT: 'discount',
  VOUCHER: 'voucher',
  COUPON: 'coupon',
  FLASH_SALE: 'flash_sale',
  BUNDLE: 'bundle',
  FREE_SHIPPING: 'free_shipping',
  NEW_USER: 'new_user',
  LOYALTY: 'loyalty',
  CAMPAIGN: 'campaign',
  UNKNOWN: 'unknown',
} as const;

export const SCOPE_TYPES = {
  GLOBAL: 'global',
  SHOP: 'shop',
  PRODUCT: 'product',
  CATEGORY: 'category',
  USER_SEGMENT: 'user_segment',
  CART: 'cart',
} as const;

export const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED_AMOUNT: 'fixed_amount',
  BOGO: 'bogo',
  SHIPPING: 'shipping',
} as const;

// ============================================================
// Compatibility Score Thresholds
// ============================================================

export const COMPATIBILITY_SCORE_THRESHOLDS = {
  FULL: 0.9,
  PARTIAL: 0.6,
  MINIMUM: 0.3,
} as const;

export const COMPATIBILITY_STATUS = {
  FULL: 'full',
  PARTIAL: 'partial',
  UNSUPPORTED: 'unsupported',
} as const;

// ============================================================
// Blocker/Warning Thresholds
// ============================================================

export const BLOCKER_THRESHOLDS = {
  CRITICAL: 3,
  HIGH: 5,
  MEDIUM: 10,
} as const;

export const WARNING_THRESHOLDS = {
  HIGH: 8,
  MEDIUM: 15,
} as const;

// ============================================================
// Support Level Thresholds
// ============================================================

export const SUPPORT_LEVEL_THRESHOLDS = {
  FULL: 0.85,
  PARTIAL: 0.5,
  MINIMUM: 0.2,
} as const;

// ============================================================
// Readiness Score Weights
// ============================================================

export const READINESS_WEIGHTS = {
  REFERENCE_PARSING: 0.30,
  CONTEXT_MODELING: 0.25,
  PROMOTION_COMPATIBILITY: 0.30,
  INTEGRATION: 0.15,
} as const;

// ============================================================
// Backlog Priority
// ============================================================

export const BACKLOG_PRIORITY_DAYS = {
  CRITICAL: 7,
  HIGH: 14,
  MEDIUM: 30,
  LOW: 60,
} as const;

// ============================================================
// TikTok Shop Specific Constants
// ============================================================

export const TIKTOK_SHOP_BASE_URLS = [
  'https://shop.tiktok.com',
  'https://www.tiktok.com',
  'https://tiktok.com',
  'https://m.tiktok.com',
  'https://vm.tiktok.com',
  'https://vt.tiktok.com',
] as const;

export const TIKTOK_SHOP_DOMAINS = [
  'tiktok.com',
  'shop.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
] as const;

export const TIKTOK_SHOP_PLATFORMS = {
  ANDROID: 'android',
  IOS: 'ios',
  WEB: 'web',
  DESKTOP: 'desktop',
} as const;

// ============================================================
// Promotion Mapping Defaults
// ============================================================

export const DEFAULT_PROMOTION_MAPPING = {
  fallbackToGeneric: false,
  logUnmappedFields: true,
  strictValidation: false,
} as const;

// ============================================================
// Validation Limits
// ============================================================

export const VALIDATION_LIMITS = {
  MAX_PROMOTION_CODE_LENGTH: 50,
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_DISCOUNT_VALUE: 0,
  MAX_DISCOUNT_PERCENTAGE: 100,
  MAX_DISCOUNT_FIXED: 1000000,
} as const;
