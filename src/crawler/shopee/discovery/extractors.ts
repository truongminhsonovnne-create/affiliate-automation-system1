/**
 * Shopee Discovery Crawler - Extractors
 *
 * Extracts raw listing data from Shopee DOM.
 */

import type { Page } from 'playwright';
import type {
  ShopeeListingCardRaw,
  ShopeeListingPageSignals,
  ShopeeListingPageKind,
  DiscoveryLogger,
} from './types.js';
import { getCardSelectors, getAllSelectors } from './selectors.js';
import { DISCOVERY_TIMEOUT, SELECTOR_WAIT, EXTRACTION } from './constants.js';

/**
 * Extract all listing cards from current page
 *
 * @param page - Playwright Page
 * @param options - Extraction options
 * @returns Array of raw listing cards
 */
export async function extractListingCardsRaw(
  page: Page,
  options: {
    /** Page kind */
    pageKind: ShopeeListingPageKind;
    /** Keyword (if search) */
    keyword?: string;
    /** Maximum cards to extract */
    maxCards?: number;
    /** Enable fallback selectors */
    enableFallback?: boolean;
    /** Custom logger */
    logger?: DiscoveryLogger;
  } = {}
): Promise<ShopeeListingCardRaw[]> {
  const {
    pageKind,
    keyword,
    maxCards = 100,
    enableFallback = EXTRACTION.ENABLE_FALLBACK,
    logger,
  } = options;

  const cards: ShopeeListingCardRaw[] = [];
  const pageKindForSelector = pageKind === 'unknown' ? 'generic' : pageKind;

  logger?.debug('Starting card extraction', { pageKind, maxCards });

  try {
    // Wait for page to stabilize
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(SELECTOR_WAIT.AFTER_SCROLL);

    // Try to find card containers
    const selectors = getCardSelectors(pageKindForSelector);

    let cardElements: unknown[] = [];

    // Try each selector
    for (const selector of selectors) {
      try {
        logger?.debug(`Trying selector: ${selector}`);

        cardElements = await page.evaluate((sel, limit) => {
          const elements = Array.from(document.querySelectorAll(sel));
          return elements.slice(0, limit).map((el, index) => ({
            element: el.outerHTML,
            index,
          }));
        }, selector, maxCards);

        if (cardElements.length > 0) {
          logger?.debug(`Found ${cardElements.length} cards with selector: ${selector}`);
          break;
        }
      } catch {
        logger?.debug(`Selector failed: ${selector}`);
        continue;
      }
    }

    // Fallback: try generic selectors if nothing found
    if (cardElements.length === 0 && enableFallback) {
      const fallbackSelectors = [
        '.item-card-wrapper',
        '[data-sqe="item"]',
        '.shopee-item-card',
        '.product-card',
      ];

      for (const selector of fallbackSelectors) {
        try {
          cardElements = await page.evaluate((sel, limit) => {
            const elements = Array.from(document.querySelectorAll(sel));
            return elements.slice(0, limit).map((el, index) => ({
              element: el.outerHTML,
              index,
            }));
          }, selector, maxCards);

          if (cardElements.length > 0) {
            logger?.debug(`Fallback found ${cardElements.length} cards with: ${selector}`);
            break;
          }
        } catch {
          continue;
        }
      }
    }

    // Extract data from each card
    const discoveredAt = Date.now();

    for (const cardData of cardElements) {
      try {
        const rawCard = await extractSingleListingCard(page, cardData, {
          pageKind,
          keyword,
          discoveredAt,
          positionIndex: cards.length,
          logger,
        });

        if (rawCard) {
          cards.push(rawCard);
        }
      } catch (error) {
        logger?.warn('Failed to extract card', {
          error: error instanceof Error ? error.message : String(error),
          index: cards.length,
        });
        // Continue with next card - don't crash entire extraction
      }
    }

    logger?.info('Card extraction complete', {
      extracted: cards.length,
      pageKind,
    });

    return cards;

  } catch (error) {
    logger?.error('Card extraction failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return cards; // Return whatever we got
  }
}

/**
 * Extract single listing card
 *
 * @param page - Playwright Page
 * @param cardData - Card element data
 * @param options - Extraction options
 * @returns Raw listing card or null
 */
export async function extractSingleListingCard(
  page: Page,
  cardData: {
    element?: string;
    html?: string;
    outerHTML?: string;
  },
  options: {
    /** Page kind */
    pageKind: ShopeeListingPageKind;
    /** Keyword (if search) */
    keyword?: string;
    /** Discovered timestamp */
    discoveredAt: number;
    /** Position index */
    positionIndex: number;
    /** Custom logger */
    logger?: DiscoveryLogger;
  }
): Promise<ShopeeListingCardRaw | null> {
  const { pageKind, keyword, discoveredAt, positionIndex, logger } = options;

  try {
    // Extract using browser-side evaluation
    const rawCard = await page.evaluate((cardHtml) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cardHtml, 'text/html');
      const el = doc.body.firstElementChild as HTMLElement;

      if (!el) return null;

      // Helper to get text content
      const getText = (selector: string): string => {
        const target = el.querySelector(selector);
        return target?.textContent?.trim() || '';
      };

      // Helper to get attribute
      const getAttr = (selector: string, attr: string): string => {
        const target = el.querySelector(selector);
        return target?.getAttribute(attr) || '';
      };

      // Extract title
      const rawTitle = getText('[data-sqe="name"]') ||
        getText('.product-name') ||
        getText('.item-card .product-name') ||
        getText('a.product-title') ||
        el.textContent?.trim().substring(0, 200) || '';

      // Extract price
      const rawPriceText = getText('[data-sqe="price"]') ||
        getText('.price') ||
        getText('.item-card .price') ||
        '';

      // Extract image
      const rawImageUrl = getAttr('[data-sqe="image"] img', 'src') ||
        getAttr('.product-img img', 'src') ||
        getAttr('.item-card img', 'src') ||
        getAttr('img', 'src') ||
        '';

      // Extract product link
      const rawProductUrl = getAttr('[data-sqe="name"] a', 'href') ||
        getAttr('a.product-name', 'href') ||
        getAttr('.item-card-wrapper a', 'href') ||
        getAttr('a', 'href') ||
        '';

      // Extract badges
      const badgeElements = el.querySelectorAll('[data-sqe="badge"], .badge, .discount-badge');
      const rawBadgeTexts = Array.from(badgeElements)
        .map(b => b.textContent?.trim())
        .filter(Boolean);

      // Return extracted data
      return {
        rawTitle,
        rawPriceText,
        rawImageUrl,
        rawProductUrl,
        rawBadgeTexts,
      };
    }, cardData.element || cardData.html || cardData.outerHTML || '');

    if (!rawCard || !rawCard.rawTitle) {
      return null;
    }

    // Build raw card
    const shopeeCard: ShopeeListingCardRaw = {
      rawTitle: rawCard.rawTitle || '',
      rawPriceText: rawCard.rawPriceText || '',
      rawImageUrl: rawCard.rawImageUrl || '',
      rawProductUrl: rawCard.rawProductUrl || '',
      rawBadgeTexts: rawCard.rawBadgeTexts || [],
      positionIndex,
      pageKind,
      keyword,
      discoveredAt,
    };

    return shopeeCard;

  } catch (error) {
    logger?.debug('Single card extraction failed', {
      error: error instanceof Error ? error.message : String(error),
      positionIndex,
    });
    return null;
  }
}

/**
 * Extract page signals for debugging
 *
 * @param page - Playwright Page
 * @param options - Extraction options
 * @returns Page signals
 */
export async function extractListingPageSignals(
  page: Page,
  options: {
    /** Custom logger */
    logger?: DiscoveryLogger;
  } = {}
): Promise<ShopeeListingPageSignals> {
  const { logger } = options;

  try {
    const signals = await page.evaluate(() => {
      // Count cards in DOM
      const cardSelectors = [
        '.item-card-wrapper',
        '[data-sqe="item"]',
        '.shopee-item-card',
        '.product-card',
        '.search-item-card',
      ];

      let totalCards = 0;
      for (const sel of cardSelectors) {
        const count = document.querySelectorAll(sel).length;
        if (count > totalCards) {
          totalCards = count;
        }
      }

      // Check for UI elements
      const hasMoreButton = !!document.querySelector('.shopee-button-primary');
      const hasPagination = !!document.querySelector('.shopee-pager');

      // Check page type
      const isFlashSalePage = !!document.querySelector('.flash-sale-page, .flash-sale-item-page');
      const isSearchPage = !!document.querySelector('.shopee-search-item-result, .search-page');

      return {
        totalCardsInDom: totalCards,
        visibleCardsCount: totalCards,
        hasMoreButton,
        hasPagination,
        isFlashSalePage,
        isSearchPage,
        pageTitle: document.title,
        currentUrl: window.location.href,
      };
    });

    logger?.debug('Page signals extracted', signals);

    return signals;

  } catch (error) {
    logger?.warn('Page signals extraction failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      totalCardsInDom: 0,
      visibleCardsCount: 0,
      hasMoreButton: false,
      hasPagination: false,
      isFlashSalePage: false,
      isSearchPage: false,
      pageTitle: '',
      currentUrl: page.url(),
    };
  }
}

/**
 * Count cards in DOM without full extraction
 *
 * @param page - Playwright Page
 * @returns Card count
 */
export async function countCardsInDom(page: Page): Promise<number> {
  try {
    const count = await page.evaluate(() => {
      const selectors = [
        '.item-card-wrapper',
        '[data-sqe="item"]',
        '.shopee-item-card',
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
