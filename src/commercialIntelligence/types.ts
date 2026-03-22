/**
 * Commercial Intelligence Layer - Core Types
 *
 * Production-grade type definitions for:
 * - Event models
 * - Session models
 * - Attribution models
 * - Performance models
 * - Governance models
 * - Anomaly models
 */

// ============================================================
// A. Event Types
// ============================================================

/**
 * All event types in the commercial funnel
 */
export type CommercialEventType =
  | 'public_page_view'
  | 'growth_surface_view'
  | 'paste_link_submit'
  | 'resolution_request'
  | 'resolution_success'
  | 'resolution_no_match'
  | 'best_voucher_view'
  | 'candidate_voucher_view'
  | 'voucher_copy_success'
  | 'voucher_copy_failure'
  | 'open_shopee_click'
  | 'affiliate_link_click'
  | 'downstream_conversion_reported'
  | 'downstream_commission_reported';

/**
 * Event types grouped by funnel stage
 */
export const FunnelEventGroups = {
  ENTRY: ['public_page_view', 'growth_surface_view'] as const,
  ENGAGEMENT: ['paste_link_submit'] as const,
  RESOLUTION: ['resolution_request', 'resolution_success', 'resolution_no_match'] as const,
  PRESENTATION: ['best_voucher_view', 'candidate_voucher_view'] as const,
  CONVERSION: ['voucher_copy_success', 'voucher_copy_failure'] as const,
  DOWNSTREAM: ['open_shopee_click', 'affiliate_link_click'] as const,
  REVENUE: ['downstream_conversion_reported', 'downstream_commission_reported'] as const,
} as const;

/**
 * Platform types
 */
export type CommercialPlatform = 'public' | 'admin' | 'api' | 'internal';

/**
 * Growth surface types
 */
export type GrowthSurfaceType =
  | 'seo_article'
  | 'seo_product_page'
  | 'social_facebook'
  | 'social_tiktok'
  | 'social_instagram'
  | 'email_campaign'
  | 'paid_search'
  | 'paid_social'
  | 'referral'
  | 'direct'
  | 'unknown';

// ============================================================
// B. Session Models
// ============================================================

/**
 * Commercial session status
 */
export type CommercialSessionStatus = 'active' | 'completed' | 'expired';

/**
 * Commercial session from database
 */
export interface CommercialSession {
  id: string;
  sessionKey: string;
  anonymousSubjectKey: string | null;
  platform: CommercialPlatform;
  entrySurfaceType: GrowthSurfaceType | null;
  entrySurfaceId: string | null;
  attributionContext: Record<string, unknown>;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
}

/**
 * Session creation input
 */
export interface CreateCommercialSessionInput {
  sessionKey: string;
  anonymousSubjectKey?: string;
  platform?: CommercialPlatform;
  entrySurfaceType?: GrowthSurfaceType;
  entrySurfaceId?: string;
  attributionContext?: Record<string, unknown>;
}

/**
 * Session update input
 */
export interface UpdateCommercialSessionInput {
  attributionContext?: Record<string, unknown>;
}

// ============================================================
// C. Funnel Event Models
// ============================================================

/**
 * Commercial funnel event from database
 */
export interface CommercialFunnelEvent {
  id: string;
  sessionId: string | null;
  eventType: CommercialEventType;
  eventTime: Date;
  platform: CommercialPlatform;
  voucherId: string | null;
  resolutionRequestId: string | null;
  surfaceType: GrowthSurfaceType | null;
  surfaceId: string | null;
  experimentContext: Record<string, unknown>;
  eventPayload: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Funnel event creation input
 */
export interface CreateFunnelEventInput {
  sessionId?: string;
  eventType: CommercialEventType;
  platform?: CommercialPlatform;
  voucherId?: string;
  resolutionRequestId?: string;
  surfaceType?: GrowthSurfaceType;
  surfaceId?: string;
  experimentContext?: Record<string, unknown>;
  eventPayload?: Record<string, unknown>;
  eventTime?: Date;
}

// ============================================================
// D. Click Attribution Models
// ============================================================

/**
 * Click attribution from database
 */
export interface AffiliateClickAttribution {
  id: string;
  sessionId: string | null;
  clickKey: string;
  platform: CommercialPlatform;
  voucherId: string | null;
  resolutionRequestId: string | null;
  sourceSurfaceType: GrowthSurfaceType | null;
  sourceSurfaceId: string | null;
  attributionPayload: Record<string, unknown>;
  clickedAt: Date;
  createdAt: Date;
}

/**
 * Click attribution creation input
 */
export interface CreateClickAttributionInput {
  sessionId?: string;
  clickKey: string;
  platform?: CommercialPlatform;
  voucherId?: string;
  resolutionRequestId?: string;
  sourceSurfaceType?: GrowthSurfaceType;
  sourceSurfaceId?: string;
  attributionPayload?: Record<string, unknown>;
  clickedAt?: Date;
}

/**
 * Attribution confidence levels
 */
export type AttributionConfidence = 'high' | 'medium' | 'low' | 'unknown';

/**
 * Attribution model types
 */
export type AttributionModelType = 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based';

/**
 * Attribution result
 */
export interface CommercialAttributionResult {
  attributionId: string;
  clickKey: string;
  confidence: AttributionConfidence;
  attributedVoucherId: string | null;
  attributedSurfaceType: GrowthSurfaceType | null;
  attributedSurfaceId: string | null;
  attributionModel: AttributionModelType;
  revenueAttribution: RevenueAttribution | null;
  attributionWindowDays: number;
  explanation: string;
  assumptions: string[];
}

// ============================================================
// E. Conversion/Revenue Models
// ============================================================

/**
 * Conversion status
 */
export type ConversionStatus = 'pending' | 'confirmed' | 'cancelled' | 'disputed' | 'rejected';

/**
 * Conversion report from database
 */
export interface AffiliateConversionReport {
  id: string;
  platform: string;
  externalConversionId: string | null;
  clickAttributionId: string | null;
  voucherId: string | null;
  reportedRevenue: number | null;
  reportedCommission: number | null;
  conversionStatus: ConversionStatus;
  conversionTime: Date | null;
  reportPayload: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Conversion creation input
 */
export interface CreateConversionReportInput {
  platform?: string;
  externalConversionId?: string;
  clickAttributionId?: string;
  voucherId?: string;
  reportedRevenue?: number;
  reportedCommission?: number;
  conversionStatus?: ConversionStatus;
  conversionTime?: Date;
  reportPayload?: Record<string, unknown>;
}

/**
 * Revenue attribution breakdown
 */
export interface RevenueAttribution {
  totalRevenue: number;
  totalCommission: number;
  voucherContribution: number;
  surfaceContribution: number;
  experimentContribution: number | null;
  attributionScore: number;
}

// ============================================================
// F. Metric Snapshot Models
// ============================================================

/**
 * Dimension types for metric snapshots
 */
export type MetricDimensionType = 'voucher' | 'surface' | 'experiment' | 'platform' | 'global' | 'session_flow';

/**
 * Metric snapshot from database
 */
export interface CommercialMetricSnapshot {
  id: string;
  metricWindowStart: Date;
  metricWindowEnd: Date;
  dimensionType: MetricDimensionType;
  dimensionKey: string;
  metricPayload: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Funnel metrics
 */
export interface FunnelMetrics {
  pageViews: number;
  pasteSubmits: number;
  resolutionSuccess: number;
  resolutionNoMatch: number;
  bestVoucherViews: number;
  candidateVoucherViews: number;
  voucherCopySuccess: number;
  voucherCopyFailure: number;
  openShopeeClicks: number;
  affiliateLinkClicks: number;
}

/**
 * Conversion rates derived from funnel
 */
export interface FunnelConversionRates {
  submitRate: number;
  resolutionSuccessRate: number;
  noMatchRate: number;
  copyRate: number;
  openRate: number;
  affiliateClickRate: number;
  overallConversionRate: number;
}

/**
 * Complete funnel performance
 */
export interface CommercialFunnelPerformance {
  metrics: FunnelMetrics;
  rates: FunnelConversionRates;
  uniqueSessions: number;
  periodStart: Date;
  periodEnd: Date;
}

// ============================================================
// G. Performance Summary Models
// ============================================================

/**
 * Voucher commercial performance
 */
export interface VoucherCommercialPerformance {
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
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Growth surface commercial performance
 */
export interface GrowthSurfaceCommercialPerformance {
  surfaceType: GrowthSurfaceType;
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
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Commercial performance summary
 */
export interface CommercialPerformanceSummary {
  globalMetrics: {
    totalRevenue: number;
    totalCommission: number;
    totalConversions: number;
    totalClicks: number;
    totalSessions: number;
  };
  voucherPerformance: VoucherCommercialPerformance[];
  surfacePerformance: GrowthSurfaceCommercialPerformance[];
  funnelPerformance: CommercialFunnelPerformance;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
}

// ============================================================
// H. Revenue-Quality Balance Models
// ============================================================

/**
 * Revenue quality dimension
 */
export interface RevenueQualityDimension {
  revenueScore: number;
  usefulnessScore: number;
  qualityScore: number;
  balanceScore: number;
}

/**
 * Revenue quality balance result
 */
export interface RevenueQualityBalanceResult {
  entityType: 'voucher' | 'surface' | 'experiment' | 'global';
  entityId: string;
  dimensions: RevenueQualityDimension;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  recommendations: string[];
  scoringPayload: Record<string, unknown>;
}

/**
 * Commercial optimization risk
 */
export interface CommercialOptimizationRisk {
  riskType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedEntities: string[];
  detectedIndicators: string[];
  recommendedActions: string[];
}

// ============================================================
// I. Anomaly Models
// ============================================================

/**
 * Anomaly severity levels
 */
export type AnomalySeverity = 'info' | 'warning' | 'critical';

/**
 * Anomaly signal types
 */
export type AnomalySignalType =
  | 'revenue_usefulness_divergence'
  | 'no_match_spike'
  | 'low_value_surface'
  | 'voucher_underperformance'
  | 'click_inflation_suspect'
  | 'quality_degradation'
  | 'experiment_regression'
  | 'anomalous_conversion_rate'
  | 'suspicious_traffic_pattern';

/**
 * Commercial anomaly signal from database
 */
export interface CommercialAnomalySignal {
  id: string;
  signalType: AnomalySignalType;
  severity: AnomalySeverity;
  targetEntityType: string | null;
  targetEntityId: string | null;
  signalPayload: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetectionResult {
  anomalies: CommercialAnomalySignal[];
  summary: {
    totalAnomalies: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  };
  periodStart: Date;
  periodEnd: Date;
}

// ============================================================
// J. Governance Models
// ============================================================

/**
 * Review types
 */
export type GovernanceReviewType =
  | 'voucher_performance'
  | 'surface_performance'
  | 'experiment_impact'
  | 'revenue_quality_balance'
  | 'anomaly_review'
  | 'release_readiness';

/**
 * Review status
 */
export type GovernanceReviewStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'resolved';

/**
 * Commercial governance review from database
 */
export interface CommercialGovernanceReview {
  id: string;
  reviewType: GovernanceReviewType;
  reviewStatus: GovernanceReviewStatus;
  targetEntityType: string | null;
  targetEntityId: string | null;
  businessSummary: Record<string, unknown>;
  usefulnessSummary: Record<string, unknown> | null;
  governancePayload: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

/**
 * Governance review creation input
 */
export interface CreateGovernanceReviewInput {
  reviewType: GovernanceReviewType;
  targetEntityType?: string;
  targetEntityId?: string;
  businessSummary: Record<string, unknown>;
  usefulnessSummary?: Record<string, unknown>;
  governancePayload?: Record<string, unknown>;
  createdBy?: string;
}

/**
 * Commercial decision support
 */
export interface CommercialDecisionSupport {
  recommendation: 'approve' | 'reject' | 'review' | 'investigate';
  confidence: number;
  supportingMetrics: Record<string, unknown>;
  riskFactors: string[];
  decisionRationale: string;
  requiredActions: string[];
}

// ============================================================
// K. Configuration Models
// ============================================================

/**
 * Attribution configuration
 */
export interface CommercialAttributionConfig {
  attributionClickWindowDays: number;
  attributionImpressionWindowHours: number;
  sessionInactivityTimeoutMinutes: number;
  funnelAggregationIntervalHours: number;
  revenueQualityThreshold: number;
  lowValueTrafficThreshold: number;
  anomalyDetectionBaselineDays: number;
}

/**
 * Quality gate definition
 */
export interface CommercialQualityGate {
  gateName: string;
  gateType: string;
  thresholdValue: number;
  comparisonOperator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  isActive: boolean;
}

/**
 * Quality gate evaluation result
 */
export interface QualityGateEvaluationResult {
  gateName: string;
  passed: boolean;
  actualValue: number;
  thresholdValue: number;
  severity: 'info' | 'warning' | 'critical';
}

// ============================================================
// L. API DTOs
// ============================================================

/**
 * Commercial summary DTO
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
 * Revenue attribution report DTO
 */
export interface RevenueAttributionReportDto {
  period: {
    start: string;
    end: string;
  };
  totalAttributedRevenue: number;
  totalAttributedCommission: number;
  byVoucher: Array<{
    voucherId: string;
    revenue: number;
    commission: number;
    conversions: number;
    confidence: string;
  }>;
  bySurface: Array<{
    surfaceType: string;
    surfaceId: string;
    revenue: number;
    commission: number;
    conversions: number;
    confidence: string;
  }>;
  attributionConfidence: {
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
}

/**
 * Commercial governance review DTO
 */
export interface CommercialGovernanceReviewDto {
  id: string;
  reviewType: string;
  reviewStatus: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  businessSummary: Record<string, unknown>;
  usefulnessSummary: Record<string, unknown> | null;
  riskLevel: string;
  createdAt: string;
  resolvedAt: string | null;
}

/**
 * Commercial anomaly DTO
 */
export interface CommercialAnomalyDto {
  id: string;
  signalType: string;
  severity: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  description: string;
  createdAt: string;
}

// ============================================================
// M. Experiment Integration Types
// ============================================================

/**
 * Experiment commercial attribution
 */
export interface ExperimentCommercialAttribution {
  experimentId: string;
  variantId: string;
  controlMetrics: {
    revenue: number;
    commission: number;
    conversions: number;
    sessions: number;
  };
  treatmentMetrics: {
    revenue: number;
    commission: number;
    conversions: number;
    sessions: number;
  };
  delta: {
    revenue: number;
    commission: number;
    conversions: number;
    sessions: number;
  };
  statisticalSignificance: number;
  revenueQualityImpact: {
    controlScore: number;
    treatmentScore: number;
    delta: number;
  };
}

/**
 * Growth surface commercial impact
 */
export interface GrowthSurfaceCommercialImpact {
  surfaceType: GrowthSurfaceType;
  surfaceId: string;
  trafficContribution: number;
  revenueContribution: number;
  commissionContribution: number;
  conversionContribution: number;
  qualityContribution: number;
  isProfitable: boolean;
  recommendation: 'scale' | 'maintain' | 'reduce' | 'investigate';
}

// ============================================================
// N. Utility Types
// ============================================================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Date range parameters
 */
export interface DateRangeParams {
  startDate: Date;
  endDate: Date;
}

/**
 * Filter parameters
 */
export interface CommercialFilterParams {
  dateRange?: DateRangeParams;
  voucherIds?: string[];
  surfaceTypes?: GrowthSurfaceType[];
  experimentIds?: string[];
  platforms?: CommercialPlatform[];
}

/**
 * Result wrapper
 */
export interface CommercialResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * List result wrapper
 */
export interface CommercialListResult<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  metadata?: Record<string, unknown>;
}
