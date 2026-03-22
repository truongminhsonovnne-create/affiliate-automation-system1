/**
 * Shopee Detail Extraction - Orchestrator
 *
 * Main orchestration for Shopee product detail extraction.
 */

import type { Page } from 'playwright';
import type {
  ShopeeDetailInput,
  ShopeeDetailExtractionOptions,
  ShopeeDetailExtractionResult,
  ShopeeDetailMetadata,
  ShopeeDetailRawPayload,
  ShopeeCanonicalProduct,
  ShopeeFieldCoverage,
  DetailLogger,
} from './types.js';
import { DETAIL_TIMEOUT, DETAIL_RETRY, DETAIL_VALIDATION, QUALITY_SCORE } from './constants.js';
import {
  openShopeeDetailPage,
  verifyShopeeDetailUrl,
} from './navigation.js';
import {
  validateShopeeDetailPage,
  validateShopeeDetailRawPayload,
  validateShopeeCanonicalProduct,
  shouldRetryExtraction,
} from './validators.js';
import {
  extractShopeeDetailRaw,
} from './extractors.js';
import {
  normalizeShopeeDetailRaw,
} from './normalizers.js';
import {
  classifyShopeeDetailError,
} from './errorClassifier.js';

/**
 * Create default logger
 */
function createDefaultLogger(verbose: boolean = false): DetailLogger {
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      console.log(`[ShopeeDetail] ℹ️ ${message}`, meta ? JSON.stringify(meta) : '');
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
      console.warn(`[ShopeeDetail] ⚠️ ${message}`, meta ? JSON.stringify(meta) : '');
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
      if (verbose) {
        console.debug(`[ShopeeDetail] 🔍 ${message}`, meta ? JSON.stringify(meta) : '');
      }
    },
    error: (message: string, meta?: Record<string, unknown>) => {
      console.error(`[ShopeeDetail] ❌ ${message}`, meta ? JSON.stringify(meta) : '');
    },
  };
}

/**
 * Extract Shopee product detail
 *
 * @param page - Playwright Page
 * @param input - Product URL or detail input
 * @param options - Extraction options
 * @returns Extraction result
 */
export async function extractShopeeProductDetail(
  page: Page,
  input: ShopeeDetailInput | string,
  options: ShopeeDetailExtractionOptions = {}
): Promise<ShopeeDetailExtractionResult> {
  const startTime = Date.now();
  const logger = options.logger ?? createDefaultLogger(options.verbose ?? false);

  const {
    maxAttempts = DETAIL_RETRY.MAX_ATTEMPTS,
    enableRetry = true,
    extractionTimeout = DETAIL_TIMEOUT.EXTRACTION,
    pageSettleDelay = DETAIL_TIMEOUT.PAGE_SETTLE,
    maxImages = 20,
  } = options;

  // Normalize input
  let productUrl: string;
  let sourceType: 'flash_sale' | 'search' | 'direct' = 'direct';
  let sourceKeyword: string | undefined;
  let discoveredAt: number | undefined;

  if (typeof input === 'string') {
    productUrl = input;
  } else {
    productUrl = input.productUrl;
    sourceType = input.sourceType;
    sourceKeyword = input.sourceKeyword;
    discoveredAt = input.discoveredAt;
  }

  // Validate URL
  const verification = verifyShopeeDetailUrl(productUrl, { logger });
  if (!verification.valid) {
    return createErrorResult(
      startTime,
      productUrl,
      `Invalid URL: ${verification.error}`,
      []
    );
  }

  productUrl = verification.normalizedUrl || productUrl;

  logger.info('Starting detail extraction', {
    url: productUrl,
    sourceType,
    keyword: sourceKeyword,
    maxAttempts,
  });

  const warnings: string[] = [];
  const errors: string[] = [];
  let rawPayload: ShopeeDetailRawPayload | undefined;
  let canonicalProduct: ShopeeCanonicalProduct | undefined;
  let pageValidationPassed = false;
  let blockedSuspicion = false;
  let attempts = 0;

  // Retry loop
  for (attempts = 1; attempts <= maxAttempts; attempts++) {
    logger.debug(`Extraction attempt ${attempts}/${maxAttempts}`);

    // ========================================
    // Step 1: Navigate to detail page
    // ========================================
    const navResult = await openShopeeDetailPage(page, productUrl, {
      timeout: extractionTimeout,
      logger,
    });

    if (!navResult.ok) {
      const error = classifyShopeeDetailError(new Error(navResult.error || 'Navigation failed'), {
        attempt: attempts,
      });

      errors.push(`Navigation failed: ${navResult.error}`);

      if (!enableRetry || !error.shouldRetry) {
        break;
      }

      continue;
    }

    // ========================================
    // Step 2: Validate page
    // ========================================
    const validationResult = await validateShopeeDetailPage(page, {
      logger,
    });

    pageValidationPassed = validationResult.ok;

    if (!validationResult.ok) {
      errors.push(...validationResult.errors);
    }

    if (validationResult.warnings.length > 0) {
      warnings.push(...validationResult.warnings.map(w => `Validation: ${w}`));
    }

    if (validationResult.signals?.isBlocked) {
      blockedSuspicion = true;
      warnings.push('Page may be blocked');
    }

    if (!validationResult.ok && attempts < maxAttempts) {
      continue;
    }

    // ========================================
    // Step 3: Extract raw data
    // ========================================
    try {
      rawPayload = await extractShopeeDetailRaw(page, {
        maxImages,
        logger,
      });
    } catch (extractError) {
      const errorMsg = extractError instanceof Error ? extractError.message : String(extractError);
      errors.push(`Extraction failed: ${errorMsg}`);

      if (attempts < maxAttempts) {
        continue;
      }
    }

    if (!rawPayload) {
      errors.push('Failed to extract data');
      break;
    }

    // ========================================
    // Step 4: Validate raw payload
    // ========================================
    const rawValidation = validateShopeeDetailRawPayload(rawPayload, { logger });

    if (!rawValidation.ok) {
      errors.push(...rawValidation.errors);
    }

    if (rawValidation.warnings.length > 0) {
      warnings.push(...rawValidation.warnings.map(w => `Raw: ${w}`));
    }

    // ========================================
    // Step 5: Normalize to canonical
    // ========================================
    try {
      canonicalProduct = normalizeShopeeDetailRaw(rawPayload, {
        sourceType,
        sourceKeyword,
        discoveredAt,
      }, { logger });
    } catch (normError) {
      const errorMsg = normError instanceof Error ? normError.message : String(normError);
      errors.push(`Normalization failed: ${errorMsg}`);
    }

    // ========================================
    // Step 6: Validate canonical
    // ========================================
    if (canonicalProduct) {
      const canonValidation = validateShopeeCanonicalProduct(canonicalProduct, { logger });

      if (!canonValidation.ok) {
        errors.push(...canonValidation.errors);
      }

      if (canonValidation.warnings.length > 0) {
        warnings.push(...canonValidation.warnings.map(w => `Canonical: ${w}`));
      }
    }

    // If we got this far, break from retry loop
    break;
  }

  // ========================================
  // Build metadata
  // ========================================
  const fieldCoverage = calculateFieldCoverage(rawPayload, canonicalProduct);
  const qualityScore = calculateQualityScore(fieldCoverage, errors);

  const metadata: ShopeeDetailMetadata = {
    startTime,
    endTime: Date.now(),
    finalUrl: page.url(),
    attempts,
    selectorProfileUsed: 'default',
    fieldCoverage,
    validationStatus: errors.length === 0 ? 'passed' : (warnings.length > 0 ? 'warnings' : 'failed'),
    blockedSuspicion,
  };

  // ========================================
  // Build result
  // ========================================
  const ok = !!canonicalProduct && errors.length === 0;
  const partialSuccess = !!rawPayload && !ok;

  return {
    ok,
    partialSuccess,
    inputUrl: productUrl,
    finalUrl: page.url(),
    canonicalProduct,
    rawPayload,
    warnings,
    errors,
    metadata,
    qualityScore,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Calculate field coverage
 */
function calculateFieldCoverage(
  raw?: ShopeeDetailRawPayload,
  canonical?: ShopeeCanonicalProduct
): ShopeeFieldCoverage {
  const fields = DETAIL_VALIDATION.QUALITY_FIELDS;
  const extractedFields: string[] = [];

  if (raw) {
    if (raw.rawTitle) extractedFields.push('title');
    if (raw.rawPriceText) extractedFields.push('price');
    if (raw.rawImageUrls?.length) extractedFields.push('images');
    if (raw.rawSellerName) extractedFields.push('seller');
    if (raw.rawRatingText) extractedFields.push('rating');
    if (raw.rawSoldCountText) extractedFields.push('soldCount');
    if (raw.rawDescriptionText) extractedFields.push('description');
    if (raw.rawBadgeTexts?.length) extractedFields.push('badges');
    if (raw.rawCategoryPath) extractedFields.push('category');
  }

  const missingCritical = fields.filter(f => !extractedFields.includes(f));

  return {
    totalFields: fields.length,
    extractedFields: extractedFields.length,
    missingCriticalFields: missingCritical,
    coveragePercent: Math.round((extractedFields.length / fields.length) * 100),
  };
}

/**
 * Calculate quality score
 */
function calculateQualityScore(
  fieldCoverage: ShopeeFieldCoverage,
  errors: string[]
): number {
  let score = fieldCoverage.coveragePercent;

  // Penalty for errors
  if (errors.length > 0) {
    score -= errors.length * QUALITY_SCORE.MISSING_FIELD_PENALTY;
  }

  // Penalty for missing critical fields
  const criticalMissing = fieldCoverage.missingCriticalFields.filter(f =>
    DETAIL_VALIDATION.CRITICAL_FIELDS.includes(f)
  ).length;

  score -= criticalMissing * QUALITY_SCORE.MISSING_FIELD_PENALTY;

  return Math.max(0, Math.min(100, score));
}

/**
 * Create error result
 */
function createErrorResult(
  startTime: number,
  inputUrl: string,
  error: string,
  warnings: string[]
): ShopeeDetailExtractionResult {
  return {
    ok: false,
    partialSuccess: false,
    inputUrl,
    finalUrl: '',
    canonicalProduct: undefined,
    rawPayload: undefined,
    warnings,
    errors: [error],
    metadata: {
      startTime,
      endTime: Date.now(),
      finalUrl: '',
      attempts: 0,
      selectorProfileUsed: 'default',
      fieldCoverage: {
        totalFields: 0,
        extractedFields: 0,
        missingCriticalFields: [],
        coveragePercent: 0,
      },
      validationStatus: 'failed',
      blockedSuspicion: false,
    },
    qualityScore: 0,
    durationMs: Date.now() - startTime,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get extraction summary
 */
export function getExtractionSummary(
  result: ShopeeDetailExtractionResult
): {
  success: boolean;
  qualityScore: number;
  duration: string;
  attempts: number;
  warnings: number;
  errors: number;
} {
  return {
    success: result.ok,
    qualityScore: result.qualityScore,
    duration: `${result.durationMs}ms`,
    attempts: result.metadata.attempts,
    warnings: result.warnings.length,
    errors: result.errors.length,
  };
}

/**
 * Print extraction summary
 */
export function printExtractionSummary(
  result: ShopeeDetailExtractionResult
): void {
  const summary = getExtractionSummary(result);

  console.log('\n========================================');
  console.log('Shopee Detail Extraction Summary');
  console.log('========================================');
  console.log(`Status:         ${result.ok ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Quality Score:  ${result.qualityScore}/100`);
  console.log(`Input URL:      ${result.inputUrl.substring(0, 50)}...`);
  console.log(`Final URL:      ${result.finalUrl.substring(0, 50)}...`);
  console.log(`Duration:       ${summary.duration}`);
  console.log(`Attempts:       ${summary.attempts}`);
  console.log(`Warnings:       ${summary.warnings}`);
  console.log(`Errors:         ${summary.errors}`);

  if (result.canonicalProduct) {
    console.log('\n--- Product ---');
    console.log(`Title:    ${result.canonicalProduct.title?.substring(0, 40)}...`);
    console.log(`Price:    ${result.canonicalProduct.price.priceVnd} VND`);
    console.log(`Images:   ${result.canonicalProduct.media.images.length}`);
    console.log(`Seller:   ${result.canonicalProduct.seller.name}`);
  }

  if (result.warnings.length > 0) {
    console.log('\n--- Warnings ---');
    result.warnings.slice(0, 3).forEach((w, i) => {
      console.log(`  ${i + 1}. ${w}`);
    });
  }

  if (result.errors.length > 0) {
    console.log('\n--- Errors ---');
    result.errors.slice(0, 3).forEach((e, i) => {
      console.log(`  ${i + 1}. ${e}`);
    });
  }

  console.log('========================================\n');
}
