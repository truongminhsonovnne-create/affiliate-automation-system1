/**
 * BI Founder Integration
 *
 * Bridges the BI system and the Founder Cockpit.
 *
 * Before: all functions returned hardcoded mock data.
 * Now: fetches real metrics from the metrics repository and
 *       falls back to demo mode with explicit indicators.
 */

import {
  fetchGrowthMetrics,
  fetchQualityMetrics,
  fetchCommercialMetrics,
  fetchReleaseMetrics,
  fetchDecisionMetrics,
  fetchFollowupMetrics,
  type DataModeInfo,
} from '../repositories/founderMetricsRepository.js';

export interface FounderBiMetrics {
  growth: {
    sessions: number;
    submitRate: number;
  };
  quality: {
    noMatchRate: number;
    copyRate: number;
  };
  commercial: {
    revenue: number;
    commission: number;
    conversions: number;
  };
  release: {
    readinessScore: number;
    blockers: number;
    anomalies: number;
  };
  decisions: {
    pending: number;
    critical: number;
    high: number;
  };
  followups: {
    pending: number;
    stale: number;
  };
  dataMode: DataModeInfo;
}

/**
 * Collect real founder metrics from BI/operational sources.
 */
export async function collectFounderMetricsFromBi(
  startDate: Date,
  endDate: Date
): Promise<FounderBiMetrics> {
  const [growth, quality, commercial, release, decisions, followups] = await Promise.all([
    fetchGrowthMetrics(startDate, endDate),
    fetchQualityMetrics(startDate, endDate),
    fetchCommercialMetrics(startDate, endDate),
    fetchReleaseMetrics(startDate, endDate),
    fetchDecisionMetrics(),
    fetchFollowupMetrics(),
  ]);

  return {
    growth: {
      sessions: growth.sessions,
      submitRate: growth.submitRate,
    },
    quality: {
      noMatchRate: quality.noMatchRate,
      copyRate: quality.copyRate,
    },
    commercial: {
      revenue: commercial.revenue,
      commission: commercial.commission,
      conversions: commercial.conversions,
    },
    release: {
      readinessScore: release.readinessScore,
      blockers: release.blockers,
      anomalies: release.anomalies,
    },
    decisions: {
      pending: decisions.pending,
      critical: decisions.critical,
      high: decisions.high,
    },
    followups: {
      pending: followups.pending,
      stale: followups.stale,
    },
    dataMode: growth.dataMode,
  };
}

/**
 * Collect active alerts from BI system for founder dashboard.
 */
export async function collectFounderAlertsFromBi(
  days = 7
): Promise<Array<{
  id: string;
  type: string;
  severity: string;
  sourceArea: string;
  message: string;
  createdAt: Date;
}>> {
  try {
    const sb = (await import('../../db/supabaseClient.js')).getSupabaseClient();
    if (!sb) return [];

    const { data } = await sb
      .from('bi_alert_signals')
      .select('id, alert_type, severity, source_area, alert_payload, created_at')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    return (data ?? []).map(row => {
      const payload = (row.alert_payload ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        type: row.alert_type,
        severity: row.severity,
        sourceArea: row.source_area,
        message: (payload.message as string) ?? row.alert_type,
        createdAt: new Date(row.created_at),
      };
    });
  } catch {
    return [];
  }
}

/**
 * Collect decision inputs for founder decision queue.
 */
export async function collectDecisionInputsFromBi(): Promise<{
  pending: number;
  critical: number;
  high: number;
  byArea: Record<string, number>;
  lastUpdated: Date;
}> {
  const decisions = await fetchDecisionMetrics();
  return {
    ...decisions,
    lastUpdated: new Date(),
  };
}
