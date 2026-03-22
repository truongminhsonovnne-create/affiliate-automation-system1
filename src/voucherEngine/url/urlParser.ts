/**
 * URL Parser
 *
 * Parses and normalizes Shopee product URLs.
 */

import {
  SupportedVoucherPlatform,
  CanonicalShopeeProductReference,
} from '../types';
import {
  DEFAULT_URL_NORMALIZE_MODE,
  URL_REMOVE_TRACKING_PARAMS,
  DEFAULT_TRACKING_PARAMS_TO_REMOVE,
  MAX_URL_LENGTH,
  MIN_URL_LENGTH,
} from '../constants';

/**
 * URL parser options
 */
export interface UrlParserOptions {
  removeTracking?: boolean;
  trackingParams?: string[];
  normalizeMode?: 'strict' | 'loose' | 'none';
  validateOnly?: boolean;
}

/**
 * URL parse result
 */
export interface UrlParseResult {
  valid: boolean;
  normalized: string | null;
  identifiers: ProductIdentifiers | null;
  platform: SupportedVoucherPlatform | null;
  errors: string[];
  warnings: string[];
}

/**
 * Extracted product identifiers
 */
export interface ProductIdentifiers {
  itemId: string | null;
  shopId: string | null;
  categoryId: string | null;
  username: string | null;
}

/**
 * Parse and validate a Shopee product URL
 */
export function parseShopeeProductUrl(
  rawUrl: string,
  options?: UrlParserOptions
): UrlParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      valid: false,
      normalized: null,
      identifiers: null,
      platform: null,
      errors: ['URL is required'],
      warnings: [],
    };
  }

  const trimmedUrl = rawUrl.trim();

  if (trimmedUrl.length < MIN_URL_LENGTH) {
    return {
      valid: false,
      normalized: null,
      identifiers: null,
      platform: null,
      errors: [`URL too short: ${trimmedUrl.length} characters`],
      warnings: [],
    };
  }

  if (trimmedUrl.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      normalized: null,
      identifiers: null,
      platform: null,
      errors: [`URL too long: ${trimmedUrl.length} characters (max: ${MAX_URL_LENGTH})`],
      warnings: [],
    };
  }

  // Try to parse URL
  let url: URL;
  try {
    url = new URL(trimmedUrl);
  } catch {
    return {
      valid: false,
      normalized: null,
      identifiers: null,
      platform: null,
      errors: ['Invalid URL format'],
      warnings: [],
    };
  }

  // Check if it's a Shopee URL
  const hostname = url.hostname.toLowerCase();
  const isShopee = hostname.includes('shopee.vn') || hostname.includes('shopee.sg');

  if (!isShopee) {
    return {
      valid: false,
      normalized: null,
      identifiers: null,
      platform: null,
      errors: ['URL is not a Shopee URL'],
      warnings: [],
    };
  }

  // Extract path segments
  const pathSegments = url.pathname.split('/').filter(Boolean);

  // Try different URL patterns
  let identifiers: ProductIdentifiers | null = null;

  // Pattern 1: /username/i.itemId.shopId
  // Example: /shoppehuy/i.123456789.987654321
  if (pathSegments.length >= 2 && pathSegments[1].startsWith('i.')) {
    identifiers = extractFromLegacyFormat(pathSegments[1]);
  }

  // Pattern 2: /product/shopId/itemId
  // Example: /product/987654321/123456789
  if (!identifiers && pathSegments[0] === 'product' && pathSegments.length >= 3) {
    identifiers = extractFromProductFormat(pathSegments[1], pathSegments[2]);
  }

  // Try to extract from query params as fallback
  if (!identifiers) {
    identifiers = extractFromQueryParams(url.searchParams);
  }

  // Normalize URL
  const normalized = normalizeShopeeProductUrl(trimmedUrl, options);

  // Check if we have valid identifiers
  const hasValidIdentifiers = identifiers && (identifiers.itemId || identifiers.shopId);

  if (!hasValidIdentifiers) {
    warnings.push('Could not extract product identifiers from URL');
  }

  return {
    valid: hasValidIdentifiers,
    normalized,
    identifiers,
    platform: hasValidIdentifiers ? 'shopee' : null,
    errors: hasValidIdentifiers ? [] : ['Could not extract valid product identifiers'],
    warnings,
  };
}

/**
 * Normalize a Shopee product URL
 */
export function normalizeShopeeProductUrl(
  rawUrl: string,
  options?: UrlParserOptions
): string {
  const opts = {
    removeTracking: options?.removeTracking ?? URL_REMOVE_TRACKING_PARAMS,
    trackingParams: options?.trackingParams ?? DEFAULT_TRACKING_PARAMS_TO_REMOVE,
    normalizeMode: options?.normalizeMode ?? DEFAULT_URL_NORMALIZE_MODE,
  };

  try {
    const url = new URL(rawUrl.trim());

    // Remove tracking parameters
    if (opts.removeTracking) {
      for (const param of opts.trackingParams) {
        url.searchParams.delete(param);
      }
    }

    // Remove fragment
    url.hash = '';

    // Get base URL without query
    let normalized = url.origin + url.pathname;

    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');

    // Sort query params for consistency
    if (url.searchParams.toString()) {
      const sortedParams = new URLSearchParams();
      const keys = Array.from(url.searchParams.keys()).sort();

      for (const key of keys) {
        sortedParams.set(key, url.searchParams.get(key)!);
      }

      normalized += '?' + sortedParams.toString();
    }

    return normalized;
  } catch {
    return rawUrl;
  }
}

/**
 * Extract product identifiers from URL
 */
export function extractShopeeProductIdentifiers(
  rawUrl: string,
  options?: UrlParserOptions
): ProductIdentifiers | null {
  const parseResult = parseShopeeProductUrl(rawUrl, options);

  if (!parseResult.valid || !parseResult.identifiers) {
    return null;
  }

  return parseResult.identifiers;
}

/**
 * Validate a Shopee product URL
 */
export function validateShopeeProductUrl(
  rawUrl: string,
  options?: UrlParserOptions
): { valid: boolean; errors: string[]; warnings: string[] } {
  const parseResult = parseShopeeProductUrl(rawUrl, {
    ...options,
    validateOnly: true,
  });

  return {
    valid: parseResult.valid,
    errors: parseResult.errors,
    warnings: parseResult.warnings,
  };
}

/**
 * Build canonical product reference from URL
 */
export function buildCanonicalShopeeReference(
  rawUrl: string,
  options?: UrlParserOptions
): CanonicalShopeeProductReference | null {
  const parseResult = parseShopeeProductUrl(rawUrl, options);

  if (!parseResult.valid || !parseResult.normalized) {
    return null;
  }

  const identifiers = parseResult.identifiers;

  if (!identifiers) {
    return null;
  }

  return {
    platform: 'shopee',
    itemId: identifiers.itemId ?? '',
    shopId: identifiers.shopId ?? null,
    categoryId: identifiers.categoryId ?? null,
    categoryPath: null,
    title: null,
    price: null,
    originalPrice: null,
    imageUrl: null,
    shopName: identifiers.username ?? null,
    normalizedUrl: parseResult.normalized,
    extractedAt: new Date(),
  };
}

// =============================================================================
// Private Helper Functions
// =============================================================================

/**
 * Extract identifiers from legacy format: i.itemId.shopId
 */
function extractFromLegacyFormat(segment: string): ProductIdentifiers {
  const parts = segment.replace('i.', '').split('.');

  return {
    itemId: parts[0] || null,
    shopId: parts[1] || null,
    categoryId: null,
    username: null,
  };
}

/**
 * Extract identifiers from product format: /product/shopId/itemId
 */
function extractFromProductFormat(shopId: string, itemId: string): ProductIdentifiers {
  return {
    itemId: itemId || null,
    shopId: shopId || null,
    categoryId: null,
    username: null,
  };
}

/**
 * Extract identifiers from query parameters
 */
function extractFromQueryParams(searchParams: URLSearchParams): ProductIdentifiers | null {
  // Try common parameter names
  const itemId = searchParams.get('itemid') || searchParams.get('item_id') || null;
  const shopId = searchParams.get('shopid') || searchParams.get('shop_id') || null;
  const categoryId = searchParams.get('categoryid') || searchParams.get('cate') || null;

  if (!itemId && !shopId) {
    return null;
  }

  return {
    itemId,
    shopId,
    categoryId,
    username: null,
  };
}

/**
 * Extract username from path
 */
function extractUsername(pathSegments: string[]): string | null {
  if (pathSegments.length > 0) {
    const firstSegment = pathSegments[0];
    // Skip common path prefixes
    if (!['product', 'shop', 'api', 'v4'].includes(firstSegment)) {
      return firstSegment;
    }
  }
  return null;
}
