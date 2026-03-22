/**
 * TikTok Shop Acquisition Failure Classifier
 * Classifies failures for retry and handling decisions
 */

import type { TikTokShopAcquisitionError, TikTokShopFailureType } from '../types.js';
import { TIKTOK_SHOP_RETRY_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Classify acquisition failure
 */
export function classifyTikTokShopAcquisitionFailure(
  error: Error,
  context?: Record<string, unknown>
): TikTokShopAcquisitionError {
  const errorMessage = error.message.toLowerCase();
  const errorType = determineFailureType(errorMessage, context);
  const retryable = isRetryableFailure(errorType);

  logger.info({ msg: 'Classifying acquisition failure', errorType, retryable });

  return {
    errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    errorType,
    message: error.message,
    timestamp: new Date(),
    retryable,
    metadata: context,
  };
}

/**
 * Check if failure is retryable
 */
export function isRetryableTikTokShopFailure(error: TikTokShopAcquisitionError): boolean {
  return error.retryable;
}

/**
 * Build failure summary
 */
export function buildTikTokShopFailureSummary(
  errors: TikTokShopAcquisitionError[]
): {
  total: number;
  retryable: number;
  nonRetryable: number;
  byType: Record<string, number>;
} {
  const retryable = errors.filter((e) => e.retryable).length;
  const nonRetryable = errors.filter((e) => !e.retryable).length;

  const byType: Record<string, number> = {};
  for (const error of errors) {
    byType[error.errorType] = (byType[error.errorType] || 0) + 1;
  }

  return {
    total: errors.length,
    retryable,
    nonRetryable,
    byType,
  };
}

function determineFailureType(errorMessage: string, context?: Record<string, unknown>): TikTokShopFailureType {
  // Navigation timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return TikTokShopFailureType.NAVIGATION_TIMEOUT;
  }

  // Anti-bot suspicion
  if (
    errorMessage.includes('blocked') ||
    errorMessage.includes('forbidden') ||
    errorMessage.includes('access denied') ||
    errorMessage.includes('captcha') ||
    errorMessage.includes('rate limit')
  ) {
    return TikTokShopFailureType.ANTI_BOT_SUSPICION;
  }

  // Missing page state
  if (
    errorMessage.includes('page not found') ||
    errorMessage.includes('404') ||
    errorMessage.includes('no such element') ||
    errorMessage.includes('not found')
  ) {
    return TikTokShopFailureType.MISSING_PAGE_STATE;
  }

  // Reference invalid
  if (
    errorMessage.includes('invalid reference') ||
    errorMessage.includes('invalid url') ||
    errorMessage.includes('malformed')
  ) {
    return TikTokShopFailureType.REFERENCE_INVALID;
  }

  // Selector fragility
  if (
    errorMessage.includes('selector') ||
    errorMessage.includes('element not found') ||
    errorMessage.includes('stale element')
  ) {
    return TikTokShopFailureType.SELECTOR_FRAGILITY;
  }

  // Partial extraction
  if (
    errorMessage.includes('partial') ||
    errorMessage.includes('incomplete') ||
    errorMessage.includes('missing field')
  ) {
    return TikTokShopFailureType.PARTIAL_EXTRACTION;
  }

  // Unsupported surface
  if (
    errorMessage.includes('unsupported') ||
    errorMessage.includes('not supported') ||
    errorMessage.includes('not implemented')
  ) {
    return TikTokShopFailureType.UNSUPPORTED_SURFACE;
  }

  // Rate limit
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return TikTokShopFailureType.RATE_LIMIT;
  }

  // Session error
  if (errorMessage.includes('session') || errorMessage.includes('browser')) {
    return TikTokShopFailureType.SESSION_ERROR;
  }

  // Default to partial extraction for unknown errors
  return TikTokShopFailureType.PARTIAL_EXTRACTION;
}

function isRetryableFailure(errorType: TikTokShopFailureType): boolean {
  const retryableTypes = [
    TikTokShopFailureType.NAVIGATION_TIMEOUT,
    TikTokShopFailureType.RATE_LIMIT,
    TikTokShopFailureType.SESSION_ERROR,
    TikTokShopFailureType.PARTIAL_EXTRACTION,
  ];

  const nonRetryableTypes = [
    TikTokShopFailureType.ANTI_BOT_SUSPICION,
    TikTokShopFailureType.REFERENCE_INVALID,
    TikTokShopFailureType.UNSUPPORTED_SURFACE,
  ];

  if (nonRetryableTypes.includes(errorType)) {
    return false;
  }

  return retryableTypes.includes(errorType);
}
