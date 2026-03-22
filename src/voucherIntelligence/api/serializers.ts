/**
 * Voucher Intelligence API Serializers
 */

import type {
  VoucherOptimizationReportDto,
  VoucherInsightDto,
  VoucherOutcomeSummaryDto,
  VoucherRankingFeedbackDto,
  RankingAdviceDto,
  NoMatchAnalysisDto,
} from './types.js';

// ============================================================================
// Serializers
// ============================================================================

/**
 * Serialize optimization report
 */
export function serializeOptimizationReport(report: any): VoucherOptimizationReportDto {
  return {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    timeWindow: {
      start: report.timeWindow.start.toISOString(),
      end: report.timeWindow.end.toISOString(),
    },
    summary: report.summary,
    topIssues: report.insights?.slice(0, 10).map(serializeInsight) || [],
    rankingAdvice: report.rankingAdvice ? serializeRankingAdvice(report.rankingAdvice) : null,
  };
}

/**
 * Serialize insight
 */
export function serializeInsight(insight: any): VoucherInsightDto {
  return {
    id: insight.id,
    insightType: insight.insightType,
    severity: insight.severity,
    status: insight.status,
    priorityScore: insight.priorityScore || 0,
    createdAt: insight.createdAt.toISOString(),
    payload: insight.insightPayload,
  };
}

/**
 * Serialize outcome summary
 */
export function serializeOutcomeSummary(aggregate: any): VoucherOutcomeSummaryDto {
  return {
    voucherId: aggregate.voucherId,
    platform: aggregate.platform,
    viewCount: aggregate.viewCount,
    copyCount: aggregate.copyCount,
    copySuccessRate: aggregate.copySuccessRate,
    openShopeeClickCount: aggregate.openShopeeClickCount,
    openShopeeClickRate: aggregate.openShopeeClickRate,
    bestVsCandidateDivergence: aggregate.bestVsCandidateDivergence,
    noMatchCount: aggregate.noMatchViewedCount,
  };
}

/**
 * Serialize ranking feedback
 */
export function serializeRankingFeedback(feedback: any): VoucherRankingFeedbackDto {
  return {
    voucherId: feedback.voucherId,
    feedbackType: feedback.feedbackType,
    feedbackScore: feedback.qualityScore,
    confidence: feedback.confidence,
    signals: feedback.signals?.map((s: any) => ({
      type: s.type,
      weight: s.weight,
      contribution: s.contribution,
    })) || [],
    warnings: feedback.warnings || [],
  };
}

/**
 * Serialize ranking advice
 */
export function serializeRankingAdvice(advice: any): RankingAdviceDto {
  return {
    weightAdjustments: advice.weightAdjustments?.map((w: any) => ({
      weightKey: w.weightKey,
      currentValue: w.currentValue,
      suggestedValue: w.suggestedValue,
      adjustmentDirection: w.adjustmentDirection,
      confidence: w.confidence,
      rationale: w.rationale,
    })) || [],
    overallConfidence: advice.overallConfidence || 0,
    summary: advice.summary || '',
  };
}

/**
 * Serialize no-match analysis
 */
export function serializeNoMatchAnalysis(analysis: any): NoMatchAnalysisDto {
  return {
    urlPattern: analysis.normalizedUrl,
    rootCause: analysis.rootCause,
    occurrenceCount: 1,
    confidenceScore: analysis.confidenceScore,
    suggestedAction: analysis.suggestedAction || null,
  };
}

/**
 * Parse date from string
 */
export function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}
