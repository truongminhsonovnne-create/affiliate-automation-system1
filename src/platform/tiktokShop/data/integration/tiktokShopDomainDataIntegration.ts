/**
 * TikTok Shop Domain Data Integration
 * Integrates data acquisition with TikTok domain layer
 */

import type { TikTokShopNormalizedProductRecord, TikTokShopDomainDataContext } from '../types.js';
import { enrichTikTokShopProductContext } from '../enrichment/tiktokShopContextEnrichmentService.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Build domain data context from normalized data
 */
export async function buildTikTokShopDomainDataContext(
  normalizedRecords: TikTokShopNormalizedProductRecord[]
): Promise<TikTokShopDomainDataContext[]> {
  logger.info({ msg: 'Building domain data context', count: normalizedRecords.length });

  const contexts: TikTokShopDomainDataContext[] = [];

  for (const record of normalizedRecords) {
    const context = mapNormalizedDataToTikTokDomainContext(record);
    if (context) {
      contexts.push(context);
    }
  }

  return contexts;
}

/**
 * Map normalized data to TikTok domain context
 */
export function mapNormalizedDataToTikTokDomainContext(
  normalizedRecord: TikTokShopNormalizedProductRecord
): TikTokShopDomainDataContext | null {
  const data = normalizedRecord.normalizedData;

  if (!data.productId && !data.productTitle) {
    return null;
  }

  return {
    canonicalReferenceKey: normalizedRecord.canonicalReferenceKey,
    productContext: data.productId
      ? {
          productId: data.productId,
          title: data.productTitle || '',
          description: data.productDescription,
          url: data.productUrl,
          rating: data.rating,
          reviewCount: data.reviewCount,
          salesCount: data.salesCount,
          images: data.images,
        }
      : undefined,
    sellerContext: data.sellerId
      ? {
          sellerId: data.sellerId,
          sellerName: data.sellerName || '',
          rating: data.sellerRating,
          followerCount: data.sellerFollowerCount,
          verified: data.sellerVerified || false,
        }
      : undefined,
    categoryContext: data.categoryId
      ? {
          categoryId: data.categoryId,
          categoryName: data.categoryName || '',
          categoryPath: data.categoryPath,
        }
      : undefined,
    priceContext: data.price
      ? {
          price: data.price,
          currency: data.currency || 'USD',
          originalPrice: data.originalPrice,
          discountPercentage: data.discountPercentage,
        }
      : undefined,
  };
}

/**
 * Build reference to context flow
 */
export function buildTikTokShopReferenceToContextFlow(
  contexts: TikTokShopDomainDataContext[]
): Map<string, TikTokShopDomainDataContext> {
  const flow = new Map<string, TikTokShopDomainDataContext>();

  for (const context of contexts) {
    flow.set(context.canonicalReferenceKey, context);
  }

  return flow;
}

/**
 * Enrich domain context with additional data
 */
export async function enrichTikTokShopDomainContext(
  contexts: TikTokShopDomainDataContext[]
): Promise<TikTokShopDomainDataContext[]> {
  // Convert to normalized records for enrichment
  const normalizedRecords: TikTokShopNormalizedProductRecord[] = contexts.map((context) => ({
    canonicalReferenceKey: context.canonicalReferenceKey,
    normalizedData: {
      productId: context.productContext?.productId,
      productTitle: context.productContext?.title,
      productDescription: context.productContext?.description,
      productUrl: context.productContext?.url,
      sellerId: context.sellerContext?.sellerId,
      sellerName: context.sellerContext?.sellerName,
      sellerRating: context.sellerContext?.rating,
      sellerFollowerCount: context.sellerContext?.followerCount,
      sellerVerified: context.sellerContext?.verified,
      categoryId: context.categoryContext?.categoryId,
      categoryName: context.categoryContext?.categoryName,
      categoryPath: context.categoryContext?.categoryPath,
      price: context.priceContext?.price,
      currency: context.priceContext?.currency,
      originalPrice: context.priceContext?.originalPrice,
      discountPercentage: context.priceContext?.discountPercentage,
    },
    normalizationStatus: 'normalized' as any,
  }));

  // Run enrichment
  const enrichmentResult = await enrichTikTokShopProductContext(normalizedRecords);

  // Map back to domain context
  return contexts.map((context, index) => ({
    ...context,
    enrichmentQuality: enrichmentResult.qualityScore,
  }));
}
