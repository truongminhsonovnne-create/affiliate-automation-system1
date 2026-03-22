/**
 * Shopee Discovery Crawler - Navigation
 *
 * Handles navigation to Shopee listing pages.
 */

import type { Page } from 'playwright';
import type {
  ShopeeNavigationOptions,
  ShopeeNavigationResult,
  ShopeeListingPageKind,
  DiscoveryLogger,
} from './types.js';
import { URL_PATTERNS, DISCOVERY_TIMEOUT, DISCOVERY_RETRY } from './constants.js';

/**
 * Build Flash Sale URL
 *
 * @returns Mobile Flash Sale URL
 */
export function buildFlashSaleUrl(): string {
  return URL_PATTERNS.FLASH_SALE_MOBILE;
}

/**
 * Build Search URL
 *
 * @param keyword - Search keyword
 * @param options - URL build options
 * @returns Full search URL
 */
export function buildSearchUrl(
  keyword: string,
  options: {
    /** Sort order */
    sortBy?: 'relevancy' | 'newest' | 'popularity' | 'price';
    /** Price range min */
    minPrice?: number;
    /** Price range max */
    maxPrice?: number;
    /** Page number */
    page?: number;
  } = {}
): string {
  // Encode keyword for URL
  const encodedKeyword = encodeURIComponent(keyword.trim());

  // Build base URL
  let url = `${URL_PATTERNS.SEARCH_BASE}?keyword=${encodedKeyword}`;

  // Add sort order
  if (options.sortBy) {
    const sortMap: Record<string, string> = {
      relevance: 'relevancy',
      newest: 'newest',
      popularity: 'top_recent',
      price: 'price',
    };
    url += `&sortBy=${sortMap[options.sortBy] || 'relevancy'}`;
  }

  // Add price range
  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    if (options.minPrice !== undefined) {
      url += `&minprice=${options.minPrice}`;
    }
    if (options.maxPrice !== undefined) {
      url += `&maxprice=${options.maxPrice}`;
    }
  }

  // Add page
  if (options.page && options.page > 1) {
    url += `&page=${options.page}`;
  }

  return url;
}

/**
 * Detect page kind from URL
 *
 * @param url - URL to analyze
 * @returns Detected page kind
 */
export function detectPageKindFromUrl(url: string): ShopeeListingPageKind {
  if (URL_PATTERNS.FLASH_SALE_PATTERN.test(url)) {
    return 'flash_sale';
  }

  if (url.includes('/search') || url.includes('keyword=')) {
    return 'search';
  }

  return 'unknown';
}

/**
 * Detect page kind from DOM
 *
 * @param page - Playwright Page
 * @returns Detected page kind
 */
export async function detectPageKindFromDom(page: Page): Promise<ShopeeListingPageKind> {
  try {
    // Check for flash sale indicators
    const isFlashSale = await page.evaluate(() => {
      // Check for flash sale specific elements
      const flashSaleIndicators = [
        document.querySelector('.flash-sale-page'),
        document.querySelector('.flash-sale-item-page-1Fe6R'),
        document.querySelector('[class*="flash-sale"]'),
        // Flash sale specific text
        ...Array.from(document.querySelectorAll('*')).filter(el =>
          el.textContent?.toLowerCase().includes('flash sale') ||
          el.textContent?.toLowerCase().includes('giảm giá sốc')
        ),
      ];
      return flashSaleIndicators.some(Boolean);
    });

    if (isFlashSale) {
      return 'flash_sale';
    }

    // Check for search page indicators
    const isSearch = await page.evaluate(() => {
      const searchIndicators = [
        document.querySelector('.shopee-search-item-result'),
        document.querySelector('.search-page'),
        document.querySelector('[class*="search-result"]'),
        // Search specific elements
        ...Array.from(document.querySelectorAll('input[type="search"]')),
        ...Array.from(document.querySelectorAll('[class*="search-input"]')),
      ];
      return searchIndicators.some(Boolean);
    });

    if (isSearch) {
      return 'search';
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Open Shopee listing page
 *
 * @param page - Playwright Page
 * @param pageKind - Expected page kind
 * @param options - Navigation options
 * @returns Navigation result
 */
export async function openShopeeListingPage(
  page: Page,
  pageKind: 'flash_sale' | 'search',
  options: ShopeeNavigationOptions & {
    /** Search keyword (if search page) */
    keyword?: string;
    /** Custom URL (if not using pageKind defaults) */
    customUrl?: string;
  } = {}
): Promise<ShopeeNavigationResult> {
  const {
    timeout = DISCOVERY_TIMEOUT.NAVIGATION,
    retryCount = DISCOVERY_RETRY.MAX_NAVIGATION,
    verbose = false,
    logger,
    keyword,
    customUrl,
  } = options;

  let lastError: string | undefined;

  // Build URL
  let url: string;
  if (customUrl) {
    url = customUrl;
  } else if (pageKind === 'flash_sale') {
    url = buildFlashSaleUrl();
  } else if (pageKind === 'search' && keyword) {
    url = buildSearchUrl(keyword);
  } else {
    return {
      ok: false,
      finalUrl: '',
      pageKind: 'unknown',
      error: 'Invalid page kind or missing keyword for search',
    };
  }

  logger?.info('Opening Shopee listing page', {
    url,
    pageKind,
    keyword,
    timeout,
    retryCount,
  });

  // Retry loop
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      if (verbose && logger) {
        logger.debug(`Navigation attempt ${attempt}/${retryCount}`);
      }

      // Navigate to URL
      const response = await page.goto(url, {
        timeout,
        waitUntil: 'networkidle',
      });

      const finalUrl = page.url();

      // Check for HTTP errors
      if (response) {
        const status = response.status();
        if (status >= 400) {
          lastError = `HTTP ${status}`;
          logger?.warn(`Navigation returned HTTP ${status}, attempt ${attempt}`);

          if (attempt < retryCount) {
            await page.waitForTimeout(DISCOVERY_RETRY.BACKOFF_BASE * attempt);
            continue;
          }

          return {
            ok: false,
            finalUrl,
            pageKind: 'unknown',
            error: `HTTP error: ${status}`,
          };
        }
      }

      // Detect actual page kind
      const detectedKind = await detectPageKindFromDom(page);

      // Validate page kind
      if (pageKind === 'search' && detectedKind === 'flash_sale') {
        logger?.warn('Redirect detected: search -> flash_sale');
        // This might be acceptable, just log it
      }

      if (verbose && logger) {
        logger.debug('Navigation successful', {
          finalUrl,
          detectedKind,
          attempt,
        });
      }

      // Wait for stabilization
      await page.waitForTimeout(1000);

      return {
        ok: true,
        finalUrl,
        pageKind: detectedKind,
      };

    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      logger?.error(`Navigation attempt ${attempt} failed`, {
        error: lastError,
      });

      if (attempt < retryCount) {
        const backoff = Math.min(
          DISCOVERY_RETRY.BACKOFF_BASE * attempt,
          DISCOVERY_RETRY.BACKOFF_MAX
        );
        await page.waitForTimeout(backoff);
      }
    }
  }

  return {
    ok: false,
    finalUrl: page.url(),
    pageKind: 'unknown',
    error: `Failed after ${retryCount} attempts: ${lastError}`,
  };
}

/**
 * Validate that we're on the expected listing page
 *
 * @param page - Playwright Page
 * @param expectedKind - Expected page kind
 * @returns Validation result
 */
export async function validateListingPage(
  page: Page,
  expectedKind: 'flash_sale' | 'search',
  options: {
    timeout?: number;
    logger?: DiscoveryLogger;
  } = {}
): Promise<{
  ok: boolean;
  detectedKind: ShopeeListingPageKind;
  error?: string;
}> {
  const { timeout = 5000, logger } = options;

  try {
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded', { timeout });

    // Get current URL
    const currentUrl = page.url();

    // Check URL first
    const urlKind = detectPageKindFromUrl(currentUrl);

    // Then check DOM
    const domKind = await detectPageKindFromDom(page);

    // Use DOM kind if URL is unknown
    const detectedKind = domKind !== 'unknown' ? domKind : urlKind;

    if (detectedKind === expectedKind) {
      logger?.debug('Page validation passed', {
        expected: expectedKind,
        detected: detectedKind,
      });

      return {
        ok: true,
        detectedKind,
      };
    }

    // Allow some flexibility - search might redirect
    if (expectedKind === 'search' && detectedKind === 'flash_sale') {
      logger?.warn('Page kind mismatch but acceptable', {
        expected: expectedKind,
        detected: detectedKind,
      });

      return {
        ok: true,
        detectedKind,
      };
    }

    logger?.error('Page validation failed', {
      expected: expectedKind,
      detected: detectedKind,
      url: currentUrl,
    });

    return {
      ok: false,
      detectedKind,
      error: `Expected ${expectedKind} but detected ${detectedKind}`,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error('Page validation error', { error: errorMessage });

    return {
      ok: false,
      detectedKind: 'unknown',
      error: errorMessage,
    };
  }
}
