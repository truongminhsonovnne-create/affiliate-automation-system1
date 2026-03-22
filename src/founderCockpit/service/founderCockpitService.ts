/**
 * Founder Cockpit Service
 *
 * Production-grade service that:
 * - Fetches REAL metrics from Supabase operational tables
 * - Falls back to demo mode with explicit flag if no data exists
 * - Never returns hardcoded numbers silently
 * - Includes DataMode in every response so the UI can display honesty
 */

import type {
  FounderCockpitSnapshot,
  WeeklyOperatingReview,
  StrategicReviewPack,
  FounderDecisionItem,
} from '../types.js';
import { buildFounderCockpitSummary } from '../summary/founderSummaryBuilder.js';
import {
  buildGrowthFounderSection,
  buildQualityFounderSection,
  buildCommercialFounderSection,
  buildReleaseFounderSection,
} from '../summary/founderSectionBuilder.js';
import {
  fetchCockpitOperationalMetrics,
  type CockpitOperationalMetrics,
} from '../repositories/founderMetricsRepository.js';
import { getCockpitSnapshotRepository } from '../repositories/cockpitSnapshotRepository.js';
import { analyzeWeeklyChanges } from '../changes/weeklyChangeAnalyzer.js';
import { buildWeeklyOperatingReview } from '../reviews/weeklyOperatingReviewBuilder.js';
import { buildFounderDecisionQueue } from '../decisions/founderDecisionBuilder.js';
import { logger } from '../../utils/logger.js';

// =============================================================================
// FOUNDER COCKPIT — uses real operational data
// =============================================================================

export async function buildFounderCockpit(params: {
  startDate: Date;
  endDate: Date;
}): Promise<FounderCockpitSnapshot> {
  const { startDate, endDate } = params;

  // Fetch real metrics from operational tables
  const metrics = await fetchCockpitOperationalMetrics(startDate, endDate);

  // Log data mode so operators can see it
  logger.info('[FounderCockpit] Metrics fetched', {
    mode: metrics.mode.mode,
    hasData: metrics.mode.hasData,
    note: metrics.mode.note,
    growthMode: metrics.growth.dataMode.mode,
    qualityMode: metrics.quality.dataMode.mode,
    commercialMode: metrics.commercial.dataMode.mode,
    releaseMode: metrics.release.dataMode.mode,
  });

  // Map operational metrics to section input format (same interface as before)
  const growthInput = {
    sessions: metrics.growth.sessions,
    submitRate: metrics.growth.submitRate,
    submitRateChange: metrics.growth.submitRateChange,
    submitRateTrend: metrics.growth.submitRateTrend,
    surfaceCount: metrics.growth.surfaceCount,
  };

  const qualityInput = {
    noMatchRate: metrics.quality.noMatchRate,
    noMatchRateChange: metrics.quality.noMatchRateChange,
    noMatchRateTrend: metrics.quality.noMatchRateTrend,
    copyRate: metrics.quality.copyRate,
    failedJobsLast7d: metrics.quality.failedJobsLast7d,
  };

  const commercialInput = {
    revenue: metrics.commercial.revenue,
    revenueChange: metrics.commercial.revenueChange,
    revenueTrend: metrics.commercial.revenueTrend,
    commission: metrics.commercial.commission,
    conversions: metrics.commercial.conversions,
  };

  const releaseInput = {
    readinessScore: metrics.release.readinessScore,
    blockers: metrics.release.blockers,
    anomalies: metrics.release.anomalies,
    activeExperiments: metrics.release.activeExperiments,
  };

  const sections = await Promise.all([
    buildGrowthFounderSection(growthInput, metrics.growth.dataMode),
    buildQualityFounderSection(qualityInput, metrics.quality.dataMode),
    buildCommercialFounderSection(commercialInput, metrics.commercial.dataMode),
    buildReleaseFounderSection(releaseInput, metrics.release.dataMode),
  ]);

  const cockpit = await buildFounderCockpitSummary({
    startDate,
    endDate,
    sections,
    decisions: metrics.decisions,
    followups: metrics.followups,
    dataMode: metrics.mode,
  });

  // Persist snapshot (fire-and-forget)
  try {
    await getCockpitSnapshotRepository().create({
      snapshotType: 'founder_cockpit',
      startDate,
      endDate,
      payload: cockpit as unknown as Record<string, unknown>,
    });
  } catch (e) {
    logger.warn({ msg: 'Failed to persist cockpit snapshot', error: e });
  }

  return cockpit;
}

// =============================================================================
// WEEKLY OPERATING RHYTHM — uses real operational data
// =============================================================================

export async function buildWeeklyOperatingRhythm(params: {
  startDate: Date;
  endDate: Date;
}): Promise<WeeklyOperatingReview> {
  const { startDate, endDate } = params;
  const periodMs = endDate.getTime() - startDate.getTime();

  // Fetch current and previous period metrics for trend comparison
  const [currentMetrics, previousMetrics] = await Promise.all([
    fetchCockpitOperationalMetrics(startDate, endDate),
    fetchCockpitOperationalMetrics(
      new Date(startDate.getTime() - periodMs),
      new Date(endDate.getTime() - periodMs),
    ),
  ]);

  // Build comparison object (simplified: revenue, sessions)
  const current = {
    sessions: currentMetrics.growth.sessions,
    revenue: currentMetrics.commercial.revenue,
    noMatchRate: currentMetrics.quality.noMatchRate,
  };

  const previous = {
    sessions: previousMetrics.growth.sessions,
    revenue: previousMetrics.commercial.revenue,
    noMatchRate: previousMetrics.quality.noMatchRate,
  };

  const changes = analyzeWeeklyChanges(current, previous);

  // Derive wins/risks from real data
  const winAreas: string[] = [];
  const riskAreas: string[] = [];

  if (currentMetrics.growth.sessions > previousMetrics.growth.sessions) {
    winAreas.push(`Sessions up ${Math.round(((currentMetrics.growth.sessions - previousMetrics.growth.sessions) / Math.max(previousMetrics.growth.sessions, 1)) * 100)}%`);
  }
  if (currentMetrics.commercial.revenue > previousMetrics.commercial.revenue) {
    winAreas.push(`Revenue up`);
  }
  if (currentMetrics.quality.noMatchRate > 0.3) {
    riskAreas.push('No-match rate elevated (>30%)');
  }
  if (currentMetrics.release.blockers > 0) {
    riskAreas.push(`${currentMetrics.release.blockers} release blocker(s)`);
  }

  const overallScore =
    (currentMetrics.growth.submitRate * 0.25 +
      (1 - currentMetrics.quality.noMatchRate) * 0.25 +
      currentMetrics.release.readinessScore * 0.25 +
      (currentMetrics.growth.sessions > 0 ? 0.25 : 0)) *
    100;

  const review = await buildWeeklyOperatingReview({
    startDate,
    endDate,
    summary: {
      overallHealth: overallScore >= 80 ? 'healthy' : overallScore >= 60 ? 'neutral' : 'at-risk',
      overallScore,
      keyChanges: changes,
      riskAreas,
      winAreas,
    },
    blockers: [],
    priorities: [],
    decisionIds: [],
    followupIds: [],
  });

  return review;
}

// =============================================================================
// STRATEGIC REVIEW — scaffolding with real data
// =============================================================================

export async function buildStrategicReviewAutomationPack(params: {
  type: string;
  startDate: Date;
  endDate: Date;
}): Promise<StrategicReviewPack> {
  const { type, startDate, endDate } = params;

  // Fetch real metrics for strategic context
  const metrics = await fetchCockpitOperationalMetrics(startDate, endDate);

  return {
    id: '',
    reviewType: type as any,
    period: { start: startDate, end: endDate },
    status: 'completed',
    summary: {
      overallHealth: metrics.mode.hasData
        ? (metrics.release.readinessScore >= 0.8 ? 'healthy' : 'at-risk')
        : 'neutral',
      overallScore:
        (metrics.growth.sessions > 0 ? 0.25 : 0) +
        (1 - metrics.quality.noMatchRate) * 0.25 +
        metrics.release.readinessScore * 0.25 +
        (metrics.commercial.revenue > 0 ? 0.25 : 0),
      keyInsights: generateInsights(metrics),
      areasOfFocus: generateFocusAreas(metrics),
    },
    findings: [],
    recommendations: [],
    decisionIds: [],
    createdAt: new Date(),
  };
}

// =============================================================================
// RUN FOUNDER OPERATING CYCLE
// =============================================================================

export async function runFounderOperatingCycle(): Promise<{
  cockpit: FounderCockpitSnapshot;
}> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const cockpit = await buildFounderCockpit({ startDate, endDate });
  return { cockpit };
}

// =============================================================================
// DECISION QUEUE — real data from DB
// =============================================================================

export async function getFounderDecisionQueue(): Promise<{
  items: FounderDecisionItem[];
  summary: { total: number; pending: number; bySeverity: Record<string, number> };
}> {
  const items = await buildFounderDecisionQueue();
  const summary = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    bySeverity: items.reduce<Record<string, number>>((acc, i) => {
      acc[i.severity] = (acc[i.severity] ?? 0) + 1;
      return acc;
    }, {}),
  };
  return { items, summary };
}

// =============================================================================
// PRIVATE HELPERS
// =============================================================================

function generateInsights(metrics: CockpitOperationalMetrics): string[] {
  const insights: string[] = [];

  if (!metrics.mode.hasData) {
    insights.push('System running in demo mode — no operational data recorded yet');
    return insights;
  }

  if (metrics.growth.submitRate < 0.03) {
    insights.push(`Submit rate low at ${(metrics.growth.submitRate * 100).toFixed(1)}% — investigate funnel`);
  }
  if (metrics.quality.noMatchRate > 0.3) {
    insights.push(`No-match rate high at ${(metrics.quality.noMatchRate * 100).toFixed(1)}% — voucher coverage may need expansion`);
  }
  if (metrics.release.blockers > 0) {
    insights.push(`${metrics.release.blockers} active release blocker(s) — blocking deployment`);
  }
  if (metrics.commercial.revenue === 0) {
    insights.push('No commercial revenue recorded — affiliate attribution not yet active');
  }
  if (metrics.growth.sessions > 0 && metrics.commercial.revenue > 0) {
    insights.push(`Revenue recorded: ${metrics.commercial.revenue.toFixed(2)} from ${metrics.growth.sessions} sessions`);
  }

  return insights;
}

function generateFocusAreas(metrics: CockpitOperationalMetrics): string[] {
  const areas: string[] = [];

  if (metrics.quality.noMatchRate > 0.3) areas.push('Improve voucher coverage');
  if (metrics.release.blockers > 0) areas.push('Resolve release blockers');
  if (metrics.followups.stale > 0) areas.push(`Address ${metrics.followups.stale} stale follow-up(s)`);
  if (!metrics.mode.hasData) areas.push('Seed system with initial data (crawl → enrich → publish cycle)');

  return areas;
}
