/**
 * TikTok Shop URL Parser
 *
 * Production-grade URL parsing for TikTok Shop references.
 */

import type {
  TikTokShopReferenceType,
  TikTokShopUrlVariant,
  TikTokShopProductIdentifier,
  TikTokShopCanonicalReference,
  TikTokShopReferenceParseResult,
  TikTokShopParseOptions,
} from '../types.js';
import { REFERENCE_PARSING_LIMITS, REFERENCE_CONFIDENCE_THRESHOLDS, TIKTOK_SHOP_DOMAINS } from '../constants.js';

/**
 * Parse a TikTok Shop URL and extract identifiers
 */
export function parseTikTokShopUrl(
  rawUrl: string,
  options?: TikTokShopParseOptions
): TikTokShopReferenceParseResult {
  const startTime = Date.now();
  const errors: string[] = [];

  // Validate input
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      success: false,
      parseMetadata: {
        inputLength: 0,
        detectedVariant: 'unknown' as TikTokShopUrlVariant,
        detectedType: 'unknown' as TikTokShopReferenceType,
        processingTimeMs: Date.now() - startTime,
      },
      errors: ['Input is required and must be a string'],
    };
  }

  // Input length validation
  if (rawUrl.length > REFERENCE_PARSING_LIMITS.MAX_INPUT_LENGTH) {
    errors.push(`Input exceeds maximum length of ${REFERENCE_PARSING_LIMITS.MAX_INPUT_LENGTH}`);
  }

  if (rawUrl.length < REFERENCE_PARSING_LIMITS.MIN_URL_LENGTH) {
    errors.push(`Input below minimum length of ${REFERENCE_PARSING_LIMITS.MIN_URL_LENGTH}`);
  }

  if (errors.length > 0) {
    return {
      success: false,
      parseMetadata: {
        inputLength: rawUrl.length,
        detectedVariant: detectUrlVariant(rawUrl),
        detectedType: 'unknown',
        processingTimeMs: Date.now() - startTime,
      },
      errors,
    };
  }

  // Detect URL variant
  const variant = detectUrlVariant(rawUrl);

  // Detect reference type
  const referenceType = detectReferenceType(rawUrl);

  // Extract identifiers based on type
  const identifiers = extractIdentifiers(rawUrl, referenceType);

  // Build canonical reference
  const reference: TikTokShopCanonicalReference = {
    referenceId: generateReferenceId(identifiers, referenceType),
    referenceType,
    identifiers,
    normalizedUrl: normalizeUrl(rawUrl),
    canonicalUrl: buildCanonicalUrl(rawUrl, identifiers, referenceType),
    variant,
    confidence: calculateConfidence(identifiers, referenceType),
    isValid: validateIdentifiers(identifiers),
    parseErrors: [],
  };

  // Validation if requested
  if (options?.validate !== false) {
    const validation = validateTikTokShopUrl(rawUrl, { strict: options?.strict ?? false });
    if (!validation.isValid) {
      errors.push(...validation.errors);
      reference.isValid = false;
      reference.parseErrors = validation.errors;
    }
  }

  return {
    success: reference.isValid,
    reference,
    parseMetadata: {
      inputLength: rawUrl.length,
      detectedVariant: variant,
      detectedType: referenceType,
      processingTimeMs: Date.now() - startTime,
    },
    errors,
  };
}

/**
 * Normalize a TikTok Shop URL
 */
export function normalizeTikTokShopUrl(
  rawUrl: string,
  _options?: TikTokShopParseOptions
): string {
  try {
    const url = new URL(rawUrl.trim());

    // Remove tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
    trackingParams.forEach(param => url.searchParams.delete(param));

    // Remove fragment
    url.hash = '';

    return url.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Extract identifiers from a TikTok Shop URL
 */
export function extractIdentifiers(
  rawUrl: string,
  referenceType: TikTokShopReferenceType
): TikTokShopProductIdentifier {
  const identifiers: TikTokShopProductIdentifier = {
    productId: '',
  };

  try {
    const url = new URL(rawUrl);

    switch (referenceType) {
      case 'product_detail':
      case 'product_detail_short':
        // Try to extract from path: /shop/{shopId}/product/{itemId}
        const pathParts = url.pathname.split('/').filter(Boolean);
        for (let i = 0; i < pathParts.length; i++) {
          if (pathParts[i] === 'product' && pathParts[i + 1]) {
            identifiers.productId = pathParts[i + 1];
            identifiers.itemId = pathParts[i + 1];
          }
          if (pathParts[i] === 'shop' && pathParts[i + 1] && !pathParts[i + 1].startsWith('@')) {
            identifiers.shopId = pathParts[i + 1];
          }
        }

        // Try query params
        const itemId = url.searchParams.get('itemId') || url.searchParams.get('id');
        if (itemId && !identifiers.productId) {
          identifiers.productId = itemId;
          identifiers.itemId = itemId;
        }

        const shopId = url.searchParams.get('shopId') || url.searchParams.get('sellerId');
        if (shopId && !identifiers.shopId) {
          identifiers.shopId = shopId;
        }

        // Try secItemId
        const secItemId = url.searchParams.get('secItemId');
        if (secItemId) {
          identifiers.secItemId = secItemId;
        }
        break;

      case 'shop':
        const shopPathMatch = url.pathname.match(/\/@([^\/]+)/);
        if (shopPathMatch) {
          identifiers.shopId = shopPathMatch[1];
        }
        break;

      case 'video':
      case 'live':
        // Extract video ID from path
        const videoMatch = url.pathname.match(/\/video\/(\d+)/);
        if (videoMatch) {
          identifiers.productId = videoMatch[1];
        }
        break;

      default:
        // Try generic extraction
        const idMatch = rawUrl.match(/(\d{10,})/);
        if (idMatch) {
          identifiers.productId = idMatch[1];
        }
    }
  } catch {
    // URL parsing failed, try regex fallback
    const idMatch = rawUrl.match(/(\d{10,})/);
    if (idMatch) {
      identifiers.productId = idMatch[1];
    }
  }

  return identifiers;
}

/**
 * Validate TikTok Shop URL
 */
export function validateTikTokShopUrl(
  rawUrl: string,
  options?: { strict?: boolean }
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if it's a valid URL
  try {
    const url = new URL(rawUrl);

    // Check if it's a TikTok domain
    const isTikTokDomain = TIKTOK_SHOP_DOMAINS.some(domain => url.hostname.includes(domain));
    if (!isTikTokDomain) {
      warnings.push('URL does not appear to be from TikTok domain');
    }

    // Check for required components based on type
    const type = detectReferenceType(rawUrl);
    if (type === 'product_detail' || type === 'product_detail_short') {
      const identifiers = extractIdentifiers(rawUrl, type);
      if (!identifiers.productId) {
        errors.push('Product ID could not be extracted from URL');
      }
    }
  } catch {
    errors.push('Invalid URL format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================
// Helper Functions
// ============================================================

function detectUrlVariant(url: string): TikTokShopUrlVariant {
  const lower = url.toLowerCase();

  if (lower.includes('m.tiktok.com') || lower.includes('mobile')) {
    return 'mobile';
  }
  if (lower.includes('vm.tiktok.com') || lower.includes('vt.tiktok.com')) {
    return 'short';
  }
  if (lower.includes('desktop') || lower.includes('www')) {
    return 'desktop';
  }
  if (lower.includes('shop.tiktok.com')) {
    return 'full';
  }

  return 'web';
}

function detectReferenceType(url: string): TikTokShopReferenceType {
  const lower = url.toLowerCase();

  // Product detail URLs
  if (lower.includes('/product/') || lower.includes('itemid=') || lower.includes('item_id=')) {
    return 'product_detail';
  }

  // Shop URLs
  if (lower.includes('/shop/') || lower.includes('/@')) {
    return 'shop';
  }

  // Video URLs
  if (lower.includes('/video/') || lower.includes('/v/')) {
    return 'video';
  }

  // Live URLs
  if (lower.includes('/live/')) {
    return 'live';
  }

  // Short URLs
  if (lower.includes('vm.tiktok.com') || lower.includes('vt.tiktok.com')) {
    return 'affiliate_link';
  }

  // Search URLs
  if (lower.includes('/search/') || lower.includes('search=')) {
    return 'search';
  }

  return 'unknown';
}

function generateReferenceId(
  identifiers: TikTokShopProductIdentifier,
  referenceType: TikTokShopReferenceType
): string {
  const parts = [
    'tiktok',
    referenceType,
    identifiers.productId || identifiers.shopId || 'unknown',
  ];

  return parts.filter(Boolean).join('_');
}

function buildCanonicalUrl(
  rawUrl: string,
  identifiers: TikTokShopProductIdentifier,
  referenceType: TikTokShopReferenceType
): string {
  try {
    const url = new URL(rawUrl);

    // Build canonical product URL
    if ((referenceType === 'product_detail' || referenceType === 'product_detail_short') && identifiers.productId) {
      return `https://shop.tiktok.com/shop/product/${identifiers.productId}`;
    }

    // Build canonical shop URL
    if (referenceType === 'shop' && identifiers.shopId) {
      return `https://shop.tiktok.com/shop/${identifiers.shopId}`;
    }

    return normalizeUrl(rawUrl);
  } catch {
    return rawUrl;
  }
}

function calculateConfidence(
  identifiers: TikTokShopProductIdentifier,
  referenceType: TikTokShopReferenceType
): number {
  let confidence = 0.5;

  // Product ID presence
  if (identifiers.productId) {
    confidence += 0.25;
  }

  // Shop ID presence
  if (identifiers.shopId) {
    confidence += 0.15;
  }

  // Reference type known
  if (referenceType !== 'unknown') {
    confidence += 0.1;
  }

  return Math.min(confidence, 1);
}

function validateIdentifiers(identifiers: TikTokShopProductIdentifier): boolean {
  return Boolean(
    identifiers.productId ||
    identifiers.shopId ||
    identifiers.itemId
  );
}

function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());

    // Remove common tracking params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
    trackingParams.forEach(param => url.searchParams.delete(param));

    // Remove fragment
    url.hash = '';

    return url.toString();
  } catch {
    return rawUrl;
  }
}
