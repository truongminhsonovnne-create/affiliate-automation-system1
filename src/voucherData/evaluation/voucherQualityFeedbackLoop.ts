// =============================================================================
// Voucher Quality Feedback Loop
// Production-grade feedback loop for voucher matching quality improvement
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import { VoucherMatchEvaluationResult, VoucherQualityIssue, VoucherQualityIssueSeverity, VoucherQualityIssueType } from '../types.js';
import { EVALUATION_SCORE } from '../constants.js';
import { detectRankingWeaknesses } from './voucherRankingQualityService.js';
import { logger } from '../../utils/logger.js';

export interface QualityFeedbackRecord {
  id: string;
  evaluationId: string;
  issueType: VoucherQualityIssueType;
  severity: VoucherQualityIssueSeverity;
  description: string;
  evidence: Record<string, unknown>;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface RuleAdjustmentSuggestion {
  voucherId?: string;
  ruleId?: string;
  adjustmentType: 'eligibility' | 'ranking' | 'constraint';
  currentValue: string;
  suggestedValue: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Record voucher matching feedback from an evaluation
 */
export function recordVoucherMatchingFeedback(
  evaluation: VoucherMatchEvaluationResult
): QualityFeedbackRecord[] {
  const feedbacks: QualityFeedbackRecord[] = [];

  if (!evaluation.qualityMetrics) {
    return feedbacks;
  }

  const metrics = evaluation.qualityMetrics;

  // Check for bad match
  if (metrics.bestMatchAccuracy < EVALUATION_SCORE.POOR_THRESHOLD) {
    feedbacks.push({
      id: uuidv4(),
      evaluationId: evaluation.id,
      issueType: 'bad_match',
      severity: 'high',
      description: `Best match accuracy is ${metrics.bestMatchAccuracy.toFixed(2)}, below threshold`,
      evidence: {
        expectedVoucherIds: evaluation.expectedVoucherIds,
        resolvedVoucherIds: evaluation.resolvedVoucherIds,
        bestResolvedVoucherId: evaluation.bestResolvedVoucherId,
      },
      createdAt: new Date(),
      resolvedAt: null,
    });
  }

  // Check for missed vouchers (false negatives)
  if (metrics.falseNegativeHints.length > 0) {
    feedbacks.push({
      id: uuidv4(),
      evaluationId: evaluation.id,
      issueType: 'missed_voucher',
      severity: metrics.falseNegativeHints.length > 2 ? 'high' : 'medium',
      description: `Missed ${metrics.falseNegativeHints.length} expected vouchers`,
      evidence: {
        hints: metrics.falseNegativeHints,
        expectedVoucherIds: evaluation.expectedVoucherIds,
      },
      createdAt: new Date(),
      resolvedAt: null,
    });
  }

  // Check for poor ranking
  if (metrics.rankingCorrelation < 0.5) {
    feedbacks.push({
      id: uuidv4(),
      evaluationId: evaluation.id,
      issueType: 'poor_ranking',
      severity: 'medium',
      description: `Ranking correlation is ${metrics.rankingCorrelation.toFixed(2)}, below threshold`,
      evidence: {
        rankingDiscount: metrics.rankingDiscount,
        rankingCorrelation: metrics.rankingCorrelation,
      },
      createdAt: new Date(),
      resolvedAt: null,
    });
  }

  return feedbacks;
}

/**
 * Build voucher quality feedback report
 */
export function buildVoucherQualityFeedbackReport(
  evaluations: VoucherMatchEvaluationResult[],
  options?: { minSampleSize?: number }
): {
  summary: {
    totalEvaluations: number;
    successRate: number;
    averageQualityScore: number;
    criticalIssues: number;
    highIssues: number;
  };
  issues: QualityFeedbackRecord[];
  recommendations: string[];
} {
  const minSampleSize = options?.minSampleSize || 10;
  const feedbacks: QualityFeedbackRecord[] = [];

  // Collect feedbacks from all evaluations
  for (const evaluation of evaluations) {
    feedbacks.push(...recordVoucherMatchingFeedback(evaluation));
  }

  // Calculate summary
  const successCount = evaluations.filter(
    (e) => e.evaluationStatus === 'success' || e.evaluationStatus === 'no_expectation'
  ).length;

  const totalScore = evaluations.reduce((sum, e) => sum + (e.qualityScore || 0), 0);

  const summary = {
    totalEvaluations: evaluations.length,
    successRate: evaluations.length > 0 ? successCount / evaluations.length : 0,
    averageQualityScore: evaluations.length > 0 ? totalScore / evaluations.length : 0,
    criticalIssues: feedbacks.filter((f) => f.severity === 'critical').length,
    highIssues: feedbacks.filter((f) => f.severity === 'high').length,
  };

  // Generate recommendations
  const recommendations = generateRecommendations(evaluations, feedbacks);

  return {
    summary,
    issues: feedbacks,
    recommendations,
  };
}

/**
 * Suggest voucher rule adjustments based on quality issues
 */
export function suggestVoucherRuleAdjustments(
  evaluations: VoucherMatchEvaluationResult[]
): RuleAdjustmentSuggestion[] {
  const suggestions: RuleAdjustmentSuggestion[] = [];
  const weaknesses = detectRankingWeaknesses(evaluations);

  for (const weakness of weaknesses) {
    switch (weakness.category) {
      case 'Low Recall':
        suggestions.push({
          adjustmentType: 'eligibility',
          currentValue: 'current eligibility criteria',
          suggestedValue: 'expanded eligibility with fuzzy matching',
          reason: weakness.recommendation,
          confidence: 'medium',
        });
        break;

      case 'Low Precision':
        suggestions.push({
          adjustmentType: 'eligibility',
          currentValue: 'current eligibility criteria',
          suggestedValue: 'tightened eligibility with stricter conditions',
          reason: weakness.recommendation,
          confidence: 'medium',
        });
        break;

      case 'Poor Ranking':
        suggestions.push({
          adjustmentType: 'ranking',
          currentValue: 'current ranking weights',
          suggestedValue: 'adjusted ranking weights based on analysis',
          reason: weakness.recommendation,
          confidence: 'low',
        });
        break;

      case 'High False Positives':
        suggestions.push({
          adjustmentType: 'constraint',
          currentValue: 'current constraints',
          suggestedValue: 'added constraints to filter irrelevant results',
          reason: weakness.recommendation,
          confidence: 'medium',
        });
        break;

      case 'High False Negatives':
        suggestions.push({
          adjustmentType: 'eligibility',
          currentValue: 'current eligibility criteria',
          suggestedValue: 'relaxed eligibility to capture more vouchers',
          reason: weakness.recommendation,
          confidence: 'low',
        });
        break;
    }
  }

  return suggestions;
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateRecommendations(
  evaluations: VoucherMatchEvaluationResult[],
  feedbacks: QualityFeedbackRecord[]
): string[] {
  const recommendations: string[] = [];

  // Calculate issue distribution
  const issueTypes = new Map<VoucherQualityIssueType, number>();
  for (const feedback of feedbacks) {
    const count = issueTypes.get(feedback.issueType) || 0;
    issueTypes.set(feedback.issueType, count + 1);
  }

  // Generate recommendations based on issue types
  const badMatchCount = issueTypes.get('bad_match') || 0;
  const missedVoucherCount = issueTypes.get('missed_voucher') || 0;
  const poorRankingCount = issueTypes.get('poor_ranking') || 0;

  if (badMatchCount > evaluations.length * 0.3) {
    recommendations.push(
      'High rate of bad matches detected. Review the eligibility matching logic and consider adding more specific conditions.'
    );
  }

  if (missedVoucherCount > evaluations.length * 0.2) {
    recommendations.push(
      'Significant number of missed vouchers detected. Consider expanding the voucher catalog or relaxing eligibility criteria.'
    );
  }

  if (poorRankingCount > evaluations.length * 0.2) {
    recommendations.push(
      'Ranking quality issues detected. Review the ranking algorithm weights and consider adjusting discount value and relevance weights.'
    );
  }

  // Check for stale vouchers
  const staleVoucherCount = feedbacks.filter((f) => f.issueType === 'stale_data').length;
  if (staleVoucherCount > 0) {
    recommendations.push(
      'Stale voucher data detected. Consider implementing a freshness check and refresh mechanism.'
    );
  }

  // Check for expired vouchers
  const expiredVoucherCount = feedbacks.filter((f) => f.issueType === 'expired_voucher').length;
  if (expiredVoucherCount > 0) {
    recommendations.push(
      'Expired vouchers in the catalog detected. Implement automatic expiration handling.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('No major issues detected. Continue monitoring for any regressions.');
  }

  return recommendations;
}
