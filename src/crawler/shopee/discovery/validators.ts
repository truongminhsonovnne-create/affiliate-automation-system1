/**
 * Shopee Discovery Crawler - Validators
 *
 * Validates page state and extracted data.
 */

import type { Page } from 'playwright';
import type {
  ShopeeListingPageKind,
  ShopeeListingCardRaw,
  ShopeeListingCardNormalized,
  DiscoveryLogger,
} from './types.js';
import { VALIDATION, DISCOVERY_TIMEOUT } from './constants.js';

/**
 * Validate listing page state
 *
 * @param page - Playwright Page
 * @param pageKind - Expected page kind
 * @param options - Validation options
 * @returns Validation result
 */
export async function validateListingPage(
  page: Page,
  pageKind: ShopeeListingPageKind,
  options: {
    /** Timeout for validation */
    timeout?: number;
    /** Custom logger */
    logger?: DiscoveryLogger;
    /** Enable strict mode */
    strictMode?: boolean;
  } = {}
): Promise<{
  ok: boolean;
  errors: string[];
  warnings: string[];
}> {
  const { timeout = 5000, logger, strictMode = false } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check page is not closed
    if (page.isClosed()) {
      errors.push('Page is closed');
      return { ok: false, errors, warnings };
    }

    // Wait for DOM to be ready
    await page.waitForLoadState('domcontentloaded', { timeout });

    // Get current URL
    const url = page.url();

    if (!url || url === 'about:blank') {
      errors.push('Page URL is empty or blank');
    }

    // Check for error pages
    if (url.includes('error') || url.includes('blocked')) {
      errors.push(`Suspicious URL detected: ${url}`);
    }

    // Check DOM accessibility
    const domCheck = await page.evaluate(() => {
      return {
        hasBody: !!document.body,
        bodyLength: document.body?.innerHTML?.length || 0,
        readyState: document.readyState,
        title: document.title,
      };
    });

    if (!domCheck.hasBody) {
      errors.push('Page has no body element');
    }

    if (domCheck.bodyLength < 100) {
      warnings.push('Page body appears very small');
    }

    if (domCheck.readyState !== 'complete' && domCheck.readyState !== 'interactive') {
      warnings.push(`Document readyState is "${domCheck.readyState}"`);
    }

    // Check for common error indicators
    const errorIndicators = await page.evaluate(() => {
      const selectors = [
        '.error-page',
        '.not-found',
        '[class*="error"]',
        '[class*="blocked"]',
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          return true;
        }
      }
      return false;
    });

    if (errorIndicators) {
      errors.push('Page contains error indicators');
    }

    // Check for login required
    const loginRequired = await page.evaluate(() => {
      const loginIndicators = [
        document.querySelector('[class*="login"]'),
        document.querySelector('[class*="signin"]'),
      ];
      return loginIndicators.some(Boolean);
    });

    if (loginRequired) {
      warnings.push('Page may require login');
    }

    // Page kind validation (if strict)
    if (strictMode && pageKind !== 'unknown') {
      const pageKindCheck = await validatePageKind(page, pageKind);
      if (!pageKindCheck.valid) {
        errors.push(...pageKindCheck.errors);
      }
    }

    const ok = errors.length === 0;

    if (!ok) {
      logger?.error('Page validation failed', { errors, warnings });
    } else if (warnings.length > 0) {
      logger?.warn('Page validation passed with warnings', { warnings });
    } else {
      logger?.debug('Page validation passed');
    }

    return { ok, errors, warnings };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Validation error: ${errorMessage}`);

    logger?.error('Page validation error', { error: errorMessage });

    return { ok: false, errors, warnings };
  }
}

/**
 * Validate page kind
 */
async function validatePageKind(
  page: Page,
  expectedKind: ShopeeListingPageKind
): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    const isValid = await page.evaluate((kind) => {
      if (kind === 'flash_sale') {
        return !!document.querySelector('.flash-sale-page, .flash-sale-item-page');
      } else if (kind === 'search') {
        return !!document.querySelector('.shopee-search-item-result, .search-page');
      }
      return true;
    }, expectedKind);

    if (!isValid) {
      errors.push(`Page does not appear to be ${expectedKind} page`);
    }

    return { valid: errors.length === 0, errors };
  } catch {
    errors.push('Could not validate page kind');
    return { valid: false, errors };
  }
}

/**
 * Validate raw listing card
 *
 * @param card - Raw listing card
 * @returns Validation result
 */
export function validateRawListingCard(
  card: ShopeeListingCardRaw
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!card.rawTitle) {
    errors.push('Missing rawTitle');
  } else if (card.rawTitle.length < VALIDATION.MIN_TITLE_LENGTH) {
    warnings.push('rawTitle is very short');
  }

  if (!card.rawProductUrl) {
    warnings.push('Missing rawProductUrl');
  }

  if (!card.rawImageUrl) {
    warnings.push('Missing rawImageUrl');
  }

  if (card.positionIndex < 0) {
    errors.push('Invalid positionIndex');
  }

  if (!card.pageKind || card.pageKind === 'unknown') {
    warnings.push('Unknown pageKind');
  }

  // Validate title length
  if (card.rawTitle && card.rawTitle.length > VALIDATION.MAX_TITLE_LENGTH) {
    warnings.push('rawTitle exceeds maximum length');
  }

  // Validate position
  if (card.positionIndex > 1000) {
    warnings.push('positionIndex is unusually high');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate normalized listing card
 *
 * @param card - Normalized listing card
 * @returns Validation result
 */
export function validateNormalizedListingCard(
  card: ShopeeListingCardNormalized
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check title
  if (!card.title) {
    errors.push('Missing title');
  } else {
    if (card.title.length < VALIDATION.MIN_TITLE_LENGTH) {
      errors.push('Title too short');
    }
    if (card.title.length > VALIDATION.MAX_TITLE_LENGTH) {
      errors.push('Title too long');
    }
  }

  // Check URLs
  if (!card.imageUrl) {
    errors.push('Missing imageUrl');
  } else if (card.imageUrl.length < VALIDATION.MIN_IMAGE_URL_LENGTH) {
    errors.push('imageUrl too short');
  }

  if (!card.productUrl) {
    errors.push('Missing productUrl');
  } else if (card.productUrl.length < VALIDATION.MIN_PRODUCT_URL_LENGTH) {
    errors.push('productUrl too short');
  }

  // Check price
  if (card.priceVnd !== undefined) {
    if (card.priceVnd < VALIDATION.MIN_PRICE) {
      errors.push('priceVnd below minimum');
    }
    if (card.priceVnd > VALIDATION.MAX_PRICE) {
      errors.push('priceVnd exceeds maximum');
    }
  }

  // Check position
  if (card.positionIndex < 0) {
    errors.push('Invalid positionIndex');
  }

  // Check source type
  if (!card.sourceType) {
    warnings.push('Missing sourceType');
  }

  // Check page kind
  if (!card.pageKind || card.pageKind === 'unknown') {
    warnings.push('Unknown pageKind');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate extraction result
 *
 * @param cards - Array of cards
 * @param options - Validation options
 * @returns Validation result
 */
export function validateExtractionResult(
  cards: ShopeeListingCardRaw[] | ShopeeListingCardNormalized[],
  options: {
    /** Minimum cards expected */
    minCards?: number;
    /** Maximum cards allowed */
    maxCards?: number;
    /** Custom logger */
    logger?: DiscoveryLogger;
  } = {}
): {
  ok: boolean;
  errors: string[];
  warnings: string[];
} {
  const { minCards = 1, maxCards = 500, logger } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check count
  if (cards.length < minCards) {
    errors.push(`Too few cards: ${cards.length} < ${minCards}`);
  }

  if (cards.length > maxCards) {
    warnings.push(`Many cards extracted: ${cards.length} > ${maxCards}`);
  }

  // Validate individual cards
  const isRaw = 'rawTitle' in cards[0];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const validation = isRaw
      ? validateRawListingCard(card as ShopeeListingCardRaw)
      : validateNormalizedListingCard(card as ShopeeListingCardNormalized);

    if (!validation.valid) {
      warnings.push(`Card ${i} has errors: ${validation.errors.join(', ')}`);
    }
  }

  const ok = errors.length === 0;

  if (!ok) {
    logger?.error('Extraction validation failed', { errors, warnings });
  }

  return { ok, errors, warnings };
}

/**
 * Classify validation issue severity
 */
export function classifyIssue(
  issue: string
): 'error' | 'warning' | 'info' {
  const errorPatterns = [
    'missing',
    'invalid',
    'required',
    'empty',
    'failed',
    'crash',
  ];

  const warningPatterns = [
    'too short',
    'too long',
    'unusual',
    'unknown',
    'may require',
    'appears',
  ];

  const lowerIssue = issue.toLowerCase();

  if (errorPatterns.some(p => lowerIssue.includes(p))) {
    return 'error';
  }

  if (warningPatterns.some(p => lowerIssue.includes(p))) {
    return 'warning';
  }

  return 'info';
}
