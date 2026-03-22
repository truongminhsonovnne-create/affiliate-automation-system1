/**
 * Shopee Discovery Crawler - Types
 *
 * Shared types and interfaces for Shopee listing discovery.
 */

// ============================================
// Source Types
// ============================================

/**
 * Type of listing source
 */
export type ShopeeListingSourceType = 'flash_sale' | 'search';

/**
 * Kind of listing page
 */
export type ShopeeListingPageKind = 'flash_sale' | 'search' | 'unknown';

// ============================================
// Card Types
// ============================================

/**
 * Raw listing card from DOM extraction
 */
export interface ShopeeListingCardRaw {
  /** Raw title text */
  rawTitle: string;

  /** Raw price text (may include discount, etc) */
  rawPriceText: string;

  /** Raw image URL */
  rawImageUrl: string;

  /** Raw product URL */
  rawProductUrl: string;

  /** Raw badge texts (flash sale, discount, etc) */
  rawBadgeTexts: string[];

  /** Position index on page */
  positionIndex: number;

  /** Page kind where card was found */
  pageKind: ShopeeListingPageKind;

  /** Search keyword (if search page) */
  keyword?: string;

  /** Timestamp when discovered */
  discoveredAt: number;

  /** Raw additional data */
  rawData?: Record<string, unknown>;
}

/**
 * Normalized listing card for downstream use
 */
export interface ShopeeListingCardNormalized {
  /** Normalized product ID (if extractable) */
  productId?: string;

  /** Clean title */
  title: string;

  /** Price in VND (if parseable) */
  priceVnd?: number;

  /** Original price in VND (if available) */
  originalPriceVnd?: number;

  /** Discount percentage (if available) */
  discountPercent?: number;

  /** Clean image URL */
  imageUrl: string;

  /** Full product URL */
  productUrl: string;

  /** Normalized source type */
  sourceType: ShopeeListingSourceType;

  /** Source page kind */
  pageKind: ShopeeListingPageKind;

  /** Search keyword (if search) */
  keyword?: string;

  /** Position on page */
  positionIndex: number;

  /** Discovered timestamp */
  discoveredAt: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Extracted page signals for debugging
 */
export interface ShopeeListingPageSignals {
  /** Total cards found in DOM */
  totalCardsInDom: number;

  /** Visible cards count */
  visibleCardsCount: number;

  /** Page has more button */
  hasMoreButton: boolean;

  /** Page has pagination */
  hasPagination: boolean;

  /** Is flash sale page */
  isFlashSalePage: boolean;

  /** Is search results page */
  isSearchPage: boolean;

  /** Page title */
  pageTitle: string;

  /** Current URL */
  currentUrl: string;
}

// ============================================
// Scroll Strategy Types
// ============================================

/**
 * Scroll strategy options
 */
export interface ShopeeScrollStrategyOptions {
  /** Maximum scroll rounds */
  maxScrollRounds?: number;

  /** Minimum cards to stop early */
  minCardsToStop?: number;

  /** Maximum plateau rounds before stopping */
  maxPlateauRounds?: number;

  /** Enable incremental card detection */
  detectIncremental?: boolean;

  /** Custom scroll config */
  scrollConfig?: {
    minStep?: number;
    maxStep?: number;
    minDelay?: number;
    maxDelay?: number;
  };
}

/**
 * Scroll round result
 */
export interface ShopeeScrollRoundResult {
  /** Round number (1-indexed) */
  roundNumber: number;

  /** Cards count before scroll */
  cardsCountBefore: number;

  /** Cards count after scroll */
  cardsCountAfter: number;

  /** New cards added */
  newCardsAdded: number;

  /** Duration of this round */
  durationMs: number;

  /** Whether this was a plateau round */
  isPlateau: boolean;
}

/**
 * Scroll strategy result
 */
export interface ShopeeScrollStrategyResult {
  /** Total scroll rounds performed */
  totalScrollRounds: number;

  /** Total cards before scrolling */
  totalCardsBeforeScroll: number;

  /** Total cards after scrolling */
  totalCardsAfterScroll: number;

  /** Whether reached max rounds */
  reachedMaxRounds: boolean;

  /** Whether was stopped early */
  stoppedEarly: boolean;

  /** Reason for stopping */
  stopReason: 'max_rounds' | 'plateau' | 'min_cards_reached' | 'error';

  /** Individual round results */
  roundResults: ShopeeScrollRoundResult[];

  /** Total duration */
  durationMs: number;
}

// ============================================
// Discovery Run Types
// ============================================

/**
 * Discovery run options
 */
export interface ShopeeDiscoveryRunOptions {
  /** Source type */
  sourceType: ShopeeListingSourceType;

  /** Search keyword (if search) */
  keyword?: string;

  /** Maximum cards to extract */
  maxCards?: number;

  /** Enable deduplication */
  enableDeduplication?: boolean;

  /** Deduplication strategy */
  dedupeStrategy?: 'url' | 'title_image' | 'strict';

  /** Enable scroll strategy */
  enableScrollStrategy?: boolean;

  /** Scroll strategy options */
  scrollOptions?: ShopeeScrollStrategyOptions;

  /** Extraction options */
  extractionOptions?: {
    enableFallback?: boolean;
    timeout?: number;
  };

  /** Validation options */
  validationOptions?: {
    strictMode?: boolean;
    ignoreWarnings?: boolean;
  };

  /** Custom logger */
  logger?: DiscoveryLogger;

  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Discovery run result
 */
export interface ShopeeDiscoveryRunResult {
  /** Overall success status */
  ok: boolean;

  /** Partial success flag */
  partialSuccess: boolean;

  /** Page kind discovered */
  pageKind: ShopeeListingPageKind;

  /** Source keyword (if search) */
  sourceKeyword?: string;

  /** Raw cards count before normalization */
  cardsRawCount: number;

  /** Normalized cards count */
  cardsNormalizedCount: number;

  /** Final deduped cards count */
  cardsDedupedCount: number;

  /** Extracted raw cards */
  cardsRaw: ShopeeListingCardRaw[];

  /** Normalized cards */
  cards: ShopeeListingCardNormalized[];

  /** Discovery metadata */
  metadata: ShopeeDiscoveryMetadata;

  /** Recoverable warnings */
  warnings: string[];

  /** Hard errors */
  errors: string[];

  /** Total duration */
  durationMs: number;
}

/**
 * Discovery metadata
 */
export interface ShopeeDiscoveryMetadata {
  /** Start timestamp */
  startTime: number;

  /** End timestamp */
  endTime: number;

  /** Final URL after navigation */
  finalUrl: string;

  /** Total scroll rounds performed */
  totalScrollRounds: number;

  /** Plateau rounds count */
  plateauRounds: number;

  /** Scroll stop reason */
  stopReason: 'max_rounds' | 'plateau' | 'min_cards_reached' | 'error' | 'none';

  /** Extraction statistics */
  extractionStats: ShopeeListingExtractionStats;

  /** Selector profile used */
  selectorProfileUsed: string;

  /** Retry count */
  retryCount: number;

  /** Page validation passed */
  pageValidationPassed: boolean;
}

/**
 * Extraction statistics
 */
export interface ShopeeListingExtractionStats {
  /** Total DOM elements found */
  totalElementsFound: number;

  /** Successfully extracted */
  successfullyExtracted: number;

  /** Failed extractions */
  failedExtractions: number;

  /** Normalization failures */
  normalizationFailures: number;

  /** Deduplication removed */
  duplicatesRemoved: number;
}

// ============================================
// Error Types
// ============================================

/**
 * Discovery error types
 */
export type ShopeeDiscoveryErrorType =
  | 'navigation_error'
  | 'page_validation_failed'
  | 'extraction_failed'
  | 'normalization_failed'
  | 'scroll_failed'
  | 'timeout'
  | 'unknown';

/**
 * Discovery error
 */
export interface ShopeeDiscoveryError {
  /** Error type */
  type: ShopeeDiscoveryErrorType;

  /** Error message */
  message: string;

  /** Stack trace (if available) */
  stack?: string;

  /** Whether is recoverable */
  recoverable: boolean;
}

// ============================================
// Logger Types
// ============================================

/**
 * Discovery logger interface
 */
export interface DiscoveryLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

// ============================================
// Navigation Types
// ============================================

/**
 * Navigation options
 */
export interface ShopeeNavigationOptions {
  /** Timeout for navigation */
  timeout?: number;

  /** Retry count */
  retryCount?: number;

  /** Enable debug logging */
  verbose?: boolean;

  /** Custom logger */
  logger?: DiscoveryLogger;
}

/**
 * Navigation result
 */
export interface ShopeeNavigationResult {
  /** Whether navigation succeeded */
  ok: boolean;

  /** Final URL */
  finalUrl: string;

  /** Page kind detected */
  pageKind: ShopeeListingPageKind;

  /** Error if failed */
  error?: string;
}
