/**
 * Commercial Intelligence API Types
 *
 * DTOs/Contracts for API layer.
 */

import type {
  CommercialPerformanceSummary,
  VoucherCommercialPerformance,
  GrowthSurfaceCommercialPerformance,
  RevenueAttributionReportDto,
  CommercialGovernanceReviewDto,
  CommercialAnomalyDto,
} from '../types.js';

/**
 * Commercial Summary API Response
 */
export interface CommercialSummaryApiResponse {
  success: boolean;
  data?: CommercialSummaryDto;
  error?: string;
}

/**
 * Commercial Summary DTO
 */
export interface CommercialSummaryDto {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalRevenue: number;
    totalCommission: number;
    totalConversions: number;
    totalClicks: number;
    totalSessions: number;
  };
  funnel: {
    submitRate: number;
    resolutionSuccessRate: number;
    copyRate: number;
    openRate: number;
  };
  topVouchers: Array<{
    voucherId: string;
    revenue: number;
    commission: number;
    conversions: number;
    balanceScore: number | null;
  }>;
  topSurfaces: Array<{
    surfaceType: string;
    surfaceId: string;
    revenue: number;
    sessions: number;
    balanceScore: number | null;
  }>;
  anomalies: {
    critical: number;
    warning: number;
  };
}

/**
 * Trend API Response
 */
export interface CommercialTrendsApiResponse {
  success: boolean;
  data?: CommercialTrendsDto;
  error?: string;
}

/**
 * Commercial Trends DTO
 */
export interface CommercialTrendsDto {
  currentPeriod: {
    start: string;
    end: string;
  };
  previousPeriod: {
    start: string;
    end: string;
  };
  trends: Record<string, {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
  }>;
  overallHealth: 'improving' | 'stable' | 'declining';
}

/**
 * Voucher Performance API Response
 */
export interface VoucherPerformanceApiResponse {
  success: boolean;
  data?: VoucherCommercialPerformanceDto;
  error?: string;
}

/**
 * Voucher Performance DTO
 */
export interface VoucherCommercialPerformanceDto {
  voucherId: string;
  totalClicks: number;
  totalCopies: number;
  totalConversions: number;
  totalRevenue: number;
  totalCommission: number;
  copyToClickRate: number;
  conversionRate: number;
  revenuePerClick: number;
  commissionPerClick: number;
  noMatchCount: number;
  noMatchRate: number;
  qualityScore: number | null;
  revenueScore: number | null;
  balanceScore: number | null;
  periodStart: string;
  periodEnd: string;
}

/**
 * Surface Performance API Response
 */
export interface SurfacePerformanceApiResponse {
  success: boolean;
  data?: GrowthSurfaceCommercialPerformanceDto;
  error?: string;
}

/**
 * Surface Performance DTO
 */
export interface GrowthSurfaceCommercialPerformanceDto {
  surfaceType: string;
  surfaceId: string;
  totalSessions: number;
  totalPageViews: number;
  totalPasteSubmits: number;
  totalResolutions: number;
  totalNoMatch: number;
  totalCopies: number;
  totalConversions: number;
  totalRevenue: number;
  totalCommission: number;
  submitRate: number;
  resolutionSuccessRate: number;
  copyRate: number;
  conversionRate: number;
  revenuePerSession: number;
  commissionPerSession: number;
  qualityScore: number | null;
  revenueScore: number | null;
  balanceScore: number | null;
  isLowValue: boolean;
  periodStart: string;
  periodEnd: string;
}

/**
 * Attribution Report API Response
 */
export interface AttributionReportApiResponse {
  success: boolean;
  data?: RevenueAttributionReportDto;
  error?: string;
}

/**
 * Governance Review API Response
 */
export interface GovernanceReviewApiResponse {
  success: boolean;
  data?: CommercialGovernanceReviewDto[];
  error?: string;
}

/**
 * Anomaly API Response
 */
export interface AnomalyApiResponse {
  success: boolean;
  data?: CommercialAnomalyDto[];
  error?: string;
}

/**
 * Run Review Request
 */
export interface RunReviewRequest {
  reviewType: string;
  targetEntityType?: string;
  targetEntityId?: string;
  businessSummary: Record<string, unknown>;
  usefulnessSummary?: Record<string, unknown>;
}

/**
 * Date Range Request
 */
export interface DateRangeRequest {
  startDate: string;
  endDate: string;
}

/**
 * Pagination Request
 */
export interface PaginationRequest {
  page?: number;
  limit?: number;
}

/**
 * List Request
 */
export interface ListRequest extends DateRangeRequest, PaginationRequest {
  severity?: string;
  reviewType?: string;
  reviewStatus?: string;
}
