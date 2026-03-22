/**
 * TikTok Shop Domain Integration
 */

import type { TikTokShopDetailExtractionResult } from '../types.js';
import { logger } from '../../../../utils/logger.js';

export async function buildTikTokShopCanonicalReferenceFromDiscovery(
  candidateKey: string
): Promise<string> {
  return candidateKey;
}

export async function buildTikTokShopDomainContextFromDetail(
  result: TikTokShopDetailExtractionResult
): Promise<Record<string, unknown>> {
  const fields = result.extractedFields;
  return {
    productContext: fields.productId ? {
      productId: fields.productId,
      title: fields.productTitle,
      description: fields.productDescription,
      url: fields.productUrl,
    } : undefined,
    sellerContext: fields.sellerId ? {
      sellerId: fields.sellerId,
      sellerName: fields.sellerName,
      rating: fields.sellerRating,
      verified: fields.sellerVerified,
    } : undefined,
    categoryContext: fields.categoryId ? {
      categoryId: fields.categoryId,
      categoryName: fields.categoryName,
      categoryPath: fields.categoryPath,
    } : undefined,
    priceContext: fields.price ? {
      price: fields.price,
      currency: fields.currency,
      originalPrice: fields.originalPrice,
      discountPercentage: fields.discountPercentage,
    } : undefined,
  };
}

export async function buildTikTokShopPromotionCompatibilityInputsFromDetail(
  result: TikTokShopDetailExtractionResult
): Promise<Record<string, unknown>[]> {
  if (!result.extractedFields.promotionSignals) {
    return [];
  }
  return result.extractedFields.promotionSignals.map(signal => ({
    promotionType: signal,
    source: 'detail_extraction',
  }));
}
