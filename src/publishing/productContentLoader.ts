/**
 * Product Content Loader Module
 *
 * Loads products with their AI content for publishing
 */

import type { AffiliateProduct, AffiliateContent } from '../types/database.js';
import type { ProductWithContent, ProductContentFilters } from './types.js';
import { getAffiliateProductRepository } from '../db/repositories/affiliateProductRepository.js';
import { getAffiliateContentRepository } from '../db/repositories/affiliateContentRepository.js';
import { log, info, warn, error, debug } from '../utils/logger.js';

// ============================================
// Loader Functions
// ============================================

/**
 * Load a single product with its AI content for publishing
 */
export async function loadProductWithContentForPublishing(
  productId: string,
  options?: {
    requireContent?: boolean;
  }
): Promise<ProductWithContent | null> {
  const productRepo = getAffiliateProductRepository();
  const contentRepo = getAffiliateContentRepository();

  try {
    // Load product
    const product = await productRepo.findById(productId);
    if (!product) {
      warn({ productId }, 'Product not found');
      return null;
    }

    // Load latest content
    const content = await contentRepo.findLatestByProductId(productId);

    // Check if content is required
    if (options?.requireContent && !content) {
      warn({ productId }, 'Product has no AI content');
      return null;
    }

    return {
      product,
      content,
    };
  } catch (err) {
    error({ err, productId }, 'Error loading product with content');
    return null;
  }
}

/**
 * Load multiple products with their AI content for publishing
 */
export async function loadProductsWithContentForPublishing(
  filters: ProductContentFilters,
  options?: {
    requireContent?: boolean;
  }
): Promise<ProductWithContent[]> {
  const productRepo = getAffiliateProductRepository();
  const contentRepo = getAffiliateContentRepository();

  try {
    // Build query
    let products: AffiliateProduct[];

    // If specific product IDs provided
    if (filters.productIds && filters.productIds.length > 0) {
      products = [];
      for (const id of filters.productIds) {
        const product = await productRepo.findById(id);
        if (product) {
          products.push(product);
        }
      }
    } else {
      // Get latest products
      products = await productRepo.getLatestProducts(filters.limit ?? 50);
    }

    // Apply additional filters
    if (filters.platform) {
      products = products.filter((p) => p.platform === filters.platform);
    }

    if (filters.sourceType) {
      products = products.filter((p) => p.source_type === filters.sourceType);
    }

    // Load content for each product
    const results: ProductWithContent[] = [];

    for (const product of products) {
      const content = await contentRepo.findLatestByProductId(product.id);

      // Skip if content is required but not present
      if (options?.requireContent && !content) {
        continue;
      }

      // Apply content filters
      if (filters.minConfidenceScore && content) {
        if (!content.confidence_score || content.confidence_score < filters.minConfidenceScore) {
          continue;
        }
      }

      if (filters.hasAiContent !== undefined) {
        const hasContent = !!content;
        if (filters.hasAiContent !== hasContent) {
          continue;
        }
      }

      results.push({ product, content });
    }

    debug({ loaded: results.length }, 'Products with content loaded');
    return results;
  } catch (err) {
    error({ err, filters }, 'Error loading products with content');
    return [];
  }
}

/**
 * Load products that are ready for publishing
 * (have product URL, image, and AI content)
 */
export async function loadProductsReadyForPublishing(
  filters?: {
    platform?: string;
    sourceType?: string;
    sourceKeyword?: string;
    limit?: number;
  }
): Promise<ProductWithContent[]> {
  return loadProductsWithContentForPublishing(
    {
      limit: filters?.limit ?? 50,
      platform: filters?.platform,
      sourceType: filters?.sourceType,
      sourceKeyword: filters?.sourceKeyword,
      hasAiContent: true,
    },
    {
      requireContent: true,
    }
  );
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if a product has sufficient data for publishing
 */
export function isProductReadyForPublishing(productWithContent: ProductWithContent): {
  ready: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  const { product, content } = productWithContent;

  // Check product data
  if (!product.product_url) {
    missing.push('product_url');
  }

  if (!product.title) {
    missing.push('title');
  }

  // Check content
  if (!content) {
    missing.push('ai_content');
  } else {
    if (!content.social_caption && !content.review_content) {
      missing.push('content_text');
    }
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}

/**
 * Get summary of loaded products
 */
export function summarizeLoadedProducts(
  productsWithContent: ProductWithContent[]
): {
  total: number;
  withContent: number;
  withoutContent: number;
  readyForPublishing: number;
} {
  let withContent = 0;
  let withoutContent = 0;
  let readyForPublishing = 0;

  for (const pwc of productsWithContent) {
    if (pwc.content) {
      withContent++;
    } else {
      withoutContent++;
    }

    if (isProductReadyForPublishing(pwc).ready) {
      readyForPublishing++;
    }
  }

  return {
    total: productsWithContent.length,
    withContent,
    withoutContent,
    readyForPublishing,
  };
}
