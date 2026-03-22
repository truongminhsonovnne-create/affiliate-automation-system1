/**
 * Shopee Discovery Crawler - Scroll Strategy
 *
 * Handles scroll-based listing card discovery.
 */

import type { Page } from 'playwright';
import type {
  ShopeeScrollStrategyOptions,
  ShopeeScrollStrategyResult,
  ShopeeScrollRoundResult,
  DiscoveryLogger,
} from './types.js';
import { SCROLL_STRATEGY, STABILIZATION, SELECTOR_WAIT } from './constants.js';

// ============================================
// Main Scroll Function
// ============================================

/**
 * Discover listing cards with intelligent scrolling
 *
 * @param page - Playwright Page
 * @param options - Scroll strategy options
 * @returns Scroll strategy result
 */
export async function discoverListingCardsWithScroll(
  page: Page,
  options: ShopeeScrollStrategyOptions & {
    /** Custom logger */
    logger?: DiscoveryLogger;
  }
): Promise<ShopeeScrollStrategyResult> {
  const {
    maxScrollRounds = SCROLL_STRATEGY.DEFAULT_MAX_ROUNDS,
    minCardsToStop = SCROLL_STRATEGY.MIN_CARDS_TO_STOP,
    maxPlateauRounds = SCROLL_STRATEGY.DEFAULT_PLATEAU_ROUNDS,
    detectIncremental = SCROLL_STRATEGY.ENABLE_INCREMENTAL,
    scrollConfig,
    logger,
  } = options;

  const startTime = Date.now();
  const roundResults: ShopeeScrollRoundResult[] = [];

  logger?.info('Starting scroll strategy', {
    maxScrollRounds,
    minCardsToStop,
    maxPlateauRounds,
  });

  // Get initial count
  const initialCount = await countCardsInDom(page);
  let totalCardsBeforeScroll = initialCount;

  logger?.debug('Initial card count', { count: initialCount });

  let plateauRounds = 0;
  let stoppedEarly = false;
  let stopReason: ShopeeScrollStrategyResult['stopReason'] = 'none';

  // Scroll loop
  for (let round = 1; round <= maxScrollRounds; round++) {
    const roundStartTime = Date.now();

    logger?.debug(`Scroll round ${round}/${maxScrollRounds}`);

    // Count before scroll
    const countBefore = await countCardsInDom(page);

    // Perform human-like scroll
    await performHumanScroll(page, scrollConfig);

    // Wait for content to load
    await page.waitForTimeout(STABILIZATION.POST_SCROLL);

    // Count after scroll
    const countAfter = await countCardsInDom(page);
    const newCardsAdded = Math.max(0, countAfter - countBefore);

    const roundDuration = Date.now() - roundStartTime;

    const isPlateau = newCardsAdded < SCROLL_STRATEGY.PLATEAU_THRESHOLD;

    if (isPlateau) {
      plateauRounds++;
    } else {
      plateauRounds = 0;
    }

    const roundResult: ShopeeScrollRoundResult = {
      roundNumber: round,
      cardsCountBefore: countBefore,
      cardsCountAfter: countAfter,
      newCardsAdded,
      durationMs: roundDuration,
      isPlateau,
    };

    roundResults.push(roundResult);

    logger?.debug(`Round ${round} complete`, {
      before: countBefore,
      after: countAfter,
      added: newCardsAdded,
      plateau: isPlateau,
      plateauRounds,
    });

    // Check stopping conditions

    // 1. Reached minimum cards and plateau
    if (countAfter >= minCardsToStop && plateauRounds >= maxPlateauRounds) {
      stoppedEarly = true;
      stopReason = 'min_cards_reached';
      logger?.info('Stopped early: min cards reached with plateau', {
        cards: countAfter,
        plateauRounds,
      });
      break;
    }

    // 2. No new cards for multiple rounds
    if (plateauRounds >= maxPlateauRounds) {
      stoppedEarly = true;
      stopReason = 'plateau';
      logger?.info('Stopped: plateau detected', {
        plateauRounds,
        totalCards: countAfter,
      });
      break;
    }

    // 3. Check if we've reached max rounds
    if (round >= maxScrollRounds) {
      stopReason = 'max_rounds';
      logger?.info('Stopped: max rounds reached', {
        rounds: round,
        totalCards: countAfter,
      });
      break;
    }
  }

  const totalDuration = Date.now() - startTime;
  const finalCount = await countCardsInDom(page);

  const result: ShopeeScrollStrategyResult = {
    totalScrollRounds: roundResults.length,
    totalCardsBeforeScroll,
    totalCardsAfterScroll: finalCount,
    reachedMaxRounds: roundResults.length >= maxScrollRounds,
    stoppedEarly,
    stopReason,
    roundResults,
    durationMs: totalDuration,
  };

  logger?.info('Scroll strategy complete', {
    totalRounds: result.totalScrollRounds,
    finalCount: result.totalCardsAfterScroll,
    stopReason: result.stopReason,
    duration: `${totalDuration}ms`,
  });

  return result;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Perform human-like scroll
 */
async function performHumanScroll(
  page: Page,
  config?: {
    minStep?: number;
    maxStep?: number;
    minDelay?: number;
    maxDelay?: number;
  }
): Promise<void> {
  const minStep = config?.minStep ?? 300;
  const maxStep = config?.maxStep ?? 600;
  const minDelay = config?.minDelay ?? 300;
  const maxDelay = config?.maxDelay ?? 800;

  // Get current scroll position
  const scrollInfo = await page.evaluate(() => ({
    scrollY: window.scrollY,
    scrollHeight: document.body.scrollHeight,
    innerHeight: window.innerHeight,
  }));

  // Calculate max scroll
  const maxScroll = Math.max(0, scrollInfo.scrollHeight - scrollInfo.innerHeight);

  if (scrollInfo.scrollY >= maxScroll) {
    // Already at bottom, try small scroll up then down
    await page.evaluate(() => {
      window.scrollBy(0, -100);
    });
    await page.waitForTimeout(300);
  }

  // Random scroll step
  const scrollStep = Math.floor(Math.random() * (maxStep - minStep) + minStep);
  const direction = Math.random() > 0.95 ? -1 : 1;
  const actualScroll = scrollStep * direction;

  // Perform scroll
  await page.evaluate((distance) => {
    window.scrollBy(0, distance);
  }, actualScroll);

  // Random delay
  const delay = Math.floor(Math.random() * (maxDelay - minDelay) + minDelay);
  await page.waitForTimeout(delay);
}

/**
 * Count cards in DOM
 */
async function countCardsInDom(page: Page): Promise<number> {
  try {
    const count = await page.evaluate(() => {
      const selectors = [
        '.item-card-wrapper',
        '[data-sqe="item"]',
        '.shopee-item-card',
        '.product-card',
      ];

      for (const sel of selectors) {
        const elements = document.querySelectorAll(sel);
        if (elements.length > 0) {
          return elements.length;
        }
      }
      return 0;
    });

    return count;
  } catch {
    return 0;
  }
}

/**
 * Wait for new cards to load
 */
async function waitForNewCards(
  page: Page,
  previousCount: number,
  timeout: number = 3000
): Promise<number> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    await page.waitForTimeout(500);
    const currentCount = await countCardsInDom(page);

    if (currentCount > previousCount) {
      return currentCount;
    }
  }

  return await countCardsInDom(page);
}

/**
 * Check if page has more content to load
 */
async function hasMoreContent(page: Page): Promise<boolean> {
  try {
    const hasMore = await page.evaluate(() => {
      // Check for "load more" button
      const loadMoreButtons = document.querySelectorAll(
        '.shopee-button-primary, button[class*="more"], button[class*="load"]'
      );

      // Check if we're at bottom
      const atBottom = (
        window.innerHeight + window.scrollY >=
        document.body.scrollHeight - 100
      );

      // Check for loading indicator
      const loading = document.querySelector(
        '.shopee-spinner, .loading, [class*="loading"]'
      );

      return loadMoreButtons.length > 0 || !atBottom || !!loading;
    });

    return hasMore;
  } catch {
    return true;
  }
}

/**
 * Get scroll statistics summary
 */
export function getScrollStatsSummary(
  result: ShopeeScrollStrategyResult
): {
  totalRounds: number;
  totalNewCards: number;
  averageCardsPerRound: number;
  plateauRounds: number;
  wasSuccessful: boolean;
} {
  const totalNewCards = result.totalCardsAfterScroll - result.totalCardsBeforeScroll;
  const plateauRounds = result.roundResults.filter(r => r.isPlateau).length;
  const averageCardsPerRound = result.totalScrollRounds > 0
    ? totalNewCards / result.totalScrollRounds
    : 0;

  const wasSuccessful = !result.stopReason || result.stopReason === 'max_rounds';

  return {
    totalRounds: result.totalScrollRounds,
    totalNewCards,
    averageCardsPerRound: Math.round(averageCardsPerRound * 10) / 10,
    plateauRounds,
    wasSuccessful,
  };
}
