/**
 * Operator BI View Builder
 *
 * Production-grade builder for operator BI surfaces.
 */

import type { OperatorBiSurfaceType, OperatorBiViewFilters, OperatorBiViewResult, BiResult } from '../types.js';
import { getGrowthBiMetrics } from '../integration/growthBiIntegration.js';
import { getCommercialBiMetrics } from '../integration/commercialBiIntegration.js';
import { getReleaseReadinessBiMetrics } from '../integration/productGovernanceBiIntegration.js';
import { getProductOpsBiMetrics } from '../integration/productOpsBiIntegration.js';
import { logger } from '../../utils/logger.js';

/**
 * Operator BI View Builder
 */
export class OperatorBiViewBuilder {
  async buildOperatorBiView(
    surface: OperatorBiSurfaceType,
    filters: OperatorBiViewFilters
  ): Promise<BiResult<OperatorBiViewResult>> {
    try {
      const startDate = filters.dateRange?.start ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = filters.dateRange?.end ?? new Date();

      switch (surface) {
        case 'growth_ops':
          return this.buildGrowthOpsView(startDate, endDate, filters);
        case 'product_ops':
          return this.buildProductOpsView(startDate, endDate, filters);
        case 'commercial_ops':
          return this.buildCommercialOpsView(startDate, endDate, filters);
        case 'release_ops':
          return this.buildReleaseOpsView(startDate, endDate, filters);
        case 'quality_ops':
          return this.buildQualityOpsView(startDate, endDate, filters);
        default:
          return { success: false, error: `Unknown surface: ${surface}` };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  private async buildGrowthOpsView(startDate: Date, endDate: Date, filters: OperatorBiViewFilters): Promise<BiResult<OperatorBiViewResult>> {
    const metrics = await getGrowthBiMetrics(startDate, endDate);
    return {
      success: true,
      data: {
        surface: 'growth_ops',
        data: [
          { metric: 'total_sessions', value: metrics.totalSessions },
          { metric: 'submit_rate', value: metrics.submitRate },
          { metric: 'surface_count', value: metrics.surfaceCount },
          { metric: 'session_trend', value: metrics.sessionTrend },
        ],
        summary: { totalItems: 4, filteredCount: 4 },
        metadata: { period: { start: startDate, end: endDate } },
      },
    };
  }

  private async buildProductOpsView(startDate: Date, endDate: Date, filters: OperatorBiViewFilters): Promise<BiResult<OperatorBiViewResult>> {
    const metrics = await getProductOpsBiMetrics(startDate, endDate);
    return {
      success: true,
      data: {
        surface: 'product_ops',
        data: metrics,
        summary: { totalItems: metrics.length, filteredCount: metrics.length },
        metadata: { period: { start: startDate, end: endDate } },
      },
    };
  }

  private async buildCommercialOpsView(startDate: Date, endDate: Date, filters: OperatorBiViewFilters): Promise<BiResult<OperatorBiViewResult>> {
    const metrics = await getCommercialBiMetrics(startDate, endDate);
    return {
      success: true,
      data: {
        surface: 'commercial_ops',
        data: [
          { metric: 'total_revenue', value: metrics.totalRevenue },
          { metric: 'total_commission', value: metrics.totalCommission },
          { metric: 'conversions', value: metrics.totalConversions },
          { metric: 'revenue_per_session', value: metrics.revenuePerSession },
        ],
        summary: { totalItems: 4, filteredCount: 4 },
        metadata: { period: { start: startDate, end: endDate } },
      },
    };
  }

  private async buildReleaseOpsView(startDate: Date, endDate: Date, filters: OperatorBiViewFilters): Promise<BiResult<OperatorBiViewResult>> {
    const metrics = await getReleaseReadinessBiMetrics(startDate, endDate);
    return {
      success: true,
      data: {
        surface: 'release_ops',
        data: [
          { metric: 'readiness_score', value: metrics.readinessScore },
          { metric: 'active_blockers', value: metrics.activeBlockers },
          { metric: 'active_anomalies', value: metrics.activeAnomalies },
          { metric: 'governance_score', value: metrics.governanceScore },
        ],
        summary: { totalItems: 4, filteredCount: 4 },
        metadata: { period: { start: startDate, end: endDate } },
      },
    };
  }

  private async buildQualityOpsView(startDate: Date, endDate: Date, filters: OperatorBiViewFilters): Promise<BiResult<OperatorBiViewResult>> {
    return {
      success: true,
      data: {
        surface: 'quality_ops',
        data: [],
        summary: { totalItems: 0, filteredCount: 0 },
        metadata: { period: { start: startDate, end: endDate } },
      },
    };
  }
}

let builder: OperatorBiViewBuilder | null = null;
export function getOperatorBiViewBuilder(): OperatorBiViewBuilder {
  if (!builder) builder = new OperatorBiViewBuilder();
  return builder;
}

export async function buildOperatorBiView(
  surface: OperatorBiSurfaceType,
  filters: OperatorBiViewFilters
): Promise<BiResult<OperatorBiViewResult>> {
  return getOperatorBiViewBuilder().buildOperatorBiView(surface, filters);
}
