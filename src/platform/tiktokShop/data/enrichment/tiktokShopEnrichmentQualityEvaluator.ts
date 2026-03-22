/**
 * TikTok Shop Enrichment Quality Evaluator
 * Evaluates quality of enrichment results and detects gaps
 */

import type {
  TikTokShopNormalizedProductRecord,
  TikTokShopEnrichmentResult,
  TikTokShopEnrichmentGap,
  TikTokShopDataWarning,
} from '../types.js';
import { TikTokShopEnrichmentType } from '../types.js';
import { TIKTOK_SHOP_ENRICHMENT_QUALITY_THRESHOLDS, TIKTOK_SHOP_CONTEXT_FIELDS } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Evaluate enrichment quality for normalized records
 */
export function evaluateTikTokShopEnrichmentQuality(
  normalizedRecords: TikTokShopNormalizedProductRecord[]
): {
  qualityScore: number;
  coverageByType: Record<TikTokShopEnrichmentType, number>;
  gaps: TikTokShopEnrichmentGap[];
} {
  logger.info({ msg: 'Evaluating enrichment quality', count: normalizedRecords.length });

  const coverageByType: Record<TikTokShopEnrichmentType, number> = {
    [TikTokShopEnrichmentType.PRODUCT]: 0,
    [TikTokShopEnrichmentType.SELLER]: 0,
    [TikTokShopEnrichmentType.CATEGORY]: 0,
    [TikTokShopEnrichmentType.PRICE]: 0,
    [TikTokShopEnrichmentType.PROMOTION]: 0,
  };

  const allGaps: TikTokShopEnrichmentGap[] = [];

  for (const record of normalizedRecords) {
    const data = record.normalizedData;

    // Product coverage
    const productFields = TIKTOK_SHOP_CONTEXT_FIELDS.PRODUCT;
    const productPresent = productFields.filter((f) => data[f as keyof typeof data]).length;
    coverageByType[TikTokShopEnrichmentType.PRODUCT] += productPresent / productFields.length;

    // Seller coverage
    const sellerFields = TIKTOK_SHOP_CONTEXT_FIELDS.SELLER;
    const sellerPresent = sellerFields.filter((f) => data[f as keyof typeof data]).length;
    coverageByType[TikTokShopEnrichmentType.SELLER] += sellerPresent / sellerFields.length;

    // Category coverage
    const categoryFields = TIKTOK_SHOP_CONTEXT_FIELDS.CATEGORY;
    const categoryPresent = categoryFields.filter((f) => data[f as keyof typeof data]).length;
    coverageByType[TikTokShopEnrichmentType.CATEGORY] += categoryPresent / categoryFields.length;

    // Price coverage
    const priceFields = TIKTOK_SHOP_CONTEXT_FIELDS.PRICE;
    const pricePresent = priceFields.filter((f) => data[f as keyof typeof data]).length;
    coverageByType[TikTokShopEnrichmentType.PRICE] += pricePresent / priceFields.length;

    // Collect gaps for this record
    const recordGaps = detectEnrichmentGapsForRecord(data);
    allGaps.push(...recordGaps);
  }

  // Calculate average coverage
  const recordCount = normalizedRecords.length || 1;
  for (const type of Object.keys(coverageByType)) {
    coverageByType[type as TikTokShopEnrichmentType] /= recordCount;
  }

  // Calculate overall quality score
  const qualityScore = Object.values(coverageByType).reduce((sum, v) => sum + v, 0) / Object.keys(coverageByType).length;

  return {
    qualityScore,
    coverageByType,
    gaps: allGaps,
  };
}

/**
 * Detect enrichment gaps for a single record
 */
function detectEnrichmentGapsForRecord(
  data: TikTokShopNormalizedProductRecord['normalizedData']
): TikTokShopEnrichmentGap[] {
  const gaps: TikTokShopEnrichmentGap[] = [];

  // Product gaps
  const productFields = TIKTOK_SHOP_CONTEXT_FIELDS.PRODUCT;
  const missingProductFields = productFields.filter((f) => !data[f as keyof typeof data]);

  if (missingProductFields.length / productFields.length > 0.3) {
    gaps.push({
      field: missingProductFields.slice(0, 3).join(', '),
      enrichmentType: TikTokShopEnrichmentType.PRODUCT,
      severity: 'high',
      message: `Missing ${missingProductFields.length} product fields`,
    });
  }

  // Seller gaps
  const sellerFields = TIKTOK_SHOP_CONTEXT_FIELDS.SELLER;
  const missingSellerFields = sellerFields.filter((f) => !data[f as keyof typeof data]);

  if (missingSellerFields.length / sellerFields.length > 0.4) {
    gaps.push({
      field: missingSellerFields.slice(0, 3).join(', '),
      enrichmentType: TikTokShopEnrichmentType.SELLER,
      severity: 'medium',
      message: `Missing ${missingSellerFields.length} seller fields`,
    });
  }

  // Category gaps
  const categoryFields = TIKTOK_SHOP_CONTEXT_FIELDS.CATEGORY;
  const missingCategoryFields = categoryFields.filter((f) => !data[f as keyof typeof data]);

  if (missingCategoryFields.length / categoryFields.length > 0.5) {
    gaps.push({
      field: missingCategoryFields.join(', '),
      enrichmentType: TikTokShopEnrichmentType.CATEGORY,
      severity: 'medium',
      message: `Missing ${missingCategoryFields.length} category fields`,
    });
  }

  // Price gaps
  const priceFields = TIKTOK_SHOP_CONTEXT_FIELDS.PRICE;
  const missingPriceFields = priceFields.filter((f) => !data[f as keyof typeof data]);

  if (missingPriceFields.length / priceFields.length > 0.2) {
    gaps.push({
      field: missingPriceFields.join(', '),
      enrichmentType: TikTokShopEnrichmentType.PRICE,
      severity: 'critical',
      message: `Missing ${missingPriceFields.length} price fields`,
    });
  }

  return gaps;
}

/**
 * Detect all enrichment gaps
 */
export function detectTikTokShopEnrichmentGaps(
  normalizedRecords: TikTokShopNormalizedProductRecord[]
): TikTokShopEnrichmentGap[] {
  const qualityResult = evaluateTikTokShopEnrichmentQuality(normalizedRecords);
  return qualityResult.gaps;
}

/**
 * Build enrichment quality summary
 */
export function buildTikTokShopEnrichmentQualitySummary(
  normalizedRecords: TikTokShopNormalizedProductRecord[]
): {
  qualityScore: number;
  qualityLevel: 'excellent' | 'good' | 'acceptable' | 'poor';
  coverageByType: Record<TikTokShopEnrichmentType, number>;
  gaps: TikTokShopEnrichmentGap[];
  recommendations: string[];
} {
  const qualityResult = evaluateTikTokShopEnrichmentQuality(normalizedRecords);

  let qualityLevel: 'excellent' | 'good' | 'acceptable' | 'poor';
  if (qualityResult.qualityScore >= TIKTOK_SHOP_ENRICHMENT_QUALITY_THRESHOLDS.EXCELLENT_ENRICHMENT) {
    qualityLevel = 'excellent';
  } else if (qualityResult.qualityScore >= TIKTOK_SHOP_ENRICHMENT_QUALITY_THRESHOLDS.GOOD_ENRICHMENT) {
    qualityLevel = 'good';
  } else if (qualityResult.qualityScore >= TIKTOK_SHOP_ENRICHMENT_QUALITY_THRESHOLDS.ACCEPTABLE_ENRICHMENT) {
    qualityLevel = 'acceptable';
  } else {
    qualityLevel = 'poor';
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (qualityResult.coverageByType[TikTokShopEnrichmentType.PRODUCT] < 0.7) {
    recommendations.push('Improve product field coverage - add more product attributes');
  }

  if (qualityResult.coverageByType[TikTokShopEnrichmentType.SELLER] < 0.6) {
    recommendations.push('Improve seller context - add seller rating, follower count, verification status');
  }

  if (qualityResult.coverageByType[TikTokShopEnrichmentType.CATEGORY] < 0.5) {
    recommendations.push('Improve category context - add category hierarchy and paths');
  }

  if (qualityResult.coverageByType[TikTokShopEnrichmentType.PRICE] < 0.8) {
    recommendations.push('Improve price context - add original price, discount, currency');
  }

  if (qualityResult.qualityScore < TIKTOK_SHOP_ENRICHMENT_QUALITY_THRESHOLDS.GOOD_ENRICHMENT) {
    recommendations.push('Overall enrichment quality below threshold - review data source capabilities');
  }

  return {
    qualityScore: qualityResult.qualityScore,
    qualityLevel,
    coverageByType: qualityResult.coverageByType,
    gaps: qualityResult.gaps,
    recommendations,
  };
}

/**
 * Convert enrichment gaps to warnings
 */
export function enrichmentGapsToWarnings(gaps: TikTokShopEnrichmentGap[]): TikTokShopDataWarning[] {
  return gaps.map((gap, index) => ({
    warningId: `enrichment-gap-${index}`,
    warningType: 'field_missing' as const,
    severity: gap.severity === 'critical' || gap.severity === 'high' ? 'medium' as const : 'low' as const,
    message: gap.message,
    field: gap.field,
  }));
}
