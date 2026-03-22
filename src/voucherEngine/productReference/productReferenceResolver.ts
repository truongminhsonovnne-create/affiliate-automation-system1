/**
 * Product Reference Resolver
 *
 * Resolves URL to canonical product reference.
 */

import {
  SupportedVoucherPlatform,
  ProductReferenceInput,
  CanonicalShopeeProductReference,
  GenericProductReference,
  ProductFingerprint,
  ProductReference,
} from '../types';
import {
  parseShopeeProductUrl,
  buildCanonicalShopeeReference,
  extractShopeeProductIdentifiers,
  normalizeShopeeProductUrl,
} from '../url/urlParser';

/**
 * Product reference resolver options
 */
export interface ProductReferenceResolverOptions {
  normalizeUrl?: boolean;
  extractMetadata?: boolean;
  confidenceBoost?: Record<string, number>;
}

/**
 * Product reference resolution result
 */
export interface ProductReferenceResolutionResult {
  success: boolean;
  reference: ProductReference | null;
  fingerprint: ProductFingerprint | null;
  confidence: number;
  errors: string[];
  warnings: string[];
}

/**
 * Resolve product reference from URL input
 */
export async function resolveShopeeProductReference(
  input: ProductReferenceInput,
  options?: ProductReferenceResolverOptions
): Promise<ProductReferenceResolutionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Step 1: Parse and validate URL
    const parseResult = parseShopeeProductUrl(input.url);

    if (!parseResult.valid || !parseResult.identifiers) {
      return {
        success: false,
        reference: null,
        fingerprint: null,
        confidence: 0,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
      };
    }

    warnings.push(...parseResult.warnings);

    // Step 2: Build canonical reference
    const canonical = buildCanonicalShopeeReference(input.url, {
      removeTracking: true,
      normalizeMode: 'strict',
    });

    if (!canonical) {
      return {
        success: false,
        reference: null,
        fingerprint: null,
        confidence: 0,
        errors: ['Failed to build canonical reference'],
        warnings,
      };
    }

    // Step 3: Enrich with additional data if requested
    if (options?.extractMetadata) {
      // In production, this would call crawler or catalog
      // For now, we work with URL-derived data
      warnings.push('Metadata enrichment not implemented - using URL-derived data only');
    }

    // Step 4: Calculate confidence
    let confidence = 0.5; // Base confidence from URL parsing

    if (canonical.itemId) {
      confidence += 0.3;
    }

    if (canonical.shopId) {
      confidence += 0.2;
    }

    // Apply confidence boosts
    if (options?.confidenceBoost) {
      for (const [key, boost] of Object.entries(options.confidenceBoost)) {
        if (canonical[key as keyof typeof canonical]) {
          confidence += boost;
        }
      }
    }

    confidence = Math.min(1, confidence);

    // Step 5: Build fingerprint
    const fingerprint = buildProductReferenceFingerprint(canonical);

    return {
      success: true,
      reference: canonical,
      fingerprint,
      confidence,
      errors: [],
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      reference: null,
      fingerprint: null,
      confidence: 0,
      errors: [`Resolution failed: ${(error as Error).message}`],
      warnings,
    };
  }
}

/**
 * Build canonical Shopee product reference with additional data
 */
export function buildCanonicalShopeeProductReference(
  itemId: string,
  shopId: string | null,
  options?: {
    categoryId?: string | null;
    categoryPath?: string[] | null;
    title?: string | null;
    price?: number | null;
    originalPrice?: number | null;
    imageUrl?: string | null;
    shopName?: string | null;
    normalizedUrl?: string;
  }
): CanonicalShopeeProductReference {
  return {
    platform: 'shopee',
    itemId,
    shopId,
    categoryId: options?.categoryId ?? null,
    categoryPath: options?.categoryPath ?? null,
    title: options?.title ?? null,
    price: options?.price ?? null,
    originalPrice: options?.originalPrice ?? null,
    imageUrl: options?.imageUrl ?? null,
    shopName: options?.shopName ?? null,
    normalizedUrl: options?.normalizedUrl ?? '',
    extractedAt: new Date(),
  };
}

/**
 * Build product reference fingerprint for caching
 */
export function buildProductReferenceFingerprint(
  reference: ProductReference
): ProductFingerprint {
  const urlHash = hashString(reference.normalizedUrl);

  const fingerprint: ProductFingerprint = {
    platform: reference.platform,
    urlHash,
  };

  // Add platform-specific identifiers
  if (reference.platform === 'shopee') {
    const shopeeRef = reference as CanonicalShopeeProductReference;
    if (shopeeRef.itemId) {
      fingerprint.itemId = shopeeRef.itemId;
    }
    if (shopeeRef.shopId) {
      fingerprint.shopId = shopeeRef.shopId;
    }
    if (shopeeRef.categoryPath && shopeeRef.categoryPath.length > 0) {
      fingerprint.categoryPath = shopeeRef.categoryPath;
    }
    if (shopeeRef.title) {
      fingerprint.titleHash = hashString(shopeeRef.title);
    }
  }

  return fingerprint;
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Resolve product reference for any supported platform
 */
export async function resolveProductReference(
  input: ProductReferenceInput,
  options?: ProductReferenceResolverOptions
): Promise<ProductReferenceResolutionResult> {
  const platform = input.platform || 'shopee';

  switch (platform) {
    case 'shopee':
      return resolveShopeeProductReference(input, options);

    case 'lazada':
    case 'tiki':
    case 'tiktok':
      // Placeholder for other platforms
      return {
        success: false,
        reference: null,
        fingerprint: null,
        confidence: 0,
        errors: [`Platform ${platform} not yet supported`],
        warnings: [],
      };

    default:
      return {
        success: false,
        reference: null,
        fingerprint: null,
        confidence: 0,
        errors: [`Unsupported platform: ${platform}`],
        warnings: [],
      };
  }
}

/**
 * Create a fallback generic reference when platform-specific fails
 */
export function createGenericProductReference(
  url: string,
  platform: SupportedVoucherPlatform
): GenericProductReference {
  const normalized = normalizeShopeeProductUrl(url);

  return {
    platform,
    productId: null,
    shopId: null,
    keywords: [],
    categoryHints: [],
    normalizedUrl: normalized,
    extractedAt: new Date(),
  };
}
