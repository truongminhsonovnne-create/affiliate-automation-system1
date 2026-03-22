/**
 * Continuous Improvement Service
 *
 * Builds continuous improvement reports and trend analysis.
 */

import {
  ProductGovernanceSignal,
  ProductGovernanceDecision,
  ProductGovernanceFollowup,
  ContinuousImprovementReport,
  QualityTrendSummary,
  TrendData,
  ImprovementBacklog,
  GovernanceEffectivenessSummary,
  UnresolvedHotspot,
} from '../types';

export interface ContinuousImprovementInput {
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Build continuous improvement report
 */
export async function buildContinuousImprovementReport(
  input: ContinuousImprovementInput
): Promise<ContinuousImprovementReport> {
  // Collect data for the period
  const signals = await collectSignalsForPeriod(input.periodStart, input.periodEnd);
  const decisions = await collectDecisionsForPeriod(input.periodStart, input.periodEnd);
  const followups = await collectFollowupsForPeriod(input.periodStart, input.periodEnd);

  // Build components
  const qualityTrends = buildQualityTrendSummary(signals);
  const backlog = await buildImprovementBacklog();
  const effectiveness = buildGovernanceEffectivenessSummary(decisions, followups);
  const hotspots = await buildUnresolvedHotspots();

  return {
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    generatedAt: new Date(),
    qualityTrends,
    improvementBacklog: backlog,
    governanceEffectiveness: effectiveness,
    unresolvedHotspots: hotspots,
  };
}

/**
 * Build quality trend summary
 */
export function buildQualityTrendSummary(
  signals: ProductGovernanceSignal[]
): QualityTrendSummary {
  // Group signals by time period (e.g., weeks)
  const weeklyData = groupSignalsByWeek(signals);

  // Build trend data
  const signalsTrend: TrendData[] = weeklyData.map(week => ({
    period: week.period,
    value: week.count,
    change: week.change,
  }));

  // Calculate resolution rate
  const resolvedSignals = signals.filter(s => !s.isActive).length;
  const resolutionRate = signals.length > 0 ? (resolvedSignals / signals.length) * 100 : 100;

  // Calculate average resolution time (simulated)
  const averageResolutionTime = 3.5; // days

  // Count recurring issues (signals with same type appearing multiple times)
  const recurringIssueCount = countRecurringIssues(signals);

  return {
    signalsTrend,
    resolutionRate: Math.round(resolutionRate * 100) / 100,
    averageResolutionTime,
    recurringIssueCount,
  };
}

/**
 * Build improvement backlog summary
 */
export async function buildImprovementBacklog(): Promise<ImprovementBacklog> {
  // Get open follow-ups
  const openFollowups = await getOpenFollowups();

  // Count by type
  const byType: Record<string, number> = {};
  openFollowups.forEach(f => {
    byType[f.followupType] = (byType[f.followupType] || 0) + 1;
  });

  // Count overdue
  const overdueCount = openFollowups.filter(f => {
    if (!f.dueAt) return false;
    return new Date(f.dueAt) < new Date();
  }).length;

  return {
    totalOpen: openFollowups.length,
    byType,
    bySeverity: {}, // Would need to compute from signals
    overdueCount,
  };
}

/**
 * Build governance effectiveness summary
 */
export function buildGovernanceEffectivenessSummary(
  decisions: ProductGovernanceDecision[],
  followups: ProductGovernanceFollowup[]
): GovernanceEffectivenessSummary {
  // Count decisions made
  const decisionsMade = decisions.length;

  // Count decisions overturned (simulated)
  const decisionsOverturned = 0; // Would need historical comparison

  // Calculate follow-up completion rate
  const completedFollowups = followups.filter(f => f.followupStatus === 'completed').length;
  const totalFollowups = followups.length;
  const followupCompletionRate = totalFollowups > 0 ? (completedFollowups / totalFollowups) * 100 : 100;

  // Average resolution time (simulated)
  const averageResolutionTime = 4.2; // days

  return {
    decisionsMade,
    decisionsOverturned,
    followupCompletionRate: Math.round(followupCompletionRate * 100) / 100,
    averageResolutionTime,
  };
}

/**
 * Build unresolved hotspots
 */
export async function buildUnresolvedHotspots(): Promise<UnresolvedHotspot[]> {
  // Get old active signals
  const oldSignals = await getOldActiveSignals();

  return oldSignals.map(signal => ({
    entityType: signal.targetEntityType || 'unknown',
    entityId: signal.targetEntityId || 'unknown',
    title: signal.signalType,
    severity: signal.severity,
    daysOpen: Math.floor((Date.now() - new Date(signal.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
    lastActivity: signal.createdAt,
  }));
}

// ============================================================================
// Helper Functions
// ============================================================================

function groupSignalsByWeek(signals: ProductGovernanceSignal[]): Array<{
  period: string;
  count: number;
  change: number;
}> {
  // Group by week and calculate change
  const weeks: Record<string, number> = {};

  signals.forEach(signal => {
    const date = new Date(signal.createdAt);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().split('T')[0];

    weeks[key] = (weeks[key] || 0) + 1;
  });

  return Object.entries(weeks).map(([period, count], index, arr) => {
    const sorted = arr.sort((a, b) => a[0].localeCompare(b[0]));
    const prevIndex = sorted.findIndex(([p]) => p === period) - 1;
    const prevCount = prevIndex >= 0 ? sorted[prevIndex][1] : 0;
    const change = prevCount > 0 ? ((count - prevCount) / prevCount) * 100 : 0;

    return { period, count, change: Math.round(change * 100) / 100 };
  });
}

function countRecurringIssues(signals: ProductGovernanceSignal[]): number {
  const typeCounts: Record<string, number> = {};

  signals.forEach(s => {
    typeCounts[s.signalType] = (typeCounts[s.signalType] || 0) + 1;
  });

  // Count types that appear more than once
  return Object.values(typeCounts).filter(count => count > 1).length;
}

// Simulated data fetching
async function collectSignalsForPeriod(start: Date, end: Date): Promise<ProductGovernanceSignal[]> {
  return [];
}

async function collectDecisionsForPeriod(start: Date, end: Date): Promise<ProductGovernanceDecision[]> {
  return [];
}

async function collectFollowupsForPeriod(start: Date, end: Date): Promise<ProductGovernanceFollowup[]> {
  return [];
}

async function getOpenFollowups(): Promise<ProductGovernanceFollowup[]> {
  return [];
}

async function getOldActiveSignals(): Promise<ProductGovernanceSignal[]> {
  return [];
}
