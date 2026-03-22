/**
 * Shopee Detail Extraction - Types
 *
 * Shared types and interfaces for Shopee product detail extraction.
 */

// ============================================
// Input Types
// ============================================

/**
 * Input for detail extraction
 */
export interface ShopeeDetailInput {
  /** Product URL */
  productUrl: string;

  /** Source type from discovery */
  sourceType: 'flash_sale' | 'search' | 'direct';

  /** Source keyword (if from search) */
  sourceKeyword?: string;

  /** When discovered (from listing) */
  discoveredAt?: number;

  /** Additional source metadata */
  sourceMetadata?: Record<string, unknown>;
}

// ============================================
// Raw Payload Types
// ============================================

/**
 * Raw extracted detail data
 */
export interface ShopeeDetailRawPayload {
  /** Raw title */
  rawTitle: string;

  /** Raw price text */
  rawPriceText: string;

  /** Raw original price text */
  rawOriginalPriceText?: string;

  /** Raw discount text */
  rawDiscountText?: string;

  /** Raw image URLs */
  rawImageUrls: string[];

  /** Raw description text */
  rawDescriptionText?: string;

  /** Raw seller name */
  rawSellerName?: string;

  /** Raw shop location */
  rawShopLocation?: string;

  /** Raw sold count text */
  rawSoldCountText?: string;

  /** Raw rating text */
  rawRatingText?: string;

  /** Raw rating count */
  rawRatingCountText?: string;

  /** Raw category path */
  rawCategoryPath?: string;

  /** Raw badge texts */
  rawBadgeTexts: string[];

  /** Raw page URL */
  rawPageUrl: string;

  /** External product ID */
  externalProductId?: string;

  /** Timestamp when extracted */
  extractedAt: number;
}

// ============================================
// Canonical Product Types
// ============================================

/**
 * Price information
 */
export interface ShopeePriceInfo {
  /** Current price in VND */
  priceVnd: number;

  /** Original price in VND (if available) */
  originalPriceVnd?: number;

  /** Discount percentage */
  discountPercent?: number;

  /** Currency */
  currency: string;

  /** Raw price text */
  rawPriceText: string;
}

/**
 * Seller information
 */
export interface ShopeeSellerInfo {
  /** Seller/Shop name */
  name: string;

  /** Shop location */
  location?: string;

  /** Seller rating (if available) */
  rating?: number;

  /** Total products (if available) */
  totalProducts?: number;

  /** Is official shop */
  isOfficial?: boolean;
}

/**
 * Badge information
 */
export interface ShopeeBadgeInfo {
  /** Badge text */
  text: string;

  /** Badge type */
  type: 'discount' | 'shipping' | 'promotion' | 'other';
}

/**
 * Product media
 */
export interface ShopeeProductMedia {
  /** All image URLs */
  images: string[];

  /** Primary image URL */
  primaryImage: string;

  /** Total images count */
  totalImages: number;
}

/**
 * Rating information
 */
export interface ShopeeRatingInfo {
  /** Rating score (0-5) */
  rating: number;

  /** Total ratings count */
  totalRatings: number;

  /** Total reviews count */
  totalReviews?: number;
}

/**
 * Category path
 */
export interface ShopeeCategoryPath {
  /** Full path as string */
  fullPath: string;

  /** Category levels */
  levels: string[];
}

/**
 * Canonical product model
 */
export interface ShopeeCanonicalProduct {
  /** Platform identifier */
  platform: 'shopee';

  /** External product ID */
  externalProductId: string;

  /** Product URL */
  productUrl: string;

  /** Product title */
  title: string;

  /** Product description */
  description?: string;

  /** Short description */
  shortDescription?: string;

  /** Price information */
  price: ShopeePriceInfo;

  /** Product media */
  media: ShopeeProductMedia;

  /** Seller information */
  seller: ShopeeSellerInfo;

  /** Badges */
  badges: ShopeeBadgeInfo[];

  /** Category path */
  categoryPath?: ShopeeCategoryPath;

  /** Rating information */
  rating?: ShopeeRatingInfo;

  /** Sold count */
  soldCount?: number;

  /** Source type */
  sourceType: 'flash_sale' | 'search' | 'direct';

  /** Source keyword (if applicable) */
  sourceKeyword?: string;

  /** When originally discovered */
  discoveredAt?: number;

  /** When detail was extracted */
  detailedAt: number;
}

// ============================================
// Validation Types
// ============================================

/**
 * Page validation result
 */
export interface ShopeeDetailPageValidationResult {
  /** Is valid */
  ok: boolean;

  /** Is detail page */
  isDetailPage: boolean;

  /** Has required elements */
  hasRequiredElements: boolean;

  /** Error messages */
  errors: string[];

  /** Warning messages */
  warnings: string[];

  /** Page signals */
  signals?: {
    isLoggedIn: boolean;
    isBlocked: boolean;
    hasCaptcha: boolean;
    hasError: boolean;
    isEmpty: boolean;
  };
}

// ============================================
// Result Types
// ============================================

/**
 * Detail extraction options
 */
export interface ShopeeDetailExtractionOptions {
  /** Maximum extraction attempts */
  maxAttempts?: number;

  /** Enable retry on failure */
  enableRetry?: boolean;

  /** Extraction timeout (ms) */
  extractionTimeout?: number;

  /** Page settle delay (ms) */
  pageSettleDelay?: number;

  /** Maximum images to extract */
  maxImages?: number;

  /** Custom logger */
  logger?: DetailLogger;

  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Field coverage information
 */
export interface ShopeeFieldCoverage {
  /** Total fields expected */
  totalFields: number;

  /** Fields successfully extracted */
  extractedFields: number;

  /** Missing critical fields */
  missingCriticalFields: string[];

  /** Coverage percentage */
  coveragePercent: number;
}

/**
 * Extraction metadata
 */
export interface ShopeeDetailMetadata {
  /** Start timestamp */
  startTime: number;

  /** End timestamp */
  endTime: number;

  /** Final URL after navigation */
  finalUrl: string;

  /** Number of attempts */
  attempts: number;

  /** Selector profile used */
  selectorProfileUsed: string;

  /** Field coverage */
  fieldCoverage: ShopeeFieldCoverage;

  /** Validation status */
  validationStatus: 'passed' | 'warnings' | 'failed';

  /** Suspicion of being blocked */
  blockedSuspicion: boolean;

  /** Page signals */
  pageSignals?: Record<string, unknown>;
}

/**
 * Detail extraction result
 */
export interface ShopeeDetailExtractionResult {
  /** Overall success */
  ok: boolean;

  /** Partial success */
  partialSuccess: boolean;

  /** Input URL */
  inputUrl: string;

  /** Final URL */
  finalUrl: string;

  /** Canonical product */
  canonicalProduct?: ShopeeCanonicalProduct;

  /** Raw payload */
  rawPayload?: ShopeeDetailRawPayload;

  /** Extraction warnings */
  warnings: string[];

  /** Extraction errors */
  errors: string[];

  /** Metadata */
  metadata: ShopeeDetailMetadata;

  /** Quality score (0-100) */
  qualityScore: number;

  /** Duration in ms */
  durationMs: number;
}

// ============================================
// Logger Types
// ============================================

/**
 * Detail extraction logger
 */
export interface DetailLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

// ============================================
// Error Types
// ============================================

/**
 * Error types
 */
export type ShopeeDetailErrorType =
  | 'navigation_failed'
  | 'page_invalid'
  | 'extraction_failed'
  | 'blocked_suspected'
  | 'timeout'
  | 'selector_not_found'
  | 'validation_failed';

/**
 * Detail extraction error
 */
export interface ShopeeDetailError {
  /** Error type */
  type: ShopeeDetailErrorType;

  /** Error message */
  message: string;

  /** Is recoverable */
  recoverable: boolean;

  /** Should retry */
  shouldRetry: boolean;
}

// ============================================
// Warning Types
// ============================================

/**
 * Warning severity
 */
export type ShopeeDetailWarningSeverity = 'info' | 'warning' | 'critical';

/**
 * Detail warning
 */
export interface ShopeeDetailWarning {
  /** Warning message */
  message: string;

  /** Severity */
  severity: ShopeeDetailWarningSeverity;

  /** Field affected */
  field?: string;
}
