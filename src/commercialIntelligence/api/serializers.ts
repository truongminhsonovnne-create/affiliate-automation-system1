/**
 * Commercial Intelligence API Serializers
 *
 * Serialize domain results to DTOs.
 */

import type {
  CommercialPerformanceSummary,
  VoucherCommercialPerformance,
  GrowthSurfaceCommercialPerformance,
  RevenueAttributionReportDto,
  CommercialGovernanceReviewDto,
  CommercialAnomalyDto,
} from '../types.js';
import type {
  CommercialSummaryDto,
  VoucherCommercialPerformanceDto,
  GrowthSurfaceCommercialPerformanceDto,
  CommercialTrendsDto,
} from './types.js';

/**
 * Serialize CommercialPerformanceSummary to CommercialSummaryDto
 */
export function serializeCommercialSummary(data: CommercialPerformanceSummary): CommercialSummaryDto {
  const topVouchers = data.voucherPerformance
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10)
    .map(v => ({
      voucherId: v.voucherId,
      revenue: v.totalRevenue,
      commission: v.totalCommission,
      conversions: v.totalConversions,
      balanceScore: v.balanceScore,
    }));

  const topSurfaces = data.surfacePerformance
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10)
    .map(s => ({
      surfaceType: s.surfaceType,
      surfaceId: s.surfaceId,
      revenue: s.totalRevenue,
      sessions: s.totalSessions,
      balanceScore: s.balanceScore,
    }));

  return {
    period: {
      start: data.periodStart.toISOString(),
      end: data.periodEnd.toISOString(),
    },
    summary: {
      totalRevenue: data.globalMetrics.totalRevenue,
      totalCommission: data.globalMetrics.totalCommission,
      totalConversions: data.globalMetrics.totalConversions,
      totalClicks: data.globalMetrics.totalClicks,
      totalSessions: data.globalMetrics.totalSessions,
    },
    funnel: {
      submitRate: data.funnelPerformance.rates.submitRate,
      resolutionSuccessRate: data.funnelPerformance.rates.resolutionSuccessRate,
      copyRate: data.funnelPerformance.rates.copyRate,
      openRate: data.funnelPerformance.rates.openRate,
    },
    topVouchers,
    topSurfaces,
    anomalies: {
      critical: 0,
      warning: 0,
    },
  };
}

/**
 * Serialize VoucherCommercialPerformance to DTO
 */
export function serializeVoucherPerformance(data: VoucherCommercialPerformance): VoucherCommercialPerformanceDto {
  return {
    voucherId: data.voucherId,
    totalClicks: data.totalClicks,
    totalCopies: data.totalCopies,
    totalConversions: data.totalConversions,
    totalRevenue: data.totalRevenue,
    totalCommission: data.totalCommission,
    copyToClickRate: data.copyToClickRate,
    conversionRate: data.conversionRate,
    revenuePerClick: data.revenuePerClick,
    commissionPerClick: data.commissionPerClick,
    noMatchCount: data.noMatchCount,
    noMatchRate: data.noMatchRate,
    qualityScore: data.qualityScore,
    revenueScore: data.revenueScore,
    balanceScore: data.balanceScore,
    periodStart: data.periodStart.toISOString(),
    periodEnd: data.periodEnd.toISOString(),
  };
}

/**
 * Serialize GrowthSurfaceCommercialPerformance to DTO
 */
export function serializeSurfacePerformance(data: GrowthSurfaceCommercialPerformance): GrowthSurfaceCommercialPerformanceDto {
  return {
    surfaceType: data.surfaceType,
    surfaceId: data.surfaceId,
    totalSessions: data.totalSessions,
    totalPageViews: data.totalPageViews,
    totalPasteSubmits: data.totalPasteSubmits,
    totalResolutions: data.totalResolutions,
    totalNoMatch: data.totalNoMatch,
    totalCopies: data.totalCopies,
    totalConversions: data.totalConversions,
    totalRevenue: data.totalRevenue,
    totalCommission: data.totalCommission,
    submitRate: data.submitRate,
    resolutionSuccessRate: data.resolutionSuccessRate,
    copyRate: data.copyRate,
    conversionRate: data.conversionRate,
    revenuePerSession: data.revenuePerSession,
    commissionPerSession: data.commissionPerSession,
    qualityScore: data.qualityScore,
    revenueScore: data.revenueScore,
    balanceScore: data.balanceScore,
    isLowValue: data.isLowValue,
    periodStart: data.periodStart.toISOString(),
    periodEnd: data.periodEnd.toISOString(),
  };
}

/**
 * Serialize CommercialGovernanceReview to DTO
 */
export function serializeGovernanceReview(data: {
  id: string;
  reviewType: string;
  reviewStatus: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  businessSummary: Record<string, unknown>;
  usefulnessSummary: Record<string, unknown> | null;
  governancePayload: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}): CommercialGovernanceReviewDto {
  const payload = data.governancePayload as Record<string, unknown> | null;
  const decisionSupport = payload?.decisionSupport as { recommendation: string } | null;

  return {
    id: data.id,
    reviewType: data.reviewType,
    reviewStatus: data.reviewStatus,
    targetEntityType: data.targetEntityType,
    targetEntityId: data.targetEntityId,
    businessSummary: data.businessSummary,
    usefulnessSummary: data.usefulnessSummary,
    riskLevel: decisionSupport?.recommendation ?? 'unknown',
    createdAt: data.createdAt.toISOString(),
    resolvedAt: data.resolvedAt?.toISOString() ?? null,
  };
}

/**
 * Serialize CommercialAnomalySignal to DTO
 */
export function serializeAnomaly(data: {
  id: string;
  signalType: string;
  severity: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  signalPayload: Record<string, unknown>;
  createdAt: Date;
}): CommercialAnomalyDto {
  let description = '';

  switch (data.signalType) {
    case 'revenue_usefulness_divergence':
      description = 'Revenue and usefulness metrics are diverging';
      break;
    case 'no_match_spike':
      description = 'No-match rate has spiked significantly';
      break;
    case 'low_value_surface':
      description = 'Surface is generating low commercial value';
      break;
    case 'voucher_underperformance':
      description = 'Voucher is underperforming commercially';
      break;
    default:
      description = `Anomaly detected: ${data.signalType}`;
  }

  return {
    id: data.id,
    signalType: data.signalType,
    severity: data.severity,
    targetEntityType: data.targetEntityType,
    targetEntityId: data.targetEntityId,
    description,
    createdAt: data.createdAt.toISOString(),
  };
}
