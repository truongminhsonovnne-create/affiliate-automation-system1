/**
 * AI Enrichment Pipeline - Eligibility
 *
 * Determines which products are eligible for AI content generation.
 */

import type {
  AffiliateProductInput,
  AiEnrichmentEligibilityResult,
  AiEnrichmentLogger,
} from './types.js';
import { ELIGIBILITY_CONFIG } from './constants.js';

/**
 * Check if product is eligible for AI enrichment
 */
export function isProductEligibleForAiEnrichment(
  product: AffiliateProductInput,
  options: {
    requireExistingContent?: boolean;
    logger?: AiEnrichmentLogger;
  } = {}
): boolean {
  const result = buildAiEnrichmentEligibilityResult(product, options);
  return result.eligible;
}

/**
 * Build eligibility result with details
 */
export function buildAiEnrichmentEligibilityResult(
  product: AffiliateProductInput,
  options: {
    requireExistingContent?: boolean;
    logger?: AiEnrichmentLogger;
  } = {}
): AiEnrichmentEligibilityResult {
  const { logger } = options;
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  for (const field of ELIGIBILITY_CONFIG.MIN_REQUIRED_FIELDS) {
    const value = product[field as keyof AffiliateProductInput];

    if (!value) {
      missingFields.push(field);
    } else if (typeof value === 'string' && value.trim().length === 0) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    logger?.debug('Product ineligible: missing required fields', {
      productId: product.id,
      missingFields,
    });

    return {
      eligible: false,
      reason: `Missing required fields: ${missingFields.join(', ')}`,
      missingFields,
      warnings,
    };
  }

  // Check interest score
  let interestScore = 0;

  if (product.description && product.description.length >= ELIGIBILITY_CONFIG.MIN_DESCRIPTION_LENGTH) {
    interestScore++;
  }

  if (product.priceVnd && product.priceVnd > 0) {
    interestScore++;
  }

  if (product.images && product.images.length > 0) {
    interestScore++;
  }

  if (product.rating && product.rating > 0) {
    interestScore++;
  }

  if (interestScore < ELIGIBILITY_CONFIG.MIN_INTEREST_SCORE) {
    warnings.push(`Low interest score (${interestScore}/${ELIGIBILITY_CONFIG.MIN_INTEREST_SCORE})`);
  }

  // Check title quality
  if (product.title) {
    if (product.title.length < 10) {
      warnings.push('Title is very short');
    }

    // Check for suspicious titles
    const suspiciousPatterns = ['test', 'demo', 'placeholder', 'xxx', 'yyy'];
    const isSuspicious = suspiciousPatterns.some(p =>
      product.title.toLowerCase().includes(p)
    );

    if (isSuspicious) {
      return {
        eligible: false,
        reason: 'Title appears to be a test/placeholder',
        missingFields,
        warnings,
      };
    }
  }

  // Check URL validity
  if (product.productUrl) {
    try {
      const url = new URL(product.productUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return {
          eligible: false,
          reason: 'Invalid URL protocol',
          missingFields,
          warnings,
        };
      }
    } catch {
      return {
        eligible: false,
        reason: 'Invalid product URL',
        missingFields,
        warnings,
      };
    }
  }

  // Check if has enough content to work with
  const hasContent = product.description || product.shortDescription || product.title;

  if (!hasContent) {
    return {
      eligible: false,
      reason: 'No content available for generation',
      missingFields,
      warnings,
    };
  }

  // Eligible
  logger?.debug('Product eligible for enrichment', {
    productId: product.id,
    interestScore,
    warnings: warnings.length,
  });

  return {
    eligible: true,
    reason: 'Product meets all eligibility criteria',
    missingFields: [],
    warnings,
  };
}

/**
 * Filter eligible products from list
 */
export function filterEligibleProducts(
  products: AffiliateProductInput[],
  options: {
    logger?: AiEnrichmentLogger;
  } = {}
): {
  eligible: AffiliateProductInput[];
  ineligible: Array<{
    product: AffiliateProductInput;
    result: AiEnrichmentEligibilityResult;
  }>;
} {
  const eligible: AffiliateProductInput[] = [];
  const ineligible: Array<{
    product: AffiliateProductInput;
    result: AiEnrichmentEligibilityResult;
  }> = [];

  for (const product of products) {
    const result = buildAiEnrichmentEligibilityResult(product, options);

    if (result.eligible) {
      eligible.push(product);
    } else {
      ineligible.push({ product, result });
    }
  }

  return { eligible, ineligible };
}
