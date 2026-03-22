/**
 * TikTok Shop Extraction Quality Evaluator
 * Evaluates quality of detail extraction
 */

import type { TikTokShopExtractedDetailFields, TikTokShopExtractionQuality, TikTokShopExtractionGap } from '../types.js';
import { TikTokShopExtractionQualityStatus } from '../types.js';
import { TIKTOK_SHOP_EXTRACTION_QUALITY_THRESHOLDS } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Evaluate extraction quality
 */
export function evaluateTikTokShopExtractionQuality(
  fields: TikTokShopExtractedDetailFields
): TikTokShopExtractionQuality {
  const gaps: TikTokShopExtractionGap[] = [];

  // Evaluate each field category
  const titleScore = evaluateTitleCoverage(fields);
  const sellerScore = evaluateSellerCoverage(fields);
  const priceScore = evaluatePriceCoverage(fields);
  const categoryScore = evaluateCategoryCoverage(fields);
  const promotionScore = evaluatePromotionCoverage(fields);
  const mediaScore = evaluateMediaCoverage(fields);
  const evidenceScore = evaluateEvidenceCompleteness(fields);

  // Check for gaps
  if (titleScore < TIKTOK_SHOP_EXTRACTION_QUALITY_THRESHOLDS.TITLE_COVERAGE) {
    gaps.push({
      field: 'title',
      severity: titleScore === 0 ? 'critical' : 'high',
      message: `Title coverage is ${(titleScore * 100).toFixed(0)}% - below threshold`,
    });
  }

  if (sellerScore < TIKTOK_SHOP_EXTRACTION_QUALITY_THRESHOLDS.SELLER_COVERAGE) {
    gaps.push({
      field: 'seller',
      severity: sellerScore === 0 ? 'high' : 'medium',
      message: `Seller coverage is ${(sellerScore * 100).toFixed(0)}% - below threshold`,
    });
  }

  if (priceScore < TIKTOK_SHOP_EXTRACTION_QUALITY_THRESHOLDS.PRICE_COVERAGE) {
    gaps.push({
      field: 'price',
      severity: priceScore === 0 ? 'critical' : 'high',
      message: `Price coverage is ${(priceScore * 100).toFixed(0)}% - below threshold`,
    });
  }

  if (categoryScore < TIKTOK_SHOP_EXTRACTION_QUALITY_THRESHOLDS.CATEGORY_COVERAGE) {
    gaps.push({
      field: 'category',
      severity: categoryScore === 0 ? 'high' : 'medium',
      message: `Category coverage is ${(categoryScore * 100).toFixed(0)}% - below threshold`,
    });
  }

  // Calculate overall score
  const overallScore = (
    titleScore * 0.2 +
    sellerScore * 0.15 +
    priceScore * 0.2 +
    categoryScore * 0.15 +
    promotionScore * 0.1 +
    mediaScore * 0.1 +
    evidenceScore * 0.1
  );

  // Determine status
  let status: TikTokShopExtractionQualityStatus;
  if (overallScore >= TIKTOK_SHOP_EXTRACTION_QUALITY_THRESHOLDS.EXCELLENT) {
    status = TikTokShopExtractionQualityStatus.EXCELLENT;
  } else if (overallScore >= TIKTOK_SHOP_EXTRACTION_QUALITY_THRESHOLDS.GOOD) {
    status = TikTokShopExtractionQualityStatus.GOOD;
  } else if (overallScore >= TIKTOK_SHOP_EXTRACTION_QUALITY_THRESHOLDS.ACCEPTABLE) {
    status = TikTokShopExtractionQualityStatus.ACCEPTABLE;
  } else if (overallScore >= TIKTOK_SHOP_EXTRACTION_QUALITY_THRESHOLDS.POOR) {
    status = TikTokShopExtractionQualityStatus.POOR;
  } else {
    status = TikTokShopExtractionQualityStatus.FAILED;
  }

  return {
    overallScore,
    titleScore,
    sellerScore,
    priceScore,
    categoryScore,
    promotionScore,
    mediaScore,
    evidenceScore,
    status,
    gaps,
  };
}

/**
 * Build extraction quality score
 */
export function buildTikTokShopExtractionQualityScore(
  fields: TikTokShopExtractedDetailFields
): number {
  const quality = evaluateTikTokShopExtractionQuality(fields);
  return quality.overallScore;
}

/**
 * Detect extraction gaps
 */
export function detectTikTokShopExtractionGaps(
  fields: TikTokShopExtractedDetailFields
): TikTokShopExtractionGap[] {
  const quality = evaluateTikTokShopExtractionQuality(fields);
  return quality.gaps;
}

/**
 * Build extraction quality summary
 */
export function buildTikTokShopExtractionQualitySummary(
  results: TikTokShopExtractionQuality[]
): {
  averageScore: number;
  scoreDistribution: Record<string, number>;
  commonGaps: TikTokShopExtractionGap[];
} {
  const scores = results.map((r) => r.overallScore);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const scoreDistribution: Record<string, number> = {
    excellent: 0,
    good: 0,
    acceptable: 0,
    poor: 0,
    failed: 0,
  };

  for (const result of results) {
    switch (result.status) {
      case TikTokShopExtractionQualityStatus.EXCELLENT:
        scoreDistribution.excellent++;
        break;
      case TikTokShopExtractionQualityStatus.GOOD:
        scoreDistribution.good++;
        break;
      case TikTokShopExtractionQualityStatus.ACCEPTABLE:
        scoreDistribution.acceptable++;
        break;
      case TikTokShopExtractionQualityStatus.POOR:
        scoreDistribution.poor++;
        break;
      default:
        scoreDistribution.failed++;
    }
  }

  // Aggregate common gaps
  const gapCounts: Record<string, number> = {};
  for (const result of results) {
    for (const gap of result.gaps) {
      const key = `${gap.field}-${gap.severity}`;
      gapCounts[key] = (gapCounts[key] || 0) + 1;
    }
  }

  const commonGaps: TikTokShopExtractionGap[] = Object.entries(gapCounts)
    .map(([key, count]) => {
      const [field, severity] = key.split('-');
      return {
        field,
        severity: severity as TikTokShopExtractionGap['severity'],
        message: `Found in ${count} extractions`,
      };
    })
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

  return {
    averageScore,
    scoreDistribution,
    commonGaps,
  };
}

function evaluateTitleCoverage(fields: TikTokShopExtractedDetailFields): number {
  const present = ['productTitle', 'productId'].filter((f) => fields[f as keyof TikTokShopExtractedDetailFields]).length;
  return present / 2;
}

function evaluateSellerCoverage(fields: TikTokShopExtractedDetailFields): number {
  const fields2 = ['sellerId', 'sellerName', 'sellerRating', 'sellerVerified', 'sellerFollowerCount'];
  const present = fields2.filter((f) => fields[f as keyof TikTokShopExtractedDetailFields]).length;
  return present / fields2.length;
}

function evaluatePriceCoverage(fields: TikTokShopExtractedDetailFields): number {
  const present = ['price', 'currency'].filter((f) => fields[f as keyof TikTokShopExtractedDetailFields]).length;
  return present / 2;
}

function evaluateCategoryCoverage(fields: TikTokShopExtractedDetailFields): number {
  const fields2 = ['categoryId', 'categoryName', 'categoryPath'];
  const present = fields2.filter((f) => fields[f as keyof TikTokShopExtractedDetailFields]).length;
  return present / fields2.length;
}

function evaluatePromotionCoverage(fields: TikTokShopExtractedDetailFields): number {
  return fields.promotionSignals ? 0.5 : 0;
}

function evaluateMediaCoverage(fields: TikTokShopExtractedDetailFields): number {
  const hasImages = !!fields.images && fields.images.length > 0;
  const hasVideos = !!fields.videos && fields.videos.length > 0;
  return (hasImages ? 0.6 : 0) + (hasVideos ? 0.4 : 0);
}

function evaluateEvidenceCompleteness(fields: TikTokShopExtractedDetailFields): number {
  let score = 0;
  let total = 0;

  for (const value of Object.values(fields)) {
    total++;
    if (value !== undefined && value !== null) {
      score++;
    }
  }

  return total > 0 ? score / total : 0;
}
