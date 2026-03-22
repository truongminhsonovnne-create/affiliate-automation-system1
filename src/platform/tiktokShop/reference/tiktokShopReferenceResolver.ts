/**
 * TikTok Shop Reference Resolver
 *
 * Resolves TikTok Shop references to canonical form.
 */

import type {
  TikTokShopCanonicalReference,
  TikTokShopReferenceParseResult,
  TikTokShopResolveOptions,
  TikTokShopResult,
} from '../types.js';
import { parseTikTokShopUrl, validateTikTokShopUrl } from './tiktokShopUrlParser.js';
import { logger } from '../../../utils/logger.js';

/**
 * Resolve TikTok Shop product reference from raw input
 */
export function resolveTikTokShopProductReference(
  input: string,
  options?: TikTokShopResolveOptions
): TikTokShopResult<TikTokShopCanonicalReference> {
  const startTime = Date.now();

  // Parse the input
  const parseResult = parseTikTokShopUrl(input, { validate: true });

  if (!parseResult.success || !parseResult.reference) {
    logger.warn({
      msg: 'TikTok Shop reference parsing failed',
      input: input.substring(0, 100),
      errors: parseResult.errors,
    });

    return {
      success: false,
      error: parseResult.errors.join('; '),
      metadata: { processingTimeMs: Date.now() - startTime },
    };
  }

  const reference = parseResult.reference;

  // Validate if requested
  if (options?.resolveContext) {
    // In a full implementation, this would fetch context
    // For now, we just mark that context is needed
    logger.debug({
      msg: 'TikTok Shop reference requires context resolution',
      referenceId: reference.referenceId,
    });
  }

  if (options?.resolvePromotions) {
    // In a full implementation, this would resolve promotions
    logger.debug({
      msg: 'TikTok Shop reference requires promotion resolution',
      referenceId: reference.referenceId,
    });
  }

  return {
    success: true,
    data: reference,
    metadata: {
      processingTimeMs: Date.now() - startTime,
      confidence: reference.confidence,
      variant: reference.variant,
    },
  };
}

/**
 * Build canonical TikTok Shop reference
 */
export function buildCanonicalTikTokShopReference(
  identifiers: {
    productId?: string;
    shopId?: string;
    itemId?: string;
    secItemId?: string;
  },
  referenceType: string
): TikTokShopCanonicalReference {
  const referenceId = buildReferenceId(identifiers, referenceType);

  return {
    referenceId,
    referenceType: referenceType as any,
    identifiers: {
      productId: identifiers.productId || '',
      shopId: identifiers.shopId,
      itemId: identifiers.itemId,
      secItemId: identifiers.secItemId,
    },
    normalizedUrl: '',
    canonicalUrl: buildCanonicalUrl(identifiers, referenceType),
    variant: 'full',
    confidence: calculateConfidence(identifiers),
    isValid: Boolean(identifiers.productId || identifiers.shopId),
    parseErrors: [],
  };
}

/**
 * Build reference fingerprint for caching/comparison
 */
export function buildTikTokShopReferenceFingerprint(
  reference: TikTokShopCanonicalReference
): string {
  const parts = [
    reference.referenceType,
    reference.identifiers.productId || '',
    reference.identifiers.shopId || '',
    reference.identifiers.itemId || '',
  ];

  return parts.filter(Boolean).join('|');
}

/**
 * Build support state for readiness evaluation
 */
export function buildTikTokShopReferenceSupportState(
  reference: TikTokShopCanonicalReference
): {
  isSupported: boolean;
  supportLevel: 'full' | 'partial' | 'unsupported';
  missing: string[];
  ready: boolean;
} {
  const missing: string[] = [];
  let supportLevel: 'full' | 'partial' | 'unsupported' = 'full';

  // Check if reference type is supported
  const supportedTypes = ['product_detail', 'product_detail_short', 'shop', 'video'];
  if (!supportedTypes.includes(reference.referenceType)) {
    missing.push(`Reference type '${reference.referenceType}' is not supported`);
    supportLevel = 'unsupported';
  }

  // Check if identifiers are present
  if (!reference.identifiers.productId && !reference.identifiers.shopId) {
    missing.push('No product or shop identifier found');
    supportLevel = 'partial';
  }

  // Check confidence
  if (reference.confidence < 0.7) {
    missing.push('Low confidence in reference parsing');
    supportLevel = 'partial';
  }

  return {
    isSupported: supportLevel !== 'unsupported',
    supportLevel,
    missing,
    ready: missing.length === 0,
  };
}

// ============================================================
// Helper Functions
// ============================================================

function buildReferenceId(
  identifiers: { productId?: string; shopId?: string; itemId?: string },
  referenceType: string
): string {
  const id = identifiers.productId || identifiers.itemId || identifiers.shopId || 'unknown';
  return `tiktok_${referenceType}_${id}`;
}

function buildCanonicalUrl(
  identifiers: { productId?: string; shopId?: string },
  referenceType: string
): string {
  if (referenceType.includes('product') && identifiers.productId) {
    return `https://shop.tiktok.com/shop/product/${identifiers.productId}`;
  }

  if (referenceType === 'shop' && identifiers.shopId) {
    return `https://shop.tiktok.com/shop/${identifiers.shopId}`;
  }

  return `https://tiktok.com`;
}

function calculateConfidence(
  identifiers: { productId?: string; shopId?: string }
): number {
  let confidence = 0.5;

  if (identifiers.productId) {
    confidence += 0.3;
  }

  if (identifiers.shopId) {
    confidence += 0.2;
  }

  return confidence;
}
