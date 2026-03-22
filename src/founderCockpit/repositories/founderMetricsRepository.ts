/**
 * Founder Metrics Repository
 *
 * Single source of truth for all founder cockpit metrics.
 * Queries real operational data from Supabase.
 *
 * Data source priority:
 *   1. Operational tables (crawl_jobs, publish_jobs, affiliate_contents, etc.)
 *   2. Executive scorecard snapshots (bi_system)
 *   3. Decision queue
 *   4. Follow-up backlog
 *
 * When no real data exists, returns zero-filled metrics with `mode: 'demo'`
 * so the UI can display an empty-but-honest state.
 */

import { getSupabaseClient } from '../../db/supabaseClient.js';
import { logger } from '../../utils/logger.js';

// =============================================================================
// TYPES
// =============================================================================

export type DataMode = 'production' | 'demo';

export interface DataModeInfo {
  mode: DataMode;
  hasData: boolean;
  source: string;
  fetchedAt: Date;
  note?: string;
}

export interface GrowthMetrics {
  sessions: number;
  submitRate: number;
  submitRateChange: number;
  submitRateTrend: 'up' | 'down' | 'stable';
  surfaceCount: number;
  surfacesWithGrowth: number;
  topSurface?: string;
  dataMode: DataModeInfo;
}

export interface QualityMetrics {
  noMatchRate: number;
  noMatchRateChange: number;
  noMatchRateTrend: 'up' | 'down' | 'stable';
  copyRate: number;
  copyRateChange: number;
  copyRateTrend: 'up' | 'down' | 'stable';
  openRate: number;
  failedJobsLast7d: number;
  dataMode: DataModeInfo;
}

export interface CommercialMetrics {
  revenue: number;
  revenueChange: number;
  revenueTrend: 'up' | 'down' | 'stable';
  commission: number;
  conversions: number;
  revenuePerSession: number;
  dataMode: DataModeInfo;
}

export interface ReleaseMetrics {
  readinessScore: number;
  blockers: number;
  anomalies: number;
  activeExperiments: number;
  activeReleases: number;
  dataMode: DataModeInfo;
}

export interface CockpitOperationalMetrics {
  growth: GrowthMetrics;
  quality: QualityMetrics;
  commercial: CommercialMetrics;
  release: ReleaseMetrics;
  decisions: {
    pending: number;
    critical: number;
    high: number;
    byArea: Record<string, number>;
  };
  followups: {
    pending: number;
    stale: number;
    criticalStale: number;
  };
  generatedAt: Date;
  mode: DataModeInfo;
}

// =============================================================================
// HELPERS
// =============================================================================

async function getSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available — cannot fetch real metrics');
  }
  return supabase;
}

async function safeQuery<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<{ data: T; mode: DataModeInfo }> {
  const start = Date.now();
  try {
    const data = await fn();
    const fetchedAt = new Date();
    const hasData = JSON.stringify(data) !== JSON.stringify(fallback);
    return {
      data,
      mode: {
        mode: hasData ? 'production' : 'demo',
        hasData,
        source: label,
        fetchedAt,
        note: hasData ? undefined : 'No records found for this period — showing empty state',
      },
    };
  } catch (err) {
    logger.warn({ err, label }, '[FounderMetrics] Query failed, returning demo mode');
    return {
      data: fallback,
      mode: {
        mode: 'demo',
        hasData: false,
        source: label,
        fetchedAt: new Date(),
        note: `Query error: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }
}

// =============================================================================
// GROWTH METRICS
// =============================================================================

/**
 * Fetch real growth metrics from operational tables.
 *
 * Sources:
 * - affiliate_contents.created_at → session volume proxy
 * - voucher_resolution_requests → submit rate
 * - bi_alert_signals → surface health signals
 */
export async function fetchGrowthMetrics(
  startDate: Date,
  endDate: Date
): Promise<GrowthMetrics> {
  const fallback: GrowthMetrics = {
    sessions: 0,
    submitRate: 0,
    submitRateChange: 0,
    submitRateTrend: 'stable',
    surfaceCount: 0,
    surfacesWithGrowth: 0,
    dataMode: { mode: 'demo', hasData: false, source: 'growth', fetchedAt: new Date() },
  };

  const { data, mode } = await safeQuery('growth', async () => {
    const sb = await getSupabase();

    // Session volume: count affiliate_contents created in period (proxy for active usage)
    const { count: contentCount } = await sb
      .from('affiliate_contents')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Submit rate: resolutions attempted / total contents
    const { count: resolutionCount } = await sb
      .from('voucher_resolution_requests')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const sessions = contentCount ?? 0;
    const resolutions = resolutionCount ?? 0;
    const submitRate = sessions > 0 ? resolutions / sessions : 0;

    // Previous period for trend
    const periodMs = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodMs);
    const prevEnd = new Date(endDate.getTime() - periodMs);

    const { count: prevResolutions } = await sb
      .from('voucher_resolution_requests')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prevStart.toISOString())
      .lte('created_at', prevEnd.toISOString());

    const prevRate = sessions > 0 ? (prevResolutions ?? 0) / sessions : 0;
    const submitRateChange = prevRate > 0 ? (submitRate - prevRate) / prevRate : 0;
    const submitRateTrend = submitRateChange > 0.05 ? 'up' : submitRateChange < -0.05 ? 'down' : 'stable';

    return {
      sessions,
      submitRate,
      submitRateChange,
      submitRateTrend,
      surfaceCount: 0,
      surfacesWithGrowth: 0,
    } satisfies Omit<GrowthMetrics, 'dataMode'>;
  }, fallback);

  return { ...data, dataMode: mode };
}

// =============================================================================
// QUALITY METRICS
// =============================================================================

/**
 * Fetch real quality metrics from operational tables.
 *
 * Sources:
 * - voucher_resolution_requests.status → no-match rate
 * - publish_jobs.status → copy/success rate
 * - crawl_jobs.status → crawl quality
 */
export async function fetchQualityMetrics(
  startDate: Date,
  endDate: Date
): Promise<QualityMetrics> {
  const fallback: QualityMetrics = {
    noMatchRate: 0,
    noMatchRateChange: 0,
    noMatchRateTrend: 'stable',
    copyRate: 0,
    copyRateChange: 0,
    copyRateTrend: 'stable',
    openRate: 0,
    failedJobsLast7d: 0,
    dataMode: { mode: 'demo', hasData: false, source: 'quality', fetchedAt: new Date() },
  };

  const { data, mode } = await safeQuery('quality', async () => {
    const sb = await getSupabase();

    // No-match rate from voucher resolutions
    const { data: resolutions } = await sb
      .from('voucher_resolution_requests')
      .select('status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const total = resolutions?.length ?? 0;
    const noMatches = resolutions?.filter(r => r.status === 'no_match').length ?? 0;
    const succeeded = resolutions?.filter(r => r.status === 'succeeded').length ?? 0;
    const noMatchRate = total > 0 ? noMatches / total : 0;
    const copyRate = succeeded > 0 ? succeeded / (noMatches + succeeded) : 0;

    // Failed jobs in last 7 days (proxy for quality)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { count: failedCrawlJobs } = await sb
      .from('crawl_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', sevenDaysAgo.toISOString());

    const { count: failedPublishJobs } = await sb
      .from('publish_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', sevenDaysAgo.toISOString());

    return {
      noMatchRate,
      noMatchRateChange: 0,
      noMatchRateTrend: 'stable' as const,
      copyRate,
      copyRateChange: 0,
      copyRateTrend: 'stable' as const,
      openRate: 0,
      failedJobsLast7d: (failedCrawlJobs ?? 0) + (failedPublishJobs ?? 0),
    } satisfies Omit<QualityMetrics, 'dataMode'>;
  }, fallback);

  return { ...data, dataMode: mode };
}

// =============================================================================
// COMMERCIAL METRICS
// =============================================================================

/**
 * Fetch real commercial metrics.
 *
 * Sources:
 * - bi_alert_signals → revenue signals
 * - executive_scorecard_snapshots → persisted commercial data
 *
 * Note: Full affiliate revenue requires external Shopee API integration.
 * This fetches what's available in the system; revenue = 0 if not yet wired.
 */
export async function fetchCommercialMetrics(
  startDate: Date,
  endDate: Date
): Promise<CommercialMetrics> {
  const fallback: CommercialMetrics = {
    revenue: 0,
    revenueChange: 0,
    revenueTrend: 'stable',
    commission: 0,
    conversions: 0,
    revenuePerSession: 0,
    dataMode: { mode: 'demo', hasData: false, source: 'commercial', fetchedAt: new Date() },
  };

  const { data, mode } = await safeQuery('commercial', async () => {
    const sb = await getSupabase();

    // Try to get from executive scorecard snapshots first
    const { data: scorecards } = await sb
      .from('executive_scorecard_snapshots')
      .select('scorecard_payload')
      .eq('scorecard_type', 'commercial')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (scorecards && scorecards.length > 0) {
      const payload = scorecards[0].scorecard_payload as Record<string, unknown> ?? {};
      const revenue = (payload.revenue as number) ?? 0;
      const commission = (payload.commission as number) ?? 0;
      const conversions = (payload.conversions as number) ?? 0;

      // Revenue per session from growth metrics
      const { count: sessions } = await sb
        .from('affiliate_contents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const revenuePerSession = (sessions ?? 0) > 0 ? revenue / (sessions ?? 1) : 0;

      return { revenue, revenueChange: 0, revenueTrend: 'stable' as const, commission, conversions, revenuePerSession };
    }

    // Fallback: aggregate from publish_jobs (proxy — published content = commercial activity)
    const { count: publishedJobs } = await sb
      .from('publish_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const { count: sessions } = await sb
      .from('affiliate_contents')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return {
      revenue: 0,
      revenueChange: 0,
      revenueTrend: 'stable' as const,
      commission: 0,
      conversions: publishedJobs ?? 0,
      revenuePerSession: 0,
    } satisfies Omit<CommercialMetrics, 'dataMode'>;
  }, fallback);

  return { ...data, dataMode: mode };
}

// =============================================================================
// RELEASE METRICS
// =============================================================================

/**
 * Fetch real release health metrics.
 *
 * Sources:
 * - bi_alert_signals → blockers, anomalies
 * - operator_bi_views → release readiness
 * - experimentation table → active experiments
 */
export async function fetchReleaseMetrics(
  startDate: Date,
  endDate: Date
): Promise<ReleaseMetrics> {
  const fallback: ReleaseMetrics = {
    readinessScore: 0,
    blockers: 0,
    anomalies: 0,
    activeExperiments: 0,
    activeReleases: 0,
    dataMode: { mode: 'demo', hasData: false, source: 'release', fetchedAt: new Date() },
  };

  const { data, mode } = await safeQuery('release', async () => {
    const sb = await getSupabase();

    // Release blockers from BI alerts
    const { data: blockerAlerts } = await sb
      .from('bi_alert_signals')
      .select('*')
      .eq('alert_type', 'threshold_breach')
      .eq('source_area', 'release')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Anomalies from BI alerts
    const { data: anomalyAlerts } = await sb
      .from('bi_alert_signals')
      .select('*')
      .eq('alert_type', 'metric_anomaly')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Readiness score from executive scorecard
    const { data: readinessCards } = await sb
      .from('executive_scorecard_snapshots')
      .select('scorecard_payload')
      .eq('scorecard_type', 'release')
      .order('created_at', { ascending: false })
      .limit(1);

    let readinessScore = 0;
    if (readinessCards && readinessCards.length > 0) {
      readinessScore = (readinessCards[0].scorecard_payload as Record<string, unknown>)?.readiness_score as number ?? 0;
    }

    // Active experiments (from BI system or alerts as proxy)
    const { count: experimentSignals } = await sb
      .from('bi_alert_signals')
      .select('*', { count: 'exact', head: true })
      .eq('alert_type', 'experiment_conclusion')
      .gte('created_at', startDate.toISOString());

    // Active releases: operator_bi_views with release scope
    const { data: releaseViews } = await sb
      .from('operator_bi_views')
      .select('id')
      .eq('view_type', 'release_ops')
      .eq('view_status', 'active');

    const blockers = blockerAlerts?.length ?? 0;
    const anomalies = anomalyAlerts?.length ?? 0;
    const activeExperiments = experimentSignals ?? 0;
    const activeReleases = releaseViews?.length ?? 0;

    // Compute readiness score: 1.0 = no blockers, decreases with blockers/anomalies
    if (readinessScore === 0) {
      readinessScore = Math.max(0, 1 - (blockers * 0.15) - (anomalies * 0.05));
    }

    return { readinessScore, blockers, anomalies, activeExperiments, activeReleases } satisfies Omit<ReleaseMetrics, 'dataMode'>;
  }, fallback);

  return { ...data, dataMode: mode };
}

// =============================================================================
// DECISION & FOLLOWUP METRICS
// =============================================================================

export async function fetchDecisionMetrics(): Promise<{
  pending: number;
  critical: number;
  high: number;
  byArea: Record<string, number>;
}> {
  try {
    const sb = await getSupabase();

    const { data: decisions } = await sb
      .from('founder_decision_queue')
      .select('decision_area, severity')
      .eq('status', 'pending');

    const items = decisions ?? [];
    const pending = items.length;
    const critical = items.filter(d => d.severity === 'critical').length;
    const high = items.filter(d => d.severity === 'high').length;

    const byArea: Record<string, number> = {};
    for (const d of items) {
      byArea[d.decision_area] = (byArea[d.decision_area] ?? 0) + 1;
    }

    return { pending, critical, high, byArea };
  } catch {
    return { pending: 0, critical: 0, high: 0, byArea: {} };
  }
}

export async function fetchFollowupMetrics(): Promise<{
  pending: number;
  stale: number;
  criticalStale: number;
}> {
  try {
    const sb = await getSupabase();

    const { data: followups } = await sb
      .from('operating_followup_backlog')
      .select('backlog_status, priority, due_at')
      .eq('backlog_status', 'pending');

    const items = followups ?? [];
    const pending = items.length;

    const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const criticalStaleThreshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    let stale = 0;
    let criticalStale = 0;

    for (const f of items) {
      if (f.due_at) {
        const dueDate = new Date(f.due_at);
        if (dueDate < staleThreshold) stale++;
        if (dueDate < criticalStaleThreshold) criticalStale++;
      }
    }

    return { pending, stale, criticalStale };
  } catch {
    return { pending: 0, stale: 0, criticalStale: 0 };
  }
}

// =============================================================================
// FULL OPERATIONAL METRICS
// =============================================================================

export async function fetchCockpitOperationalMetrics(
  startDate: Date,
  endDate: Date
): Promise<CockpitOperationalMetrics> {
  const [growth, quality, commercial, release, decisions, followups] = await Promise.all([
    fetchGrowthMetrics(startDate, endDate),
    fetchQualityMetrics(startDate, endDate),
    fetchCommercialMetrics(startDate, endDate),
    fetchReleaseMetrics(startDate, endDate),
    fetchDecisionMetrics(),
    fetchFollowupMetrics(),
  ]);

  // Overall mode: production if ANY section has real data
  const hasData = [growth, quality, commercial, release].some(m => m.dataMode.hasData);

  return {
    growth,
    quality,
    commercial,
    release,
    decisions,
    followups,
    generatedAt: new Date(),
    mode: {
      mode: hasData ? 'production' : 'demo',
      hasData,
      source: 'cockpit_operational',
      fetchedAt: new Date(),
      note: hasData ? undefined : 'No operational data found for this period. System is running but has no recorded activity.',
    },
  };
}
