/**
 * Ranking Optimization Analyzer
 *
 * Analyzes what needs to be optimized in ranking
 */

import {
  VoucherOutcomeAggregate,
  VoucherRankingSnapshot,
  RankingWeights,
  RankingOptimizationSuggestion,
  Platform,
} from '../types/index.js';
import { RANKING_THRESHOLDS, SEVERITY_THRESHOLDS } from '../constants/index.js';

// ============================================================================
// Types
// ============================================================================

export interface OptimizationAnalysisResult {
  suggestions: RankingOptimizationSuggestion[];
  scoringProblems: ScoringProblem[];
  confidence: number;
}

export interface ScoringProblem {
  weightKey: string;
  currentValue: number;
  expectedRange: [number, number];
  severity: 'low' | 'medium' | 'high';
  evidence: string;
}

// ============================================================================
// Main Analysis Functions
// ============================================================================

/**
 * Analyze ranking optimization needs
 */
export function analyzeRankingOptimizationNeeds(
  aggregates: VoucherOutcomeAggregate[],
  currentWeights: RankingWeights,
  snapshots: VoucherRankingSnapshot[]
): OptimizationAnalysisResult {
  const suggestions: RankingOptimizationSuggestion[] = [];
  const scoringProblems: ScoringProblem[] = [];

  // 1. Analyze exact match performance
  const exactMatchAnalysis = analyzeExactMatchPerformance(aggregates);
  if (exactMatchAnalysis.problem) {
    scoringProblems.push(exactMatchAnalysis.problem);
    suggestions.push(exactMatchAnalysis.suggestion);
  }

  // 2. Analyze category relevance
  const categoryAnalysis = analyzeCategoryRelevance(aggregates);
  if (categoryAnalysis.problem) {
    scoringProblems.push(categoryAnalysis.problem);
    suggestions.push(categoryAnalysis.suggestion);
  }

  // 3. Analyze fallback handling
  const fallbackAnalysis = analyzeFallbackHandling(aggregates);
  if (fallbackAnalysis.problem) {
    scoringProblems.push(fallbackAnalysis.problem);
    suggestions.push(fallbackAnalysis.suggestion);
  }

  // 4. Analyze minimum spend proximity
  const minSpendAnalysis = analyzeMinSpendProximity(aggregates);
  if (minSpendAnalysis.problem) {
    scoringProblems.push(minSpendAnalysis.problem);
    suggestions.push(minSpendAnalysis.suggestion);
  }

  // Calculate overall confidence
  const confidence = calculateOptimizationConfidence(aggregates, scoringProblems.length);

  return {
    suggestions,
    scoringProblems,
    confidence,
  };
}

/**
 * Detect scoring weight problems
 */
export function detectScoringWeightProblems(
  aggregates: VoucherOutcomeAggregate[],
  currentWeights: RankingWeights
): ScoringProblem[] {
  const problems: ScoringProblem[] = [];

  // Check exact match weight
  const exactMatchPerformance = aggregates.filter(a => a.copySuccessRate > 0.7).length / aggregates.length;
  if (exactMatchPerformance > 0.8 && currentWeights.exactMatch < 0.3) {
    problems.push({
      weightKey: 'exactMatch',
      currentValue: currentWeights.exactMatch,
      expectedRange: [0.3, 0.5],
      severity: 'high',
      evidence: 'High-performing vouchers are often exact matches but weight is too low',
    });
  }

  // Check discount percentage weight
  const discountPerformance = aggregates.filter(a => a.copyCount > 0).length;
  if (discountPerformance > 0 && currentWeights.discountPercentage < 0.15) {
    problems.push({
      weightKey: 'discountPercentage',
      currentValue: currentWeights.discountPercentage,
      expectedRange: [0.15, 0.25],
      severity: 'medium',
      evidence: 'Discount percentage seems to influence selection but weight is low',
    });
  }

  // Check category relevance weight
  if (currentWeights.categoryRelevance < 0.1) {
    problems.push({
      weightKey: 'categoryRelevance',
      currentValue: currentWeights.categoryRelevance,
      expectedRange: [0.1, 0.2],
      severity: 'medium',
      evidence: 'Category relevance could improve matching',
    });
  }

  // Check shop relevance weight
  if (currentWeights.shopRelevance < 0.05) {
    problems.push({
      weightKey: 'shopRelevance',
      currentValue: currentWeights.shopRelevance,
      expectedRange: [0.05, 0.15],
      severity: 'low',
      evidence: 'Shop relevance may help with user preferences',
    });
  }

  return problems;
}

/**
 * Build ranking optimization suggestions
 */
export function buildRankingOptimizationSuggestions(
  problems: ScoringProblem[],
  aggregates: VoucherOutcomeAggregate[]
): RankingOptimizationSuggestion[] {
  const suggestions: RankingOptimizationSuggestion[] = [];

  for (const problem of problems) {
    const suggestion: RankingOptimizationSuggestion = {
      type: 'weight_adjustment',
      description: `Adjust ${problem.weightKey} weight`,
      currentValue: problem.currentValue,
      suggestedValue: (problem.expectedRange[0] + problem.expectedRange[1]) / 2,
      rationale: problem.evidence,
      confidence: problem.severity === 'high' ? 0.8 : problem.severity === 'medium' ? 0.6 : 0.4,
      evidence: {
        problem: problem,
        sampleSize: aggregates.length,
      },
    };

    suggestions.push(suggestion);
  }

  return suggestions;
}

// ============================================================================
// Analysis Helpers
// ============================================================================

/**
 * Analyze exact match performance
 */
function analyzeExactMatchPerformance(
  aggregates: VoucherOutcomeAggregate[]
): { problem?: ScoringProblem; suggestion?: RankingOptimizationSuggestion } {
  // This is simplified - in reality, you'd need to track exact match separately
  return {};
}

/**
 * Analyze category relevance
 */
function analyzeCategoryRelevance(
  aggregates: VoucherOutcomeAggregate[]
): { problem?: ScoringProblem; suggestion?: RankingOptimizationSuggestion } {
  // This would analyze how category affects selection
  return {};
}

/**
 * Analyze fallback handling
 */
function analyzeFallbackHandling(
  aggregates: VoucherOutcomeAggregate[]
): { problem?: ScoringProblem; suggestion?: RankingOptimizationSuggestion } {
  const avgFallbackRate = aggregates.reduce((sum, a) => sum + a.fallbackClickRate, 0) / aggregates.length;

  if (avgFallbackRate > 0.5) {
    return {
      problem: {
        weightKey: 'fallback',
        currentValue: 0.1,
        expectedRange: [0.15, 0.25],
        severity: 'high',
        evidence: 'High fallback rate suggests fallback options need improvement',
      },
      suggestion: {
        type: 'weight_adjustment',
        description: 'Improve fallback ranking or catalog coverage',
        currentValue: 0.1,
        suggestedValue: 0.2,
        rationale: 'Users are falling back too often, indicating ranking or coverage issues',
        confidence: 0.7,
        evidence: { avgFallbackRate },
      },
    };
  }

  return {};
}

/**
 * Analyze minimum spend proximity
 */
function analyzeMinSpendProximity(
  aggregates: VoucherOutcomeAggregate[]
): { problem?: ScoringProblem; suggestion?: RankingOptimizationSuggestion } {
  // This would analyze minimum spend requirements
  return {};
}

/**
 * Calculate optimization confidence
 */
function calculateOptimizationConfidence(
  aggregates: VoucherOutcomeAggregate[],
  problemCount: number
): number {
  if (aggregates.length < RANKING_THRESHOLDS.MIN_SAMPLE_SIZE) {
    return 0.3;
  }

  if (problemCount === 0) {
    return 0.8;
  }

  return Math.max(0.5, 0.8 - problemCount * 0.1);
}
