/**
 * TikTok Shop Promotion Acquisition Gap Analyzer
 * Detects gaps in promotion data acquisition
 */

import type {
  TikTokShopDataBlocker,
  TikTokShopDataWarning,
  TikTokShopPromotionSourceRecord,
} from '../types.js';
import { TikTokShopBacklogType, TikTokShopBacklogStatus, TikTokShopPriority } from '../types.js';
import { TIKTOK_SHOP_PROMOTION_SOURCE_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Gap detection result
 */
export interface TikTokPromotionAcquisitionGap {
  gapId: string;
  gapType: 'source_gap' | 'field_gap' | 'quality_gap' | 'compatibility_gap';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  affectedSourceKeys: string[];
  recommendation: string;
}

/**
 * Gap report
 */
export interface TikTokPromotionGapReport {
  totalGaps: number;
  criticalGaps: number;
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;
  gaps: TikTokPromotionAcquisitionGap[];
  recommendations: string[];
}

/**
 * Detect promotion acquisition gaps
 */
export function detectTikTokPromotionAcquisitionGaps(
  promotionRecords?: TikTokShopPromotionSourceRecord[]
): TikTokPromotionAcquisitionGap[] {
  const gaps: TikTokPromotionAcquisitionGap[] = [];

  // Gap 1: No promotion data
  if (!promotionRecords || promotionRecords.length === 0) {
    gaps.push({
      gapId: 'no-promotion-data',
      gapType: 'source_gap',
      severity: 'critical',
      category: 'Data Availability',
      description: 'No promotion data available from any source',
      affectedSourceKeys: [],
      recommendation: 'Implement promotion data source - API access or scraping infrastructure needed',
    });
    return gaps;
  }

  // Gap 2: Missing promotion types
  const foundTypes = new Set(promotionRecords.map((r) => r.rawPayload.promotionType as string));
  const supportedTypes = TIKTOK_SHOP_PROMOTION_SOURCE_CONFIG.SUPPORTED_PROMOTION_TYPES;

  for (const type of supportedTypes) {
    if (!foundTypes.has(type)) {
      gaps.push({
        gapId: `missing-promotion-type-${type}`,
        gapType: 'coverage_gap',
        severity: 'medium',
        category: 'Promotion Type Coverage',
        description: `No promotions of type "${type}" found`,
        affectedSourceKeys: [],
        recommendation: `Source promotions of type "${type}" or adjust compatibility expectations`,
      });
    }
  }

  // Gap 3: Missing required fields
  const requiredFields = TIKTOK_SHOP_PROMOTION_SOURCE_CONFIG.REQUIRED_PROMOTION_FIELDS;
  const recordsWithAllFields = promotionRecords.filter((r) =>
    requiredFields.every((field) => r.rawPayload[field as string] !== undefined)
  );

  if (recordsWithAllFields.length < promotionRecords.length) {
    const missingPct = ((promotionRecords.length - recordsWithAllFields.length) / promotionRecords.length) * 100;
    gaps.push({
      gapId: 'missing-required-fields',
      gapType: 'field_gap',
      severity: missingPct > 50 ? 'high' : 'medium',
      category: 'Field Completeness',
      description: `${missingPct.toFixed(0)}% of records missing required fields`,
      affectedSourceKeys: [],
      recommendation: 'Improve source data quality or implement field mapping',
    });
  }

  // Gap 4: Missing constraint fields
  const constraintFields = ['minPurchaseAmount', 'maxDiscountAmount', 'stackable'];
  const recordsWithConstraints = promotionRecords.filter((r) =>
    constraintFields.some((field) => r.rawPayload[field as string] !== undefined)
  );

  if (recordsWithConstraints.length < promotionRecords.length) {
    const constraintPct = ((promotionRecords.length - recordsWithConstraints.length) / promotionRecords.length) * 100;
    gaps.push({
      gapId: 'missing-constraint-fields',
      gapType: 'field_gap',
      severity: 'medium',
      category: 'Constraint Support',
      description: `${constraintPct.toFixed(0)}% of records missing constraint information`,
      affectedSourceKeys: [],
      recommendation: 'Add constraint field extraction from source',
    });
  }

  // Gap 5: Quality issues
  const lowQualityRecords = promotionRecords.filter((r) => {
    const keys = Object.keys(r.rawPayload);
    return keys.length < 5;
  });

  if (lowQualityRecords.length > 0) {
    const qualityPct = (lowQualityRecords.length / promotionRecords.length) * 100;
    gaps.push({
      gapId: 'low-quality-records',
      gapType: 'quality_gap',
      severity: qualityPct > 30 ? 'high' : 'medium',
      category: 'Data Quality',
      description: `${qualityPct.toFixed(0)}% of records have insufficient data (less than 5 fields)`,
      affectedSourceKeys: [],
      recommendation: 'Improve data extraction or filter out low-quality records',
    });
  }

  // Gap 6: No compatibility mapping support
  const recordsWithCompatibilityFields = promotionRecords.filter(
    (r) =>
      r.rawPayload.discountValue !== undefined &&
      r.rawPayload.promotionType !== undefined
  );

  if (recordsWithCompatibilityFields.length < promotionRecords.length) {
    const compatPct = ((promotionRecords.length - recordsWithCompatibilityFields.length) / promotionRecords.length) * 100;
    gaps.push({
      gapId: 'compatibility-mapping-gaps',
      gapType: 'compatibility_gap',
      severity: compatPct > 50 ? 'high' : 'medium',
      category: 'Compatibility',
      description: `${compatPct.toFixed(0)}% of records cannot be mapped to platform-neutral contracts`,
      affectedSourceKeys: [],
      recommendation: 'Implement field mapping or adjust compatibility expectations',
    });
  }

  return gaps;
}

/**
 * Build gap report
 */
export function buildTikTokPromotionGapReport(
  gaps: TikTokPromotionAcquisitionGap[]
): TikTokPromotionGapReport {
  const criticalGaps = gaps.filter((g) => g.severity === 'critical').length;
  const highGaps = gaps.filter((g) => g.severity === 'high').length;
  const mediumGaps = gaps.filter((g) => g.severity === 'medium').length;
  const lowGaps = gaps.filter((g) => g.severity === 'low').length;

  // Generate recommendations
  const recommendations: string[] = [];

  if (criticalGaps > 0) {
    recommendations.push('Address critical gaps before proceeding with promotion resolution');
  }

  if (highGaps > 0) {
    recommendations.push('Resolve high-priority gaps to improve promotion support');
  }

  const dataGaps = gaps.filter((g) => g.gapType === 'source_gap' || g.gapType === 'field_gap');
  if (dataGaps.length > 0) {
    recommendations.push('Improve data source capabilities to fill gaps');
  }

  const qualityGaps = gaps.filter((g) => g.gapType === 'quality_gap');
  if (qualityGaps.length > 0) {
    recommendations.push('Address data quality issues before production use');
  }

  return {
    totalGaps: gaps.length,
    criticalGaps,
    highGaps,
    mediumGaps,
    lowGaps,
    gaps,
    recommendations,
  };
}

/**
 * Prioritize promotion acquisition gaps
 */
export function prioritizeTikTokPromotionAcquisitionGaps(
  gaps: TikTokPromotionAcquisitionGap[]
): TikTokPromotionAcquisitionGap[] {
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...gaps].sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.gapId.localeCompare(b.gapId);
  });
}

/**
 * Convert gaps to backlog items
 */
export function gapsToBacklogItems(
  gaps: TikTokPromotionAcquisitionGap[]
): Array<{
  backlogType: TikTokShopBacklogType;
  backlogStatus: TikTokShopBacklogStatus;
  priority: string;
  backlogPayload: Record<string, unknown>;
  recommendation: string;
}> {
  return gaps.map((gap) => {
    let backlogType: TikTokShopBacklogType;
    let priority: string;

    switch (gap.gapType) {
      case 'source_gap':
        backlogType = TikTokShopBacklogType.SOURCE_GAP;
        break;
      case 'field_gap':
        backlogType = TikTokShopBacklogType.NORMALIZATION_GAP;
        break;
      case 'quality_gap':
        backlogType = TikTokShopBacklogType.QUALITY_GAP;
        break;
      case 'compatibility_gap':
        backlogType = TikTokShopBacklogType.INTEGRATION_GAP;
        break;
      default:
        backlogType = TikTokShopBacklogType.SOURCE_GAP;
    }

    switch (gap.severity) {
      case 'critical':
        priority = 'critical';
        break;
      case 'high':
        priority = 'high';
        break;
      case 'medium':
        priority = 'medium';
        break;
      default:
        priority = 'low';
    }

    return {
      backlogType,
      backlogStatus: TikTokShopBacklogStatus.OPEN,
      priority,
      backlogPayload: {
        gapId: gap.gapId,
        gapType: gap.gapType,
        category: gap.category,
        description: gap.description,
        affectedSourceKeys: gap.affectedSourceKeys,
      },
      recommendation: gap.recommendation,
    };
  });
}
