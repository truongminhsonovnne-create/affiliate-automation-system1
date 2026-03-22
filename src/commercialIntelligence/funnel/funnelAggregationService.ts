/**
 * Funnel Aggregation Service
 *
 * Production-grade funnel aggregation for commercial metrics.
 * Calculates conversion rates and performance by voucher/surface.
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type {
  CommercialFunnelPerformance,
  FunnelMetrics,
  FunnelConversionRates,
  VoucherCommercialPerformance,
  GrowthSurfaceCommercialPerformance,
  GrowthSurfaceType,
  CommercialResult,
  CommercialFunnelEvent,
} from '../types.js';
import { GROWTH_SURFACE_CONFIG } from '../constants.js';
import { logger } from '../../utils/logger.js';

/**
 * Funnel Aggregation Service
 *
 * Handles funnel metrics aggregation and analysis.
 */
export class FunnelAggregationService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  /**
   * Aggregate commercial funnel metrics
   */
  async aggregateCommercialFunnel(params: {
    startDate: Date;
    endDate: Date;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    sessionId?: string;
  }): Promise<CommercialResult<CommercialFunnelPerformance>> {
    try {
      const { startDate, endDate, surfaceType, surfaceId, sessionId } = params;

      // Build query
      let query = this.supabase
        .from('affiliate_funnel_events')
        .select('*')
        .gte('event_time', startDate.toISOString())
        .lte('event_time', endDate.toISOString());

      if (surfaceType) {
        query = query.eq('surface_type', surfaceType);
      }
      if (surfaceId) {
        query = query.eq('surface_id', surfaceId);
      }
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error({
          msg: 'Failed to aggregate commercial funnel',
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      const events = (data ?? []).map(this.mapDbToFunnelEvent);
      const metrics = this.calculateFunnelMetrics(events);
      const rates = this.calculateFunnelConversionRates(metrics);
      const uniqueSessions = new Set(events.map(e => e.sessionId).filter(Boolean)).size;

      return {
        success: true,
        data: {
          metrics,
          rates,
          uniqueSessions,
          periodStart: startDate,
          periodEnd: endDate,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ msg: 'Error aggregating commercial funnel', error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Aggregate voucher commercial performance
   */
  async aggregateVoucherCommercialPerformance(params: {
    voucherId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<CommercialResult<VoucherCommercialPerformance>> {
    try {
      const { voucherId, startDate, endDate } = params;

      // Get funnel events for this voucher
      const { data: events, error: eventsError } = await this.supabase
        .from('affiliate_funnel_events')
        .select('*')
        .eq('voucher_id', voucherId)
        .gte('event_time', startDate.toISOString())
        .lte('event_time', endDate.toISOString());

      if (eventsError) {
        return { success: false, error: eventsError.message };
      }

      // Get conversion reports for this voucher
      const { data: conversions, error: convError } = await this.supabase
        .from('affiliate_conversion_reports')
        .select('*')
        .eq('voucher_id', voucherId)
        .eq('conversion_status', 'confirmed')
        .gte('conversion_time', startDate.toISOString())
        .lte('conversion_time', endDate.toISOString());

      if (convError) {
        return { success: false, error: convError.message };
      }

      // Get clicks for this voucher
      const { data: clicks, error: clicksError } = await this.supabase
        .from('affiliate_click_attributions')
        .select('id')
        .eq('voucher_id', voucherId)
        .gte('clicked_at', startDate.toISOString())
        .lte('clicked_at', endDate.toISOString());

      if (clicksError) {
        return { success: false, error: clicksError.message };
      }

      const eventList = (events ?? []).map(this.mapDbToFunnelEvent);
      const metrics = this.calculateFunnelMetrics(eventList);

      const totalRevenue = (conversions ?? []).reduce((sum, c) => sum + (c.reported_revenue ?? 0), 0);
      const totalCommission = (conversions ?? []).reduce((sum, c) => sum + (c.reported_commission ?? 0), 0);
      const totalConversions = conversions?.length ?? 0;
      const totalClicks = clicks?.length ?? 0;

      const copyToClickRate = totalClicks > 0 ? metrics.openShopeeClicks / totalClicks : 0;
      const conversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0;
      const revenuePerClick = totalClicks > 0 ? totalRevenue / totalClicks : 0;
      const commissionPerClick = totalClicks > 0 ? totalCommission / totalClicks : 0;

      // Calculate scores
      const noMatchRate = metrics.pasteSubmits > 0
        ? metrics.resolutionNoMatch / metrics.pasteSubmits
        : 0;

      return {
        success: true,
        data: {
          voucherId,
          totalClicks,
          totalCopies: metrics.voucherCopySuccess,
          totalConversions,
          totalRevenue,
          totalCommission,
          copyToClickRate,
          conversionRate,
          revenuePerClick,
          commissionPerClick,
          noMatchCount: metrics.resolutionNoMatch,
          noMatchRate,
          qualityScore: this.calculateQualityScore(metrics),
          revenueScore: this.calculateRevenueScore(totalRevenue, totalClicks),
          balanceScore: null, // Calculated by revenue quality balance service
          periodStart: startDate,
          periodEnd: endDate,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Aggregate growth surface commercial performance
   */
  async aggregateGrowthSurfaceCommercialPerformance(params: {
    surfaceType: GrowthSurfaceType;
    surfaceId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<CommercialResult<GrowthSurfaceCommercialPerformance>> {
    try {
      const { surfaceType, surfaceId, startDate, endDate } = params;

      // Get funnel events for this surface
      const { data: events, error: eventsError } = await this.supabase
        .from('affiliate_funnel_events')
        .select('*')
        .eq('surface_type', surfaceType)
        .eq('surface_id', surfaceId)
        .gte('event_time', startDate.toISOString())
        .lte('event_time', endDate.toISOString());

      if (eventsError) {
        return { success: false, error: eventsError.message };
      }

      // Get clicks for this surface
      const { data: clicks, error: clicksError } = await this.supabase
        .from('affiliate_click_attributions')
        .select('*')
        .eq('source_surface_type', surfaceType)
        .eq('source_surface_id', surfaceId)
        .gte('clicked_at', startDate.toISOString())
        .lte('clicked_at', endDate.toISOString());

      if (clicksError) {
        return { success: false, error: clicksError.message };
      }

      // Get conversions for this surface
      const clickIds = (clicks ?? []).map(c => c.id);
      let conversions: Record<string, unknown>[] = [];

      if (clickIds.length > 0) {
        const { data: convData, error: convError } = await this.supabase
          .from('affiliate_conversion_reports')
          .select('*')
          .in('click_attribution_id', clickIds)
          .eq('conversion_status', 'confirmed')
          .gte('conversion_time', startDate.toISOString())
          .lte('conversion_time', endDate.toISOString());

        if (!convError) {
          conversions = convData ?? [];
        }
      }

      const eventList = (events ?? []).map(this.mapDbToFunnelEvent);
      const metrics = this.calculateFunnelMetrics(eventList);

      const uniqueSessions = new Set(
        eventList.map(e => e.sessionId).filter(Boolean)
      ).size;

      const totalRevenue = conversions.reduce((sum, c) => sum + (c.reported_revenue ?? 0), 0);
      const totalCommission = conversions.reduce((sum, c) => sum + (c.reported_commission ?? 0), 0);
      const totalConversions = conversions.length;

      const submitRate = metrics.pageViews > 0 ? metrics.pasteSubmits / metrics.pageViews : 0;
      const resolutionSuccessRate = metrics.pasteSubmits > 0
        ? metrics.resolutionSuccess / metrics.pasteSubmits
        : 0;
      const copyRate = metrics.resolutionSuccess > 0
        ? metrics.voucherCopySuccess / metrics.resolutionSuccess
        : 0;
      const conversionRate = uniqueSessions > 0 ? totalConversions / uniqueSessions : 0;
      const revenuePerSession = uniqueSessions > 0 ? totalRevenue / uniqueSessions : 0;
      const commissionPerSession = uniqueSessions > 0 ? totalCommission / uniqueSessions : 0;

      // Check if low value
      const config = GROWTH_SURFACE_CONFIG[surfaceType];
      const isLowValue = this.isSurfaceLowValue({
        submitRate,
        resolutionSuccessRate,
        conversionRate,
        revenuePerSession,
        expectedRevenuePerSession: config?.expectedRevenuePerSession ?? 0.01,
      });

      return {
        success: true,
        data: {
          surfaceType,
          surfaceId,
          totalSessions: uniqueSessions,
          totalPageViews: metrics.pageViews,
          totalPasteSubmits: metrics.pasteSubmits,
          totalResolutions: metrics.resolutionSuccess + metrics.resolutionNoMatch,
          totalNoMatch: metrics.resolutionNoMatch,
          totalCopies: metrics.voucherCopySuccess,
          totalConversions,
          totalRevenue,
          totalCommission,
          submitRate,
          resolutionSuccessRate,
          copyRate,
          conversionRate,
          revenuePerSession,
          commissionPerSession,
          qualityScore: this.calculateQualityScore(metrics),
          revenueScore: this.calculateRevenueScore(totalRevenue, uniqueSessions),
          balanceScore: null,
          isLowValue,
          periodStart: startDate,
          periodEnd: endDate,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build funnel summary
   */
  buildFunnelSummary(performance: CommercialFunnelPerformance): {
    summary: string;
    conversionPoints: Array<{
      stage: string;
      rate: number;
      description: string;
    }>;
  } {
    const { metrics, rates, uniqueSessions } = performance;

    const summary = `Sessions: ${uniqueSessions}, ` +
      `Page Views: ${metrics.pageViews}, ` +
      `Submits: ${metrics.pasteSubmits} (${(rates.submitRate * 100).toFixed(1)}%), ` +
      `Resolved: ${metrics.resolutionSuccess} (${(rates.resolutionSuccessRate * 100).toFixed(1)}%), ` +
      `Copied: ${metrics.voucherCopySuccess} (${(rates.copyRate * 100).toFixed(1)}%), ` +
      `Opened: ${metrics.openShopeeClicks} (${(rates.openRate * 100).toFixed(1)}%)`;

    const conversionPoints = [
      {
        stage: 'Entry to Submit',
        rate: rates.submitRate,
        description: `${metrics.pasteSubmits} out of ${metrics.pageViews} page views led to paste submission`,
      },
      {
        stage: 'Submit to Resolution',
        rate: rates.resolutionSuccessRate,
        description: `${metrics.resolutionSuccess} out of ${metrics.pasteSubmits} submissions were successfully resolved`,
      },
      {
        stage: 'Resolution to Copy',
        rate: rates.copyRate,
        description: `${metrics.voucherCopySuccess} out of ${metrics.resolutionSuccess} resolutions led to voucher copy`,
      },
      {
        stage: 'Copy to Open',
        rate: rates.openRate,
        description: `${metrics.openShopeeClicks} out of ${metrics.voucherCopySuccess} copies led to Shopee open`,
      },
    ];

    return { summary, conversionPoints };
  }

  /**
   * Calculate funnel metrics from events
   */
  calculateFunnelMetrics(events: CommercialFunnelEvent[]): FunnelMetrics {
    return {
      pageViews: events.filter(e => e.eventType === 'public_page_view').length,
      pasteSubmits: events.filter(e => e.eventType === 'paste_link_submit').length,
      resolutionSuccess: events.filter(e => e.eventType === 'resolution_success').length,
      resolutionNoMatch: events.filter(e => e.eventType === 'resolution_no_match').length,
      bestVoucherViews: events.filter(e => e.eventType === 'best_voucher_view').length,
      candidateVoucherViews: events.filter(e => e.eventType === 'candidate_voucher_view').length,
      voucherCopySuccess: events.filter(e => e.eventType === 'voucher_copy_success').length,
      voucherCopyFailure: events.filter(e => e.eventType === 'voucher_copy_failure').length,
      openShopeeClicks: events.filter(e => e.eventType === 'open_shopee_click').length,
      affiliateLinkClicks: events.filter(e => e.eventType === 'affiliate_link_click').length,
    };
  }

  /**
   * Calculate funnel conversion rates
   */
  calculateFunnelConversionRates(metrics: FunnelMetrics): FunnelConversionRates {
    const submitRate = metrics.pageViews > 0
      ? metrics.pasteSubmits / metrics.pageViews
      : 0;

    const resolutionSuccessRate = metrics.pasteSubmits > 0
      ? metrics.resolutionSuccess / metrics.pasteSubmits
      : 0;

    const noMatchRate = metrics.pasteSubmits > 0
      ? metrics.resolutionNoMatch / metrics.pasteSubmits
      : 0;

    const copyRate = metrics.resolutionSuccess > 0
      ? metrics.voucherCopySuccess / metrics.resolutionSuccess
      : 0;

    const openRate = metrics.voucherCopySuccess > 0
      ? metrics.openShopeeClicks / metrics.voucherCopySuccess
      : 0;

    const affiliateClickRate = metrics.voucherCopySuccess > 0
      ? metrics.affiliateLinkClicks / metrics.voucherCopySuccess
      : 0;

    const overallConversionRate = metrics.pageViews > 0
      ? metrics.openShopeeClicks / metrics.pageViews
      : 0;

    return {
      submitRate,
      resolutionSuccessRate,
      noMatchRate,
      copyRate,
      openRate,
      affiliateClickRate,
      overallConversionRate,
    };
  }

  /**
   * Calculate quality score from metrics
   */
  private calculateQualityScore(metrics: FunnelMetrics): number {
    // Quality is based on resolution success rate and copy success rate
    const resolutionRate = metrics.pasteSubmits > 0
      ? metrics.resolutionSuccess / metrics.pasteSubmits
      : 0;

    const copyRate = metrics.resolutionSuccess > 0
      ? metrics.voucherCopySuccess / metrics.resolutionSuccess
      : 0;

    // Weighted average: resolution 60%, copy 40%
    return resolutionRate * 0.6 + copyRate * 0.4;
  }

  /**
   * Calculate revenue score
   */
  private calculateRevenueScore(totalRevenue: number, sessionsOrClicks: number): number {
    if (sessionsOrClicks === 0) return 0;

    const revenuePerSession = totalRevenue / sessionsOrClicks;

    // Score based on revenue per session
    // 0.01 = 0.2, 0.1 = 0.5, 1.0 = 0.8, 10+ = 1.0
    if (revenuePerSession >= 10) return 1.0;
    if (revenuePerSession >= 1) return 0.8;
    if (revenuePerSession >= 0.1) return 0.5;
    if (revenuePerSession >= 0.01) return 0.2;
    return 0;
  }

  /**
   * Check if surface is low value
   */
  private isSurfaceLowValue(params: {
    submitRate: number;
    resolutionSuccessRate: number;
    conversionRate: number;
    revenuePerSession: number;
    expectedRevenuePerSession: number;
  }): boolean {
    const { submitRate, resolutionSuccessRate, conversionRate, revenuePerSession, expectedRevenuePerSession } = params;

    // Low value if:
    // 1. Very low submit rate (< 1%)
    // 2. Very low resolution success (< 20%)
    // 3. Very low conversion (< 0.1%)
    // 4. Revenue significantly below expectation (< 50%)

    return (
      submitRate < 0.01 ||
      resolutionSuccessRate < 0.2 ||
      conversionRate < 0.001 ||
      revenuePerSession < expectedRevenuePerSession * 0.5
    );
  }

  /**
   * Map database record to FunnelEvent
   */
  private mapDbToFunnelEvent(data: Record<string, unknown>): CommercialFunnelEvent {
    return {
      id: data.id as string,
      sessionId: data.session_id as string | null,
      eventType: data.event_type as CommercialFunnelEvent['eventType'],
      eventTime: new Date(data.event_time as string),
      platform: data.platform as CommercialFunnelEvent['platform'],
      voucherId: data.voucher_id as string | null,
      resolutionRequestId: data.resolution_request_id as string | null,
      surfaceType: data.surface_type as string | null,
      surfaceId: data.surface_id as string | null,
      experimentContext: data.experiment_context as Record<string, unknown> ?? {},
      eventPayload: data.event_payload as Record<string, unknown> ?? {},
      createdAt: new Date(data.created_at as string),
    };
  }
}

// ============================================================
// Factory
// ============================================================

let funnelAggregationService: FunnelAggregationService | null = null;

export function getFunnelAggregationService(): FunnelAggregationService {
  if (!funnelAggregationService) {
    funnelAggregationService = new FunnelAggregationService();
  }
  return funnelAggregationService;
}

// ============================================================
// Direct Exports
// ============================================================

export async function aggregateCommercialFunnel(
  params: Parameters<FunnelAggregationService['aggregateCommercialFunnel']>[0]
): Promise<CommercialResult<CommercialFunnelPerformance>> {
  return getFunnelAggregationService().aggregateCommercialFunnel(params);
}

export async function aggregateVoucherCommercialPerformance(
  params: Parameters<FunnelAggregationService['aggregateVoucherCommercialPerformance']>[0]
): Promise<CommercialResult<VoucherCommercialPerformance>> {
  return getFunnelAggregationService().aggregateVoucherCommercialPerformance(params);
}

export async function aggregateGrowthSurfaceCommercialPerformance(
  params: Parameters<FunnelAggregationService['aggregateGrowthSurfaceCommercialPerformance']>[0]
): Promise<CommercialResult<GrowthSurfaceCommercialPerformance>> {
  return getFunnelAggregationService().aggregateGrowthSurfaceCommercialPerformance(params);
}

export function buildFunnelSummary(
  performance: CommercialFunnelPerformance
): ReturnType<FunnelAggregationService['buildFunnelSummary']> {
  return getFunnelAggregationService().buildFunnelSummary(performance);
}
