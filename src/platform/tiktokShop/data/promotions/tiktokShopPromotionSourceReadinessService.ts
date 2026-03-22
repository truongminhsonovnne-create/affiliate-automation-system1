/**
 * TikTok Shop Promotion Source Readiness Service
 * Evaluates readiness of promotion sources for compatibility mapping
 */

import type {
  TikTokShopSourceReadinessResult,
  TikTokShopDataBlocker,
  TikTokShopDataWarning,
  TikTokShopPromotionSourceRecord,
  TikTokShopPromotionCompatibilityEvidence,
} from '../types.js';
import { TikTokShopReadinessStatus } from '../types.js';
import { TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS, TIKTOK_SHOP_PROMOTION_SOURCE_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';
import {
  normalizeTikTokPromotionSourceRecords,
  checkPromotionCompatibility,
  getPromotionQualityScore,
} from '../normalization/tiktokShopPromotionSourceNormalizer.js';

/**
 * Evaluate promotion source readiness for a source
 */
export async function evaluateTikTokShopPromotionSourceReadiness(
  sourceKey: string,
  promotionRecords?: TikTokShopPromotionSourceRecord[]
): Promise<TikTokShopSourceReadinessResult> {
  logger.info({ msg: 'Evaluating promotion source readiness', sourceKey });

  const blockers: TikTokShopDataBlocker[] = [];
  const warnings: TikTokShopDataWarning[] = [];

  // Check if source is available
  const isAvailable = sourceKey !== 'import_file'; // import_file needs config

  if (!isAvailable) {
    blockers.push({
      blockerId: 'source-not-available',
      blockerType: 'source_unavailable',
      severity: 'critical',
      message: `Source ${sourceKey} is not available`,
      sourceKey,
    });
  }

  // If we have records, evaluate them
  if (promotionRecords && promotionRecords.length > 0) {
    const normalizationResult = normalizeTikTokPromotionSourceRecords(promotionRecords);

    // Check normalization success
    if (!normalizationResult.success) {
      warnings.push({
        warningId: 'normalization-issues',
        warningType: 'field_incomplete',
        severity: 'medium',
        message: `${normalizationResult.failedCount} records failed normalization`,
        sourceKey,
      });
    }

    // Evaluate each normalized promotion
    for (const record of normalizationResult.records) {
      const compatibility = checkPromotionCompatibility(record);
      const qualityScore = getPromotionQualityScore(record);

      if (!compatibility.compatible) {
        warnings.push({
          warningId: `promotion-incompatible-${record.promotionId}`,
          warningType: 'field_missing',
          severity: 'medium',
          message: `Promotion ${record.promotionId} missing required fields: ${compatibility.missingFields.join(', ')}`,
          sourceKey,
        });
      }

      if (qualityScore < TIKTOK_SHOP_PROMOTION_SOURCE_CONFIG.MIN_PROMOTION_QUALITY_SCORE) {
        warnings.push({
          warningId: `promotion-low-quality-${record.promotionId}`,
          warningType: 'quality_low',
          severity: 'low',
          message: `Promotion ${record.promotionId} quality score is ${(qualityScore * 100).toFixed(0)}%`,
          sourceKey,
        });
      }
    }

    // Check promotion type coverage
    const supportedTypes = new Set(TIKTOK_SHOP_PROMOTION_SOURCE_CONFIG.SUPPORTED_PROMOTION_TYPES);
    const foundTypes = new Set(normalizationResult.records.map((r) => r.promotionType));

    for (const type of supportedTypes) {
      if (!foundTypes.has(type)) {
        warnings.push({
          warningId: `promotion-type-missing-${type}`,
          warningType: 'coverage_gap',
          severity: 'low',
          message: `No promotions of type ${type} found in source`,
          sourceKey,
        });
      }
    }
  } else {
    // No records - this is a critical blocker for production
    blockers.push({
      blockerId: 'no-promotion-data',
      blockerType: 'source_gap',
      severity: 'critical',
      message: 'No promotion data available from source - cannot evaluate compatibility',
      sourceKey,
    });
  }

  // Check for critical blockers
  const hasCriticalBlocker = blockers.some((b) => b.severity === 'critical');
  const hasHighBlocker = blockers.some((b) => b.severity === 'high');
  const warningCount = warnings.length;

  // Calculate readiness score
  let readinessScore = 0.5; // Base score

  if (hasCriticalBlocker) {
    readinessScore = 0.1;
  } else if (hasHighBlocker) {
    readinessScore = 0.3;
  }

  if (warningCount < 3) {
    readinessScore += 0.1;
  }

  if (promotionRecords && promotionRecords.length > 0) {
    readinessScore += 0.2;
  }

  // Cap score
  readinessScore = Math.min(readinessScore, 1.0);

  // Determine readiness status
  let readinessStatus: TikTokShopReadinessStatus;
  if (readinessScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.READY_THRESHOLD) {
    readinessStatus = TikTokShopReadinessStatus.READY;
  } else if (readinessScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.PROCEED_CAUTIOUSLY_THRESHOLD) {
    readinessStatus = TikTokShopReadinessStatus.PROCEED_CAUTIOUSLY;
  } else if (readinessScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.HOLD_THRESHOLD) {
    readinessStatus = TikTokShopReadinessStatus.HOLD;
  } else {
    readinessStatus = TikTokShopReadinessStatus.NOT_READY;
  }

  return {
    sourceKey,
    readinessStatus,
    readinessScore,
    blockers,
    warnings,
    metadata: {
      promotionRecordCount: promotionRecords?.length || 0,
      evaluatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Detect promotion source blockers
 */
export function detectTikTokPromotionSourceBlockers(
  sourceKey: string,
  promotionRecords?: TikTokShopPromotionSourceRecord[]
): TikTokShopDataBlocker[] {
  const blockers: TikTokShopDataBlocker[] = [];

  // Check source availability
  if (!sourceKey || sourceKey === 'import_file') {
    blockers.push({
      blockerId: 'source-unavailable',
      blockerType: 'source_unavailable',
      severity: 'critical',
      message: `Source ${sourceKey} is not available or not configured`,
      sourceKey,
    });
  }

  // Check for promotion data
  if (!promotionRecords || promotionRecords.length === 0) {
    blockers.push({
      blockerId: 'no-promotion-data',
      blockerType: 'source_gap',
      severity: 'critical',
      message: 'No promotion data available - cannot support promotion resolution',
      sourceKey,
    });
  }

  // Check promotion record quality
  if (promotionRecords && promotionRecords.length > 0) {
    const emptyRecords = promotionRecords.filter((r) => !r.rawPayload || Object.keys(r.rawPayload).length === 0);
    if (emptyRecords.length > 0) {
      blockers.push({
        blockerId: 'empty-promotion-records',
        blockerType: 'quality_gap',
        severity: 'high',
        message: `${emptyRecords.length} promotion records have empty payload`,
        sourceKey,
      });
    }
  }

  return blockers;
}

/**
 * Build promotion source readiness summary
 */
export function buildTikTokPromotionSourceReadinessSummary(
  sourceResults: TikTokShopSourceReadinessResult[]
): {
  overallScore: number;
  readinessStatus: TikTokShopReadinessStatus;
  sourcesReady: number;
  sourcesPartial: number;
  sourcesNotReady: number;
  totalBlockers: number;
  totalWarnings: number;
  commonBlockers: TikTokShopDataBlocker[];
  commonWarnings: TikTokShopDataWarning[];
} {
  const sourcesReady = sourceResults.filter((r) => r.readinessStatus === TikTokShopReadinessStatus.READY).length;
  const sourcesPartial = sourceResults.filter((r) => r.readinessStatus === TikTokShopReadinessStatus.PROCEED_CAUTIOUSLY).length;
  const sourcesNotReady = sourceResults.filter((r) => r.readinessStatus === TikTokShopReadinessStatus.NOT_READY || r.readinessStatus === TikTokShopReadinessStatus.HOLD).length;

  let totalBlockers = 0;
  let totalWarnings = 0;

  const commonBlockers: TikTokShopDataBlocker[] = [];
  const commonWarnings: TikTokShopDataWarning[] = [];

  for (const result of sourceResults) {
    totalBlockers += result.blockers.length;
    totalWarnings += result.warnings.length;

    commonBlockers.push(...result.blockers);
    commonWarnings.push(...result.warnings);
  }

  const overallScore = sourceResults.length > 0
    ? sourceResults.reduce((sum, r) => sum + r.readinessScore, 0) / sourceResults.length
    : 0;

  let readinessStatus: TikTokShopReadinessStatus;
  if (overallScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.READY_THRESHOLD) {
    readinessStatus = TikTokShopReadinessStatus.READY;
  } else if (overallScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.PROCEED_CAUTIOUSLY_THRESHOLD) {
    readinessStatus = TikTokShopReadinessStatus.PROCEED_CAUTIOUSLY;
  } else if (overallScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.HOLD_THRESHOLD) {
    readinessStatus = TikTokShopReadinessStatus.HOLD;
  } else {
    readinessStatus = TikTokShopReadinessStatus.NOT_READY;
  }

  return {
    overallScore,
    readinessStatus,
    sourcesReady,
    sourcesPartial,
    sourcesNotReady,
    totalBlockers,
    totalWarnings,
    commonBlockers,
    commonWarnings,
  };
}

/**
 * Generate promotion compatibility evidence
 */
export function generatePromotionCompatibilityEvidence(
  sourceKey: string,
  promotionRecords?: TikTokShopPromotionSourceRecord[]
): TikTokShopPromotionCompatibilityEvidence {
  const evidence: TikTokShopPromotionCompatibilityEvidence = {
    sourceKey,
    compatible: false,
    compatibilityScore: 0,
    supportedPromotions: [],
    unsupportedPromotions: [],
    missingFields: [],
    blockers: [],
  };

  if (!promotionRecords || promotionRecords.length === 0) {
    evidence.blockers.push({
      blockerId: 'no-data',
      blockerType: 'source_gap',
      severity: 'critical',
      message: 'No promotion data available',
      sourceKey,
    });
    return evidence;
  }

  const normalizationResult = normalizeTikTokPromotionSourceRecords(promotionRecords);
  const supportedTypes = new Set(TIKTOK_SHOP_PROMOTION_SOURCE_CONFIG.SUPPORTED_PROMOTION_TYPES);

  for (const record of normalizationResult.records) {
    const compatibility = checkPromotionCompatibility(record);

    if (compatibility.compatible) {
      evidence.supportedPromotions.push(record.promotionType);
    } else {
      evidence.unsupportedPromotions.push(record.promotionType);
      evidence.missingFields.push(...compatibility.missingFields);
    }
  }

  evidence.compatibilityScore = evidence.supportedPromotions.length / (normalizationResult.records.length || 1);
  evidence.compatible = evidence.compatibilityScore >= 0.5 && evidence.blockers.length === 0;

  return evidence;
}
