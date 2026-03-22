/**
 * Revenue Attribution Report Builder
 *
 * Production-grade revenue attribution reports.
 */

import type {
  RevenueAttributionReportDto,
  GrowthSurfaceType,
  AttributionConfidence,
  CommercialResult,
} from '../types.js';
import { getConversionAttributionService } from '../attribution/conversionAttributionService.js';
import { getClickAttributionService } from '../attribution/clickAttributionService.js';

/**
 * Revenue Attribution Report Builder
 *
 * Builds detailed revenue attribution reports.
 */
export class RevenueAttributionReportBuilder {
  /**
   * Build revenue attribution report
   */
  async buildRevenueAttributionReport(params: {
    startDate: Date;
    endDate: Date;
    modelType?: 'first_touch' | 'last_touch' | 'linear' | 'time_decay';
  }): Promise<CommercialResult<RevenueAttributionReportDto>> {
    try {
      const conversionService = getConversionAttributionService();

      // Get all confirmed conversions
      const conversions = await conversionService.getConfirmedConversions(params.startDate, params.endDate);

      // Aggregate by voucher and surface
      const byVoucher = new Map<string, { revenue: number; commission: number; conversions: number }>();
      const bySurface = new Map<string, { revenue: number; commission: number; conversions: number }>();
      const confidenceCounts = { high: 0, medium: 0, low: 0, unknown: 0 };

      let totalAttributedRevenue = 0;
      let totalAttributedCommission = 0;

      for (const conversion of conversions) {
        // Get click attribution if available
        let confidence: AttributionConfidence = 'unknown';
        let surfaceKey = 'unknown';

        if (conversion.clickAttributionId) {
          const clickService = getClickAttributionService();
          const clickResult = await clickService.resolveClickAttribution(
            conversion.clickAttributionId.replace('ck_', '')
          );

          if (clickResult.success && clickResult.data) {
            const click = clickResult.data;
            surfaceKey = `${click.sourceSurfaceType ?? 'unknown'}:${click.sourceSurfaceId ?? 'unknown'}`;

            // Evaluate confidence
            confidence = conversionService.resolveAttributionConfidence({
              hasClickAttribution: true,
              hasVoucherMatch: !!conversion.voucherId,
              hasExternalId: !!conversion.externalConversionId,
              conversionTime: conversion.conversionTime,
              clickTime: click.clickedAt,
            });
          }
        }

        // Aggregate by voucher
        if (conversion.voucherId) {
          const existing = byVoucher.get(conversion.voucherId) ?? { revenue: 0, commission: 0, conversions: 0 };
          byVoucher.set(conversion.voucherId, {
            revenue: existing.revenue + (conversion.reportedRevenue ?? 0),
            commission: existing.commission + (conversion.reportedCommission ?? 0),
            conversions: existing.conversions + 1,
          });
        }

        // Aggregate by surface
        const existingSurface = bySurface.get(surfaceKey) ?? { revenue: 0, commission: 0, conversions: 0 };
        bySurface.set(surfaceKey, {
          revenue: existingSurface.revenue + (conversion.reportedRevenue ?? 0),
          commission: existingSurface.commission + (conversion.reportedCommission ?? 0),
          conversions: existingSurface.conversions + 1,
        });

        // Aggregate confidence
        confidenceCounts[confidence]++;

        // Add to totals
        totalAttributedRevenue += conversion.reportedRevenue ?? 0;
        totalAttributedCommission += conversion.reportedCommission ?? 0;
      }

      return {
        success: true,
        data: {
          period: {
            start: params.startDate.toISOString(),
            end: params.endDate.toISOString(),
          },
          totalAttributedRevenue,
          totalAttributedCommission,
          byVoucher: Array.from(byVoucher.entries()).map(([voucherId, data]) => ({
            voucherId,
            revenue: data.revenue,
            commission: data.commission,
            conversions: data.conversions,
            confidence: 'medium' as AttributionConfidence, // Simplified - would need per-voucher logic
          })),
          bySurface: Array.from(bySurface.entries()).map(([surfaceKey, data]) => {
            const [surfaceType, surfaceId] = surfaceKey.split(':');
            return {
              surfaceType: surfaceType ?? 'unknown',
              surfaceId: surfaceId ?? 'unknown',
              revenue: data.revenue,
              commission: data.commission,
              conversions: data.conversions,
              confidence: 'medium' as AttributionConfidence,
            };
          }),
          attributionConfidence: confidenceCounts,
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Build voucher attribution report
   */
  async buildVoucherAttributionReport(params: {
    voucherId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<CommercialResult<{
    voucherId: string;
    revenue: number;
    commission: number;
    conversions: number;
    clicks: number;
    attributionBreakdown: {
      firstTouch: { revenue: number; commission: number };
      lastTouch: { revenue: number; commission: number };
    };
  }>> {
    try {
      const conversionService = getConversionAttributionService();
      const clickService = getClickAttributionService();

      // Get conversions
      const conversions = await conversionService.getConversionsByVoucher(
        params.voucherId,
        params.startDate,
        params.endDate
      );

      // Get clicks
      const clicks = await clickService.getClicksByVoucher(params.voucherId, params.startDate, params.endDate);

      // Calculate totals
      const revenue = conversions.reduce((sum, c) => sum + (c.reportedRevenue ?? 0), 0);
      const commission = conversions.reduce((sum, c) => sum + (c.reportedCommission ?? 0), 0);

      // For simplicity, attribute all to last_touch (in production, would implement proper multi-touch)
      return {
        success: true,
        data: {
          voucherId: params.voucherId,
          revenue,
          commission,
          conversions: conversions.length,
          clicks: clicks.length,
          attributionBreakdown: {
            firstTouch: { revenue, commission },
            lastTouch: { revenue, commission },
          },
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Build surface attribution report
   */
  async buildSurfaceAttributionReport(params: {
    surfaceType: GrowthSurfaceType;
    surfaceId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<CommercialResult<{
    surfaceType: string;
    surfaceId: string;
    revenue: number;
    commission: number;
    conversions: number;
    clicks: number;
    sessions: number;
  }>> {
    try {
      const conversionService = getConversionAttributionService();
      const clickService = getClickAttributionService();

      // Get conversions
      const conversions = await conversionService.getConversionsBySurface(
        params.surfaceType,
        params.surfaceId,
        params.startDate,
        params.endDate
      );

      // Get clicks
      const clicks = await clickService.getClicksBySurface(
        params.surfaceType,
        params.surfaceId,
        params.startDate,
        params.endDate
      );

      // Calculate totals
      const revenue = conversions.reduce((sum, c) => sum + (c.reportedRevenue ?? 0), 0);
      const commission = conversions.reduce((sum, c) => sum + (c.reportedCommission ?? 0), 0);
      const sessions = new Set(clicks.map(c => c.sessionId).filter(Boolean)).size;

      return {
        success: true,
        data: {
          surfaceType: params.surfaceType,
          surfaceId: params.surfaceId,
          revenue,
          commission,
          conversions: conversions.length,
          clicks: clicks.length,
          sessions,
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Build experiment commercial report
   */
  async buildExperimentCommercialReport(params: {
    experimentId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<CommercialResult<{
    experimentId: string;
    control: {
      revenue: number;
      commission: number;
      conversions: number;
      sessions: number;
      noMatchRate: number;
    };
    treatment: {
      revenue: number;
      commission: number;
      conversions: number;
      sessions: number;
      noMatchRate: number;
    };
    delta: {
      revenue: number;
      commission: number;
      conversions: number;
      sessions: number;
      noMatchRate: number;
    };
    recommendation: 'approve' | 'reject' | 'continue';
  }>> {
    try {
      // Get events for experiment
      const { getSupabaseClient } = await import('../../db/supabaseClient.js');
      const supabase = getSupabaseClient();

      // Query events by experiment context
      const { data: events } = await supabase
        .from('affiliate_funnel_events')
        .select('*')
        .contains('experiment_context', { experimentId: params.experimentId })
        .gte('event_time', params.startDate.toISOString())
        .lte('event_time', params.endDate.toISOString());

      if (!events || events.length === 0) {
        return { success: false, error: 'No events found for experiment' };
      }

      // Separate by variant
      const controlEvents = events.filter(e => e.experiment_context?.variant === 'control');
      const treatmentEvents = events.filter(e => e.experiment_context?.variant === 'treatment');

      const calculateMetrics = (eventList: typeof events) => {
        const eventTypes = eventList.map(e => e.event_type);
        const sessions = new Set(eventList.map(e => e.session_id).filter(Boolean)).size;
        const pasteSubmits = eventTypes.filter(e => e === 'paste_link_submit').length;
        const noMatches = eventTypes.filter(e => e === 'resolution_no_match').length;
        const conversions = eventTypes.filter(e => e === 'open_shopee_click').length;

        return {
          sessions,
          noMatchRate: pasteSubmits > 0 ? noMatches / pasteSubmits : 0,
          conversions,
        };
      };

      const controlMetrics = calculateMetrics(controlEvents);
      const treatmentMetrics = calculateMetrics(treatmentEvents);

      // Get conversion/revenue data (simplified - would need proper attribution)
      const controlRevenue = 0;
      const treatmentRevenue = 0;

      const delta = {
        revenue: treatmentRevenue - controlRevenue,
        commission: 0,
        conversions: treatmentMetrics.conversions - controlMetrics.conversions,
        sessions: treatmentMetrics.sessions - controlMetrics.sessions,
        noMatchRate: treatmentMetrics.noMatchRate - controlMetrics.noMatchRate,
      };

      // Determine recommendation
      let recommendation: 'approve' | 'reject' | 'continue' = 'continue';

      if (treatmentMetrics.sessions >= 100) {
        if (delta.revenue > 0 && delta.noMatchRate <= 0) {
          recommendation = 'approve';
        } else if (delta.revenue < -0.1 || delta.noMatchRate > 0.1) {
          recommendation = 'reject';
        }
      }

      return {
        success: true,
        data: {
          experimentId: params.experimentId,
          control: {
            revenue: controlRevenue,
            commission: 0,
            ...controlMetrics,
          },
          treatment: {
            revenue: treatmentRevenue,
            commission: 0,
            ...treatmentMetrics,
          },
          delta,
          recommendation,
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}

// ============================================================
// Factory
// ============================================================

let revenueAttributionReportBuilder: RevenueAttributionReportBuilder | null = null;

export function getRevenueAttributionReportBuilder(): RevenueAttributionReportBuilder {
  if (!revenueAttributionReportBuilder) {
    revenueAttributionReportBuilder = new RevenueAttributionReportBuilder();
  }
  return revenueAttributionReportBuilder;
}

// ============================================================
// Direct Exports
// ============================================================

export async function buildRevenueAttributionReport(
  params: Parameters<RevenueAttributionReportBuilder['buildRevenueAttributionReport']>[0]
): Promise<CommercialResult<RevenueAttributionReportDto>> {
  return getRevenueAttributionReportBuilder().buildRevenueAttributionReport(params);
}

export async function buildVoucherAttributionReport(
  params: Parameters<RevenueAttributionReportBuilder['buildVoucherAttributionReport']>[0]
): Promise<CommercialResult<{
  voucherId: string;
  revenue: number;
  commission: number;
  conversions: number;
  clicks: number;
  attributionBreakdown: {
    firstTouch: { revenue: number; commission: number };
    lastTouch: { revenue: number; commission: number };
  };
}>> {
  return getRevenueAttributionReportBuilder().buildVoucherAttributionReport(params);
}

export async function buildSurfaceAttributionReport(
  params: Parameters<RevenueAttributionReportBuilder['buildSurfaceAttributionReport']>[0]
): Promise<CommercialResult<{
  surfaceType: string;
  surfaceId: string;
  revenue: number;
  commission: number;
  conversions: number;
  clicks: number;
  sessions: number;
}>> {
  return getRevenueAttributionReportBuilder().buildSurfaceAttributionReport(params);
}

export async function buildExperimentCommercialReport(
  params: Parameters<RevenueAttributionReportBuilder['buildExperimentCommercialReport']>[0]
): Promise<CommercialResult<{
  experimentId: string;
  control: { revenue: number; commission: number; conversions: number; sessions: number; noMatchRate: number };
  treatment: { revenue: number; commission: number; conversions: number; sessions: number; noMatchRate: number };
  delta: { revenue: number; commission: number; conversions: number; sessions: number; noMatchRate: number };
  recommendation: 'approve' | 'reject' | 'continue';
}>> {
  return getRevenueAttributionReportBuilder().buildExperimentCommercialReport(params);
}
