/**
 * Founder Decision Prioritizer
 */

import type { FounderDecisionItem } from '../types.js';

const SEVERITY_SCORES = { critical: 100, high: 75, medium: 50, low: 25 };

export function prioritizeFounderDecisionItems(items: FounderDecisionItem[]): FounderDecisionItem[] {
  return items
    .map(item => ({ item, score: SEVERITY_SCORES[item.severity] }))
    .sort((a, b) => b.score - a.score)
    .map(r => r.item);
}

export function scoreFounderDecisionUrgency(item: FounderDecisionItem): number {
  let score = SEVERITY_SCORES[item.severity];
  const daysOld = (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  score += Math.min(30, daysOld * 5);
  return score;
}

export function buildFounderDecisionPrioritySummary(items: FounderDecisionItem[]): {
  critical: number;
  high: number;
  medium: number;
  low: number;
} {
  return {
    critical: items.filter(i => i.severity === 'critical').length,
    high: items.filter(i => i.severity === 'high').length,
    medium: items.filter(i => i.severity === 'medium').length,
    low: items.filter(i => i.severity === 'low').length,
  };
}
