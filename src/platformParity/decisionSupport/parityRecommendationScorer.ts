/**
 * Parity Recommendation Scorer
 * Scores and prioritizes parity hardening recommendations
 */

import type {
  ParityHardeningRecommendation,
  PlatformParityGapSeverity,
} from '../types.js';

import {
  BACKLOG_CRITICAL_THRESHOLD,
  BACKLOG_HIGH_THRESHOLD,
  BACKLOG_MEDIUM_THRESHOLD,
  BACKLOG_LOW_THRESHOLD,
} from '../constants.js';

export interface ScoringWeights {
  severityWeight: number;
  effortWeight: number;
  riskWeight: number;
  impactWeight: number;
}

export interface ScoredRecommendation extends ParityHardeningRecommendation {
  finalScore: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  baseScore: number;
  severityAdjustment: number;
  effortAdjustment: number;
  riskAdjustment: number;
  impactAdjustment: number;
}

export interface ConfidenceSummary {
  overallConfidence: number;
  recommendationCount: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  recommendationsByConfidence: {
    high: ParityHardeningRecommendation[];
    medium: ParityHardeningRecommendation[];
    low: ParityHardeningRecommendation[];
  };
}

/**
 * Default scoring weights
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  severityWeight: 0.4,
  effortWeight: 0.15,
  riskWeight: 0.3,
  impactWeight: 0.15,
};

/**
 * Score a single parity recommendation
 */
export function scoreParityRecommendation(
  recommendation: ParityHardeningRecommendation,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ScoredRecommendation {
  // Base score from priority
  const baseScore = recommendation.priorityScore;

  // Severity adjustment based on risk if ignored
  const severityAdjustment = calculateSeverityAdjustment(recommendation.riskIfIgnored);

  // Effort adjustment (prefer smaller efforts)
  const effortAdjustment = calculateEffortAdjustment(recommendation.estimatedEffort);

  // Risk adjustment (higher risk items score higher)
  const riskAdjustment = calculateRiskAdjustment(recommendation.riskIfIgnored);

  // Impact adjustment (more affected platforms/scopes = higher impact)
  const impactAdjustment = calculateImpactAdjustment(
    recommendation.affectedPlatforms.length,
    recommendation.affectedScopes.length
  );

  // Calculate final score
  const rawScore =
    baseScore * 0.5 +
    severityAdjustment * weights.severityWeight * 100 +
    effortAdjustment * weights.effortWeight * 100 +
    riskAdjustment * weights.riskWeight * 100 +
    impactAdjustment * weights.impactWeight * 100;

  const finalScore = Math.min(100, Math.max(0, rawScore));

  return {
    ...recommendation,
    finalScore,
    scoreBreakdown: {
      baseScore,
      severityAdjustment,
      effortAdjustment,
      riskAdjustment,
      impactAdjustment,
    },
  };
}

/**
 * Prioritize multiple parity recommendations
 */
export function prioritizeParityRecommendations(
  recommendations: ParityHardeningRecommendation[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
  maxRecommendations?: number
): ScoredRecommendation[] {
  // Score all recommendations
  const scoredRecommendations = recommendations.map((r) => scoreParityRecommendation(r, weights));

  // Sort by final score descending
  scoredRecommendations.sort((a, b) => b.finalScore - a.finalScore);

  // Return top N if specified
  if (maxRecommendations && maxRecommendations > 0) {
    return scoredRecommendations.slice(0, maxRecommendations);
  }

  return scoredRecommendations;
}

/**
 * Build parity confidence summary
 */
export function buildParityConfidenceSummary(
  recommendations: ParityHardeningRecommendation[]
): ConfidenceSummary {
  const scoredRecommendations = recommendations.map((r) => scoreParityRecommendation(r));

  const highConfidence = scoredRecommendations.filter((r) => r.finalScore >= 80);
  const mediumConfidence = scoredRecommendations.filter((r) => r.finalScore >= 60 && r.finalScore < 80);
  const lowConfidence = scoredRecommendations.filter((r) => r.finalScore < 60);

  // Calculate overall confidence
  const totalScore = scoredRecommendations.reduce((sum, r) => sum + r.finalScore, 0);
  const overallConfidence =
    scoredRecommendations.length > 0 ? totalScore / scoredRecommendations.length : 0;

  return {
    overallConfidence,
    recommendationCount: recommendations.length,
    highConfidenceCount: highConfidence.length,
    mediumConfidenceCount: mediumConfidence.length,
    lowConfidenceCount: lowConfidence.length,
    recommendationsByConfidence: {
      high: highConfidence,
      medium: mediumConfidence,
      low: lowConfidence,
    },
  };
}

/**
 * Calculate severity adjustment
 */
function calculateSeverityAdjustment(risk: PlatformParityGapSeverity): number {
  const severityMap: Record<PlatformParityGapSeverity, number> = {
    critical: 1.0,
    high: 0.75,
    medium: 0.5,
    low: 0.25,
    info: 0.1,
  };

  return severityMap[risk] ?? 0;
}

/**
 * Calculate effort adjustment
 */
function calculateEffortAdjustment(effort: string): number {
  const effortMap: Record<string, number> = {
    small: 1.0,
    medium: 0.6,
    large: 0.3,
  };

  return effortMap[effort] ?? 0.5;
}

/**
 * Calculate risk adjustment
 */
function calculateRiskAdjustment(risk: PlatformParityGapSeverity): number {
  return calculateSeverityAdjustment(risk);
}

/**
 * Calculate impact adjustment
 */
function calculateImpactAdjustment(
  platformCount: number,
  scopeCount: number
): number {
  // More platforms and scopes = higher impact
  const platformFactor = Math.min(platformCount / 2, 1);
  const scopeFactor = Math.min(scopeCount / 3, 1);

  return (platformFactor + scopeFactor) / 2;
}

/**
 * Map priority score to backlog threshold
 */
export function mapPriorityToBacklogThreshold(priorityScore: number): string {
  if (priorityScore >= BACKLOG_CRITICAL_THRESHOLD) {
    return 'critical';
  }
  if (priorityScore >= BACKLOG_HIGH_THRESHOLD) {
    return 'high';
  }
  if (priorityScore >= BACKLOG_MEDIUM_THRESHOLD) {
    return 'medium';
  }
  if (priorityScore >= BACKLOG_LOW_THRESHOLD) {
    return 'low';
  }
  return 'trivial';
}

/**
 * Calculate priority score from gap severity and age
 */
export function calculatePriorityScoreFromGap(
  severity: PlatformParityGapSeverity,
  daysOpen: number,
  hasActiveWork: boolean
): number {
  const severityScores: Record<PlatformParityGapSeverity, number> = {
    critical: 100,
    high: 80,
    medium: 60,
    low: 40,
    info: 20,
  };

  let score = severityScores[severity] ?? 50;

  // Escalate based on age
  if (daysOpen > 30) {
    score = Math.min(100, score + 20);
  } else if (daysOpen > 14) {
    score = Math.min(100, score + 10);
  } else if (daysOpen > 7) {
    score = Math.min(100, score + 5);
  }

  // Reduce if work is already in progress
  if (hasActiveWork) {
    score = Math.max(0, score - 15);
  }

  return score;
}

/**
 * Determine if recommendation is actionable
 */
export function isRecommendationActionable(
  recommendation: ParityHardeningRecommendation
): boolean {
  // Must have positive priority score
  if (recommendation.priorityScore <= 0) {
    return false;
  }

  // Must have affected platforms
  if (recommendation.affectedPlatforms.length === 0) {
    return false;
  }

  // Must have success metrics defined
  if (recommendation.successMetrics.length === 0) {
    return false;
  }

  return true;
}

/**
 * Filter actionable recommendations
 */
export function filterActionableRecommendations(
  recommendations: ParityHardeningRecommendation[]
): ParityHardeningRecommendation[] {
  return recommendations.filter(isRecommendationActionable);
}
