/**
 * Recommendation Explainability
 */

import type { StrategicDecisionRecommendation } from '../types.js';

export function buildRecommendationExplanation(recommendation: StrategicDecisionRecommendation): string {
  const evidence = recommendation.evidence
    .map(e => `${e.metric}: ${e.value.toFixed(2)} (threshold: ${e.threshold})`)
    .join(', ');

  return `${recommendation.recommendation.toUpperCase()}: ${recommendation.context}. Evidence: ${evidence}`;
}

export function buildRecommendationEvidenceSummary(recommendation: StrategicDecisionRecommendation): {
  supporting: string[];
  opposing: string[];
} {
  const supporting: string[] = [];
  const opposing: string[] = [];

  for (const e of recommendation.evidence) {
    if (e.direction === 'above') {
      if (e.value > e.threshold) {
        supporting.push(`${e.metric} exceeds threshold`);
      } else {
        opposing.push(`${e.metric} below threshold`);
      }
    } else {
      if (e.value < e.threshold) {
        supporting.push(`${e.metric} below threshold`);
      } else {
        opposing.push(`${e.metric} exceeds threshold`);
      }
    }
  }

  return { supporting, opposing };
}

export function buildRecommendationTradeoffSummary(recommendation: StrategicDecisionRecommendation): string {
  if (recommendation.tradeoffs.length === 0) {
    return 'No significant tradeoffs identified.';
  }

  const positives = recommendation.tradeoffs.filter(t => t.positive).map(t => t.description);
  const negatives = recommendation.tradeoffs.filter(t => !t.positive).map(t => t.description);

  return `Positives: ${positives.join('; ')}. Negatives: ${negatives.join('; ')}`;
}
