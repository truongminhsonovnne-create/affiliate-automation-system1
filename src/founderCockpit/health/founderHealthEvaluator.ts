/**
 * Founder Health Evaluator
 */

import type { FounderHealthStatus, FounderRiskLevel, FounderCockpitSection } from '../types.js';
import { HEALTH_THRESHOLDS } from '../constants.js';

export function evaluateFounderSystemHealth(sections: FounderCockpitSection[]): {
  health: FounderHealthStatus;
  score: number;
  riskLevel: FounderRiskLevel;
  attentionAreas: string[];
} {
  const score = sections.reduce((sum, s) => sum + s.score, 0) / sections.length;
  const health = classifyHealth(score);
  const riskLevel = classifyRisk(score);

  const attentionAreas = sections
    .filter(s => s.status === 'warning' || s.status === 'critical')
    .map(s => s.name);

  return { health, score, riskLevel, attentionAreas };
}

export function buildFounderRiskLevel(score: number): FounderRiskLevel {
  if (score >= 0.8) return 'low';
  if (score >= 0.6) return 'medium';
  if (score >= 0.4) return 'high';
  return 'critical';
}

export function classifyFounderAttentionAreas(sections: FounderCockpitSection[]): string[] {
  return sections
    .filter(s => s.status !== 'healthy')
    .map(s => `${s.name}: ${s.risks.join(', ')}`);
}

function classifyHealth(score: number): FounderHealthStatus {
  if (score >= HEALTH_THRESHOLDS.HEALTHY_MIN) return 'healthy';
  if (score >= HEALTH_THRESHOLDS.WARNING_MIN) return 'warning';
  return 'critical';
}

function classifyRisk(score: number): FounderRiskLevel {
  return buildFounderRiskLevel(score);
}
