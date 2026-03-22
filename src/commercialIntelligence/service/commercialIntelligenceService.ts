/**
 * Commercial Intelligence Service
 *
 * Main orchestrator for commercial intelligence operations.
 */

import type {
  CommercialPerformanceSummary,
  RevenueQualityBalanceResult,
  GovernanceReviewType,
  CommercialResult,
  DateRangeParams,
} from '../types.js';
import { getFunnelAggregationService } from '../funnel/funnelAggregationService.js';
import { getRevenueQualityBalanceService } from '../metrics/revenueQualityBalanceService.js';
import { getCommercialAnomalyDetector } from '../anomalies/commercialAnomalyDetector.js';
import { getCommercialGovernanceService } from '../governance/commercialGovernanceService.js';
import { getCommercialSummaryBuilder } from '../reports/commercialSummaryBuilder.js';
import { logger } from '../../utils/logger.js';

/**
 * Commercial Intelligence Service
 *
 * Orchestrates all commercial intelligence operations.
 */
export class CommercialIntelligenceService {
  /**
   * Run commercial attribution cycle
   */
  async runCommercialAttributionCycle(params: {
    startDate: Date;
    endDate: Date;
    includeVouchers?: boolean;
    includeSurfaces?: boolean;
  }): Promise<CommercialResult<{
    attributed: boolean;
    conversionsProcessed: number;
    errors: string[];
  }>> {
    try {
      logger.info({
        msg: 'Starting commercial attribution cycle',
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      });

      const errors: string[] = [];

      // 1. Aggregate funnel metrics
      const funnelService = getFunnelAggregationService();
      const funnelResult = await funnelService.aggregateCommercialFunnel({
        startDate: params.startDate,
        endDate: params.endDate,
      });

      if (!funnelResult.success) {
        errors.push(`Funnel aggregation failed: ${funnelResult.error}`);
      }

      // 2. Run anomaly detection
      const anomalyDetector = getCommercialAnomalyDetector();
      const anomalyResult = await anomalyDetector.detectCommercialAnomalies({
        startDate: params.startDate,
        endDate: params.endDate,
      });

      if (!anomalyResult.success) {
        errors.push(`Anomaly detection failed: ${anomalyResult.error}`);
      }

      // 3. Evaluate revenue-quality balance
      const balanceService = getRevenueQualityBalanceService();
      if (funnelResult.success && funnelResult.data) {
        const balanceResult = await balanceService.evaluateRevenueQualityBalance({
          entityType: 'global',
          entityId: 'global',
          revenueMetrics: {
            totalRevenue: 0,
            totalCommission: 0,
            conversions: funnelResult.data.metrics.openShopeeClicks,
          },
          usefulnessMetrics: {
            noMatchCount: funnelResult.data.metrics.resolutionNoMatch,
            noMatchRate: funnelResult.data.rates.noMatchRate,
            copyCount: funnelResult.data.metrics.voucherCopySuccess,
            openCount: funnelResult.data.metrics.openShopeeClicks,
            sessionCount: funnelResult.data.uniqueSessions,
          },
        });

        if (!balanceResult.success) {
          errors.push(`Revenue-quality balance failed: ${balanceResult.error}`);
        }
      }

      logger.info({
        msg: 'Commercial attribution cycle completed',
        errors: errors.length,
      });

      return {
        success: errors.length === 0,
        data: {
          attributed: errors.length === 0,
          conversionsProcessed: funnelResult.data?.metrics.openShopeeClicks ?? 0,
          errors,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ msg: 'Error in commercial attribution cycle', error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build commercial performance report
   */
  async buildCommercialPerformanceReport(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<CommercialResult<CommercialPerformanceSummary>> {
    const summaryBuilder = getCommercialSummaryBuilder();
    return summaryBuilder.buildCommercialPerformanceSummary({
      startDate: params.startDate,
      endDate: params.endDate,
      includeVouchers: true,
      includeSurfaces: true,
    });
  }

  /**
   * Build voucher commercial report
   */
  async buildVoucherCommercialReport(params: {
    voucherId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<CommercialResult<VoucherCommercialPerformance>> {
    const summaryBuilder = getCommercialSummaryBuilder();
    return summaryBuilder.buildVoucherCommercialSummary(params);
  }

  /**
   * Build growth commercial report
   */
  async buildGrowthCommercialReport(params: {
    surfaceType: string;
    surfaceId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<CommercialResult<GrowthSurfaceCommercialPerformance>> {
    const summaryBuilder = getCommercialSummaryBuilder();
    return summaryBuilder.buildGrowthSurfaceCommercialSummary({
      surfaceType: params.surfaceType as GrowthSurfaceType,
      surfaceId: params.surfaceId,
      startDate: params.startDate,
      endDate: params.endDate,
    });
  }

  /**
   * Run commercial governance cycle
   */
  async runCommercialGovernanceCycle(params: {
    reviewType: GovernanceReviewType;
    targetEntityType?: string;
    targetEntityId?: string;
    businessSummary: Record<string, unknown>;
    usefulnessSummary?: Record<string, unknown>;
    createdBy?: string;
  }): Promise<CommercialResult<CommercialGovernanceReview>> {
    const governanceService = getCommercialGovernanceService();
    return governanceService.runCommercialGovernanceReview(params);
  }

  /**
   * Get commercial anomalies
   */
  async getCommercialAnomalies(params: {
    startDate: Date;
    endDate: Date;
    severity?: string;
    limit?: number;
  }): Promise<CommercialAnomalySignal[]> {
    const anomalyDetector = getCommercialAnomalyDetector();
    return anomalyDetector.getRecentAnomalies({
      startDate: params.startDate,
      endDate: params.endDate,
      severity: params.severity as AnomalySeverity | undefined,
      limit: params.limit,
    });
  }
}

// ============================================================
// Types needed for service
// ============================================================

import type { VoucherCommercialPerformance, GrowthSurfaceCommercialPerformance, GrowthSurfaceType, CommercialGovernanceReview, CommercialAnomalySignal, AnomalySeverity } from '../types.js';

// ============================================================
// Factory
// ============================================================

let service: CommercialIntelligenceService | null = null;

export function getCommercialIntelligenceService(): CommercialIntelligenceService {
  if (!service) {
    service = new CommercialIntelligenceService();
  }
  return service;
}

// ============================================================
// Direct Exports
// ============================================================

export async function runCommercialAttributionCycle(
  params: Parameters<CommercialIntelligenceService['runCommercialAttributionCycle']>[0]
): Promise<CommercialResult<{
  attributed: boolean;
  conversionsProcessed: number;
  errors: string[];
}>> {
  return getCommercialIntelligenceService().runCommercialAttributionCycle(params);
}

export async function buildCommercialPerformanceReport(
  params: { startDate: Date; endDate: Date }
): Promise<CommercialResult<CommercialPerformanceSummary>> {
  return getCommercialIntelligenceService().buildCommercialPerformanceReport(params);
}

export async function buildVoucherCommercialReport(
  params: { voucherId: string; startDate: Date; endDate: Date }
): Promise<CommercialResult<VoucherCommercialPerformance>> {
  return getCommercialIntelligenceService().buildVoucherCommercialReport(params);
}

export async function buildGrowthCommercialReport(
  params: { surfaceType: string; surfaceId: string; startDate: Date; endDate: Date }
): Promise<CommercialResult<GrowthSurfaceCommercialPerformance>> {
  return getCommercialIntelligenceService().buildGrowthCommercialReport(params);
}

export async function runCommercialGovernanceCycle(
  params: Parameters<CommercialIntelligenceService['runCommercialGovernanceCycle']>[0]
): Promise<CommercialResult<CommercialGovernanceReview>> {
  return getCommercialIntelligenceService().runCommercialGovernanceCycle(params);
}
