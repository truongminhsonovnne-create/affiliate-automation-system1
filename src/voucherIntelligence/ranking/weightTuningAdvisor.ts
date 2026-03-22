/**
 * Weight Tuning Advisor
 *
 * Recommends tuning - does NOT auto-apply changes
 */

import {
  VoucherRankingSnapshot,
  RankingWeights,
  RankingWeightAdjustmentCandidate,
} from '../types/index.js';

// ============================================================================
// Types
// ============================================================================

export interface TuningAdvice {
  weightAdjustments: RankingWeightAdjustmentCandidate[];
  ruleChanges: RuleChange[];
  coverageImprovements: CoverageImprovement[];
  overallConfidence: number;
  summary: string;
}

export interface RuleChange {
  rule: string;
  currentBehavior: string;
  suggestedBehavior: string;
  rationale: string;
  confidence: number;
}

export interface CoverageImprovement {
  category: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Build weight adjustment candidates
 */
export function buildWeightAdjustmentCandidates(
  currentWeights: RankingWeights,
  analysisResults: {
    exactMatchProblem?: boolean;
    discountProblem?: boolean;
    categoryProblem?: boolean;
    shopProblem?: boolean;
    fallbackProblem?: boolean;
  }
): RankingWeightAdjustmentCandidate[] {
  const candidates: RankingWeightAdjustmentCandidate[] = [];

  // Exact match adjustment
  if (analysisResults.exactMatchProblem) {
    candidates.push({
      weightKey: 'exactMatch',
      currentValue: currentWeights.exactMatch,
      suggestedValue: Math.min(currentWeights.exactMatch + 0.1, 0.5),
      adjustmentDirection: 'increase',
      confidence: 0.7,
      rationale: 'Exact match vouchers are performing well but weight is too low',
      supportingEvidence: [
        {
          metric: 'copy_success_rate',
          value: 0.8,
          interpretation: 'High correlation between exact match and successful copy',
        },
      ],
    });
  }

  // Discount adjustment
  if (analysisResults.discountProblem) {
    candidates.push({
      weightKey: 'discountPercentage',
      currentValue: currentWeights.discountPercentage,
      suggestedValue: Math.min(currentWeights.discountPercentage + 0.05, 0.3),
      adjustmentDirection: 'increase',
      confidence: 0.6,
      rationale: 'Discount percentage influences selection but weight is low',
      supportingEvidence: [
        {
          metric: 'selection_rate',
          value: 0.6,
          interpretation: 'Users prefer higher discounts',
        },
      ],
    });
  }

  // Category relevance
  if (analysisResults.categoryProblem) {
    candidates.push({
      weightKey: 'categoryRelevance',
      currentValue: currentWeights.categoryRelevance,
      suggestedValue: Math.max(currentWeights.categoryRelevance + 0.05, 0.1),
      adjustmentDirection: 'increase',
      confidence: 0.5,
      rationale: 'Category relevance could improve matching',
      supportingEvidence: [
        {
          metric: 'category_match_rate',
          value: 0.4,
          interpretation: 'Some improvement possible',
        },
      ],
    });
  }

  // Shop relevance
  if (analysisResults.shopProblem) {
    candidates.push({
      weightKey: 'shopRelevance',
      currentValue: currentWeights.shopRelevance,
      suggestedValue: Math.max(currentWeights.shopRelevance + 0.03, 0.05),
      adjustmentDirection: 'increase',
      confidence: 0.4,
      rationale: 'Shop relevance may help user preferences',
      supportingEvidence: [
        {
          metric: 'shop_selection_rate',
          value: 0.3,
          interpretation: 'Minor impact expected',
        },
      ],
    });
  }

  return candidates;
}

/**
 * Build ranking tuning advice
 */
export function buildRankingTuningAdvice(
  candidates: RankingWeightAdjustmentCandidate[],
  snapshots: VoucherRankingSnapshot[]
): TuningAdvice {
  // Get current weights from latest snapshot
  const currentWeights = snapshots.length > 0
    ? snapshots[0].scoringWeights
    : getDefaultWeights();

  return {
    weightAdjustments: candidates,
    ruleChanges: [],
    coverageImprovements: [],
    overallConfidence: calculateOverallConfidence(candidates),
    summary: generateTuningSummary(candidates),
  };
}

/**
 * Summarize weight tuning advice
 */
export function summarizeWeightTuningAdvice(
  advice: TuningAdvice
): string {
  if (advice.weightAdjustments.length === 0) {
    return 'No weight adjustments recommended at this time.';
  }

  const increases = advice.weightAdjustments.filter(a => a.adjustmentDirection === 'increase');
  const decreases = advice.weightAdjustments.filter(a => a.adjustmentDirection === 'decrease');

  const parts: string[] = [];

  if (increases.length > 0) {
    const weightNames = increases.map(i => `${i.weightKey} (+${(i.suggestedValue - i.currentValue).toFixed(2)})`);
    parts.push(`Increase: ${weightNames.join(', ')}`);
  }

  if (decreases.length > 0) {
    const weightNames = decreases.map(d => `${d.weightKey} (${(d.suggestedValue - d.currentValue).toFixed(2)})`);
    parts.push(`Decrease: ${weightNames.join(', ')}`);
  }

  return parts.join('. ');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default ranking weights
 */
function getDefaultWeights(): RankingWeights {
  return {
    exactMatch: 0.3,
    discountAmount: 0.2,
    discountPercentage: 0.15,
    minSpend: 0.1,
    freeShipping: 0.1,
    categoryRelevance: 0.05,
    shopRelevance: 0.03,
    confidence: 0.05,
    recency: 0.02,
  };
}

/**
 * Calculate overall confidence
 */
function calculateOverallConfidence(candidates: RankingWeightAdjustmentCandidate[]): number {
  if (candidates.length === 0) return 0.8;

  const avgConfidence = candidates.reduce((sum, c) => sum + c.confidence, 0) / candidates.length;
  return avgConfidence;
}

/**
 * Generate tuning summary
 */
function generateTuningSummary(candidates: RankingWeightAdjustmentCandidate[]): string {
  if (candidates.length === 0) {
    return 'Ranking is performing well. No major tuning needed.';
  }

  const highConfidence = candidates.filter(c => c.confidence >= 0.7);
  const mediumConfidence = candidates.filter(c => c.confidence >= 0.5 && c.confidence < 0.7);

  if (highConfidence.length > 0) {
    return `${highConfidence.length} high-confidence adjustments recommended. Review before applying.`;
  }

  if (mediumConfidence.length > 0) {
    return `${mediumConfidence.length} medium-confidence adjustments may help. Further analysis recommended.`;
  }

  return 'Some potential adjustments identified. More data needed before action.';
}
