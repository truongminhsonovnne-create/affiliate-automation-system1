/**
 * AI Enrichment Pipeline - Product Loader
 *
 * Loads products from affiliate_products for AI enrichment.
 */

import type { AffiliateProductRepository } from '../../repositories/affiliateProductRepository.js';
import type { AffiliateProductInput, AiEnrichmentLogger } from './types.js';

/**
 * Product loader options
 */
export interface ProductLoaderOptions {
  /** Custom logger */
  logger?: AiEnrichmentLogger;
}

/**
 * Load affiliate product for enrichment
 */
export async function loadAffiliateProductForEnrichment(
  productId: string,
  repository: AffiliateProductRepository,
  options: ProductLoaderOptions = {}
): Promise<AffiliateProductInput | null> {
  const { logger } = options;

  try {
    const product = await repository.findById(productId);

    if (!product) {
      logger?.debug('Product not found', { productId });
      return null;
    }

    return mapToAffiliateProductInput(product);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error('Failed to load product', { productId, error: errorMessage });
    throw error;
  }
}

/**
 * Load multiple affiliate products for enrichment
 */
export async function loadAffiliateProductsForEnrichment(
  repository: AffiliateProductRepository,
  filters: {
    /** Specific product IDs */
    productIds?: string[];

    /** Latest N products */
    latestCount?: number;

    /** Filter by source type */
    sourceType?: string;

    /** Filter by keyword */
    keyword?: string;

    /** Minimum quality score */
    minQualityScore?: number;

    /** Skip if already has content */
    skipWithContent?: boolean;

    /** Maximum products to load */
    limit?: number;
  },
  options: ProductLoaderOptions = {}
): Promise<AffiliateProductInput[]> {
  const { logger } = options;

  try {
    let products;

    // Load by specific IDs
    if (filters.productIds && filters.productIds.length > 0) {
      const results = await repository.findByIds(filters.productIds);
      products = results.filter(p => p !== null);
    }
    // Load latest products
    else if (filters.latestCount && filters.latestCount > 0) {
      products = await repository.findLatest(filters.latestCount, {
        sourceType: filters.sourceType,
        minQualityScore: filters.minQualityScore,
      });
    }
    // Load by filters
    else {
      products = await repository.findForEnrichment({
        sourceType: filters.sourceType,
        keyword: filters.keyword,
        minQualityScore: filters.minQualityScore,
        limit: filters.limit || 50,
      });
    }

    logger?.debug('Products loaded', { count: products.length });

    // Map to input format
    return products.map(p => mapToAffiliateProductInput(p));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error('Failed to load products', { error: errorMessage });
    throw error;
  }
}

/**
 * Map repository product to input format
 */
function mapToAffiliateProductInput(
  product: Record<string, unknown>
): AffiliateProductInput {
  return {
    id: String(product.id || ''),
    title: String(product.title || ''),
    description: product.description ? String(product.description) : undefined,
    shortDescription: product.short_description ? String(product.short_description) : undefined,
    priceVnd: product.price_vnd ? Number(product.price_vnd) : undefined,
    originalPriceVnd: product.original_price_vnd ? Number(product.original_price_vnd) : undefined,
    discountPercent: product.discount_percent ? Number(product.discount_percent) : undefined,
    productUrl: String(product.product_url || ''),
    images: Array.isArray(product.images) ? product.images.map(String) : [],
    sellerName: product.seller_name ? String(product.seller_name) : undefined,
    rating: product.rating ? Number(product.rating) : undefined,
    totalRatings: product.total_ratings ? Number(product.total_ratings) : undefined,
    soldCount: product.sold_count ? Number(product.sold_count) : undefined,
    categoryPath: product.category_path ? String(product.category_path) : undefined,
    sourceType: String(product.source_type || 'unknown'),
    sourceKeyword: product.source_keyword ? String(product.source_keyword) : undefined,
  };
}

/**
 * Check if product has existing AI content
 */
export async function hasExistingAiContent(
  productId: string,
  repository: {
    findContentByProductId: (productId: string) => Promise<Array<Record<string, unknown>>>;
  },
  options: ProductLoaderOptions = {}
): Promise<boolean> {
  const { logger } = options;

  try {
    const contents = await repository.findContentByProductId(productId);
    const hasContent = contents.length > 0;

    logger?.debug('Checked existing content', {
      productId,
      hasContent,
      count: contents.length,
    });

    return hasContent;
  } catch (error) {
    // If check fails, assume no content to be safe
    logger?.warn('Failed to check existing content', {
      productId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
