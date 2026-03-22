/**
 * Commercial Intelligence Integration
 *
 * Integrates TikTok preview with commercial intelligence layer.
 */

import type {
  TikTokCommercialConfidenceSummary,
  TikTokShopPreviewClickLineage,
} from '../types.js';
import { ATTRIBUTION_CONFIDENCE_THRESHOLDS } from '../constants.js';
import { calculateLineageConfidence } from '../commercial/tiktokPreviewClickLineageService.js';
import logger from '../../../../utils/logger.js';

/**
 * Build preview commercial signals
 */
export function buildTikTokPreviewCommercialSignals(
  lineages: TikTokShopPreviewClickLineage[]
): Record<string, unknown> {
  logger.info({ msg: 'Building TikTok preview commercial signals', lineageCount: lineages.length });

  const confidence = calculateLineageConfidence(lineages);

  return {
    previewCommercialSignals: {
      totalClicks: lineages.length,
      confidence: confidence.confidence,
      confidenceLevel: confidence.level,
      factors: confidence.factors,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Build preview revenue readiness signals
 */
export function buildTikTokPreviewRevenueReadinessSignals(
  params: {
    lineageCount: number;
    lineageConfidence: number;
    usefulnessScore: number;
    stabilityScore: number;
    commercialReadinessScore: number;
  }
): Record<string, unknown> {
  logger.info({ msg: 'Building TikTok preview revenue readiness signals' });

  const {
    lineageCount,
    lineageConfidence,
    usefulnessScore,
    stabilityScore,
    commercialReadinessScore,
  } = params;

  // Determine revenue readiness
  let revenueReadiness: string;
  if (lineageCount < ATTRIBUTION_CONFIDENCE_THRESHOLDS.MIN_CLICK_VOLUME) {
    revenueReadiness = 'insufficient_volume';
  } else if (lineageConfidence < ATTRIBUTION_CONFIDENCE_THRESHOLDS.LOW_CONFIDENCE) {
    revenueReadiness = 'low_confidence';
  } else if (commercialReadinessScore < 50) {
    revenueReadiness = 'not_ready';
  } else if (commercialReadinessScore < 70) {
    revenueReadiness = 'preview_ready';
  } else {
    revenueReadiness = 'production_ready';
  }

  return {
    revenueReadiness,
    signals: {
      volume: {
        count: lineageCount,
        meetsThreshold: lineageCount >= ATTRIBUTION_CONFIDENCE_THRESHOLDS.MIN_CLICK_VOLUME,
      },
      confidence: {
        score: lineageConfidence,
        level: lineageConfidence >= ATTRIBUTION_CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE
          ? 'high'
          : lineageConfidence >= ATTRIBUTION_CONFIDENCE_THRESHOLDS.MEDIUM_CONFIDENCE
            ? 'medium'
            : 'low',
      },
      quality: {
        usefulness: usefulnessScore,
        stability: stabilityScore,
      },
      commercial: {
        readiness: commercialReadinessScore,
      },
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Build commercial confidence summary
 */
export function buildTikTokPreviewCommercialConfidenceSummary(
  lineages: TikTokShopPreviewClickLineage[],
  readinessStatus: string
): TikTokCommercialConfidenceSummary {
  logger.info({ msg: 'Building TikTok preview commercial confidence summary' });

  const confidence = calculateLineageConfidence(lineages);

  // Determine attribution confidence (simplified)
  let attributionConfidence = confidence.confidence;
  if (readinessStatus === 'not_ready' || readinessStatus === 'insufficient_evidence') {
    attributionConfidence = 0;
  }

  return {
    lineageConfidence: confidence.confidence,
    attributionConfidence,
    overallConfidence: (confidence.confidence + attributionConfidence) / 2,
    readinessLevel: readinessStatus as TikTokCommercialConfidenceSummary['readinessLevel'],
    blockers: [],
    warnings: [],
  };
}

/**
 * Prepare commercial intelligence payload
 */
export function prepareCommercialIntelligencePayload(
  params: {
    lineages: TikTokShopPreviewClickLineage[];
    readinessScore: number;
    readinessStatus: string;
    funnelMetrics: Record<string, unknown>;
  }
): Record<string, unknown> {
  const { lineages, readinessScore, readinessStatus, funnelMetrics } = params;

  const signals = buildTikTokPreviewCommercialSignals(lineages);
  const revenueSignals = buildTikTokPreviewRevenueReadinessSignals({
    lineageCount: lineages.length,
    lineageConfidence: calculateLineageConfidence(lineages).confidence / 100,
    usefulnessScore: (funnelMetrics['usefulnessScore'] as number) || 0,
    stabilityScore: (funnelMetrics['stabilityScore'] as number) || 0,
    commercialReadinessScore: readinessScore,
  });

  return {
    platform: 'tiktok_shop',
    previewCommercial: {
      ...signals,
      ...revenueSignals,
      readinessScore,
      readinessStatus,
    },
    generatedAt: new Date().toISOString(),
  };
}
