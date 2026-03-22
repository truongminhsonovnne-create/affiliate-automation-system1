/**
 * Explainability Outcome Analyzer
 *
 * Analyzes if explanations are helping conversion
 */

import {
  VoucherOutcomeSignal,
  VoucherOutcomeAggregate,
} from '../types/index.js';

// ============================================================================
// Types
// ============================================================================

export interface ExplanationAnalysisResult {
  effectivenessScore: number;
  weakPoints: ExplanationWeakness[];
  suggestions: ExplanationOptimizationSuggestion[];
}

export interface ExplanationWeakness {
  type: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface ExplanationOptimizationSuggestion {
  suggestion: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Analyze explanation effectiveness
 */
export function analyzeExplanationEffectiveness(
  aggregates: VoucherOutcomeAggregate[]
): ExplanationAnalysisResult {
  const weakPoints: ExplanationWeakness[] = [];
  const suggestions: ExplanationOptimizationSuggestion[] = [];

  // Analyze each aggregate
  for (const aggregate of aggregates) {
    // Check if high view but low copy indicates confusion
    if (aggregate.viewCount > 50 && aggregate.copyCount === 0) {
      weakPoints.push({
        type: 'no_engagement',
        description: `Voucher ${aggregate.voucherId} has views but no copies - users may not understand how to use it`,
        impact: 'high',
      });

      suggestions.push({
        suggestion: 'Improve explanation clarity',
        rationale: 'Users are viewing but not copying - unclear how to use',
        priority: 'high',
      });
    }

    // Check if high copy failure indicates misleading explanation
    if (aggregate.copyFailureCount > aggregate.copyCount * 0.3) {
      weakPoints.push({
        type: 'copy_failure',
        description: `Voucher ${aggregate.voucherId} has high copy failure rate - explanation may be misleading`,
        impact: 'high',
      });

      suggestions.push({
        suggestion: 'Review voucher terms and conditions in explanation',
        rationale: 'Users are failing to use voucher - terms may be unclear',
        priority: 'high',
      });
    }

    // Check if high open but no copy indicates explanation not helpful
    if (aggregate.openShopeeClickCount > aggregate.copyCount * 2) {
      weakPoints.push({
        type: 'low_conversion',
        description: `Voucher ${aggregate.voucherId} users open Shopee but don't copy - explanation may not be compelling`,
        impact: 'medium',
      });

      suggestions.push({
        suggestion: 'Add urgency or benefit to explanation',
        rationale: 'Users open Shopee but skip copying - need more compelling reason',
        priority: 'medium',
      });
    }
  }

  // Calculate effectiveness score
  const effectivenessScore = calculateEffectivenessScore(weakPoints);

  return {
    effectivenessScore,
    weakPoints,
    suggestions,
  };
}

/**
 * Detect explanation weaknesses
 */
export function detectExplanationWeaknesses(
  aggregates: VoucherOutcomeAggregate[]
): ExplanationWeakness[] {
  const weaknesses: ExplanationWeakness[] = [];

  for (const aggregate of aggregates) {
    // No engagement weakness
    if (aggregate.viewCount > 20 && aggregate.copyCount === 0) {
      weaknesses.push({
        type: 'no_engagement',
        description: `Voucher ${aggregate.voucherId} viewed ${aggregate.viewCount} times with 0 copies`,
        impact: 'high',
      });
    }

    // Confusion weakness
    if (aggregate.copyFailureCount > aggregate.copyCount * 0.2) {
      weaknesses.push({
        type: 'copy_failure',
        description: `Voucher ${aggregate.voucherId} has ${(aggregate.copyFailureCount / (aggregate.copyCount + aggregate.copyFailureCount) * 100).toFixed(0)}% copy failure rate`,
        impact: 'medium',
      });
    }

    // Low conversion weakness
    if (aggregate.openShopeeClickCount > 10 && aggregate.copyCount === 0) {
      weaknesses.push({
        type: 'low_conversion',
        description: `Voucher ${aggregate.voucherId} users open Shopee but don't copy`,
        impact: 'medium',
      });
    }
  }

  return weaknesses;
}

/**
 * Build explanation optimization suggestions
 */
export function buildExplanationOptimizationSuggestions(
  weaknesses: ExplanationWeakness[]
): ExplanationOptimizationSuggestion[] {
  const suggestions: ExplanationOptimizationSuggestion[] = [];

  const highImpact = weaknesses.filter(w => w.impact === 'high');
  const mediumImpact = weaknesses.filter(w => w.impact === 'medium');

  if (highImpact.length > 0) {
    suggestions.push({
      suggestion: 'Review high-impact explanation issues immediately',
      rationale: `${highImpact.length} high-impact issues detected`,
      priority: 'high',
    });
  }

  if (mediumImpact.length > 0) {
    suggestions.push({
      suggestion: 'Investigate medium-impact explanation issues',
      rationale: `${mediumImpact.length} medium-impact issues detected`,
      priority: 'medium',
    });
  }

  return suggestions;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate effectiveness score
 */
function calculateEffectivenessScore(weaknesses: ExplanationWeakness[]): number {
  if (weaknesses.length === 0) return 1.0;

  let penalty = 0;
  for (const weakness of weaknesses) {
    switch (weakness.impact) {
      case 'high':
        penalty += 0.3;
        break;
      case 'medium':
        penalty += 0.15;
        break;
      case 'low':
        penalty += 0.05;
        break;
    }
  }

  return Math.max(0, 1.0 - penalty);
}
