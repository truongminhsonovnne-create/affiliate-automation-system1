/**
 * Platform-Neutral Product Reference Contract
 *
 * Standardizes product reference across e-commerce platforms.
 */

import type { CommercePlatform } from '../types.js';

// ============================================================
// A. Product Reference Types
// ============================================================

export interface PlatformProductIdentifier {
  platform: CommercePlatform;
  productId: string;
  productUrl?: string;
  productCode?: string;
}

export interface CommerceProductReference {
  referenceId: string;
  platform: CommercePlatform;
  identifiers: PlatformProductIdentifier[];
  normalizedForm?: string;
  referenceType: 'url' | 'id' | 'code' | 'search';
}

export interface PlatformReferenceValidationResult {
  isValid: boolean;
  normalizedForm?: string;
  platform?: CommercePlatform;
  errors: string[];
}

export interface PlatformReferenceNormalizationResult {
  success: boolean;
  normalizedReference?: CommerceProductReference;
  platform?: CommercePlatform;
  confidence: number;
  errors: string[];
}

// ============================================================
// B. Reference Parser Interface
// ============================================================

export interface PlatformReferenceParser {
  platform: CommercePlatform;
  canParse: (input: string) => boolean;
  parse: (input: string) => PlatformReferenceNormalizationResult;
  normalize: (reference: CommerceProductReference) => PlatformReferenceNormalizationResult;
  validate: (reference: CommerceProductReference) => PlatformReferenceValidationResult;
}

// ============================================================
// C. Factory Functions
// ============================================================

/**
 * Normalize a commerce product reference across platforms
 */
export function normalizeCommerceProductReference(
  input: string,
  platform?: CommercePlatform
): PlatformReferenceNormalizationResult {
  // Try to detect platform from input if not provided
  const detectedPlatform = platform ?? detectPlatformFromInput(input);

  if (!detectedPlatform) {
    return {
      success: false,
      confidence: 0,
      errors: ['Unable to detect platform from input'],
    };
  }

  // Normalize based on platform
  const normalizedForm = input.trim().toLowerCase();

  return {
    success: true,
    normalizedReference: {
      referenceId: generateReferenceId(detectedPlatform, normalizedForm),
      platform: detectedPlatform,
      identifiers: [{
        platform: detectedPlatform,
        productId: extractProductId(normalizedForm, detectedPlatform),
        productUrl: normalizedForm,
      }],
      normalizedForm,
      referenceType: classifyReferenceType(normalizedForm),
    },
    platform: detectedPlatform,
    confidence: 0.9,
    errors: [],
  };
}

/**
 * Validate a commerce product reference
 */
export function validateCommerceProductReference(
  reference: CommerceProductReference
): PlatformReferenceValidationResult {
  const errors: string[] = [];

  if (!reference.referenceId) {
    errors.push('Reference ID is required');
  }

  if (!reference.platform) {
    errors.push('Platform is required');
  }

  if (!reference.identifiers || reference.identifiers.length === 0) {
    errors.push('At least one product identifier is required');
  }

  // Validate platform-specific requirements
  for (const identifier of reference.identifiers) {
    if (!identifier.productId && !identifier.productCode && !identifier.productUrl) {
      errors.push('Each identifier must have at least one of: productId, productCode, productUrl');
    }
  }

  return {
    isValid: errors.length === 0,
    normalizedForm: reference.normalizedForm,
    platform: reference.platform,
    errors,
  };
}

// ============================================================
// D. Helper Functions
// ============================================================

function detectPlatformFromInput(input: string): CommercePlatform | null {
  const lowerInput = input.toLowerCase();

  // Shopee patterns
  if (lowerInput.includes('shopee') || lowerInput.includes('shopee.sg') || lowerInput.includes('shopee.co.id')) {
    return 'shopee';
  }

  // TikTok Shop patterns
  if (lowerInput.includes('tiktok') || lowerInput.includes('shop.tiktok')) {
    return 'tiktok_shop';
  }

  // Lazada patterns
  if (lowerInput.includes('lazada')) {
    return 'lazada';
  }

  // Tokopedia patterns
  if (lowerInput.includes('tokopedia')) {
    return 'tokopedia';
  }

  // If no platform detected, assume generic
  return null;
}

function generateReferenceId(platform: CommercePlatform, normalizedForm: string): string {
  const hash = Buffer.from(normalizedForm).toString('base64').substring(0, 12);
  return `${platform}_${hash}`;
}

function extractProductId(input: string, platform: CommercePlatform): string {
  // Extract product ID based on platform patterns
  // This is a simplified version - real implementation would parse actual URLs
  const urlMatch = input.match(/\/product\/(\d+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // For non-URL references, use the input as-is
  return input;
}

function classifyReferenceType(input: string): 'url' | 'id' | 'code' | 'search' {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return 'url';
  }

  if (/^\d+$/.test(input)) {
    return 'id';
  }

  if (input.length > 20) {
    return 'search';
  }

  return 'code';
}
