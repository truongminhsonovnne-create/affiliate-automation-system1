/**
 * Business Intelligence Layer - Core Types
 *
 * Production-grade type definitions for:
 * - Executive scorecards
 * - Operator BI surfaces
 * - Decision support
 * - Metric definitions
 * - Alerts
 */

import type { GrowthSurfaceType } from '../commercialIntelligence/types.js';

// ============================================================
// A. Scorecard Types
// ============================================================

/**
 * Scorecard types
 */
export type ScorecardType =
  | 'growth'
  | 'quality'
  | 'commercial'
  | 'release'
  | 'product_health'
  | 'experiment'
  | 'overall';

/**
 * Scorecard metric
 */
export interface ScorecardMetric {
  key: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  threshold?: {
    warning: number;
    critical: number;
  };
}

/**
 * Executive scorecard
 */
export interface ExecutiveScorecard {
  type: ScorecardType;
  key: string;
  period: {
    start: Date;
    end: Date;
  };
  headline: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    trend: 'improving' | 'stable' | 'declining';
  };
  metrics: ScorecardMetric[];
  risks: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedEntities: string[];
  }>;
  decisionHints: string[];
  confidence: number;
  generatedAt: Date;
}

// ============================================================
// B. Operator BI Types
// ============================================================

/**
 * Operator BI surface types
 */
export type OperatorBiSurfaceType =
  | 'growth_ops'
  | 'product_ops'
  | 'commercial_ops'
  | 'release_ops'
  | 'quality_ops'
  | 'remediation'
  | 'experiment';

/**
 * Operator BI view scope
 */
export type OperatorBiViewScope = 'global' | 'surface' | 'voucher' | 'experiment' | 'release';

/**
 * Operator BI filters
 */
export interface OperatorBiViewFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  surfaceTypes?: GrowthSurfaceType[];
  experimentIds?: string[];
  voucherIds?: string[];
  status?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Operator BI view result
 */
export interface OperatorBiViewResult {
  surface: OperatorBiSurfaceType;
  data: Record<string, unknown>[];
  summary: {
    totalItems: number;
    filteredCount: number;
  };
  metadata: Record<string, unknown>;
}

// ============================================================
// C. Decision Support Types
// ============================================================

/**
 * Strategic decision areas
 */
export type StrategicDecisionArea =
  | 'growth_surface_scale'
  | 'growth_surface_pause'
  | 'growth_surface_deindex'
  | 'voucher_cluster_review'
  | 'experiment_promote'
  | 'experiment_rollback'
  | 'experiment_hold'
  | 'release_block'
  | 'release_conditional'
  | 'release_approve'
  | 'remediation_prioritize'
  | 'surface_refresh'
  | 'surface_retire'
  | 'anomaly_investigate'
  | 'tuning_review';

/**
 * Recommendation status
 */
export type RecommendationStatus = 'pending' | 'active' | 'accepted' | 'rejected' | 'superseded' | 'expired';

/**
 * Strategic decision recommendation
 */
export interface StrategicDecisionRecommendation {
  id: string;
  area: StrategicDecisionArea;
  targetEntityType: string | null;
  targetEntityId: string | null;
  status: RecommendationStatus;
  recommendation: 'scale' | 'hold' | 'pause' | 'deindex' | 'promote' | 'rollback' | 'approve' | 'block' | 'conditional_approve' | 'prioritize' | 'investigate' | 'retune';
  confidence: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  evidence: Array<{
    metric: string;
    value: number;
    threshold: number;
    direction: 'above' | 'below';
  }>;
  tradeoffs: Array<{
    factor: string;
    positive: boolean;
    description: string;
  }>;
  context: string;
  actionableSteps: string[];
  createdAt: Date;
}

/**
 * Strategic decision support summary
 */
export interface StrategicDecisionSupportSummary {
  period: {
    start: Date;
    end: Date;
  };
  recommendations: StrategicDecisionRecommendation[];
  summary: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byArea: Record<string, number>;
  };
  generatedAt: Date;
}

// ============================================================
// D. Metric Definition Types
// ============================================================

/**
 * Metric category
 */
export type MetricCategory = 'growth' | 'quality' | 'commercial' | 'release' | 'product' | 'experiment';

/**
 * Metric definition record
 */
export interface MetricDefinitionRecord {
  id: string;
  key: string;
  name: string;
  category: MetricCategory;
  definition: string;
  lineage: MetricLineageModel;
  unit: string | null;
  status: 'active' | 'deprecated' | 'superseded';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Metric lineage model
 */
export interface MetricLineageModel {
  source: string;
  calculation: string;
  dependencies?: string[];
  assumptions?: string[];
  caveats?: string[];
}

// ============================================================
// E. Alert Types
// ============================================================

/**
 * BI alert types
 */
export type BiAlertType =
  | 'scorecard_stale'
  | 'metric_anomaly'
  | 'decision_required'
  | 'threshold_breach'
  | 'trend_reversal'
  | 'readiness_change'
  | 'experiment_conclusion'
  | 'surface_health_change';

/**
 * Alert severity
 */
export type BiAlertSeverity = 'info' | 'warning' | 'critical';

/**
 * BI alert signal
 */
export interface BiAlertSignal {
  id: string;
  type: BiAlertType;
  severity: BiAlertSeverity;
  sourceArea: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================
// F. Trend Types
// ============================================================

/**
 * Trend point
 */
export interface BiTrendPoint {
  timestamp: Date;
  value: number;
  change?: number;
  changePercent?: number;
}

/**
 * Trend series
 */
export interface BiTrendSeries {
  metric: string;
  points: BiTrendPoint[];
  trend: 'up' | 'down' | 'stable';
  volatility: 'low' | 'medium' | 'high';
}

/**
 * Comparison window
 */
export interface BiComparisonWindow {
  current: {
    start: Date;
    end: Date;
  };
  previous: {
    start: Date;
    end: Date;
  };
}

// ============================================================
// G. Insight Types
// ============================================================

/**
 * BI insight summary
 */
export interface BiInsightSummary {
  category: string;
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral';
    title: string;
    description: string;
    affectedEntities: string[];
  }>;
  generatedAt: Date;
}

/**
 * BI warning
 */
export interface BiWarning {
  id: string;
  category: string;
  severity: BiAlertSeverity;
  title: string;
  description: string;
  affectedEntities: string[];
  recommendedActions: string[];
  createdAt: Date;
}

/**
 * BI error
 */
export interface BiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================
// H. API DTOs
// ============================================================

/**
 * Executive scorecard DTO
 */
export interface ExecutiveScorecardDto {
  type: string;
  key: string;
  period: { start: string; end: string };
  headline: {
    score: number;
    status: string;
    trend: string;
  };
  metrics: Array<{
    key: string;
    name: string;
    value: number;
    unit: string;
    trend: string;
    changePercent: number;
  }>;
  risks: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  decisionHints: string[];
  confidence: number;
  generatedAt: string;
}

/**
 * Scorecard pack DTO
 */
export interface ExecutiveScorecardPackDto {
  overall: ExecutiveScorecardDto;
  scorecards: ExecutiveScorecardDto[];
  period: { start: string; end: string };
  generatedAt: string;
}

/**
 * Operator BI view DTO
 */
export interface OperatorBiViewDto {
  surface: string;
  data: Record<string, unknown>[];
  summary: { totalItems: number; filteredCount: number };
  metadata: Record<string, unknown>;
}

/**
 * Decision recommendation DTO
 */
export interface StrategicDecisionRecommendationDto {
  id: string;
  area: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  recommendation: string;
  confidence: number;
  priority: string;
  evidence: Array<{
    metric: string;
    value: number;
    threshold: number;
    direction: string;
  }>;
  tradeoffs: Array<{
    factor: string;
    positive: boolean;
    description: string;
  }>;
  context: string;
  actionableSteps: string[];
  createdAt: string;
}

/**
 * Metric definition DTO
 */
export interface MetricDefinitionDto {
  key: string;
  name: string;
  category: string;
  definition: string;
  lineage: Record<string, unknown>;
  unit: string | null;
  status: string;
}

/**
 * BI alert DTO
 */
export interface BiAlertDto {
  id: string;
  type: string;
  severity: string;
  sourceArea: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  description: string;
  createdAt: string;
}

// ============================================================
// I. Utility Types
// ============================================================

/**
 * Result wrapper
 */
export interface BiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Scorecard health classification
 */
export type ScorecardHealthStatus = 'healthy' | 'warning' | 'critical';

/**
 * Scorecard trend
 */
export type ScorecardTrend = 'improving' | 'stable' | 'declining';

/**
 * Recommendation priority
 */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
