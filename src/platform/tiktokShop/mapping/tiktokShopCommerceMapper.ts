/**
 * TikTok Shop Commerce Mapper
 *
 * Maps TikTok Shop domain to platform-neutral commerce contracts.
 */

import type { CommerceProductReference } from '../../contracts/productReference.js';
import type { CommerceProductContext } from '../../contracts/productContext.js';
import type { CommercePromotion } from '../../contracts/promotion.js';

/**
 * Map TikTok reference to commerce reference
 */
export function mapTikTokReferenceToCommerceReference(
  tiktokReference: { referenceId: string; identifiers: Record<string, string>; canonicalUrl: string }
): CommerceProductReference {
  return {
    referenceId: tiktokReference.referenceId,
    platform: 'tiktok_shop',
    identifiers: [{
      platform: 'tiktok_shop',
      productId: tiktokReference.identifiers.productId || '',
      productUrl: tiktokReference.canonicalUrl,
    }],
    normalizedForm: tiktokReference.canonicalUrl,
    referenceType: 'url',
  };
}

/**
 * Map TikTok context to commerce context
 */
export function mapTikTokContextToCommerceContext(
  tiktokContext: {
    productId: string; title: string; description?: string;
    seller: { shopId: string; shopName: string; shopType: string; rating?: number };
    category: { categoryId: string; categoryName: string };
    price: { currentPrice: number; originalPrice?: number; currency: string };
    images: { url: string; type: string }[];
    inventory: { stockLevel: number; stockStatus: string };
  }
): CommerceProductContext {
  return {
    productId: tiktokContext.productId,
    platform: 'tiktok_shop',
    title: tiktokContext.title,
    description: tiktokContext.description,
    seller: {
      sellerId: tiktokContext.seller.shopId,
      sellerName: tiktokContext.seller.shopName,
      sellerType: tiktokContext.seller.shopType as any,
      rating: tiktokContext.seller.rating,
      isVerified: tiktokContext.seller.shopType === 'verified',
    },
    category: {
      categoryId: tiktokContext.category.categoryId,
      categoryName: tiktokContext.category.categoryName,
      breadcrumbs: [],
    },
    price: {
      currentPrice: tiktokContext.price.currentPrice,
      originalPrice: tiktokContext.price.originalPrice,
      currency: tiktokContext.price.currency,
      priceType: 'fixed',
    },
    images: tiktokContext.images.map(img => ({ url: img.url, type: img.type as any })),
    inventory: {
      stockLevel: tiktokContext.inventory.stockLevel,
      stockStatus: tiktokContext.inventory.stockStatus as any,
    },
    metadata: {},
    fetchedAt: new Date(),
  };
}

/**
 * Map TikTok promotion to commerce promotion
 */
export function mapTikTokPromotionToCommercePromotion(
  tiktokPromotion: {
    promotionId: string; promotionCode?: string; title: string;
    promotionType: string; scope: string;
    benefit: { discountType: string; discountValue: number; maxDiscount?: number };
    eligibility: { eligibilityType: string; constraints: { type: string; operator: string; value: unknown }[] };
    startDate: Date; endDate: Date; isStackable: boolean;
  }
): CommercePromotion {
  return {
    promotionId: tiktokPromotion.promotionId,
    platform: 'tiktok_shop',
    promotionCode: tiktokPromotion.promotionCode,
    promotionType: tiktokPromotion.promotionType as any,
    title: tiktokPromotion.title,
    scope: tiktokPromotion.scope as any,
    benefit: {
      discountType: tiktokPromotion.benefit.discountType as any,
      discountValue: tiktokPromotion.benefit.discountValue,
      maxDiscount: tiktokPromotion.benefit.maxDiscount,
    },
    eligibility: {
      eligibilityType: tiktokPromotion.eligibility.eligibilityType as any,
      conditions: tiktokPromotion.eligibility.constraints.map(c => ({
        type: c.type as any,
        operator: c.operator as any,
        value: c.value,
      })),
    },
    startDate: tiktokPromotion.startDate,
    endDate: tiktokPromotion.endDate,
    isStackable: tiktokPromotion.isStackable,
    createdAt: new Date(),
  };
}
