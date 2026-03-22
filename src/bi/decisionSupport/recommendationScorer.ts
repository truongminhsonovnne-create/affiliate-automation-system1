/**
 * Recommendation Scorer
 */

import type { StrategicDecisionRecommendation, RecommendationPriority } from '../types.js';
import { DECISION_CONFIDENCE_THRESHOLDS } from '../constants.js';

export function scoreStrategicRecommendation(recommendation: StrategicDecisionRecommendation): number {
  let score = 0.5;

  // Priority scoring
  switch (recommendation.priority) {
    case 'critical': score += 0.3; break;
    case 'high': score += 0.2; break;
    case 'medium': score += 0.1; break;
    case 'low': break;
  }

  // Evidence scoring
  score += Math.min(0.2, recommendation.evidence.length * 0.05);

  // Confidence scoring
  if (recommendation.confidence >= DECISION_CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE) {
    score += 0.15;
  }

  return Math.min(1, Math.max(0, score));
}

export function prioritizeStrategicRecommendations(recommendations: StrategicDecisionRecommendation[]): StrategicDecisionRecommendation[] {
  return recommendations
    .map(r => ({ rec: r, score: scoreStrategicRecommendation(r) }))
    .sort((a, b) => b.score - a.score)
    .map(r => r.rec);
}

export function buildRecommendationConfidence(evidence: StrategicDecisionRecommendation['evidence']): number {
  if (evidence.length === 0) return 0.3;
  const strong = evidence.filter(e => Math.abs(e.value - e.threshold) < 0.1).length;
  return Math.min(0.9, 0.3 + strong * 0.15);
}
