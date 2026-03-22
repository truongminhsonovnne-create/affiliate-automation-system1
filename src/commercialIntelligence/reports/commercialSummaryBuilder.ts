/**
 * Commercial Summary Builder
 *
 * Production-grade commercial performance summaries.
 */

import type {
  CommercialPerformanceSummary,
  VoucherCommercialPerformance,
  GrowthSurfaceCommercialPerformance,
  CommercialFunnelPerformance,
  GrowthSurfaceType,
  CommercialResult,
} from '../types.js';
import { getFunnelAggregationService } from '../funnel/funnelAggregationService.js';
import { getRevenueQualityBalanceService } from '../metrics/revenueQualityBalanceService.js';

/**
 * Commercial Summary Builder
 *
 * Builds commercial performance summaries for different entities.
 */
export class CommercialSummaryBuilder {
  /**
   * Build commercial performance summary
   */
  async buildCommercialPerformanceSummary(params: {
    startDate: Date;
    endDate: Date;
    includeVouchers?: boolean;
    includeSurfaces?: boolean;
    voucherLimit?: number;
    surfaceLimit?: number;
  }): Promise<CommercialResult<CommercialPerformanceSummary>> {
    try {
      const funnelService = getFunnelAggregationService();

      // Get global funnel performance
      const funnelResult = await funnelService.aggregateCommercialFunnel({
        startDate: params.startDate,
        endDate: params.endDate,
      });

      if (!funnelResult.success || !funnelResult.data) {
        return { success: false, error: funnelResult.error ?? 'Failed to aggregate funnel' };
      }

      // Get voucher performance
      let voucherPerformance: VoucherCommercialPerformance[] = [];
      if (params.includeVouchers !== false) {
        // This would need to query all vouchers - simplified for now
        voucherPerformance = [];
      }

      // Get surface performance
      let surfacePerformance: GrowthSurfaceCommercialPerformance[] = [];
      if (params.includeSurfaces !== false) {
        // This would need to query all surfaces - simplified for now
        surfacePerformance = [];
      }

      // Calculate global totals
      const globalMetrics = this.calculateGlobalMetrics(funnelResult.data, voucherPerformance, surfacePerformance);

      return {
        success: true,
        data: {
          globalMetrics,
          voucherPerformance,
          surfacePerformance,
          funnelPerformance: funnelResult.data,
          periodStart: params.startDate,
          periodEnd: params.endDate,
          generatedAt: new Date(),
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Build voucher commercial summary
   */
  async buildVoucherCommercialSummary(params: {
    voucherId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<CommercialResult<VoucherCommercialPerformance>> {
    const funnelService = getFunnelAggregationService();
    return funnelService.aggregateVoucherCommercialPerformance(params);
  }

  /**
   * Build growth surface commercial summary
   */
  async buildGrowthSurfaceCommercialSummary(params: {
    surfaceType: GrowthSurfaceType;
    surfaceId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<CommercialResult<GrowthSurfaceCommercialPerformance>> {
    const funnelService = getFunnelAggregationService();
    return funnelService.aggregateGrowthSurfaceCommercialPerformance(params);
  }

  /**
   * Build commercial trend summary
   */
  async buildCommercialTrendSummary(params: {
    currentStartDate: Date;
    currentEndDate: Date;
    previousStartDate: Date;
    previousEndDate: Date;
  }): Promise<CommercialResult<{
    trends: Record<string, {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
    }>;
    overallHealth: 'improving' | 'stable' | 'declining';
  }>> {
    try {
      const funnelService = getFunnelAggregationService();

      // Get current period
      const currentResult = await funnelService.aggregateCommercialFunnel({
        startDate: params.currentStartDate,
        endDate: params.currentEndDate,
      });

      // Get previous period
      const previousResult = await funnelService.aggregateCommercialFunnel({
        startDate: params.previousStartDate,
        endDate: params.previousEndDate,
      });

      if (!currentResult.success || !previousResult.success) {
        return { success: false, error: 'Failed to aggregate funnel data' };
      }

      const current = currentResult.data;
      const previous = previousResult.data;

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return { change: current, changePercent: current > 0 ? 100 : 0 };
        const change = current - previous;
        const changePercent = (change / previous) * 100;
        return { change, changePercent };
      };

      const trends = {
        pageViews: calculateChange(current.metrics.pageViews, previous.metrics.pageViews),
        pasteSubmits: calculateChange(current.metrics.pasteSubmits, previous.metrics.pasteSubmits),
        resolutionSuccess: calculateChange(current.metrics.resolutionSuccess, previous.metrics.resolutionSuccess),
        resolutionNoMatch: calculateChange(current.metrics.resolutionNoMatch, previous.metrics.resolutionNoMatch),
        voucherCopies: calculateChange(current.metrics.voucherCopySuccess, previous.metrics.voucherCopySuccess),
        shopeeOpens: calculateChange(current.metrics.openShopeeClicks, previous.metrics.openShopeeClicks),
        submitRate: calculateChange(current.rates.submitRate, previous.rates.submitRate),
        resolutionSuccessRate: calculateChange(current.rates.resolutionSuccessRate, previous.rates.resolutionSuccessRate),
        copyRate: calculateChange(current.rates.copyRate, previous.rates.copyRate),
        openRate: calculateChange(current.rates.openRate, previous.rates.openRate),
      };

      // Determine overall health
      let healthScore = 0;
      if (trends.resolutionSuccessRate.changePercent > 0) healthScore++;
      if (trends.copyRate.changePercent > 0) healthScore++;
      if (trends.openRate.changePercent > 0) healthScore++;
      if (trends.resolutionNoMatch.changePercent < 0) healthScore++;

      const overallHealth = healthScore >= 3 ? 'improving' : healthScore >= 1 ? 'stable' : 'declining';

      return {
        success: true,
        data: { trends, overallHealth },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Calculate global metrics
   */
  private calculateGlobalMetrics(
    funnelPerformance: CommercialFunnelPerformance,
    voucherPerformance: VoucherCommercialPerformance[],
    surfacePerformance: GrowthSurfaceCommercialPerformance[]
  ): CommercialPerformanceSummary['globalMetrics'] {
    const totalRevenue = voucherPerformance.reduce((sum, v) => sum + v.totalRevenue, 0);
    const totalCommission = voucherPerformance.reduce((sum, v) => sum + v.totalCommission, 0);
    const totalConversions = voucherPerformance.reduce((sum, v) => sum + v.totalConversions, 0);
    const totalClicks = voucherPerformance.reduce((sum, v) => sum + v.totalClicks, 0);
    const totalSessions = funnelPerformance.uniqueSessions;

    return {
      totalRevenue,
      totalCommission,
      totalConversions,
      totalClicks,
      totalSessions,
    };
  }
}

// ============================================================
// Factory
// ============================================================

let summaryBuilder: CommercialSummaryBuilder | null = null;

export function getCommercialSummaryBuilder(): CommercialSummaryBuilder {
  if (!summaryBuilder) {
    summaryBuilder = new CommercialSummaryBuilder();
  }
  return summaryBuilder;
}

// ============================================================
// Direct Exports
// ============================================================

export async function buildCommercialPerformanceSummary(
  params: Parameters<CommercialSummaryBuilder['buildCommercialPerformanceSummary']>[0]
): Promise<CommercialResult<CommercialPerformanceSummary>> {
  return getCommercialSummaryBuilder().buildCommercialPerformanceSummary(params);
}

export async function buildVoucherCommercialSummary(
  params: Parameters<CommercialSummaryBuilder['buildVoucherCommercialSummary']>[0]
): Promise<CommercialResult<VoucherCommercialPerformance>> {
  return getCommercialSummaryBuilder().buildVoucherCommercialSummary(params);
}

export async function buildGrowthSurfaceCommercialSummary(
  params: Parameters<CommercialSummaryBuilder['buildGrowthSurfaceCommercialSummary']>[0]
): Promise<CommercialResult<GrowthSurfaceCommercialPerformance>> {
  return getCommercialSummaryBuilder().buildGrowthSurfaceCommercialSummary(params);
}

export async function buildCommercialTrendSummary(
  params: Parameters<CommercialSummaryBuilder['buildCommercialTrendSummary']>[0]
): Promise<CommercialResult<{
  trends: Record<string, { current: number; previous: number; change: number; changePercent: number }>;
  overallHealth: 'improving' | 'stable' | 'declining';
}>> {
  return getCommercialSummaryBuilder().buildCommercialTrendSummary(params);
}
