/**
 * Shopee Detail Extraction - Public API
 *
 * Re-exports all public APIs from the detail extraction modules.
 */

// ============================================
// Types
// ============================================

export type {
  ShopeeDetailInput,
  ShopeeDetailRawPayload,
  ShopeePriceInfo,
  ShopeeSellerInfo,
  ShopeeBadgeInfo,
  ShopeeProductMedia,
  ShopeeRatingInfo,
  ShopeeCategoryPath,
  ShopeeCanonicalProduct,
  ShopeeDetailPageValidationResult,
  ShopeeDetailExtractionOptions,
  ShopeeDetailExtractionResult,
  ShopeeFieldCoverage,
  ShopeeDetailMetadata,
  DetailLogger,
  ShopeeDetailErrorType,
  ShopeeDetailError,
  ShopeeDetailWarningSeverity,
  ShopeeDetailWarning,
} from './types.js';

// ============================================
// Constants
// ============================================

export {
  DETAIL_TIMEOUT,
  DETAIL_RETRY,
  DETAIL_LIMITS,
  DETAIL_VALIDATION,
  DETAIL_SELECTOR_WAIT,
  MEDIA,
  URL_PATTERNS_DETAIL,
  PRICE_PARSING_DETAIL,
  DETAIL_LOGGING,
  QUALITY_SCORE,
} from './constants.js';

// ============================================
// Selectors
// ============================================

export {
  SHOPEE_DETAIL_SELECTORS,
  getDetailSelector,
  getAllDetailSelectors,
  getImageSelectors,
  createDetailSelectorProfile,
  type DetailSelectorProfile,
} from './selectors.js';

// ============================================
// Navigation
// ============================================

export {
  normalizeShopeeDetailUrl,
  verifyShopeeDetailUrl,
  extractProductIdFromUrl,
  openShopeeDetailPage,
  openFromListingCard,
} from './navigation.js';

// ============================================
// Validators
// ============================================

export {
  validateShopeeDetailPage,
  validateShopeeDetailRawPayload,
  validateShopeeCanonicalProduct,
  shouldRetryExtraction,
} from './validators.js';

// ============================================
// Extractors
// ============================================

export {
  extractShopeeDetailRaw,
  extractTitleRaw,
  extractPriceRaw,
  extractImagesRaw,
  extractDescriptionRaw,
  extractSellerRaw,
  extractStatsRaw,
  extractBadgesRaw,
  extractCategoryRaw,
} from './extractors.js';

// ============================================
// Normalizers
// ============================================

export {
  normalizeShopeeDetailRaw,
  normalizePriceInfo,
  normalizeSellerInfo,
  normalizeRating,
  normalizeSoldCount,
  normalizeCategory,
  normalizeBadges,
} from './normalizers.js';

// ============================================
// Media
// ============================================

export {
  normalizeShopeeImageUrls,
  selectPrimaryMedia,
  isValidImageUrl,
  getImageDimensionsFromUrl,
  sortImagesByQuality,
} from './media.js';

// ============================================
// Error Classifier
// ============================================

export {
  classifyShopeeDetailError,
  getErrorCategory,
  getRetryDelay,
  shouldFailFast,
} from './errorClassifier.js';

// ============================================
// Main Extractor
// ============================================

export {
  extractShopeeProductDetail,
  getExtractionSummary,
  printExtractionSummary,
} from './shopeeDetailExtractor.js';
