// =============================================================================
// Public Input Validation
// Production-grade validation for public API input
// =============================================================================

import { PublicInputValidationResult, PublicShopeeUrlParseResult } from '../types.js';
import { PUBLIC_API, TRUST_SAFETY, ERROR_CODES } from '../constants.js';
import { validateShopeeUrl } from '../../voucherEngine/url/urlParser.js';

/**
 * Validate and sanitize public input
 */
export function validatePublicShopeeLinkInput(input: string): PublicInputValidationResult {
  const errors: PublicInputValidationResult['errors'] = [];

  // Check if input is empty
  if (!input || typeof input !== 'string') {
    errors.push({
      code: ERROR_CODES.INVALID_INPUT,
      message: 'Input is required',
      field: 'input',
    });
    return {
      valid: false,
      normalizedInput: '',
      errors,
      sanitizedInput: '',
    };
  }

  // Trim input
  let normalized = input.trim();

  // Check minimum length
  if (normalized.length < PUBLIC_API.MIN_INPUT_LENGTH) {
    errors.push({
      code: ERROR_CODES.INPUT_TOO_SHORT,
      message: `Input must be at least ${PUBLIC_API.MIN_INPUT_LENGTH} characters`,
      field: 'input',
    });
  }

  // Check maximum length
  if (normalized.length > PUBLIC_API.MAX_INPUT_LENGTH) {
    errors.push({
      code: ERROR_CODES.INPUT_TOO_LONG,
      message: `Input must be less than ${PUBLIC_API.MAX_INPUT_LENGTH} characters`,
      field: 'input',
    });
  }

  // Sanitize input
  const sanitized = sanitizeInput(normalized);

  // Check for suspicious patterns
  for (const pattern of TRUST_SAFETY.SUSPICIOUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      errors.push({
        code: ERROR_CODES.INVALID_INPUT,
        message: 'Input contains invalid characters',
        field: 'input',
      });
    }
  }

  // Check for blocked patterns
  for (const pattern of TRUST_SAFETY.BLOCKED_PATTERNS) {
    if (pattern.test(sanitized)) {
      errors.push({
        code: ERROR_CODES.INVALID_INPUT,
        message: 'Input contains blocked content',
        field: 'input',
      });
    }
  }

  // Try to parse as URL if it looks like a URL
  if (sanitized.includes('://') || sanitized.includes('shopee')) {
    const parseResult = parsePublicShopeeUrl(sanitized);
    if (!parseResult.success) {
      errors.push({
        code: ERROR_CODES.INVALID_URL_FORMAT,
        message: parseResult.errors?.[0] || 'Invalid URL format',
        field: 'input',
      });
    }
  }

  return {
    valid: errors.length === 0,
    normalizedInput: normalized,
    errors,
    sanitizedInput: sanitized,
  };
}

/**
 * Sanitize public input
 */
export function sanitizePublicLinkInput(input: string): string {
  return sanitizeInput(input.trim());
}

/**
 * Internal sanitize function
 */
function sanitizeInput(input: string): string {
  let result = input;

  // Remove null bytes
  result = result.replace(/\0/g, '');

  // Normalize line endings
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove excessive whitespace
  result = result.replace(/\s+/g, ' ').trim();

  // Remove control characters except newlines and tabs
  result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return result;
}

/**
 * Parse public Shopee URL
 */
export function parsePublicShopeeUrl(input: string): PublicShopeeUrlParseResult {
  // Use existing URL parser from voucher engine
  const parseResult = validateShopeeUrl(input);

  if (!parseResult.valid) {
    return {
      success: false,
      errors: parseResult.errors,
    };
  }

  return {
    success: true,
    productId: parseResult.productId,
    shopId: parseResult.shopId,
    normalizedUrl: parseResult.normalizedUrl,
  };
}

/**
 * Validate input is a valid Shopee URL or product ID
 */
export function isValidShopeeInput(input: string): boolean {
  const validation = validatePublicShopeeLinkInput(input);
  return validation.valid;
}

/**
 * Normalize input to a standard format
 */
export function normalizePublicInput(input: string): string {
  const validation = validatePublicShopeeLinkInput(input);

  // If valid, try to parse as URL
  if (validation.valid && (input.includes('shopee') || input.includes('http'))) {
    const parseResult = parsePublicShopeeUrl(input);
    if (parseResult.success && parseResult.normalizedUrl) {
      return parseResult.normalizedUrl;
    }
  }

  return validation.sanitizedInput;
}
