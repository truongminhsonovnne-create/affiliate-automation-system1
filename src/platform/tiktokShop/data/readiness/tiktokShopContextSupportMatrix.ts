/**
 * TikTok Shop Context Support Matrix
 * Builds support matrices for context fields and promotion types
 */

import type {
  TikTokShopContextSupportMatrix,
  TikTokShopContextFieldSupport,
  TikTokShopPromotionSupportMatrix,
  TikTokShopPromotionTypeSupport,
  TikTokShopPromotionConstraintSupport,
} from '../types.js';
import { TIKTOK_SHOP_CONTEXT_FIELDS, TIKTOK_SHOP_PROMOTION_SOURCE_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Build context support matrix
 */
export async function buildTikTokShopContextSupportMatrix(): Promise<TikTokShopContextSupportMatrix> {
  logger.info({ msg: 'Building context support matrix' });

  // Product context support
  const product = buildProductContextSupport();

  // Seller context support
  const seller = buildSellerContextSupport();

  // Category context support
  const category = buildCategoryContextSupport();

  // Price context support
  const price = buildPriceContextSupport();

  // Promotion context support
  const promotion = buildPromotionContextSupport();

  return {
    product,
    seller,
    category,
    price,
    promotion,
  };
}

/**
 * Build product context support
 */
function buildProductContextSupport(): Record<string, TikTokShopContextFieldSupport> {
  const support: Record<string, TikTokShopContextFieldSupport> = {};

  // Current support from available sources (manual sample)
  const currentFields = ['productId', 'productTitle', 'productDescription', 'productUrl', 'rating', 'reviewCount', 'salesCount', 'images', 'tags', 'stockStatus'];

  for (const field of TIKTOK_SHOP_CONTEXT_FIELDS.PRODUCT) {
    const isSupported = currentFields.includes(field);
    support[field] = {
      field,
      supported: isSupported,
      qualityScore: isSupported ? 0.7 : 0,
      sourceKeys: isSupported ? ['manual_sample'] : [],
      gaps: isSupported ? [] : ['Requires API or scraper implementation'],
    };
  }

  return support;
}

/**
 * Build seller context support
 */
function buildSellerContextSupport(): Record<string, TikTokShopContextFieldSupport> {
  const support: Record<string, TikTokShopContextFieldSupport> = {};

  // Current support from available sources (manual sample)
  const currentFields = ['sellerId', 'sellerName', 'sellerRating', 'sellerFollowerCount', 'sellerVerified'];

  for (const field of TIKTOK_SHOP_CONTEXT_FIELDS.SELLER) {
    const isSupported = currentFields.includes(field);
    support[field] = {
      field,
      supported: isSupported,
      qualityScore: isSupported ? 0.6 : 0,
      sourceKeys: isSupported ? ['manual_sample'] : [],
      gaps: isSupported ? [] : ['Requires API or scraper implementation'],
    };
  }

  return support;
}

/**
 * Build category context support
 */
function buildCategoryContextSupport(): Record<string, TikTokShopContextFieldSupport> {
  const support: Record<string, TikTokShopContextFieldSupport> = {};

  // Current support from available sources (manual sample)
  const currentFields = ['categoryId', 'categoryName', 'categoryPath'];

  for (const field of TIKTOK_SHOP_CONTEXT_FIELDS.CATEGORY) {
    const isSupported = currentFields.includes(field);
    support[field] = {
      field,
      supported: isSupported,
      qualityScore: isSupported ? 0.5 : 0,
      sourceKeys: isSupported ? ['manual_sample'] : [],
      gaps: isSupported ? [] : ['Requires API or scraper implementation'],
    };
  }

  return support;
}

/**
 * Build price context support
 */
function buildPriceContextSupport(): Record<string, TikTokShopContextFieldSupport> {
  const support: Record<string, TikTokShopContextFieldSupport> = {};

  // Current support from available sources (manual sample)
  const currentFields = ['price', 'currency', 'originalPrice', 'discountPercentage'];

  for (const field of TIKTOK_SHOP_CONTEXT_FIELDS.PRICE) {
    const isSupported = currentFields.includes(field);
    support[field] = {
      field,
      supported: isSupported,
      qualityScore: isSupported ? 0.8 : 0,
      sourceKeys: isSupported ? ['manual_sample'] : [],
      gaps: isSupported ? [] : ['Requires API or scraper implementation'],
    };
  }

  return support;
}

/**
 * Build promotion context support
 */
function buildPromotionContextSupport(): Record<string, TikTokShopContextFieldSupport> {
  const support: Record<string, TikTokShopContextFieldSupport> = {};

  // Current support (none - placeholder sources)
  const currentFields: string[] = [];

  for (const field of TIKTOK_SHOP_CONTEXT_FIELDS.PROMOTION) {
    const isSupported = currentFields.includes(field);
    support[field] = {
      field,
      supported: isSupported,
      qualityScore: 0,
      sourceKeys: [],
      gaps: ['Requires API implementation'],
    };
  }

  return support;
}

/**
 * Build promotion support matrix
 */
export async function buildTikTokShopPromotionSupportMatrix(): Promise<TikTokShopPromotionSupportMatrix> {
  logger.info({ msg: 'Building promotion support matrix' });

  // Promotion types
  const promotionTypes = buildPromotionTypeSupport();

  // Constraint support
  const constraintSupport = buildPromotionConstraintSupport();

  return {
    promotionTypes,
    constraintSupport,
  };
}

/**
 * Build promotion type support
 */
function buildPromotionTypeSupport(): TikTokShopPromotionTypeSupport[] {
  const supportedTypes = TIKTOK_SHOP_PROMOTION_SOURCE_CONFIG.SUPPORTED_PROMOTION_TYPES;

  // Current support - none for production (placeholder sources)
  return supportedTypes.map((type) => ({
    promotionType: type,
    supported: false, // No real source available yet
    qualityScore: 0,
    sourceKeys: [],
  }));
}

/**
 * Build promotion constraint support
 */
function buildPromotionConstraintSupport(): TikTokShopPromotionConstraintSupport[] {
  const constraints = [
    'minPurchaseAmount',
    'maxDiscountAmount',
    'applicableCategories',
    'applicableProducts',
    'stackable',
    'validFrom',
    'validUntil',
  ];

  // Current support - none for production
  return constraints.map((constraint) => ({
    constraint,
    supported: false, // No real source available yet
    sourceKeys: [],
  }));
}

/**
 * Build data coverage summary
 */
export function buildTikTokShopDataCoverageSummary(contextMatrix: TikTokShopContextSupportMatrix): {
  totalFields: number;
  supportedFields: number;
  unsupportedFields: number;
  coveragePercentage: number;
  byCategory: Record<string, { supported: number; total: number; percentage: number }>;
} {
  const categories = ['product', 'seller', 'category', 'price', 'promotion'] as const;
  const byCategory: Record<string, { supported: number; total: number; percentage: number }> = {};

  let totalFields = 0;
  let supportedFields = 0;

  for (const category of categories) {
    const fields = contextMatrix[category];
    const supported = Object.values(fields).filter((f) => f.supported).length;
    const total = Object.keys(fields).length;

    totalFields += total;
    supportedFields += supported;

    byCategory[category] = {
      supported,
      total,
      percentage: total > 0 ? (supported / total) * 100 : 0,
    };
  }

  return {
    totalFields,
    supportedFields,
    unsupportedFields: totalFields - supportedFields,
    coveragePercentage: totalFields > 0 ? (supportedFields / totalFields) * 100 : 0,
    byCategory,
  };
}
