/**
 * Commercial Anomaly Detector
 *
 * Production-grade anomaly detection for commercial metrics.
 * Detects revenue-usefulness divergence, low-value surfaces, and underperforming vouchers.
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type {
  CommercialAnomalySignal,
  AnomalyDetectionResult,
  AnomalySignalType,
  AnomalySeverity,
  GrowthSurfaceType,
  VoucherCommercialPerformance,
  GrowthSurfaceCommercialPerformance,
  CommercialResult,
} from '../types.js';
import {
  ANOMALY_DETECTION,
  RISK_THRESHOLDS,
  LOW_VALUE_SURFACE_CRITERIA,
  VOUCHER_UNDERPERFORMANCE,
} from '../constants.js';
import { logger } from '../../utils/logger.js';

/**
 * Commercial Anomaly Detector
 *
 * Detects anomalies in commercial metrics and generates signals.
 */
export class CommercialAnomalyDetector {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  /**
   * Detect commercial anomalies
   */
  async detectCommercialAnomalies(params: {
    startDate: Date;
    endDate: Date;
    baselineStartDate?: Date;
    baselineEndDate?: Date;
  }): Promise<CommercialResult<AnomalyDetectionResult>> {
    try {
      const anomalies: CommercialAnomalySignal[] = [];

      // Detect revenue-usefulness divergence
      const divergenceAnomalies = await this.detectRevenueUsefulnessDivergence(
        params.startDate,
        params.endDate,
        params.baselineStartDate,
        params.baselineEndDate
      );
      anomalies.push(...divergenceAnomalies);

      // Detect low-value growth surfaces
      const lowValueAnomalies = await this.detectLowValueGrowthSurfaces(
        params.startDate,
        params.endDate
      );
      anomalies.push(...lowValueAnomalies);

      // Detect voucher underperformance
      const voucherAnomalies = await this.detectVoucherCommercialUnderperformance(
        params.startDate,
        params.endDate
      );
      anomalies.push(...voucherAnomalies);

      // Save anomalies to database
      for (const anomaly of anomalies) {
        await this.saveAnomalySignal(anomaly);
      }

      return {
        success: true,
        data: {
          anomalies,
          summary: {
            totalAnomalies: anomalies.length,
            criticalCount: anomalies.filter(a => a.severity === 'critical').length,
            warningCount: anomalies.filter(a => a.severity === 'warning').length,
            infoCount: anomalies.filter(a => a.severity === 'info').length,
          },
          periodStart: params.startDate,
          periodEnd: params.endDate,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ msg: 'Error detecting commercial anomalies', error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Detect revenue-usefulness divergence
   */
  async detectRevenueUsefulnessDivergence(
    startDate: Date,
    endDate: Date,
    baselineStartDate?: Date,
    baselineEndDate?: Date
  ): Promise<CommercialAnomalySignal[]> {
    const anomalies: CommercialAnomalySignal[] = [];

    // Use baseline dates if provided
    const baselineStart = baselineStartDate ?? new Date(startDate.getTime() - ANOMALY_DETECTION.BASELINE_DAYS * 24 * 60 * 60 * 1000);
    const baselineEnd = baselineEndDate ?? new Date(startDate.getTime() - 1);

    // Get baseline metrics
    const baselineMetrics = await this.getAggregatedMetrics(baselineStart, baselineEnd);
    // Get current metrics
    const currentMetrics = await this.getAggregatedMetrics(startDate, endDate);

    if (!baselineMetrics || !currentMetrics) {
      return anomalies;
    }

    // Calculate changes
    const revenueChange = baselineMetrics.totalRevenue > 0
      ? (currentMetrics.totalRevenue - baselineMetrics.totalRevenue) / baselineMetrics.totalRevenue
      : 0;

    const noMatchChange = baselineMetrics.noMatchRate > 0
      ? (currentMetrics.noMatchRate - baselineMetrics.noMatchRate) / baselineMetrics.noMatchRate
      : 0;

    // Detect divergence
    if (revenueChange > RISK_THRESHOLDS.REVENUE_SPIKE_THRESHOLD && noMatchChange > 0.5) {
      anomalies.push({
        id: '',
        signalType: 'revenue_usefulness_divergence',
        severity: 'critical',
        targetEntityType: 'global',
        targetEntityId: 'global',
        signalPayload: {
          revenueChange: revenueChange * 100,
          noMatchRateChange: noMatchChange * 100,
          baselineNoMatchRate: baselineMetrics.noMatchRate,
          currentNoMatchRate: currentMetrics.noMatchRate,
          baselineRevenue: baselineMetrics.totalRevenue,
          currentRevenue: currentMetrics.totalRevenue,
        },
        createdAt: new Date(),
      });
    }

    // Check for no-match spike
    if (currentMetrics.noMatchRate > RISK_THRESHOLDS.NO_MATCH_SPIKE_THRESHOLD) {
      anomalies.push({
        id: '',
        signalType: 'no_match_spike',
        severity: currentMetrics.noMatchRate > RISK_THRESHOLDS.NO_MATCH_CRITICAL_THRESHOLD ? 'critical' : 'warning',
        targetEntityType: 'global',
        targetEntityId: 'global',
        signalPayload: {
          noMatchRate: currentMetrics.noMatchRate,
          threshold: RISK_THRESHOLDS.NO_MATCH_SPIKE_THRESHOLD,
          pasteSubmits: currentMetrics.pasteSubmits,
          noMatchCount: currentMetrics.noMatchCount,
        },
        createdAt: new Date(),
      });
    }

    return anomalies;
  }

  /**
   * Detect low-value growth surfaces
   */
  async detectLowValueGrowthSurfaces(
    startDate: Date,
    endDate: Date
  ): Promise<CommercialAnomalySignal[]> {
    const anomalies: CommercialAnomalySignal[] = [];

    // Get surfaces with minimum sessions
    const { data: surfaces } = await this.supabase
      .from('affiliate_funnel_events')
      .select('surface_type, surface_id, session_id')
      .gte('event_time', startDate.toISOString())
      .lte('event_time', endDate.toISOString())
      .not('surface_type', 'is', null);

    if (!surfaces || surfaces.length === 0) {
      return anomalies;
    }

    // Group by surface
    const surfaceMap = new Map<string, Set<string>>();
    for (const event of surfaces) {
      const key = `${event.surface_type}:${event.surface_id}`;
      if (!surfaceMap.has(key)) {
        surfaceMap.set(key, new Set());
      }
      if (event.session_id) {
        surfaceMap.get(key)!.add(event.session_id);
      }
    }

    // Evaluate each surface
    for (const [surfaceKey, sessions] of surfaceMap) {
      const sessionCount = sessions.size;

      if (sessionCount < LOW_VALUE_SURFACE_CRITERIA.MIN_SESSIONS_FOR_EVALUATION) {
        continue;
      }

      const [surfaceType, surfaceId] = surfaceKey.split(':') as [GrowthSurfaceType, string];

      // Get surface metrics
      const { data: surfaceEvents } = await this.supabase
        .from('affiliate_funnel_events')
        .select('event_type')
        .eq('surface_type', surfaceType)
        .eq('surface_id', surfaceId)
        .gte('event_time', startDate.toISOString())
        .lte('event_time', endDate.toISOString());

      if (!surfaceEvents) continue;

      const eventTypes = surfaceEvents.map(e => e.event_type);
      const pasteSubmits = eventTypes.filter(e => e === 'paste_link_submit').length;
      const pageViews = eventTypes.filter(e => e === 'public_page_view' || e === 'growth_surface_view').length;
      const noMatches = eventTypes.filter(e => e === 'resolution_no_match').length;

      const submitRate = pageViews > 0 ? pasteSubmits / pageViews : 0;
      const noMatchRate = pasteSubmits > 0 ? noMatches / pasteSubmits : 0;

      // Check if low value
      if (
        submitRate < LOW_VALUE_THRESHOLDS.SESSION_WITH_NO_SUBMIT ||
        noMatchRate > LOW_VALUE_SURFACE_CRITERIA.MAX_NO_MATCH_RATE
      ) {
        anomalies.push({
          id: '',
          signalType: 'low_value_surface',
          severity: noMatchRate > 0.8 ? 'critical' : 'warning',
          targetEntityType: 'surface',
          targetEntityId: surfaceKey,
          signalPayload: {
            surfaceType,
            surfaceId,
            sessionCount,
            submitRate,
            noMatchRate,
            pageViews,
            pasteSubmits,
          },
          createdAt: new Date(),
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect voucher commercial underperformance
   */
  async detectVoucherCommercialUnderperformance(
    startDate: Date,
    endDate: Date
  ): Promise<CommercialAnomalySignal[]> {
    const anomalies: CommercialAnomalySignal[] = [];

    // Get vouchers with minimum clicks
    const { data: vouchers } = await this.supabase
      .from('affiliate_funnel_events')
      .select('voucher_id, event_type')
      .eq('event_type', 'voucher_copy_success')
      .gte('event_time', startDate.toISOString())
      .lte('event_time', endDate.toISOString())
      .not('voucher_id', 'is', null);

    if (!vouchers || vouchers.length === 0) {
      return anomalies;
    }

    // Count copies per voucher
    const voucherCounts = new Map<string, number>();
    for (const event of vouchers) {
      if (event.voucher_id) {
        voucherCounts.set(event.voucher_id, (voucherCounts.get(event.voucher_id) || 0) + 1);
      }
    }

    // Evaluate each voucher
    for (const [voucherId, copyCount] of voucherCounts) {
      if (copyCount < VOUCHER_UNDERPERFORMANCE.MIN_CLICKS_FOR_EVALUATION) {
        continue;
      }

      // Get resolution data
      const { data: resolutions } = await this.supabase
        .from('affiliate_funnel_events')
        .select('event_type')
        .eq('voucher_id', voucherId)
        .in('event_type', ['resolution_success', 'resolution_no_match'])
        .gte('event_time', startDate.toISOString())
        .lte('event_time', endDate.toISOString());

      if (!resolutions) continue;

      const resolutionsCount = resolutions.length;
      const noMatchCount = resolutions.filter(r => r.event_type === 'resolution_no_match').length;
      const noMatchRate = resolutionsCount > 0 ? noMatchCount / resolutionsCount : 0;

      // Check for underperformance
      if (noMatchRate > VOUCHER_UNDERPERFORMANCE.MAX_NO_MATCH_RATE) {
        anomalies.push({
          id: '',
          signalType: 'voucher_underperformance',
          severity: noMatchRate > 0.9 ? 'critical' : 'warning',
          targetEntityType: 'voucher',
          targetEntityId: voucherId,
          signalPayload: {
            voucherId,
            copyCount,
            noMatchRate,
            noMatchCount,
            totalResolutions: resolutionsCount,
          },
          createdAt: new Date(),
        });
      }
    }

    return anomalies;
  }

  /**
   * Get aggregated metrics
   */
  private async getAggregatedMetrics(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    noMatchRate: number;
    pasteSubmits: number;
    noMatchCount: number;
  } | null> {
    const { data: events } = await this.supabase
      .from('affiliate_funnel_events')
      .select('event_type')
      .gte('event_time', startDate.toISOString())
      .lte('event_time', endDate.toISOString());

    if (!events || events.length === 0) {
      return null;
    }

    const eventTypes = events.map(e => e.event_type);
    const pasteSubmits = eventTypes.filter(e => e === 'paste_link_submit').length;
    const noMatchCount = eventTypes.filter(e => e === 'resolution_no_match').length;
    const noMatchRate = pasteSubmits > 0 ? noMatchCount / pasteSubmits : 0;

    // Get revenue from conversions
    const { data: conversions } = await this.supabase
      .from('affiliate_conversion_reports')
      .select('reported_revenue')
      .eq('conversion_status', 'confirmed')
      .gte('conversion_time', startDate.toISOString())
      .lte('conversion_time', endDate.toISOString());

    const totalRevenue = (conversions ?? []).reduce((sum, c) => sum + (c.reported_revenue ?? 0), 0);

    return { totalRevenue, noMatchRate, pasteSubmits, noMatchCount };
  }

  /**
   * Save anomaly signal to database
   */
  async saveAnomalySignal(anomaly: CommercialAnomalySignal): Promise<void> {
    const { error } = await this.supabase
      .from('commercial_anomaly_signals')
      .insert({
        signal_type: anomaly.signalType,
        severity: anomaly.severity,
        target_entity_type: anomaly.targetEntityType,
        target_entity_id: anomaly.targetEntityId,
        signal_payload: anomaly.signalPayload,
      });

    if (error) {
      logger.error({
        msg: 'Failed to save anomaly signal',
        error: error.message,
        signalType: anomaly.signalType,
      });
    }
  }

  /**
   * Get recent anomalies
   */
  async getRecentAnomalies(params: {
    startDate: Date;
    endDate: Date;
    severity?: AnomalySeverity;
    signalType?: AnomalySignalType;
    targetEntityType?: string;
    limit?: number;
  }): Promise<CommercialAnomalySignal[]> {
    let query = this.supabase
      .from('commercial_anomaly_signals')
      .select('*')
      .gte('created_at', params.startDate.toISOString())
      .lte('created_at', params.endDate.toISOString())
      .order('created_at', { ascending: false });

    if (params.severity) {
      query = query.eq('severity', params.severity);
    }
    if (params.signalType) {
      query = query.eq('signal_type', params.signalType);
    }
    if (params.targetEntityType) {
      query = query.eq('target_entity_type', params.targetEntityType);
    }
    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data } = await query;

    return (data ?? []).map(this.mapDbToAnomaly);
  }

  /**
   * Map database record to AnomalySignal
   */
  private mapDbToAnomaly(data: Record<string, unknown>): CommercialAnomalySignal {
    return {
      id: data.id as string,
      signalType: data.signal_type as AnomalySignalType,
      severity: data.severity as AnomalySeverity,
      targetEntityType: data.target_entity_type as string | null,
      targetEntityId: data.target_entity_id as string | null,
      signalPayload: data.signal_payload as Record<string, unknown> ?? {},
      createdAt: new Date(data.created_at as string),
    };
  }
}

// ============================================================
// Factory
// ============================================================

let anomalyDetector: CommercialAnomalyDetector | null = null;

export function getCommercialAnomalyDetector(): CommercialAnomalyDetector {
  if (!anomalyDetector) {
    anomalyDetector = new CommercialAnomalyDetector();
  }
  return anomalyDetector;
}

// ============================================================
// Direct Exports
// ============================================================

export async function detectCommercialAnomalies(
  params: Parameters<CommercialAnomalyDetector['detectCommercialAnomalies']>[0]
): Promise<CommercialResult<AnomalyDetectionResult>> {
  return getCommercialAnomalyDetector().detectCommercialAnomalies(params);
}

export async function detectRevenueUsefulnessDivergence(
  startDate: Date,
  endDate: Date,
  baselineStartDate?: Date,
  baselineEndDate?: Date
): Promise<CommercialAnomalySignal[]> {
  return getCommercialAnomalyDetector().detectRevenueUsefulnessDivergence(startDate, endDate, baselineStartDate, baselineEndDate);
}

export async function detectLowValueGrowthSurfaces(
  startDate: Date,
  endDate: Date
): Promise<CommercialAnomalySignal[]> {
  return getCommercialAnomalyDetector().detectLowValueGrowthSurfaces(startDate, endDate);
}

export async function detectVoucherCommercialUnderperformance(
  startDate: Date,
  endDate: Date
): Promise<CommercialAnomalySignal[]> {
  return getCommercialAnomalyDetector().detectVoucherCommercialUnderperformance(startDate, endDate);
}
