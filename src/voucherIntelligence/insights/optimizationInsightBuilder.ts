/**
 * Optimization Insight Builder
 *
 * Builds optimization insights from analysis results
 */

import {
  VoucherOptimizationInsight,
  VoucherOptimizationInsightType,
  VoucherOptimizationSeverity,
  InsightStatus,
  BestVoucherUnderperformancePayload,
  CandidateOutperformingBestPayload,
  NoMatchCoverageGapPayload,
  RankingDivergencePayload,
} from '../types/index.js';
import { INSIGHT_TYPE_CONFIG, SEVERITY_THRESHOLDS } from '../constants/index.js';

// ============================================================================
// Types
// ============================================================================

export interface InsightBuilderInput {
  type: VoucherOptimizationInsightType;
  payload: Record<string, unknown>;
  severity?: VoucherOptimizationSeverity;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Build optimization insight
 */
export function buildVoucherOptimizationInsight(
  input: InsightBuilderInput
): VoucherOptimizationInsight {
  const config = INSIGHT_TYPE_CONFIG[input.type];
  const severity = input.severity || config?.defaultSeverity || VoucherOptimizationSeverity.MEDIUM;

  return {
    id: crypto.randomUUID(),
    insightType: input.type,
    severity,
    insightPayload: input.payload,
    status: InsightStatus.OPEN,
    priorityScore: calculatePriorityScore(input.type, severity, input.payload),
    metadata: input.metadata,
    createdAt: new Date(),
  };
}

/**
 * Build underperforming voucher insight
 */
export function buildUnderperformingVoucherInsight(params: {
  voucherId: string;
  selectionRate: number;
  expectedMinRate: number;
  sampleSize: number;
}): VoucherOptimizationInsight {
  const payload: BestVoucherUnderperformancePayload = {
    voucherId: params.voucherId,
    bestSelectedRate: params.selectionRate,
    expectedMinRate: params.expectedMinRate,
    sampleSize: params.sampleSize,
    divergenceFromCandidates: params.expectedMinRate - params.selectionRate,
  };

  // Determine severity based on how bad the underperformance is
  let severity = VoucherOptimizationSeverity.MEDIUM;
  if (params.selectionRate < 0.1) {
    severity = VoucherOptimizationSeverity.CRITICAL;
  } else if (params.selectionRate < 0.2) {
    severity = VoucherOptimizationSeverity.HIGH;
  }

  return buildVoucherOptimizationInsight({
    type: VoucherOptimizationInsightType.BEST_VOUCHER_UNDERPERFORMANCE,
    payload: payload as unknown as Record<string, unknown>,
    severity,
    metadata: {
      voucherId: params.voucherId,
      sampleSize: params.sampleSize,
    },
  });
}

/**
 * Build no-match improvement insight
 */
export function buildNoMatchImprovementInsight(params: {
  urlPattern: string;
  occurrenceCount: number;
  rootCause: string;
  suggestedAction?: string;
}): VoucherOptimizationInsight {
  const payload: NoMatchCoverageGapPayload = {
    urlPattern: params.urlPattern,
    occurrenceCount: params.occurrenceCount,
    rootCause: params.rootCause as any,
    suggestedAction: params.suggestedAction,
  };

  // Determine severity based on occurrence count
  let severity = VoucherOptimizationSeverity.LOW;
  if (params.occurrenceCount > 100) {
    severity = VoucherOptimizationSeverity.CRITICAL;
  } else if (params.occurrenceCount > 50) {
    severity = VoucherOptimizationSeverity.HIGH;
  } else if (params.occurrenceCount > 20) {
    severity = VoucherOptimizationSeverity.MEDIUM;
  }

  return buildVoucherOptimizationInsight({
    type: VoucherOptimizationInsightType.NO_MATCH_COVERAGE_GAP,
    payload: payload as unknown as Record<string, unknown>,
    severity,
    metadata: {
      occurrenceCount: params.occurrenceCount,
    },
  });
}

/**
 * Build ranking divergence insight
 */
export function buildRankingDivergenceInsight(params: {
  positionGap: number;
  scoreGap: number;
  affectedVouchers: string[];
  sampleSize: number;
}): VoucherOptimizationInsight {
  const payload: RankingDivergencePayload = {
    positionGap: params.positionGap,
    scoreGap: params.scoreGap,
    affectedVouchers: params.affectedVouchers,
    sampleSize: params.sampleSize,
  };

  // Determine severity based on gap size
  let severity = VoucherOptimizationSeverity.LOW;
  if (params.positionGap > 5 || params.scoreGap > 0.5) {
    severity = VoucherOptimizationSeverity.HIGH;
  } else if (params.positionGap > 3 || params.scoreGap > 0.3) {
    severity = VoucherOptimizationSeverity.MEDIUM;
  }

  return buildVoucherOptimizationInsight({
    type: VoucherOptimizationInsightType.RANKING_DIVERGENCE,
    payload: payload as unknown as Record<string, unknown>,
    severity,
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate priority score for insight
 */
function calculatePriorityScore(
  type: VoucherOptimizationInsightType,
  severity: VoucherOptimizationSeverity,
  payload: Record<string, unknown>
): number {
  // Base score from severity
  let score = 0;
  switch (severity) {
    case VoucherOptimizationSeverity.CRITICAL:
      score = 0.9;
      break;
    case VoucherOptimizationSeverity.HIGH:
      score = 0.7;
      break;
    case VoucherOptimizationSeverity.MEDIUM:
      score = 0.5;
      break;
    case VoucherOptimizationSeverity.LOW:
      score = 0.3;
      break;
  }

  // Adjust based on insight type
  switch (type) {
    case VoucherOptimizationInsightType.COPY_FAILURE_PATTERN:
      score += 0.1;
      break;
    case VoucherOptimizationInsightType.NO_MATCH_COVERAGE_GAP:
      // Adjust based on occurrence count
      const count = (payload as any).occurrenceCount || 0;
      if (count > 100) score += 0.1;
      else if (count > 50) score += 0.05;
      break;
  }

  return Math.min(score, 1.0);
}

/**
 * Build insights from multiple analysis results
 */
export function buildInsightsFromAnalysis(results: {
  underperformingVouchers?: Array<{ voucherId: string; selectionRate: number; sampleSize: number }>;
  noMatchPatterns?: Array<{ urlPattern: string; occurrenceCount: number; rootCause: string }>;
  rankingDivergences?: Array<{ positionGap: number; scoreGap: number; affectedVouchers: string[] }>;
}): VoucherOptimizationInsight[] {
  const insights: VoucherOptimizationInsight[] = [];

  // Build underperforming voucher insights
  if (results.underperformingVouchers) {
    for (const v of results.underperformingVouchers) {
      insights.push(buildUnderperformingVoucherInsight({
        voucherId: v.voucherId,
        selectionRate: v.selectionRate,
        expectedMinRate: 0.3,
        sampleSize: v.sampleSize,
      }));
    }
  }

  // Build no-match insights
  if (results.noMatchPatterns) {
    for (const p of results.noMatchPatterns) {
      insights.push(buildNoMatchImprovementInsight({
        urlPattern: p.urlPattern,
        occurrenceCount: p.occurrenceCount,
        rootCause: p.rootCause,
      }));
    }
  }

  // Build ranking divergence insights
  if (results.rankingDivergences) {
    for (const d of results.rankingDivergences) {
      insights.push(buildRankingDivergenceInsight({
        positionGap: d.positionGap,
        scoreGap: d.scoreGap,
        affectedVouchers: d.affectedVouchers,
        sampleSize: 100, // Simplified
      }));
    }
  }

  return insights;
}
