/**
 * Product Context Loader
 *
 * Loads product context for voucher matching.
 */

import {
  ProductReference,
  CanonicalShopeeProductReference,
  GenericProductReference,
  ProductContext,
  ProductContextSummary,
  SupportedVoucherPlatform,
} from '../types';
import {
  MIN_PRODUCT_CONTEXT_CONFIDENCE,
  INCLUDE_PRICE_IN_CONTEXT,
  INCLUDE_IMAGE_IN_CONTEXT,
} from '../constants';

/**
 * Product context loader options
 */
export interface ProductContextLoaderOptions {
  includePrice?: boolean;
  includeImage?: boolean;
  enrichFromCatalog?: boolean;
  enrichFromCrawler?: boolean;
  confidenceThreshold?: number;
}

/**
 * Load product context from product reference
 */
export async function loadProductContextFromReference(
  reference: ProductReference,
  options?: ProductContextLoaderOptions
): Promise<ProductContext> {
  const opts = {
    includePrice: options?.includePrice ?? INCLUDE_PRICE_IN_CONTEXT,
    includeImage: options?.includeImage ?? INCLUDE_IMAGE_IN_CONTEXT,
    enrichFromCatalog: options?.enrichFromCatalog ?? false,
    enrichFromCrawler: options?.enrichFromCrawler ?? false,
    confidenceThreshold: options?.confidenceThreshold ?? MIN_PRODUCT_CONTEXT_CONFIDENCE,
  };

  // Start with URL-derived context
  const baseContext = buildBaseProductContext(reference);

  // Try to enrich from available sources
  let enrichedContext = baseContext;
  let contextSource: ProductContext['contextSource'] = 'url';

  if (opts.enrichFromCatalog) {
    const catalogEnriched = await enrichFromCatalog(reference, enrichedContext);
    if (catalogEnriched) {
      enrichedContext = catalogEnriched;
      contextSource = 'catalog';
    }
  }

  if (opts.enrichFromCrawler) {
    const crawlerEnriched = await enrichFromCrawler(reference, enrichedContext);
    if (crawlerEnriched) {
      enrichedContext = crawlerEnriched;
      contextSource = 'crawler';
    }
  }

  // Apply context source
  enrichedContext.contextSource = contextSource;

  // Calculate final confidence
  enrichedContext.confidence = calculateContextConfidence(enrichedContext, opts.confidenceThreshold);

  return enrichedContext;
}

/**
 * Build base product context from reference
 */
function buildBaseProductContext(reference: ProductReference): ProductContext {
  const platform = reference.platform;

  if (platform === 'shopee') {
    const shopeeRef = reference as CanonicalShopeeProductReference;
    return {
      platform: 'shopee',
      productReference: reference,
      productId: shopeeRef.itemId || null,
      shopId: shopeeRef.shopId,
      shopName: shopeeRef.shopName,
      categoryId: shopeeRef.categoryId,
      categoryPath: shopeeRef.categoryPath || [],
      title: shopeeRef.title,
      price: shopeeRef.price,
      originalPrice: shopeeRef.originalPrice,
      imageUrl: shopeeRef.imageUrl,
      normalizedUrl: shopeeRef.normalizedUrl,
      sourceUrl: shopeeRef.normalizedUrl,
      confidence: 0.5,
      contextSource: 'url',
      extractedHints: [],
      metadata: {},
      loadedAt: new Date(),
    };
  }

  // Generic platform
  const genericRef = reference as GenericProductReference;
  return {
    platform,
    productReference: reference,
    productId: genericRef.productId,
    shopId: genericRef.shopId,
    shopName: null,
    categoryId: null,
    categoryPath: [],
    title: null,
    price: null,
    originalPrice: null,
    imageUrl: null,
    normalizedUrl: genericRef.normalizedUrl,
    sourceUrl: genericRef.normalizedUrl,
    confidence: 0.3,
    contextSource: 'url',
    extractedHints: genericRef.keywords,
    metadata: {},
    loadedAt: new Date(),
  };
}

/**
 * Enrich product context from catalog data
 */
async function enrichFromCatalog(
  reference: ProductReference,
  context: ProductContext
): Promise<ProductContext | null> {
  // Placeholder: In production, this would query catalog database
  // for known products matching the reference
  return null;
}

/**
 * Enrich product context from crawler data
 */
async function enrichFromCrawler(
  reference: ProductReference,
  context: ProductContext
): Promise<ProductContext | null> {
  // Placeholder: In production, this would call the crawler service
  // to get fresh product data
  return null;
}

/**
 * Calculate context confidence score
 */
function calculateContextConfidence(
  context: ProductContext,
  threshold: number
): number {
  let confidence = 0.3; // Base confidence

  // Product ID presence
  if (context.productId) {
    confidence += 0.2;
  }

  // Shop ID presence
  if (context.shopId) {
    confidence += 0.15;
  }

  // Category presence
  if (context.categoryPath && context.categoryPath.length > 0) {
    confidence += 0.15;
  }

  // Price presence
  if (context.price !== null) {
    confidence += 0.1;
  }

  // Title presence
  if (context.title) {
    confidence += 0.1;
  }

  // Shop name presence
  if (context.shopName) {
    confidence += 0.1;
  }

  // Image presence
  if (context.imageUrl) {
    confidence += 0.1;
  }

  // Context source boost
  if (context.contextSource === 'crawler') {
    confidence += 0.1;
  } else if (context.contextSource === 'catalog') {
    confidence += 0.05;
  }

  return Math.min(1, confidence);
}

/**
 * Enrich product context from additional data
 */
export async function enrichProductContextFromCatalogOrCrawlerData(
  reference: ProductReference,
  additionalData: {
    title?: string;
    price?: number;
    originalPrice?: number;
    shopName?: string;
    categoryPath?: string[];
    imageUrl?: string;
  }
): Promise<ProductContext> {
  const baseContext = buildBaseProductContext(reference);

  // Apply enrichment data
  if (additionalData.title) {
    baseContext.title = additionalData.title;
  }
  if (additionalData.price !== undefined) {
    baseContext.price = additionalData.price;
  }
  if (additionalData.originalPrice !== undefined) {
    baseContext.originalPrice = additionalData.originalPrice;
  }
  if (additionalData.shopName) {
    baseContext.shopName = additionalData.shopName;
  }
  if (additionalData.categoryPath) {
    baseContext.categoryPath = additionalData.categoryPath;
  }
  if (additionalData.imageUrl) {
    baseContext.imageUrl = additionalData.imageUrl;
  }

  // Recalculate confidence
  baseContext.confidence = calculateContextConfidence(baseContext, MIN_PRODUCT_CONTEXT_CONFIDENCE);

  return baseContext;
}

/**
 * Build product context summary
 */
export function buildProductContextSummary(context: ProductContext): ProductContextSummary {
  return {
    platform: context.platform,
    hasProductId: !!context.productId,
    hasShopId: !!context.shopId,
    hasCategory: context.categoryPath.length > 0,
    price: context.price,
    confidence: context.confidence,
    source: context.contextSource,
  };
}

/**
 * Check if product context meets minimum requirements
 */
export function isProductContextSufficient(
  context: ProductContext,
  options?: { minConfidence?: number }
): boolean {
  const minConfidence = options?.minConfidence ?? MIN_PRODUCT_CONTEXT_CONFIDENCE;

  return context.confidence >= minConfidence;
}

/**
 * Get product context identifiers for matching
 */
export function getProductContextIdentifiers(context: ProductContext): {
  productIds: string[];
  shopIds: string[];
  categoryIds: string[];
} {
  const productIds: string[] = [];
  const shopIds: string[] = [];
  const categoryIds: string[] = [];

  if (context.productId) {
    productIds.push(context.productId);
  }

  if (context.shopId) {
    shopIds.push(context.shopId);
  }

  if (context.categoryId) {
    categoryIds.push(context.categoryId);
  }

  // Add category path
  if (context.categoryPath) {
    categoryIds.push(...context.categoryPath);
  }

  return { productIds, shopIds, categoryIds };
}
