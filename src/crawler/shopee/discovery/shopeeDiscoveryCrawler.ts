/**
 * Shopee Discovery Crawler - Orchestrator
 *
 * Main orchestration for Shopee listing discovery.
 */

import type { Page } from 'playwright';
import type {
  ShopeeDiscoveryRunOptions,
  ShopeeDiscoveryRunResult,
  ShopeeDiscoveryMetadata,
  ShopeeListingExtractionStats,
  ShopeeListingSourceType,
  ShopeeListingPageKind,
  ShopeeScrollStrategyOptions,
  DiscoveryLogger,
} from './types.js';
import {
  CARD_LIMITS,
  DISCOVERY_TIMEOUT,
  SCROLL_STRATEGY,
  DISCOVERY_LOGGING,
} from './constants.js';
import {
  buildFlashSaleUrl,
  buildSearchUrl,
  openShopeeListingPage,
  validateListingPage,
} from './navigation.js';
import {
  extractListingCardsRaw,
  extractListingPageSignals,
} from './extractors.js';
import {
  normalizeListingCards,
  dedupeListingCards,
} from './normalizers.js';
import {
  discoverListingCardsWithScroll,
} from './scrollStrategy.js';
import {
  validateListingPage as validateListingPageFn,
} from './validators.js';

/**
 * Create default logger
 */
function createDefaultLogger(verbose: boolean = false): DiscoveryLogger {
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      console.log(`${DISCOVERY_LOGGING.PREFIX} ℹ️ ${message}`, meta ? JSON.stringify(meta) : '');
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
      console.warn(`${DISCOVERY_LOGGING.PREFIX} ⚠️ ${message}`, meta ? JSON.stringify(meta) : '');
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
      if (verbose) {
        console.debug(`${DISCOVERY_LOGGING.PREFIX} 🔍 ${message}`, meta ? JSON.stringify(meta) : '');
      }
    },
    error: (message: string, meta?: Record<string, unknown>) => {
      console.error(`${DISCOVERY_LOGGING.PREFIX} ❌ ${message}`, meta ? JSON.stringify(meta) : '');
    },
  };
}

/**
 * Crawl Flash Sale discovery
 *
 * @param page - Playwright Page
 * @param options - Discovery options
 * @returns Discovery run result
 */
export async function crawlFlashSaleDiscovery(
  page: Page,
  options: Omit<ShopeeDiscoveryRunOptions, 'sourceType'> & {
    /** Override URL */
    customUrl?: string;
  } = {}
): Promise<ShopeeDiscoveryRunResult> {
  return runDiscovery(page, {
    ...options,
    sourceType: 'flash_sale',
    keyword: undefined,
  });
}

/**
 * Crawl Search discovery
 *
 * @param page - Playwright Page
 * @param keyword - Search keyword
 * @param options - Discovery options
 * @returns Discovery run result
 */
export async function crawlSearchDiscovery(
  page: Page,
  keyword: string,
  options: Omit<ShopeeDiscoveryRunOptions, 'sourceType' | 'keyword'> = {}
): Promise<ShopeeDiscoveryRunResult> {
  return runDiscovery(page, {
    ...options,
    sourceType: 'search',
    keyword,
  });
}

/**
 * Main discovery runner
 */
async function runDiscovery(
  page: Page,
  options: ShopeeDiscoveryRunOptions
): Promise<ShopeeDiscoveryRunResult> {
  const startTime = Date.now();
  const logger = options.logger ?? createDefaultLogger(options.verbose ?? false);

  const {
    sourceType,
    keyword,
    maxCards = CARD_LIMITS.DEFAULT_MAX_CARDS,
    enableDeduplication = true,
    dedupeStrategy = 'url',
    enableScrollStrategy = true,
    scrollOptions,
    extractionOptions,
    validationOptions,
  } = options;

  // Determine page kind
  const pageKind: ShopeeListingPageKind = sourceType === 'flash_sale' ? 'flash_sale' : 'search';

  logger.info('Starting Shopee discovery', {
    sourceType,
    pageKind,
    keyword,
    maxCards,
  });

  const warnings: string[] = [];
  const errors: string[] = [];

  let cardsRaw: Awaited<ReturnType<typeof extractListingCardsRaw>> = [];
  let cardsNormalized: Awaited<ReturnType<typeof normalizeListingCards>> = [];
  let scrollResult: Awaited<ReturnType<typeof discoverListingCardsWithScroll>> | undefined;
  let metadata: ShopeeDiscoveryMetadata;
  let pageValidationPassed = false;

  try {
    // ========================================
    // Step 1: Verify page is prepared
    // ========================================
    if (page.isClosed()) {
      errors.push('Page is closed');
      return createErrorResult(pageKind, startTime, errors, warnings);
    }

    // ========================================
    // Step 2: Open listing page
    // ========================================
    logger.info('Opening listing page...');

    const navResult = await openShopeeListingPage(page, pageKind, {
      keyword,
      customUrl: options.customUrl,
      logger,
    });

    if (!navResult.ok) {
      errors.push(`Navigation failed: ${navResult.error}`);
      return createErrorResult(pageKind, startTime, errors, warnings, keyword);
    }

    const finalUrl = navResult.finalUrl;
    logger.info('Page opened successfully', { finalUrl, detectedKind: navResult.pageKind });

    // ========================================
    // Step 3: Validate listing page
    // ========================================
    logger.debug('Validating page...');

    const validationResult = await validateListingPageFn(page, pageKind, {
      logger,
      strictMode: validationOptions?.strictMode ?? false,
    });

    pageValidationPassed = validationResult.ok;

    if (!validationResult.ok) {
      warnings.push(...validationResult.errors.map(e => `Validation: ${e}`));
    }

    if (validationResult.warnings.length > 0) {
      warnings.push(...validationResult.warnings.map(w => `Validation: ${w}`));
    }

    // ========================================
    // Step 4: Scroll strategy (if enabled)
    // ========================================
    let totalScrollRounds = 0;
    let plateauRounds = 0;
    let stopReason: ShopeeDiscoveryMetadata['stopReason'] = 'none';

    if (enableScrollStrategy) {
      logger.info('Running scroll strategy...');

      const scrollOpts: ShopeeScrollStrategyOptions & { logger?: DiscoveryLogger } = {
        maxScrollRounds: scrollOptions?.maxScrollRounds ?? SCROLL_STRATEGY.DEFAULT_MAX_ROUNDS,
        minCardsToStop: scrollOptions?.minCardsToStop ?? CARD_LIMITS.MIN_CARDS_SUCCESS,
        maxPlateauRounds: scrollOptions?.maxPlateauRounds ?? SCROLL_STRATEGY.DEFAULT_PLATEAU_ROUNDS,
        scrollConfig: scrollOptions?.scrollConfig,
        logger,
      };

      scrollResult = await discoverListingCardsWithScroll(page, scrollOpts);

      totalScrollRounds = scrollResult.totalScrollRounds;
      plateauRounds = scrollResult.roundResults.filter(r => r.isPlateau).length;
      stopReason = scrollResult.stopReason;

      logger.info('Scroll strategy complete', {
        rounds: totalScrollRounds,
        cardsFound: scrollResult.totalCardsAfterScroll,
        stopReason,
      });
    }

    // ========================================
    // Step 5: Extract raw cards
    // ========================================
    logger.info('Extracting cards...');

    cardsRaw = await extractListingCardsRaw(page, {
      pageKind: navResult.pageKind,
      keyword,
      maxCards,
      enableFallback: extractionOptions?.enableFallback ?? true,
      logger,
    });

    logger.info('Raw extraction complete', { count: cardsRaw.length });

    // ========================================
    // Step 6: Normalize cards
    // ========================================
    logger.info('Normalizing cards...');

    cardsNormalized = normalizeListingCards(cardsRaw, {
      sourceType,
      logger,
    });

    logger.info('Normalization complete', { count: cardsNormalized.length });

    // ========================================
    // Step 7: Deduplicate cards
    // ========================================
    let cardsDeduped = cardsNormalized;
    let duplicatesRemoved = 0;

    if (enableDeduplication && cardsNormalized.length > 0) {
      logger.info('Deduplicating cards...');

      cardsDeduped = dedupeListingCards(cardsNormalized, {
        strategy: dedupeStrategy,
        logger,
      });

      duplicatesRemoved = cardsNormalized.length - cardsDeduped.length;

      logger.info('Deduplication complete', {
        before: cardsNormalized.length,
        after: cardsDeduped.length,
        removed: duplicatesRemoved,
      });
    }

    // ========================================
    // Build metadata
    // ========================================
    const extractionStats: ShopeeListingExtractionStats = {
      totalElementsFound: cardsRaw.length,
      successfullyExtracted: cardsNormalized.length,
      failedExtractions: cardsRaw.length - cardsNormalized.length,
      normalizationFailures: 0,
      duplicatesRemoved,
    };

    metadata = {
      startTime,
      endTime: Date.now(),
      finalUrl,
      totalScrollRounds,
      plateauRounds,
      stopReason,
      extractionStats,
      selectorProfileUsed: pageKind,
      retryCount: 0,
      pageValidationPassed,
    };

    // ========================================
    // Build result
    // ========================================
    const success = cardsDeduped.length > 0;
    const partialSuccess = cardsNormalized.length > 0 && cardsDeduped.length === 0;

    return {
      ok: success,
      partialSuccess: partialSuccess || (!success && cardsNormalized.length > 0),
      pageKind: navResult.pageKind,
      sourceKeyword: keyword,
      cardsRawCount: cardsRaw.length,
      cardsNormalizedCount: cardsNormalized.length,
      cardsDedupedCount: cardsDeduped.length,
      cardsRaw,
      cards: cardsDeduped,
      metadata,
      warnings,
      errors,
      durationMs: Date.now() - startTime,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Discovery failed with error', { error: errorMessage });
    errors.push(errorMessage);

    // Build partial metadata if possible
    const extractionStats: ShopeeListingExtractionStats = {
      totalElementsFound: cardsRaw.length,
      successfullyExtracted: cardsNormalized.length,
      failedExtractions: cardsRaw.length - cardsNormalized.length,
      normalizationFailures: 0,
      duplicatesRemoved: 0,
    };

    metadata = {
      startTime,
      endTime: Date.now(),
      finalUrl: page.url(),
      totalScrollRounds: scrollResult?.totalScrollRounds ?? 0,
      plateauRounds: scrollResult?.roundResults.filter(r => r.isPlateau).length ?? 0,
      stopReason: scrollResult?.stopReason ?? 'error',
      extractionStats,
      selectorProfileUsed: pageKind,
      retryCount: 0,
      pageValidationPassed,
    };

    return {
      ok: false,
      partialSuccess: cardsNormalized.length > 0,
      pageKind,
      sourceKeyword: keyword,
      cardsRawCount: cardsRaw.length,
      cardsNormalizedCount: cardsNormalized.length,
      cardsDedupedCount: cardsDeduped.length,
      cardsRaw,
      cards: cardsDeduped,
      metadata,
      warnings,
      errors,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Create error result
 */
function createErrorResult(
  pageKind: ShopeeListingPageKind,
  startTime: number,
  errors: string[],
  warnings: string[] = [],
  keyword?: string
): ShopeeDiscoveryRunResult {
  return {
    ok: false,
    partialSuccess: false,
    pageKind,
    sourceKeyword: keyword,
    cardsRawCount: 0,
    cardsNormalizedCount: 0,
    cardsDedupedCount: 0,
    cardsRaw: [],
    cards: [],
    metadata: {
      startTime,
      endTime: Date.now(),
      finalUrl: '',
      totalScrollRounds: 0,
      plateauRounds: 0,
      stopReason: 'error',
      extractionStats: {
        totalElementsFound: 0,
        successfullyExtracted: 0,
        failedExtractions: 0,
        normalizationFailures: 0,
        duplicatesRemoved: 0,
      },
      selectorProfileUsed: pageKind,
      retryCount: 0,
      pageValidationPassed: false,
    },
    warnings,
    errors,
    durationMs: Date.now() - startTime,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get discovery summary
 */
export function getDiscoverySummary(
  result: ShopeeDiscoveryRunResult
): {
  success: boolean;
  cardsFound: number;
  duration: string;
  warnings: number;
  errors: number;
} {
  return {
    success: result.ok,
    cardsFound: result.cardsDedupedCount,
    duration: `${result.durationMs}ms`,
    warnings: result.warnings.length,
    errors: result.errors.length,
  };
}

/**
 * Print discovery summary to console
 */
export function printDiscoverySummary(
  result: ShopeeDiscoveryRunResult,
  options: {
    /** Show cards */
    showCards?: boolean;
    /** Show warnings */
    showWarnings?: boolean;
    /** Show errors */
    showErrors?: boolean;
  } = {}
): void {
  const summary = getDiscoverySummary(result);

  console.log('\n========================================');
  console.log('Shopee Discovery Summary');
  console.log('========================================');
  console.log(`Status:        ${result.ok ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Page Kind:     ${result.pageKind}`);
  console.log(`Keyword:       ${result.sourceKeyword || 'N/A'}`);
  console.log(`Cards Found:   ${result.cardsDedupedCount}`);
  console.log(`Duration:      ${summary.duration}`);
  console.log(`Warnings:      ${result.warnings.length}`);
  console.log(`Errors:        ${result.errors.length}`);

  if (result.metadata) {
    console.log('\n--- Metadata ---');
    console.log(`Scroll Rounds: ${result.metadata.totalScrollRounds}`);
    console.log(`Stop Reason:   ${result.metadata.stopReason}`);
    console.log(`Final URL:     ${result.metadata.finalUrl.substring(0, 60)}...`);
  }

  if (options.showWarnings && result.warnings.length > 0) {
    console.log('\n--- Warnings ---');
    result.warnings.slice(0, 5).forEach((w, i) => {
      console.log(`  ${i + 1}. ${w}`);
    });
    if (result.warnings.length > 5) {
      console.log(`  ... and ${result.warnings.length - 5} more`);
    }
  }

  if (options.showErrors && result.errors.length > 0) {
    console.log('\n--- Errors ---');
    result.errors.slice(0, 5).forEach((e, i) => {
      console.log(`  ${i + 1}. ${e}`);
    });
    if (result.errors.length > 5) {
      console.log(`  ... and ${result.errors.length - 5} more`);
    }
  }

  console.log('========================================\n');
}
