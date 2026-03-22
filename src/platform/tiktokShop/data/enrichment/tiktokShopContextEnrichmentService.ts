/**
 * TikTok Shop Context Enrichment Service
 * Enriches normalized product data with context information
 */

import type {
  TikTokShopNormalizedProductRecord,
  TikTokShopEnrichmentResult,
  TikTokShopEnrichmentGap,
  TikTokShopContextFieldSupport,
  TikTokShopProductContextData,
  TikTokShopSellerContextData,
  TikTokShopCategoryContextData,
  TikTokShopPriceContextData,
} from '../types.js';
import { TikTokShopEnrichmentStatus, TikTokShopEnrichmentType } from '../types.js';
import { TIKTOK_SHOP_ENRICHMENT_QUALITY_THRESHOLDS, TIKTOK_SHOP_CONTEXT_FIELDS } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Enrich product context for normalized records
 */
export async function enrichTikTokShopProductContext(
  normalizedRecords: TikTokShopNormalizedProductRecord[]
): Promise<TikTokShopEnrichmentResult> {
  logger.info({ msg: 'Enriching product context', count: normalizedRecords.length });

  const gaps: TikTokShopEnrichmentGap[] = [];
  let enrichedCount = 0;

  for (const record of normalizedRecords) {
    const enriched = enrichSingleProductContext(record);
    if (enriched) {
      enrichedCount++;
    }

    // Collect gaps
    const recordGaps = detectProductContextGaps(record.normalizedData);
    gaps.push(...recordGaps);
  }

  const qualityScore = calculateEnrichmentQualityScore(normalizedRecords, enrichedCount);

  return {
    success: enrichedCount > 0,
    recordCount: normalizedRecords.length,
    enrichedCount,
    failedCount: normalizedRecords.length - enrichedCount,
    qualityScore,
    gaps,
  };
}

/**
 * Enrich seller context for normalized records
 */
export async function enrichTikTokShopSellerContext(
  normalizedRecords: TikTokShopNormalizedProductRecord[]
): Promise<TikTokShopEnrichmentResult> {
  logger.info({ msg: 'Enriching seller context', count: normalizedRecords.length });

  const gaps: TikTokShopEnrichmentGap[] = [];
  let enrichedCount = 0;

  for (const record of normalizedRecords) {
    const enriched = enrichSingleSellerContext(record);
    if (enriched) {
      enrichedCount++;
    }

    // Collect gaps
    const recordGaps = detectSellerContextGaps(record.normalizedData);
    gaps.push(...recordGaps);
  }

  const qualityScore = calculateSellerEnrichmentQualityScore(normalizedRecords, enrichedCount);

  return {
    success: enrichedCount > 0,
    recordCount: normalizedRecords.length,
    enrichedCount,
    failedCount: normalizedRecords.length - enrichedCount,
    qualityScore,
    gaps,
  };
}

/**
 * Enrich category context for normalized records
 */
export async function enrichTikTokShopCategoryContext(
  normalizedRecords: TikTokShopNormalizedProductRecord[]
): Promise<TikTokShopEnrichmentResult> {
  logger.info({ msg: 'Enriching category context', count: normalizedRecords.length });

  const gaps: TikTokShopEnrichmentGap[] = [];
  let enrichedCount = 0;

  for (const record of normalizedRecords) {
    const enriched = enrichSingleCategoryContext(record);
    if (enriched) {
      enrichedCount++;
    }

    // Collect gaps
    const recordGaps = detectCategoryContextGaps(record.normalizedData);
    gaps.push(...recordGaps);
  }

  const qualityScore = calculateCategoryEnrichmentQualityScore(normalizedRecords, enrichedCount);

  return {
    success: enrichedCount > 0,
    recordCount: normalizedRecords.length,
    enrichedCount,
    failedCount: normalizedRecords.length - enrichedCount,
    qualityScore,
    gaps,
  };
}

/**
 * Enrich price context for normalized records
 */
export async function enrichTikTokShopPriceContext(
  normalizedRecords: TikTokShopNormalizedProductRecord[]
): Promise<TikTokShopEnrichmentResult> {
  logger.info({ msg: 'Enriching price context', count: normalizedRecords.length });

  const gaps: TikTokShopEnrichmentGap[] = [];
  let enrichedCount = 0;

  for (const record of normalizedRecords) {
    const enriched = enrichSinglePriceContext(record);
    if (enriched) {
      enrichedCount++;
    }

    // Collect gaps
    const recordGaps = detectPriceContextGaps(record.normalizedData);
    gaps.push(...recordGaps);
  }

  const qualityScore = calculatePriceEnrichmentQualityScore(normalizedRecords, enrichedCount);

  return {
    success: enrichedCount > 0,
    recordCount: normalizedRecords.length,
    enrichedCount,
    failedCount: normalizedRecords.length - enrichedCount,
    qualityScore,
    gaps,
  };
}

/**
 * Enrich single product context
 */
function enrichSingleProductContext(record: TikTokShopNormalizedProductRecord): boolean {
  const data = record.normalizedData;

  // Check if we have minimum required fields
  const hasProductId = !!data.productId;
  const hasTitle = !!data.productTitle;
  const hasPrice = !!data.price;

  return hasProductId || hasTitle || hasPrice;
}

/**
 * Enrich single seller context
 */
function enrichSingleSellerContext(record: TikTokShopNormalizedProductRecord): boolean {
  const data = record.normalizedData;

  // Check if we have minimum seller fields
  const hasSellerId = !!data.sellerId;
  const hasSellerName = !!data.sellerName;

  return hasSellerId || hasSellerName;
}

/**
 * Enrich single category context
 */
function enrichSingleCategoryContext(record: TikTokShopNormalizedProductRecord): boolean {
  const data = record.normalizedData;

  // Check if we have category
  const hasCategoryId = !!data.categoryId;
  const hasCategoryName = !!data.categoryName;

  return hasCategoryId || hasCategoryName;
}

/**
 * Enrich single price context
 */
function enrichSinglePriceContext(record: TikTokShopNormalizedProductRecord): boolean {
  const data = record.normalizedData;

  // Check if we have price
  return !!data.price;
}

/**
 * Detect product context gaps
 */
function detectProductContextGaps(
  data: TikTokShopNormalizedProductRecord['normalizedData']
): TikTokShopEnrichmentGap[] {
  const gaps: TikTokShopEnrichmentGap[] = [];
  const requiredFields = TIKTOK_SHOP_CONTEXT_FIELDS.PRODUCT;
  const presentFields = requiredFields.filter((field) => data[field as keyof typeof data]);

  const coverage = presentFields.length / requiredFields.length;

  if (coverage < TIKTOK_SHOP_ENRICHMENT_QUALITY_THRESHOLDS.MIN_PRODUCT_FIELDS_COVERED) {
    const missingFields = requiredFields.filter((field) => !data[field as keyof typeof data]);

    gaps.push({
      field: missingFields.join(', '),
      enrichmentType: TikTokShopEnrichmentType.PRODUCT,
      severity: coverage < 0.3 ? 'critical' : coverage < 0.5 ? 'high' : 'medium',
      message: `Product context coverage is ${(coverage * 100).toFixed(0)}% - missing: ${missingFields.slice(0, 3).join(', ')}`,
    });
  }

  return gaps;
}

/**
 * Detect seller context gaps
 */
function detectSellerContextGaps(
  data: TikTokShopNormalizedProductRecord['normalizedData']
): TikTokShopEnrichmentGap[] {
  const gaps: TikTokShopEnrichmentGap[] = [];
  const requiredFields = TIKTOK_SHOP_CONTEXT_FIELDS.SELLER;
  const presentFields = requiredFields.filter((field) => data[field as keyof typeof data]);

  const coverage = presentFields.length / requiredFields.length;

  if (coverage < TIKTOK_SHOP_ENRICHMENT_QUALITY_THRESHOLDS.MIN_SELLER_FIELDS_COVERED) {
    const missingFields = requiredFields.filter((field) => !data[field as keyof typeof data]);

    gaps.push({
      field: missingFields.join(', '),
      enrichmentType: TikTokShopEnrichmentType.SELLER,
      severity: coverage < 0.2 ? 'critical' : coverage < 0.4 ? 'high' : 'medium',
      message: `Seller context coverage is ${(coverage * 100).toFixed(0)}% - missing: ${missingFields.slice(0, 3).join(', ')}`,
    });
  }

  return gaps;
}

/**
 * Detect category context gaps
 */
function detectCategoryContextGaps(
  data: TikTokShopNormalizedProductRecord['normalizedData']
): TikTokShopEnrichmentGap[] {
  const gaps: TikTokShopEnrichmentGap[] = [];
  const requiredFields = TIKTOK_SHOP_CONTEXT_FIELDS.CATEGORY;
  const presentFields = requiredFields.filter((field) => data[field as keyof typeof data]);

  const coverage = presentFields.length / requiredFields.length;

  if (coverage < TIKTOK_SHOP_ENRICHMENT_QUALITY_THRESHOLDS.MIN_CATEGORY_FIELDS_COVERED) {
    const missingFields = requiredFields.filter((field) => !data[field as keyof typeof data]);

    gaps.push({
      field: missingFields.join(', '),
      enrichmentType: TikTokShopEnrichmentType.CATEGORY,
      severity: coverage < 0.2 ? 'critical' : coverage < 0.3 ? 'high' : 'medium',
      message: `Category context coverage is ${(coverage * 100).toFixed(0)}% - missing: ${missingFields.join(', ')}`,
    });
  }

  return gaps;
}

/**
 * Detect price context gaps
 */
function detectPriceContextGaps(
  data: TikTokShopNormalizedProductRecord['normalizedData']
): TikTokShopEnrichmentGap[] {
  const gaps: TikTokShopEnrichmentGap[] = [];
  const requiredFields = TIKTOK_SHOP_CONTEXT_FIELDS.PRICE;
  const presentFields = requiredFields.filter((field) => data[field as keyof typeof data]);

  const coverage = presentFields.length / requiredFields.length;

  if (coverage < TIKTOK_SHOP_ENRICHMENT_QUALITY_THRESHOLDS.MIN_PRICE_FIELDS_COVERED) {
    const missingFields = requiredFields.filter((field) => !data[field as keyof typeof data]);

    gaps.push({
      field: missingFields.join(', '),
      enrichmentType: TikTokShopEnrichmentType.PRICE,
      severity: coverage < 0.5 ? 'critical' : coverage < 0.7 ? 'high' : 'medium',
      message: `Price context coverage is ${(coverage * 100).toFixed(0)}% - missing: ${missingFields.join(', ')}`,
    });
  }

  return gaps;
}

/**
 * Calculate enrichment quality score
 */
function calculateEnrichmentQualityScore(
  records: TikTokShopNormalizedProductRecord[],
  enrichedCount: number
): number {
  if (records.length === 0) return 0;

  let totalScore = 0;

  for (const record of records) {
    const data = record.normalizedData;
    let recordScore = 0;
    let maxScore = 0;

    // Product fields
    const productFields = TIKTOK_SHOP_CONTEXT_FIELDS.PRODUCT;
    for (const field of productFields) {
      maxScore += 1;
      if (data[field as keyof typeof data]) {
        recordScore += 1;
      }
    }

    totalScore += recordScore / maxScore;
  }

  return totalScore / records.length;
}

/**
 * Calculate seller enrichment quality score
 */
function calculateSellerEnrichmentQualityScore(
  records: TikTokShopNormalizedProductRecord[],
  enrichedCount: number
): number {
  if (records.length === 0) return 0;

  let totalScore = 0;

  for (const record of records) {
    const data = record.normalizedData;
    let recordScore = 0;
    let maxScore = 0;

    const sellerFields = TIKTOK_SHOP_CONTEXT_FIELDS.SELLER;
    for (const field of sellerFields) {
      maxScore += 1;
      if (data[field as keyof typeof data]) {
        recordScore += 1;
      }
    }

    totalScore += maxScore > 0 ? recordScore / maxScore : 0;
  }

  return totalScore / records.length;
}

/**
 * Calculate category enrichment quality score
 */
function calculateCategoryEnrichmentQualityScore(
  records: TikTokShopNormalizedProductRecord[],
  enrichedCount: number
): number {
  if (records.length === 0) return 0;

  let totalScore = 0;

  for (const record of records) {
    const data = record.normalizedData;
    let recordScore = 0;
    let maxScore = 0;

    const categoryFields = TIKTOK_SHOP_CONTEXT_FIELDS.CATEGORY;
    for (const field of categoryFields) {
      maxScore += 1;
      if (data[field as keyof typeof data]) {
        recordScore += 1;
      }
    }

    totalScore += maxScore > 0 ? recordScore / maxScore : 0;
  }

  return totalScore / records.length;
}

/**
 * Calculate price enrichment quality score
 */
function calculatePriceEnrichmentQualityScore(
  records: TikTokShopNormalizedProductRecord[],
  enrichedCount: number
): number {
  if (records.length === 0) return 0;

  let totalScore = 0;

  for (const record of records) {
    const data = record.normalizedData;
    let recordScore = 0;
    let maxScore = 0;

    const priceFields = TIKTOK_SHOP_CONTEXT_FIELDS.PRICE;
    for (const field of priceFields) {
      maxScore += 1;
      if (data[field as keyof typeof data]) {
        recordScore += 1;
      }
    }

    totalScore += maxScore > 0 ? recordScore / maxScore : 0;
  }

  return totalScore / records.length;
}

/**
 * Build enrichment summary
 */
export function buildTikTokShopEnrichmentSummary(
  productResult: TikTokShopEnrichmentResult,
  sellerResult: TikTokShopEnrichmentResult,
  categoryResult: TikTokShopEnrichmentResult,
  priceResult: TikTokShopEnrichmentResult
): {
  totalRecords: number;
  enrichedRecords: number;
  averageQualityScore: number;
  gaps: TikTokShopEnrichmentGap[];
  byType: Record<TikTokShopEnrichmentType, TikTokShopEnrichmentResult>;
} {
  const allGaps = [
    ...productResult.gaps,
    ...sellerResult.gaps,
    ...categoryResult.gaps,
    ...priceResult.gaps,
  ];

  const totalRecords = productResult.recordCount;
  const enrichedRecords =
    productResult.enrichedCount +
    sellerResult.enrichedCount +
    categoryResult.enrichedCount +
    priceResult.enrichedCount;

  const averageQualityScore =
    (productResult.qualityScore +
      sellerResult.qualityScore +
      categoryResult.qualityScore +
      priceResult.qualityScore) /
    4;

  return {
    totalRecords,
    enrichedRecords,
    averageQualityScore,
    gaps: allGaps,
    byType: {
      [TikTokShopEnrichmentType.PRODUCT]: productResult,
      [TikTokShopEnrichmentType.SELLER]: sellerResult,
      [TikTokShopEnrichmentType.CATEGORY]: categoryResult,
      [TikTokShopEnrichmentType.PRICE]: priceResult,
    },
  };
}

/**
 * Map normalized data to TikTok domain context
 */
export function mapToTikTokDomainContext(
  normalizedData: TikTokShopNormalizedProductRecord['normalizedData']
): {
  product?: TikTokShopProductContextData;
  seller?: TikTokShopSellerContextData;
  category?: TikTokShopCategoryContextData;
  price?: TikTokShopPriceContextData;
} {
  return {
    product: normalizedData.productId
      ? {
          productId: normalizedData.productId,
          title: normalizedData.productTitle || '',
          description: normalizedData.productDescription,
          url: normalizedData.productUrl,
          rating: normalizedData.rating,
          reviewCount: normalizedData.reviewCount,
          salesCount: normalizedData.salesCount,
          images: normalizedData.images,
        }
      : undefined,
    seller: normalizedData.sellerId
      ? {
          sellerId: normalizedData.sellerId,
          sellerName: normalizedData.sellerName || '',
          rating: normalizedData.sellerRating,
          followerCount: normalizedData.sellerFollowerCount,
          verified: normalizedData.sellerVerified || false,
        }
      : undefined,
    category: normalizedData.categoryId
      ? {
          categoryId: normalizedData.categoryId,
          categoryName: normalizedData.categoryName || '',
          categoryPath: normalizedData.categoryPath,
        }
      : undefined,
    price: normalizedData.price
      ? {
          price: normalizedData.price,
          currency: normalizedData.currency || 'USD',
          originalPrice: normalizedData.originalPrice,
          discountPercentage: normalizedData.discountPercentage,
        }
      : undefined,
  };
}
