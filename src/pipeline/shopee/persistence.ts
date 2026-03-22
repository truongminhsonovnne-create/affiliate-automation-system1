/**
 * Shopee Pipeline - Persistence
 *
 * Handles product persistence with Supabase integration.
 */

import type {
  ShopeeCanonicalProduct,
  ShopeeRecordPersistenceResult,
  PipelineLogger,
} from './types.js';
import type { AffiliateProductRepository } from '../../repositories/affiliateProductRepository.js';
import { PIPELINE_PERSISTENCE } from './constants.js';

export interface AffiliateProductRecord {
  id?: string;
  platform: string;
  external_product_id: string;
  product_url: string;
  title: string;
  description?: string;
  short_description?: string;
  price_vnd?: number;
  original_price_vnd?: number;
  discount_percent?: number;
  currency: string;
  images: string[];
  seller_name?: string;
  seller_location?: string;
  rating?: number;
  total_ratings?: number;
  sold_count?: number;
  category_path?: string;
  badges?: string;
  source_type: string;
  source_keyword?: string;
  quality_score?: number;
  discovered_at?: string;
  detailed_at?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Map canonical product to affiliate product record
 */
export function mapCanonicalProductToAffiliateProductRecord(
  product: ShopeeCanonicalProduct,
  options: {
    qualityScore?: number;
  existingId?: string;
  logger?: PipelineLogger;
  } = {}
): AffiliateProductRecord {
  const { qualityScore, existingId, logger } = options;

  const now = new Date().toISOString();

  return {
    ...(existingId ? { id: existingId } : {}),
    platform: product.platform || 'shopee',
    external_product_id: product.externalProductId || '',
    product_url: product.productUrl || '',
    title: product.title || '',
    description: product.description || undefined,
    short_description: product.shortDescription || undefined,
    price_vnd: product.price?.priceVnd,
    original_price_vnd: product.price?.originalPriceVnd,
    discount_percent: product.price?.discountPercent,
    currency: product.price?.currency || 'VND',
    images: product.media?.images || [],
    seller_name: product.seller?.name,
    seller_location: product.seller?.location,
    rating: product.rating?.rating,
    total_ratings: product.rating?.totalRatings,
    sold_count: product.soldCount,
    category_path: product.categoryPath?.fullPath,
    badges: product.badges?.map(b => b.text).join(', ') || undefined,
    source_type: product.sourceType,
    source_keyword: product.sourceKeyword || undefined,
    quality_score: qualityScore,
    discovered_at: product.discoveredAt ? new Date(product.discoveredAt).toISOString() : undefined,
    detailed_at: product.detailedAt ? new Date(product.detailedAt).toISOString() : undefined,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Resolve upsert policy for product
 */
export function resolveShopeeUpsertPolicy(
  product: ShopeeCanonicalProduct,
  existingProduct: AffiliateProductRecord | null,
  options: {
    preferBetterQuality?: boolean;
    logger?: PipelineLogger;
  } = {}
): {
  action: 'insert' | 'update' | 'skip';
  reason: string;
} {
  const { preferBetterQuality = PIPELINE_PERSISTENCE.PREFER_BETTER_QUALITY, logger } = options;

  // If no existing product, insert
  if (!existingProduct) {
    return {
      action: 'insert',
      reason: 'New product',
    };
  }

  // If prefer better quality, compare quality scores
  if (preferBetterQuality && existingProduct.quality_score) {
    // We don't have quality score from canonical, assume new is better if quality gate passed
    const newQuality = 50; // Default quality from pipeline
    if (newQuality > existingProduct.quality_score) {
      return {
        action: 'update',
        reason: `New quality (${newQuality}) > existing (${existingProduct.quality_score})`,
      };
    } else {
      return {
        action: 'skip',
        reason: `Existing quality (${existingProduct.quality_score}) >= new (${newQuality})`,
      };
    }
  }

  // Default: update
  return {
    action: 'update',
    reason: 'Default update',
  };
}

/**
 * Persist Shopee products to database
 */
export async function persistShopeeProducts(
  repository: AffiliateProductRepository,
  products: ShopeeCanonicalProduct[],
  options: {
    /** Batch size */
    batchSize?: number;
    /** Quality scores map */
    qualityScores?: Map<string, number>;
    /** Custom logger */
    logger?: PipelineLogger;
  } = {}
): Promise<{
  ok: boolean;
  results: ShopeeRecordPersistenceResult[];
  counters: {
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  error?: string;
}> {
  const { batchSize = PIPELINE_PERSISTENCE.BATCH_SIZE, qualityScores = new Map(), logger } = options;

  if (products.length === 0) {
    return {
      ok: true,
      results: [],
      counters: { inserted: 0, updated: 0, skipped: 0, failed: 0 },
    };
  }

  logger?.info('Starting product persistence', { count: products.length });

  const results: ShopeeRecordPersistenceResult[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    for (const product of batch) {
      const result = await persistSingleShopeeProduct(repository, product, {
        qualityScore: qualityScores.get(product.externalProductId),
        logger,
      });

      results.push(result);

      if (result.operation === 'insert') inserted++;
      else if (result.operation === 'update') updated++;
      else if (result.operation === 'skip') skipped++;
      else if (result.operation === 'fail') failed++;
    }
  }

  logger?.info('Product persistence complete', {
    inserted,
    updated,
    skipped,
    failed,
  });

  return {
    ok: failed === 0,
    results,
    counters: { inserted, updated, skipped, failed },
  };
}

/**
 * Persist single Shopee product
 */
export async function persistSingleShopeeProduct(
  repository: AffiliateProductRepository,
  product: ShopeeCanonicalProduct,
  options: {
    /** Quality score */
    qualityScore?: number;
    /** Custom logger */
    logger?: PipelineLogger;
  } = {}
): Promise<ShopeeRecordPersistenceResult> {
  const { qualityScore, logger } = options;

  try {
    // Check if product exists
    const existing = await repository.findByPlatformAndUrl(
      product.platform,
      product.productUrl
    );

    // Resolve upsert policy
    const policy = resolveShopeeUpsertPolicy(product, existing, { logger });

    logger?.debug('Upsert policy resolved', {
      productId: product.externalProductId,
      action: policy.action,
      reason: policy.reason,
    });

    // Map to record
    const record = mapCanonicalProductToAffiliateProductRecord(product, {
      qualityScore,
      existingId: existing?.id,
      logger,
    });

    let result: ShopeeRecordPersistenceResult;

    if (policy.action === 'skip') {
      return {
        id: existing?.id,
        ok: true,
        operation: 'skip',
        reason: policy.reason,
      };
    }

    if (policy.action === 'insert') {
      const created = await repository.create(record);
      logger?.debug('Product inserted', { id: created.id, productId: product.externalProductId });
      return {
        id: created.id,
        ok: true,
        operation: 'insert',
      };
    }

    // Update
    if (existing?.id) {
      await repository.update(existing.id, record);
      logger?.debug('Product updated', { id: existing.id, productId: product.externalProductId });
      return {
        id: existing.id,
        ok: true,
        operation: 'update',
      };
    }

    // Fallback: create
    const created = await repository.create(record);
    return {
      id: created.id,
      ok: true,
      operation: 'insert',
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error('Failed to persist product', {
      productId: product.externalProductId,
      error: errorMessage,
    });

    return {
      ok: false,
      operation: 'fail',
      error: errorMessage,
    };
  }
}
