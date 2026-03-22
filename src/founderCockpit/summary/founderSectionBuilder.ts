/**
 * Founder Section Builder
 *
 * Builds founder cockpit sections from REAL metrics.
 * Each section:
 * - Computes a real health score from live data
 * - Emits an insight when running in demo mode
 * - Computes risks/wins from actual thresholds
 */

import type { FounderCockpitSection, FounderHealthStatus, FounderCockpitSectionInsight } from '../types.js';
import { HEALTH_THRESHOLDS } from '../constants.js';
import type { DataModeInfo } from '../repositories/founderMetricsRepository.js';

// =============================================================================
// SECTION BUILDER INPUTS
// =============================================================================

export interface GrowthSectionInput {
  sessions: number;
  submitRate: number;
  submitRateChange: number;
  submitRateTrend: 'up' | 'down' | 'stable';
  surfaceCount?: number;
}

export interface QualitySectionInput {
  noMatchRate: number;
  noMatchRateChange: number;
  noMatchRateTrend: 'up' | 'down' | 'stable';
  copyRate: number;
  failedJobsLast7d?: number;
}

export interface CommercialSectionInput {
  revenue: number;
  revenueChange: number;
  revenueTrend: 'up' | 'down' | 'stable';
  commission?: number;
  conversions?: number;
}

export interface ReleaseSectionInput {
  readinessScore: number;
  blockers: number;
  anomalies?: number;
  activeExperiments?: number;
}

// =============================================================================
// GROWTH SECTION
// =============================================================================

export async function buildGrowthFounderSection(
  input: GrowthSectionInput,
  dataMode: DataModeInfo
): Promise<FounderCockpitSection> {
  const { sessions, submitRate, submitRateChange, submitRateTrend } = input;

  const score = computeGrowthScore(sessions, submitRate);
  const status = classifyStatus(score);

  const metrics = buildMetrics([
    { key: 'growth.sessions', name: 'Sessions', value: sessions, unit: 'count', change: 0, trend: 'stable' as const },
    { key: 'growth.submit_rate', name: 'Submit Rate', value: submitRate, unit: 'percentage', change: submitRateChange, trend: submitRateTrend },
  ]);

  const risks = extractGrowthRisks(input);
  const wins = extractGrowthWins(input);
  const insights = buildInsights('growth', dataMode, score, metrics);

  return {
    type: 'growth',
    name: 'Growth',
    healthStatus: status,
    score,
    trend: submitRateTrend,
    metrics,
    insights,
    risks,
    wins,
  };
}

// =============================================================================
// QUALITY SECTION
// =============================================================================

export async function buildQualityFounderSection(
  input: QualitySectionInput,
  dataMode: DataModeInfo
): Promise<FounderCockpitSection> {
  const { noMatchRate, noMatchRateChange, noMatchRateTrend, copyRate, failedJobsLast7d } = input;

  const score = computeQualityScore(noMatchRate, failedJobsLast7d ?? 0);
  const status = classifyStatus(score);

  const metrics = buildMetrics([
    { key: 'quality.no_match_rate', name: 'No-Match Rate', value: noMatchRate, unit: 'percentage', change: noMatchRateChange, trend: noMatchRateTrend },
    { key: 'quality.copy_rate', name: 'Copy Rate', value: copyRate, unit: 'percentage', change: 0, trend: 'stable' as const },
  ]);

  const risks = extractQualityRisks(input);
  const wins = extractQualityWins(input);
  const insights = buildInsights('quality', dataMode, score, metrics);

  return {
    type: 'quality',
    name: 'Quality',
    healthStatus: status,
    score,
    trend: noMatchRateTrend === 'up' ? 'down' : noMatchRateTrend === 'down' ? 'up' : 'stable',
    metrics,
    insights,
    risks,
    wins,
  };
}

// =============================================================================
// COMMERCIAL SECTION
// =============================================================================

export async function buildCommercialFounderSection(
  input: CommercialSectionInput,
  dataMode: DataModeInfo
): Promise<FounderCockpitSection> {
  const { revenue, revenueChange, revenueTrend, commission, conversions } = input;

  const score = computeCommercialScore(revenue, conversions ?? 0);
  const status = classifyStatus(score);

  const metrics = buildMetrics([
    { key: 'commercial.revenue', name: 'Revenue', value: revenue, unit: 'currency', change: revenueChange, trend: revenueTrend },
    { key: 'commercial.conversions', name: 'Conversions', value: conversions ?? 0, unit: 'count', change: 0, trend: 'stable' as const },
  ]);

  const risks = extractCommercialRisks(input);
  const wins = extractCommercialWins(input);
  const insights = buildInsights('commercial', dataMode, score, metrics);

  return {
    type: 'commercial',
    name: 'Commercial',
    healthStatus: status,
    score,
    trend: revenueTrend,
    metrics,
    insights,
    risks,
    wins,
  };
}

// =============================================================================
// RELEASE SECTION
// =============================================================================

export async function buildReleaseFounderSection(
  input: ReleaseSectionInput,
  dataMode: DataModeInfo
): Promise<FounderCockpitSection> {
  const { readinessScore, blockers, anomalies, activeExperiments } = input;

  const score = computeReleaseScore(readinessScore, blockers, anomalies ?? 0);
  const status = classifyStatus(score);

  const metrics = buildMetrics([
    { key: 'release.readiness_score', name: 'Readiness Score', value: readinessScore, unit: 'score', change: 0, trend: 'stable' as const },
    { key: 'release.blockers', name: 'Blockers', value: blockers, unit: 'count', change: 0, trend: 'stable' as const },
    { key: 'release.active_experiments', name: 'Active Experiments', value: activeExperiments ?? 0, unit: 'count', change: 0, trend: 'stable' as const },
  ]);

  const risks = extractReleaseRisks(input);
  const wins = extractReleaseWins(input);
  const insights = buildInsights('release', dataMode, score, metrics);

  return {
    type: 'release',
    name: 'Release',
    healthStatus: status,
    score,
    trend: blockers > 0 ? 'down' : 'stable',
    metrics,
    insights,
    risks,
    wins,
  };
}

// =============================================================================
// SCORE COMPUTATION
// =============================================================================

/**
 * Growth score: sessions * submit rate contribution.
 * Score = (session_normalized * 0.5) + (submit_rate_penalty * 0.5)
 */
function computeGrowthScore(sessions: number, submitRate: number): number {
  if (sessions === 0 && submitRate === 0) return 0;

  // Normalize sessions: 1000+ sessions = full score
  const sessionScore = Math.min(sessions / 1000, 1) * 0.5;
  // Submit rate: 5% = full score, below 1% = 0
  const submitScore = Math.max(0, Math.min(submitRate / 0.05, 1)) * 0.5;

  return Math.round((sessionScore + submitScore) * 100) / 100;
}

/**
 * Quality score: inverse of no-match rate + job failure penalty.
 * Score = (1 - noMatchRate) * 0.7 + (1 - failure_rate_penalty) * 0.3
 */
function computeQualityScore(noMatchRate: number, failedJobsLast7d: number): number {
  const noMatchScore = (1 - noMatchRate) * 0.7;
  // Failed jobs: 0 = no penalty, 10+ = max penalty
  const failurePenalty = Math.min(failedJobsLast7d / 10, 1) * 0.3;
  const failureScore = (1 - failurePenalty) * 0.3;

  return Math.max(0, Math.min(1, noMatchScore + failureScore));
}

/**
 * Commercial score: revenue + conversion activity.
 * Score = min(revenue/10000, 1) * 0.6 + min(conversions/100, 1) * 0.4
 */
function computeCommercialScore(revenue: number, conversions: number): number {
  if (revenue === 0 && conversions === 0) return 0;

  const revenueScore = Math.min(revenue / 10000, 1) * 0.6;
  const conversionScore = Math.min(conversions / 100, 1) * 0.4;

  return Math.round((revenueScore + conversionScore) * 100) / 100;
}

/**
 * Release score: readiness - blocker penalty.
 */
function computeReleaseScore(readiness: number, blockers: number, anomalies: number): number {
  const baseScore = readiness;
  const blockerPenalty = Math.min(blockers * 0.15, 0.5);
  const anomalyPenalty = Math.min(anomalies * 0.05, 0.2);

  return Math.max(0, Math.min(1, baseScore - blockerPenalty - anomalyPenalty));
}

// =============================================================================
// RISK / WIN EXTRACTION
// =============================================================================

function extractGrowthRisks(input: GrowthSectionInput): string[] {
  const risks: string[] = [];
  if (input.sessions === 0) risks.push('No sessions recorded — crawler/enrich pipeline may not be running');
  if ((input.submitRate ?? 0) < 0.03) risks.push(`Submit rate low (${((input.submitRate ?? 0) * 100).toFixed(1)}%)`);
  if (input.submitRateTrend === 'down') risks.push('Submit rate declining week-over-week');
  return risks;
}

function extractGrowthWins(input: GrowthSectionInput): string[] {
  const wins: string[] = [];
  if ((input.sessions ?? 0) > 1000) wins.push(`Strong activity: ${input.sessions.toLocaleString()} content items`);
  if (input.submitRateTrend === 'up') wins.push('Submit rate improving week-over-week');
  if ((input.surfaceCount ?? 0) > 0) wins.push(`${input.surfaceCount} active surface(s)`);
  return wins;
}

function extractQualityRisks(input: QualitySectionInput): string[] {
  const risks: string[] = [];
  if ((input.noMatchRate ?? 0) > 0.3) risks.push(`No-match rate elevated at ${((input.noMatchRate ?? 0) * 100).toFixed(1)}%`);
  if (input.noMatchRateTrend === 'up') risks.push('No-match rate worsening');
  if ((input.failedJobsLast7d ?? 0) > 10) risks.push(`${input.failedJobsLast7d} jobs failed in last 7 days`);
  return risks;
}

function extractQualityWins(input: QualitySectionInput): string[] {
  const wins: string[] = [];
  if ((input.noMatchRate ?? 0) < 0.1) wins.push('Low no-match rate — voucher coverage is healthy');
  if ((input.copyRate ?? 0) > 0.3) wins.push(`Strong copy rate at ${((input.copyRate ?? 0) * 100).toFixed(1)}%`);
  return wins;
}

function extractCommercialRisks(input: CommercialSectionInput): string[] {
  const risks: string[] = [];
  if (input.revenue === 0) risks.push('No revenue recorded — affiliate attribution not yet wired');
  if (input.revenueTrend === 'down') risks.push('Revenue declining week-over-week');
  return risks;
}

function extractCommercialWins(input: CommercialSectionInput): string[] {
  const wins: string[] = [];
  if (input.revenue > 0) wins.push(`Revenue recorded: ${input.revenue.toFixed(2)}`);
  if ((input.conversions ?? 0) > 0) wins.push(`${input.conversions} conversion(s) confirmed`);
  return wins;
}

function extractReleaseRisks(input: ReleaseSectionInput): string[] {
  const risks: string[] = [];
  if ((input.blockers ?? 0) > 2) risks.push(`Too many blockers (${input.blockers}) — block deployment`);
  if ((input.anomalies ?? 0) > 3) risks.push(`${input.anomalies} anomalies detected`);
  return risks;
}

function extractReleaseWins(input: ReleaseSectionInput): string[] {
  const wins: string[] = [];
  if ((input.blockers ?? 0) === 0) wins.push('No release blockers');
  if ((input.activeExperiments ?? 0) > 0) wins.push(`${input.activeExperiments} experiment(s) running`);
  return wins;
}

// =============================================================================
// STATUS / METRICS / INSIGHTS HELPERS
// =============================================================================

function classifyStatus(score: number): FounderHealthStatus {
  if (score >= HEALTH_THRESHOLDS.HEALTHY_MIN) return 'healthy';
  if (score >= HEALTH_THRESHOLDS.WARNING_MIN) return 'neutral';
  return 'critical';
}

function buildMetrics(items: Array<{
  key: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
}>): FounderCockpitSection['metrics'] {
  return items.map(m => ({
    key: m.key,
    name: m.name,
    value: m.value,
    unit: m.unit,
    changePercent: m.change,
    trend: m.trend,
  }));
}

function buildInsights(
  section: string,
  dataMode: DataModeInfo,
  score: number,
  metrics: FounderCockpitSection['metrics']
): FounderCockpitSection['insights'] {
  const insights: FounderCockpitSectionInsight[] = [];

  if (dataMode.mode === 'demo' || !dataMode.hasData) {
    insights.push({
      type: 'warning',
      message: `Running in demo mode — no real data found for ${section} in the selected period. ${dataMode.note ?? 'Seed the system by running the crawler → enrich → publish cycle.'}`,
    });
  }

  return insights;
}
