/**
 * Founder Summary Builder
 *
 * Builds founder cockpit summary from real sections.
 * Accepts optional decision/followup data and DataMode for transparency.
 */

import type {
  FounderCockpitSnapshot,
  FounderCockpitSection,
  FounderHealthStatus,
} from '../types.js';
import { HEALTH_THRESHOLDS } from '../constants.js';
import type { DataModeInfo } from '../repositories/founderMetricsRepository.js';

export interface FounderSummaryOptions {
  startDate: Date;
  endDate: Date;
  sections: FounderCockpitSection[];
  decisions?: {
    pending: number;
    critical: number;
    high: number;
    byArea: Record<string, number>;
  };
  followups?: {
    pending: number;
    stale: number;
    criticalStale: number;
  };
  dataMode?: DataModeInfo;
}

export async function buildFounderCockpitSummary(params: FounderSummaryOptions): Promise<FounderCockpitSnapshot> {
  const { startDate, endDate, sections, decisions, followups, dataMode } = params;

  const overallScore = sections.reduce((sum, s) => sum + s.score, 0) / sections.length;
  const overallStatus = classifyHealthStatus(overallScore);

  const topRisks = sections
    .filter(s => s.healthStatus === 'critical' || s.healthStatus === 'at-risk')
    .flatMap(s => s.risks.map(r => ({ category: s.name, severity: 'high' as const, title: r, description: r, affectedEntities: [], recommendation: 'Investigate' })))
    .slice(0, 5);

  const topWins = sections
    .flatMap(s => s.wins)
    .slice(0, 5);

  const decisionsPending = decisions?.pending ?? sections.reduce((sum, s) => sum + s.risks.length, 0);

  return {
    id: '',
    snapshotType: 'weekly',
    period: { start: startDate, end: endDate },
    sections,
    overallHealth: overallStatus,
    healthScore: overallScore,
    topRisks,
    topWins,
    decisionsSummary: {
      pending: decisionsPending,
      critical: decisions?.critical ?? 0,
      high: decisions?.high ?? 0,
    },
    followupsSummary: {
      pending: followups?.pending ?? 0,
      stale: followups?.stale ?? 0,
    },
    createdAt: new Date(),
  };
}

export function buildFounderHealthSummary(sections: FounderCockpitSection[]): {
  health: FounderHealthStatus;
  score: number;
  trend: 'up' | 'down' | 'stable';
} {
  const score = sections.reduce((sum, s) => sum + s.score, 0) / sections.length;
  return {
    health: classifyHealthStatus(score),
    score,
    trend: calculateOverallTrend(sections),
  };
}

function classifyHealthStatus(score: number): FounderHealthStatus {
  if (score >= HEALTH_THRESHOLDS.HEALTHY_MIN) return 'healthy';
  if (score >= HEALTH_THRESHOLDS.WARNING_MIN) return 'neutral';
  return 'critical';
}

function calculateOverallTrend(sections: FounderCockpitSection[]): 'up' | 'down' | 'stable' {
  const ups = sections.filter(s => s.trend === 'up').length;
  const downs = sections.filter(s => s.trend === 'down').length;
  if (ups > downs) return 'up';
  if (downs > ups) return 'down';
  return 'stable';
}
