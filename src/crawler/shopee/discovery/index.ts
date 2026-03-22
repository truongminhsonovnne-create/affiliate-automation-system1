/**
 * Shopee Discovery Crawler - Public API
 *
 * Re-exports all public APIs from the discovery modules.
 */

// ============================================
// Types
// ============================================

export type {
  ShopeeListingSourceType,
  ShopeeListingPageKind,
  ShopeeListingCardRaw,
  ShopeeListingCardNormalized,
  ShopeeListingPageSignals,
  ShopeeScrollStrategyOptions,
  ShopeeScrollRoundResult,
  ShopeeScrollStrategyResult,
  ShopeeDiscoveryRunOptions,
  ShopeeDiscoveryRunResult,
  ShopeeDiscoveryMetadata,
  ShopeeListingExtractionStats,
  ShopeeDiscoveryErrorType,
  ShopeeDiscoveryError,
  DiscoveryLogger,
  ShopeeNavigationOptions,
  ShopeeNavigationResult,
} from './types.js';

// ============================================
// Constants
// ============================================

export {
  DISCOVERY_TIMEOUT,
  DISCOVERY_RETRY,
  CARD_LIMITS,
  SCROLL_STRATEGY,
  SCROLL_CONFIG,
  SELECTOR_WAIT,
  STABILIZATION,
  DEDUPE,
  EXTRACTION,
  VALIDATION,
  URL_PATTERNS,
  PRICE_PARSING,
  DISCOVERY_LOGGING,
} from './constants.js';

// ============================================
// Selectors
// ============================================

export {
  SHOPEE_SELECTORS,
  getSelectorsForPageKind,
  getSelector,
  getAllSelectors,
  getCardSelectors,
  createSelectorProfile,
  type SelectorSet,
  type SelectorProfile,
} from './selectors.js';

// ============================================
// Navigation
// ============================================

export {
  buildFlashSaleUrl,
  buildSearchUrl,
  detectPageKindFromUrl,
  detectPageKindFromDom,
  openShopeeListingPage,
  validateListingPage as validateListingPageNavigation,
} from './navigation.js';

// ============================================
// Extractors
// ============================================

export {
  extractListingCardsRaw,
  extractSingleListingCard,
  extractListingPageSignals,
  countCardsInDom,
} from './extractors.js';

// ============================================
// Normalizers
// ============================================

export {
  normalizeListingCard,
  normalizeListingCards,
  dedupeListingCards,
  validateNormalizedCard,
} from './normalizers.js';

// ============================================
// Scroll Strategy
// ============================================

export {
  discoverListingCardsWithScroll,
  getScrollStatsSummary,
} from './scrollStrategy.js';

// ============================================
// Validators
// ============================================

export {
  validateListingPage as validateListingPageState,
  validateRawListingCard,
  validateNormalizedListingCard,
  validateExtractionResult,
  classifyIssue,
} from './validators.js';

// ============================================
// Main Crawler
// ============================================

export {
  crawlFlashSaleDiscovery,
  crawlSearchDiscovery,
  getDiscoverySummary,
  printDiscoverySummary,
} from './shopeeDiscoveryCrawler.js';
