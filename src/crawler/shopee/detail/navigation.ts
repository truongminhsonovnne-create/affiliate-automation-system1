/**
 * Shopee Detail Extraction - Navigation
 *
 * Handles navigation to Shopee product detail pages.
 */

import type { Page } from 'playwright';
import type {
  ShopeeDetailInput,
  DetailLogger,
} from './types.js';
import { DETAIL_TIMEOUT, URL_PATTERNS_DETAIL } from './constants.js';

/**
 * Normalize Shopee detail URL
 *
 * @param url - Input URL
 * @returns Normalized URL
 */
export function normalizeShopeeDetailUrl(
  url: string,
  options: {
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): string {
  const { logger } = options;

  if (!url) {
    return '';
  }

  // Trim and clean
  let normalized = url.trim();

  // Add protocol if missing
  if (normalized.startsWith('//')) {
    normalized = 'https:' + normalized;
  }

  // Make relative URLs absolute
  if (normalized.startsWith('/')) {
    normalized = 'https://shopee.vn' + normalized;
  }

  // Ensure HTTPS
  if (normalized.startsWith('http:')) {
    normalized = normalized.replace('http:', 'https:');
  }

  // Remove tracking parameters
  try {
    const urlObj = new URL(normalized);
    // Keep only essential params
    const essentialParams = ['sp', 'pdp'];
    const searchParams = new URLSearchParams();

    for (const [key, value] of urlObj.searchParams) {
      if (essentialParams.includes(key)) {
        searchParams.append(key, value);
      }
    }

    // Rebuild URL
    normalized = urlObj.origin + urlObj.pathname;
    if (searchParams.toString()) {
      normalized += '?' + searchParams.toString();
    }
  } catch {
    // URL parsing failed, return as-is
  }

  logger?.debug('URL normalized', { original: url, normalized });

  return normalized;
}

/**
 * Verify Shopee detail URL
 *
 * @param url - URL to verify
 * @returns Verification result
 */
export function verifyShopeeDetailUrl(
  url: string,
  options: {
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
} {
  const { logger } = options;

  if (!url) {
    return { valid: false, error: 'URL is empty' };
  }

  // Normalize first
  const normalized = normalizeShopeeDetailUrl(url, { logger });

  // Check if it's a valid Shopee URL
  if (!normalized.includes(URL_PATTERNS_DETAIL.SHOPEE_DOMAIN)) {
    return { valid: false, error: 'Not a Shopee URL', normalizedUrl: normalized };
  }

  // Check if it looks like a product URL
  const hasProductPattern = URL_PATTERNS_DETAIL.PRODUCT_URL_PATTERN.test(normalized) ||
    URL_PATTERNS_DETAIL.PRODUCT_ID_ALT_PATTERN.test(normalized);

  if (!hasProductPattern) {
    logger?.warn('URL may not be a product detail URL', { url: normalized });
    // Not returning error - allow it but warn
  }

  return { valid: true, normalizedUrl: normalized };
}

/**
 * Extract product ID from URL
 *
 * @param url - Product URL
 * @returns Product ID or undefined
 */
export function extractProductIdFromUrl(url: string): string | undefined {
  if (!url) return undefined;

  // Try primary pattern
  const match = url.match(URL_PATTERNS_DETAIL.PRODUCT_URL_PATTERN);
  if (match && match[1]) {
    return match[1];
  }

  // Try alternative pattern
  const altMatch = url.match(URL_PATTERNS_DETAIL.PRODUCT_ID_ALT_PATTERN);
  if (altMatch && altMatch[1]) {
    return altMatch[1];
  }

  return undefined;
}

/**
 * Open Shopee detail page
 *
 * @param page - Playwright Page
 * @param input - Detail input
 * @param options - Navigation options
 * @returns Navigation result
 */
export async function openShopeeDetailPage(
  page: Page,
  input: ShopeeDetailInput | string,
  options: {
    /** Navigation timeout */
    timeout?: number;
    /** Enable debug logging */
    verbose?: boolean;
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): Promise<{
  ok: boolean;
  finalUrl: string;
  productId?: string;
  error?: string;
}> {
  const { timeout = DETAIL_TIMEOUT.NAVIGATION, verbose = false, logger } = options;

  // Normalize input to URL
  let productUrl: string;
  if (typeof input === 'string') {
    productUrl = input;
  } else {
    productUrl = input.productUrl;
  }

  // Validate URL
  const verification = verifyShopeeDetailUrl(productUrl, { logger });
  if (!verification.valid) {
    logger?.error('Invalid product URL', { url: productUrl, error: verification.error });
    return {
      ok: false,
      finalUrl: '',
      error: verification.error,
    };
  }

  const normalizedUrl = verification.normalizedUrl || productUrl;
  const productId = extractProductIdFromUrl(normalizedUrl);

  logger?.info('Opening detail page', {
    url: normalizedUrl,
    productId,
    timeout,
  });

  try {
    // Navigate using Playwright
    const response = await page.goto(normalizedUrl, {
      timeout,
      waitUntil: 'networkidle',
    });

    const finalUrl = page.url();

    // Check HTTP status
    if (response) {
      const status = response.status();
      if (status >= 400) {
        logger?.error('HTTP error during navigation', { status, url: finalUrl });
        return {
          ok: false,
          finalUrl,
          productId,
          error: `HTTP ${status}`,
        };
      }
    }

    // Wait for page to settle
    await page.waitForTimeout(DETAIL_TIMEOUT.PAGE_SETTLE);

    // Check for redirect
    if (finalUrl !== normalizedUrl) {
      logger?.debug('Redirect detected', {
        from: normalizedUrl,
        to: finalUrl,
      });
    }

    // Extract product ID from final URL if different
    const finalProductId = productId || extractProductIdFromUrl(finalUrl);

    if (verbose && logger) {
      logger.debug('Navigation successful', {
        finalUrl,
        productId: finalProductId,
      });
    }

    return {
      ok: true,
      finalUrl,
      productId: finalProductId,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error('Navigation failed', { error: errorMessage, url: normalizedUrl });

    return {
      ok: false,
      finalUrl: page.url(),
      productId,
      error: errorMessage,
    };
  }
}

/**
 * Navigate to detail from listing card
 *
 * @param page - Playwright Page
 * @param listingCard - Listing card with product URL
 * @param options - Navigation options
 * @returns Navigation result
 */
export async function openFromListingCard(
  page: Page,
  listingCard: {
    productUrl: string;
  },
  options: {
    /** Click selector if needed */
    clickSelector?: string;
    /** Timeout */
    timeout?: number;
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): Promise<{
  ok: boolean;
  finalUrl: string;
  productId?: string;
  error?: string;
}> {
  const { clickSelector, logger } = options;

  // First try direct navigation
  const navResult = await openShopeeDetailPage(page, listingCard.productUrl, {
    ...options,
    logger,
  });

  if (navResult.ok) {
    return navResult;
  }

  // If direct navigation failed, try clicking if selector provided
  if (clickSelector) {
    try {
      logger?.debug('Trying click navigation', { selector: clickSelector });

      await page.goto(listingCard.productUrl, {
        timeout: options.timeout || DETAIL_TIMEOUT.NAVIGATION,
        waitUntil: 'domcontentloaded',
      });

      await page.waitForTimeout(DETAIL_TIMEOUT.POST_CLICK_SETTLE);

      const finalUrl = page.url();
      const productId = extractProductIdFromUrl(finalUrl);

      return {
        ok: true,
        finalUrl,
        productId,
      };
    } catch (clickError) {
      logger?.error('Click navigation failed', {
        error: clickError instanceof Error ? clickError.message : String(clickError),
      });
    }
  }

  return navResult;
}
