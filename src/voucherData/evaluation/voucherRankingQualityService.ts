// =============================================================================
// Voucher Ranking Quality Service
// Production-grade service for analyzing ranking quality
// =============================================================================

import { VoucherMatchEvaluationResult, VoucherQualityMetrics } from '../types.js';
import { EVALUATION_SCORE, RANKING_EVALUATION } from '../constants.js';
import { logger } from '../../utils/logger.js';

export interface RankingQualityAnalysis {
  totalEvaluations: number;
  averageQualityScore: number;
  averageTopKRecall: number;
  averageTopKPrecision: number;
  averageRankingDiscount: number;
  averageRankingCorrelation: number;
  rankingConsistency: number;
  commonIssues: RankingIssue[];
}

export interface RankingIssue {
  issueType: string;
  description: string;
  frequency: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface RankingWeakness {
  category: string;
  description: string;
  affectedCount: number;
  recommendation: string;
}

/**
 * Analyze voucher ranking quality from evaluations
 */
export function analyzeVoucherRankingQuality(
  evaluations: VoucherMatchEvaluationResult[],
  options?: { minSampleSize?: number }
): RankingQualityAnalysis {
  const minSampleSize = options?.minSampleSize || 10;

  if (evaluations.length < minSampleSize) {
    logger.warn(
      { evaluationCount: evaluations.length, minSampleSize },
      'Insufficient evaluations for ranking quality analysis'
    );
  }

  const validEvaluations = evaluations.filter((e) => e.qualityMetrics);

  if (validEvaluations.length === 0) {
    return {
      totalEvaluations: 0,
      averageQualityScore: 0,
      averageTopKRecall: 0,
      averageTopKPrecision: 0,
      averageRankingDiscount: 0,
      averageRankingCorrelation: 0,
      rankingConsistency: 0,
      commonIssues: [],
    };
  }

  // Calculate averages
  let totalQualityScore = 0;
  let totalTopKRecall = 0;
  let totalTopKPrecision = 0;
  let totalRankingDiscount = 0;
  let totalRankingCorrelation = 0;

  const allFalsePositives: string[] = [];
  const allFalseNegatives: string[] = [];

  for (const evaluation of validEvaluations) {
    const metrics = evaluation.qualityMetrics!;
    totalQualityScore += metrics.bestMatchAccuracy;
    totalTopKRecall += metrics.topKRecall;
    totalTopKPrecision += metrics.topKPrecision;
    totalRankingDiscount += metrics.rankingDiscount;
    totalRankingCorrelation += metrics.rankingCorrelation;

    allFalsePositives.push(...metrics.falsePositiveHints);
    allFalseNegatives.push(...metrics.falseNegativeHints);
  }

  const count = validEvaluations.length;
  const averageQualityScore = totalQualityScore / count;
  const averageTopKRecall = totalTopKRecall / count;
  const averageTopKPrecision = totalTopKPrecision / count;
  const averageRankingDiscount = totalRankingDiscount / count;
  const averageRankingCorrelation = totalRankingCorrelation / count;

  // Calculate ranking consistency
  const rankingConsistency = calculateRankingConsistency(validEvaluations);

  // Identify common issues
  const commonIssues = identifyCommonIssues(allFalsePositives, allFalseNegatives, count);

  return {
    totalEvaluations: evaluations.length,
    averageQualityScore,
    averageTopKRecall,
    averageTopKPrecision,
    averageRankingDiscount,
    averageRankingCorrelation,
    rankingConsistency,
    commonIssues,
  };
}

/**
 * Detect ranking weaknesses
 */
export function detectRankingWeaknesses(
  evaluations: VoucherMatchEvaluationResult[],
  options?: { threshold?: number }
): RankingWeakness[] {
  const threshold = options?.threshold || EVALUATION_SCORE.ACCEPTABLE_THRESHOLD;
  const weaknesses: RankingWeakness[] = [];

  const validEvaluations = evaluations.filter((e) => e.qualityMetrics);
  if (validEvaluations.length === 0) {
    return weaknesses;
  }

  // Check for low recall
  const lowRecallEvaluations = validEvaluations.filter(
    (e) => e.qualityMetrics!.topKRecall < threshold
  );
  if (lowRecallEvaluations.length > validEvaluations.length * 0.3) {
    weaknesses.push({
      category: 'Low Recall',
      description: 'More than 30% of evaluations have low recall. The system is missing expected vouchers.',
      affectedCount: lowRecallEvaluations.length,
      recommendation: 'Review eligibility criteria and expand voucher matching logic.',
    });
  }

  // Check for low precision
  const lowPrecisionEvaluations = validEvaluations.filter(
    (e) => e.qualityMetrics!.topKPrecision < threshold
  );
  if (lowPrecisionEvaluations.length > validEvaluations.length * 0.3) {
    weaknesses.push({
      category: 'Low Precision',
      description: 'More than 30% of evaluations have low precision. The system is returning irrelevant vouchers.',
      affectedCount: lowPrecisionEvaluations.length,
      recommendation: 'Tighten eligibility criteria and improve relevance scoring.',
    });
  }

  // Check for ranking issues
  const poorRankingEvaluations = validEvaluations.filter(
    (e) => e.qualityMetrics!.rankingCorrelation < 0.5
  );
  if (poorRankingEvaluations.length > validEvaluations.length * 0.2) {
    weaknesses.push({
      category: 'Poor Ranking',
      description: 'More than 20% of evaluations have poor ranking correlation.',
      affectedCount: poorRankingEvaluations.length,
      recommendation: 'Review ranking algorithm weights and scoring functions.',
    });
  }

  // Check for false positives
  const highFalsePositiveEvaluations = validEvaluations.filter(
    (e) => e.qualityMetrics!.falsePositiveHints.length > 0
  );
  if (highFalsePositiveEvaluations.length > validEvaluations.length * 0.25) {
    weaknesses.push({
      category: 'High False Positives',
      description: 'More than 25% of evaluations have false positive hints.',
      affectedCount: highFalsePositiveEvaluations.length,
      recommendation: 'Review eligibility conditions and tighten matching rules.',
    });
  }

  // Check for false negatives
  const highFalseNegativeEvaluations = validEvaluations.filter(
    (e) => e.qualityMetrics!.falseNegativeHints.length > 0
  );
  if (highFalseNegativeEvaluations.length > validEvaluations.length * 0.25) {
    weaknesses.push({
      category: 'High False Negatives',
      description: 'More than 25% of evaluations have false negative hints.',
      affectedCount: highFalseNegativeEvaluations.length,
      recommendation: 'Expand matching logic to capture more relevant vouchers.',
    });
  }

  return weaknesses;
}

/**
 * Build ranking quality summary
 */
export function buildRankingQualitySummary(
  evaluations: VoucherMatchEvaluationResult[],
  options?: { minSampleSize?: number }
): {
  summary: RankingQualityAnalysis;
  weaknesses: RankingWeakness[];
  recommendation: string;
} {
  const summary = analyzeVoucherRankingQuality(evaluations, options);
  const weaknesses = detectRankingWeaknesses(evaluations, options);

  // Generate overall recommendation
  let recommendation = '';

  if (summary.averageQualityScore >= EVALUATION_SCORE.EXCELLENT_THRESHOLD) {
    recommendation = 'Ranking quality is excellent. Continue monitoring.';
  } else if (summary.averageQualityScore >= EVALUATION_SCORE.GOOD_THRESHOLD) {
    recommendation = 'Ranking quality is good. Minor improvements may help.';
  } else if (summary.averageQualityScore >= EVALUATION_SCORE.ACCEPTABLE_THRESHOLD) {
    recommendation = 'Ranking quality is acceptable. Address identified weaknesses for improvement.';
  } else {
    recommendation = 'Ranking quality needs significant improvement. Review and address all identified weaknesses.';
  }

  return {
    summary,
    weaknesses,
    recommendation,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateRankingConsistency(evaluations: VoucherMatchEvaluationResult[]): number {
  if (evaluations.length === 0) return 0;

  // Calculate consistency based on variance in quality metrics
  const correlationScores = evaluations
    .filter((e) => e.qualityMetrics?.rankingCorrelation !== undefined)
    .map((e) => e.qualityMetrics!.rankingCorrelation);

  if (correlationScores.length === 0) return 0;

  const mean = correlationScores.reduce((a, b) => a + b, 0) / correlationScores.length;
  const variance =
    correlationScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
    correlationScores.length;
  const stdDev = Math.sqrt(variance);

  // Convert to 0-1 scale (lower variance = higher consistency)
  const consistency = Math.max(0, 1 - stdDev);

  return consistency;
}

function identifyCommonIssues(
  falsePositives: string[],
  falseNegatives: string[],
  totalEvaluations: number
): RankingIssue[] {
  const issueMap = new Map<string, { count: number; type: 'fp' | 'fn' }>();

  // Count false positive patterns
  for (const hint of falsePositives) {
    const pattern = extractIssuePattern(hint);
    const existing = issueMap.get(pattern) || { count: 0, type: 'fp' };
    existing.count++;
    issueMap.set(pattern, existing);
  }

  // Count false negative patterns
  for (const hint of falseNegatives) {
    const pattern = extractIssuePattern(hint);
    const existing = issueMap.get(pattern) || { count: 0, type: 'fn' };
    existing.count++;
    issueMap.set(pattern, existing);
  }

  // Convert to issue list
  const issues: RankingIssue[] = [];
  for (const [pattern, data] of issueMap) {
    const frequency = data.count / totalEvaluations;
    let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';

    if (frequency > 0.3) {
      severity = 'critical';
    } else if (frequency > 0.2) {
      severity = 'high';
    } else if (frequency > 0.1) {
      severity = 'medium';
    }

    issues.push({
      issueType: data.type === 'fp' ? 'false_positive' : 'false_negative',
      description: pattern,
      frequency,
      severity,
    });
  }

  // Sort by frequency
  return issues.sort((a, b) => b.frequency - a.frequency).slice(0, 10);
}

function extractIssuePattern(hint: string): string {
  // Extract a pattern from the hint for grouping
  if (hint.includes('not expected')) {
    return 'Resolved voucher was not expected';
  }
  if (hint.includes('not in top')) {
    return 'Expected voucher not in top results';
  }
  return hint.substring(0, 50);
}
