/**
 * Shopee Detail Extraction - Validators
 *
 * Validates page state and extracted data.
 */

import type { Page } from 'playwright';
import type {
  ShopeeDetailPageValidationResult,
  ShopeeDetailRawPayload,
  ShopeeCanonicalProduct,
  DetailLogger,
} from './types.js';
import { DETAIL_TIMEOUT, DETAIL_VALIDATION } from './constants.js';

/**
 * Validate Shopee detail page
 *
 * @param page - Playwright Page
 * @param options - Validation options
 * @returns Validation result
 */
export async function validateShopeeDetailPage(
  page: Page,
  options: {
    /** Timeout */
    timeout?: number;
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): Promise<ShopeeDetailPageValidationResult> {
  const { timeout = 5000, logger } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check page closed
    if (page.isClosed()) {
      return {
        ok: false,
        isDetailPage: false,
        hasRequiredElements: false,
        errors: ['Page is closed'],
        warnings: [],
      };
    }

    // Wait for DOM
    await page.waitForLoadState('domcontentloaded', { timeout });

    // Get URL
    const url = page.url();

    // Check URL
    if (!url || url === 'about:blank') {
      errors.push('Page URL is empty');
    }

    // Check for error indicators
    const signals = await page.evaluate(() => {
      // Check for error page
      const errorIndicators = [
        document.querySelector('.error-page, .not-found'),
        ...Array.from(document.querySelectorAll('[class*="error"]')),
        ...Array.from(document.querySelectorAll('[class*="blocked"]')),
      ].filter(Boolean);

      // Check for CAPTCHA
      const captchaIndicators = [
        document.querySelector('.captcha, [class*="captcha"]'),
        document.querySelector('[class*="verification"]'),
      ].filter(Boolean);

      // Check for empty state
      const isEmpty = document.body.innerHTML.length < 500;

      // Check for login requirement
      const hasLoginForm = !!document.querySelector('input[type="password"]');

      return {
        isLoggedIn: !hasLoginForm,
        isBlocked: errorIndicators.length > 0,
        hasCaptcha: captchaIndicators.length > 0,
        hasError: errorIndicators.length > 0,
        isEmpty,
        bodyLength: document.body.innerHTML.length,
        title: document.title,
      };
    });

    if (signals.isBlocked) {
      errors.push('Page appears to be blocked');
    }

    if (signals.hasCaptcha) {
      warnings.push('CAPTCHA or verification may be required');
    }

    if (signals.isEmpty) {
      errors.push('Page body is empty or too small');
    }

    // Check title
    if (signals.title.toLowerCase().includes('error')) {
      warnings.push('Page title contains error');
    }

    // Try to find product-specific elements
    const hasProductElements = await page.evaluate(() => {
      const selectors = [
        '.product-title',
        '.product-price',
        '.product-name',
        '[class*="product-title"]',
        '[class*="product-price"]',
      ];

      return selectors.some(sel => !!document.querySelector(sel));
    });

    // Determine if this is a detail page
    const isDetailPage = hasProductElements || signals.bodyLength > 5000;

    if (!isDetailPage) {
      warnings.push('Page does not appear to be a product detail page');
    }

    const ok = errors.length === 0;

    if (!ok) {
      logger?.error('Page validation failed', { errors, warnings });
    } else if (warnings.length > 0) {
      logger?.warn('Page validation passed with warnings', { warnings });
    }

    return {
      ok,
      isDetailPage,
      hasRequiredElements: hasProductElements,
      errors,
      warnings,
      signals,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error('Page validation error', { error: errorMessage });

    return {
      ok: false,
      isDetailPage: false,
      hasRequiredElements: false,
      errors: [errorMessage],
      warnings,
    };
  }
}

/**
 * Validate raw detail payload
 *
 * @param raw - Raw payload
 * @returns Validation result
 */
export function validateShopeeDetailRawPayload(
  raw: ShopeeDetailRawPayload,
  options: {
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): {
  ok: boolean;
  errors: string[];
  warnings: string[];
  missingCritical: string[];
} {
  const { logger } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  const missingCritical: string[] = [];

  // Check required fields
  if (!raw.rawTitle || raw.rawTitle.length < 3) {
    missingCritical.push('rawTitle');
    errors.push('Missing or invalid title');
  }

  if (!raw.rawPriceText) {
    missingCritical.push('rawPriceText');
    errors.push('Missing price');
  }

  if (!raw.rawPageUrl) {
    missingCritical.push('rawPageUrl');
    errors.push('Missing page URL');
  }

  // Check optional but expected fields
  if (!raw.rawImageUrls || raw.rawImageUrls.length === 0) {
    warnings.push('No images found');
  }

  if (!raw.rawSellerName) {
    warnings.push('No seller name found');
  }

  // Validate image URLs
  if (raw.rawImageUrls && raw.rawImageUrls.length > 0) {
    const invalidImages = raw.rawImageUrls.filter(url => !url || url.length < 10);
    if (invalidImages.length > 0) {
      warnings.push(`${invalidImages.length} invalid image URLs`);
    }
  }

  // Validate title length
  if (raw.rawTitle && raw.rawTitle.length > 500) {
    warnings.push('Title is unusually long');
  }

  const ok = errors.length === 0;

  if (!ok) {
    logger?.warn('Raw payload validation failed', {
      errors,
      warnings,
      missingCritical,
    });
  }

  return { ok, errors, warnings, missingCritical };
}

/**
 * Validate canonical product
 *
 * @param product - Canonical product
 * @returns Validation result
 */
export function validateShopeeCanonicalProduct(
  product: ShopeeCanonicalProduct,
  options: {
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): {
  ok: boolean;
  errors: string[];
  warnings: string[];
} {
  const { logger } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!product.title || product.title.length < 3) {
    errors.push('Invalid title');
  }

  if (!product.productUrl) {
    errors.push('Missing product URL');
  }

  if (!product.price || !product.price.priceVnd) {
    errors.push('Invalid price');
  }

  if (!product.media || !product.media.images || product.media.images.length === 0) {
    warnings.push('No images');
  }

  // Validate price
  if (product.price.priceVnd < 0) {
    errors.push('Price cannot be negative');
  }

  if (product.price.priceVnd > 100000000) {
    warnings.push('Price seems unusually high');
  }

  // Validate URL format
  if (product.productUrl && !product.productUrl.includes('shopee.vn')) {
    errors.push('Invalid Shopee URL');
  }

  // Check external ID
  if (!product.externalProductId) {
    warnings.push('No external product ID');
  }

  const ok = errors.length === 0;

  if (!ok) {
    logger?.warn('Canonical product validation failed', { errors, warnings });
  }

  return { ok, errors, warnings };
}

/**
 * Check if extraction should be retried
 *
 * @param result - Extraction result
 * @returns Whether should retry
 */
export function shouldRetryExtraction(
  result: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  },
  options: {
    /** Max retries */
    maxRetries?: number;
    /** Current attempt */
    currentAttempt?: number;
  } = {}
): boolean {
  const { maxRetries = 3, currentAttempt = 1 } = options;

  // Don't retry if already succeeded
  if (result.ok) {
    return false;
  }

  // Don't exceed max retries
  if (currentAttempt >= maxRetries) {
    return false;
  }

  // Check error types that are retryable
  const retryableErrors = [
    'timeout',
    'navigation',
    'page_invalid',
  ];

  const hasRetryableError = result.errors.some(err =>
    retryableErrors.some(pattern => err.toLowerCase().includes(pattern))
  );

  return hasRetryableError;
}
