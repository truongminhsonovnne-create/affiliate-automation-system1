/**
 * TikTok Shop Promotion Compatibility Integration
 * Integrates source readiness with promotion compatibility layer
 */

import type {
  TikTokShopPromotionCompatibilityInput,
  TikTokShopPromotionCompatibilityEvidence,
  TikTokShopDataBlocker,
} from '../types.js';
import { generatePromotionCompatibilityEvidence } from '../promotions/tiktokShopPromotionSourceReadinessService.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Build promotion compatibility input from source data
 */
export function buildTikTokPromotionCompatibilityInput(
  promotionData: Record<string, unknown>[],
  sourceKey: string,
  constraints?: {
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    applicableCategories?: string[];
    applicableProducts?: string[];
    stackable: boolean;
  }
): TikTokShopPromotionCompatibilityInput {
  return {
    promotionData,
    sourceKey,
    constraints: constraints || { stackable: false },
  };
}

/**
 * Evaluate promotion compatibility from source data
 */
export async function evaluatePromotionCompatibilityFromSourceData(
  sourceKey: string,
  promotionData?: Record<string, unknown>[]
): Promise<TikTokShopPromotionCompatibilityEvidence> {
  logger.info({ msg: 'Evaluating promotion compatibility from source data', sourceKey });

  // If no data, return evidence with blockers
  if (!promotionData || promotionData.length === 0) {
    return {
      sourceKey,
      compatible: false,
      compatibilityScore: 0,
      supportedPromotions: [],
      unsupportedPromotions: [],
      missingFields: ['No promotion data available'],
      blockers: [
        {
          blockerId: 'no-promotion-data',
          blockerType: 'source_gap',
          severity: 'critical',
          message: 'No promotion data available from source',
          sourceKey,
        },
      ],
    };
  }

  // Convert to promotion source records
  const promotionRecords = promotionData.map((data) => ({
    id: `promo-${Date.now()}-${Math.random()}`,
    sourceId: undefined,
    promotionSourceKey: data.promotionId as string || `promo-${Math.random()}`,
    rawPayload: data,
    normalizationStatus: 'pending' as const,
    compatibilityStatus: 'unknown' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // Generate evidence
  return generatePromotionCompatibilityEvidence(sourceKey, promotionRecords);
}

/**
 * Build promotion compatibility evidence bundle
 */
export function buildPromotionCompatibilityEvidenceBundle(
  evidence: TikTokShopPromotionCompatibilityEvidence
): {
  summary: string;
  recommendations: string[];
  blockers: TikTokShopDataBlocker[];
} {
  const recommendations: string[] = [];

  // Generate recommendations based on evidence
  if (!evidence.compatible) {
    if (evidence.blockers.length > 0) {
      recommendations.push('Address critical blockers before enabling promotion resolution');
    }

    if (evidence.missingFields.length > 0) {
      recommendations.push(`Add missing fields: ${evidence.missingFields.slice(0, 3).join(', ')}`);
    }

    if (evidence.unsupportedPromotions.length > 0) {
      recommendations.push(`Support additional promotion types: ${evidence.unsupportedPromotions.slice(0, 3).join(', ')}`);
    }
  }

  if (evidence.compatibilityScore < 0.5) {
    recommendations.push('Improve promotion data quality to reach 50% compatibility threshold');
  }

  // Generate summary
  const summary = evidence.compatible
    ? `Promotion compatibility is ${(evidence.compatibilityScore * 100).toFixed(0)}% - ${evidence.supportedPromotions.length} types supported`
    : `Promotion compatibility is ${(evidence.compatibilityScore * 100).toFixed(0)}% - ${evidence.blockers.length} blockers found`;

  return {
    summary,
    recommendations,
    blockers: evidence.blockers,
  };
}

/**
 * Check if source is ready for promotion resolution
 */
export function isSourceReadyForPromotionResolution(
  evidence: TikTokShopPromotionCompatibilityEvidence
): {
  ready: boolean;
  reason: string;
} {
  if (evidence.blockers.some((b) => b.severity === 'critical')) {
    return {
      ready: false,
      reason: 'Critical blockers exist',
    };
  }

  if (evidence.compatibilityScore < 0.5) {
    return {
      ready: false,
      reason: `Compatibility score ${(evidence.compatibilityScore * 100).toFixed(0)}% is below 50% threshold`,
    };
  }

  if (evidence.supportedPromotions.length === 0) {
    return {
      ready: false,
      reason: 'No promotion types are supported',
    };
  }

  return {
    ready: true,
    reason: `Ready with ${(evidence.compatibilityScore * 100).toFixed(0)}% compatibility`,
  };
}
