/**
 * Shopee Detail Extraction - Error Classifier
 *
 * Classifies extraction errors to determine retry strategy.
 */

import type { ShopeeDetailError, ShopeeDetailErrorType } from './types.js';

/**
 * Classify Shopee detail extraction error
 *
 * @param error - Error to classify
 * @param context - Additional context
 * @returns Classified error
 */
export function classifyShopeeDetailError(
  error: Error | string,
  context?: {
    /** Current attempt number */
    attempt?: number;
    /** Whether page is blocked */
    isBlocked?: boolean;
    /** Whether validation failed */
    validationFailed?: boolean;
    /** Selector match failed */
    selectorFailed?: boolean;
  }
): ShopeeDetailError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorType = classifyErrorType(errorMessage, context);

  return {
    type: errorType,
    message: errorMessage,
    recoverable: isRecoverableError(errorType),
    shouldRetry: shouldRetryError(errorType, context),
  };
}

/**
 * Classify error type
 */
function classifyErrorType(
  errorMessage: string,
  context?: {
    isBlocked?: boolean;
    validationFailed?: boolean;
    selectorFailed?: boolean;
  }
): ShopeeDetailErrorType {
  const lowerMessage = errorMessage.toLowerCase();

  // Navigation failures
  if (
    lowerMessage.includes('navigation') ||
    lowerMessage.includes('goto') ||
    lowerMessage.includes('timeout')
  ) {
    return 'navigation_failed';
  }

  // Page invalid
  if (
    lowerMessage.includes('page') ||
    lowerMessage.includes('closed') ||
    lowerMessage.includes('invalid')
  ) {
    return 'page_invalid';
  }

  // Blocked suspicion
  if (
    lowerMessage.includes('blocked') ||
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('403') ||
    lowerMessage.includes('captcha') ||
    lowerMessage.includes('verify') ||
    lowerMessage.includes('robot')
  ) {
    return 'blocked_suspected';
  }

  // Timeout
  if (
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('timed out')
  ) {
    return 'timeout';
  }

  // Selector not found
  if (
    lowerMessage.includes('selector') ||
    lowerMessage.includes('not found') ||
    lowerMessage.includes('null') ||
    lowerMessage.includes('undefined')
  ) {
    return 'selector_not_found';
  }

  // Validation failed
  if (lowerMessage.includes('validation') || context?.validationFailed) {
    return 'validation_failed';
  }

  // Extraction failed
  if (
    lowerMessage.includes('extract') ||
    lowerMessage.includes('parse')
  ) {
    return 'extraction_failed';
  }

  return 'extraction_failed';
}

/**
 * Check if error is recoverable
 */
function isRecoverableError(type: ShopeeDetailErrorType): boolean {
  const recoverableTypes: ShopeeDetailErrorType[] = [
    'navigation_failed',
    'timeout',
    'page_invalid',
  ];

  return recoverableTypes.includes(type);
}

/**
 * Check if should retry
 */
function shouldRetryError(
  type: ShopeeDetailErrorType,
  context?: {
    attempt?: number;
    isBlocked?: boolean;
  }
): boolean {
  const maxAttempts = 3;
  const currentAttempt = context?.attempt || 1;

  // Don't retry if blocked
  if (type === 'blocked_suspected') {
    return false;
  }

  // Don't exceed max attempts
  if (currentAttempt >= maxAttempts) {
    return false;
  }

  // Retry on recoverable errors
  return isRecoverableError(type);
}

/**
 * Get error category
 */
export function getErrorCategory(error: ShopeeDetailError): 'navigation' | 'page' | 'extraction' | 'validation' | 'blocking' {
  if (
    error.type === 'navigation_failed' ||
    error.type === 'timeout'
  ) {
    return 'navigation';
  }

  if (
    error.type === 'page_invalid' ||
    error.type === 'blocked_suspected'
  ) {
    return 'blocking';
  }

  if (
    error.type === 'validation_failed' ||
    error.type === 'selector_not_found'
  ) {
    return 'extraction';
  }

  return 'extraction';
}

/**
 * Get retry delay for error type
 */
export function getRetryDelay(
  errorType: ShopeeDetailErrorType,
  attempt: number
): number {
  const baseDelay = 1000;
  const maxDelay = 5000;

  // Longer delay for blocking issues
  if (errorType === 'blocked_suspected') {
    return Math.min(baseDelay * 3 * attempt, maxDelay);
  }

  // Exponential backoff for other errors
  return Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
}

/**
 * Determine if should fail fast
 */
export function shouldFailFast(
  errors: ShopeeDetailError[]
): boolean {
  // If any error is blocking, fail fast
  const hasBlockingError = errors.some(e => e.type === 'blocked_suspected');
  if (hasBlockingError) {
    return true;
  }

  // If too many consecutive errors
  if (errors.length >= 3) {
    return true;
  }

  return false;
}
