/**
 * Founder Cockpit Layer - Core Types
 *
 * Production-grade type definitions for:
 * - Founder cockpit snapshots
 * - Decision queue items
 * - Weekly operating reviews
 * - Strategic review packs
 * - Follow-up records
 * - Health evaluation
 */

import type { ExecutiveScorecard } from '../bi/types.js';

// ============================================================
// A. Health & Risk Types
// ============================================================

export type FounderHealthStatus = 'healthy' | 'neutral' | 'at-risk' | 'critical';

export type FounderRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface FounderHealthScore {
  overall: number;
  growth: number;
  quality: number;
  commercial: number;
  release: number;
  productOps: number;
  experiment: number;
}

export interface FounderHealthTrend {
  status: FounderHealthStatus;
  trend: 'improving' | 'stable' | 'declining';
  changedAt?: Date;
}

// ============================================================
// B. Decision Types
// ============================================================

export type FounderDecisionArea =
  | 'growth_surface'
  | 'growth_scaling'
  | 'quality_no_match'
  | 'quality_copy_detection'
  | 'commercial_revenue'
  | 'commercial_attribution'
  | 'release_readiness'
  | 'release_blocker'
  | 'experiment_promote'
  | 'experiment_rollback'
  | 'experiment_hold'
  | 'product_ops_remediation'
  | 'product_ops_backlog';

export type FounderDecisionSeverity = 'low' | 'medium' | 'high' | 'critical';

export type FounderDecisionStatus = 'pending' | 'resolved' | 'deferred' | 'superseded';

export interface FounderDecisionEvidence {
  metrics: Array<{
    key: string;
    value: number;
    threshold: number;
    direction: 'above' | 'below';
  }>;
  context: string;
}

export interface FounderDecisionRecommendation {
  action: 'scale' | 'pause' | 'deindex' | 'retune' | 'approve' | 'block' | 'prioritize' | 'investigate' | 'promote' | 'rollback';
  confidence: number;
  tradeoffs: Array<{
    factor: string;
    impact: 'positive' | 'negative';
    description: string;
  }>;
  nextSteps: string[];
}

export interface FounderDecisionItem {
  id: string;
  decisionArea: FounderDecisionArea;
  severity: FounderDecisionSeverity;
  status: FounderDecisionStatus;
  title: string;
  summary: string;
  evidence: FounderDecisionEvidence;
  recommendation: FounderDecisionRecommendation;
  targetEntity?: {
    type: string;
    id: string;
  };
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

export interface FounderDecisionQueue {
  items: FounderDecisionItem[];
  summary: {
    total: number;
    pending: number;
    resolved: number;
    deferred: number;
    bySeverity: Record<FounderDecisionSeverity, number>;
    byArea: Record<FounderDecisionArea, number>;
  };
}

// ============================================================
// C. Cockpit Section Types
// ============================================================

export type FounderCockpitSectionType =
  | 'growth'
  | 'quality'
  | 'commercial'
  | 'release'
  | 'product_ops'
  | 'experiment';

export interface FounderCockpitMetric {
  key: string;
  name: string;
  value: number;
  unit: string;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface FounderCockpitSectionInsight {
  type: 'positive' | 'negative' | 'warning';
  message: string;
  entities?: string[];
}

export interface FounderCockpitSection {
  type: FounderCockpitSectionType;
  name: string;
  healthStatus: FounderHealthStatus;
  score: number;
  trend: 'up' | 'down' | 'stable';
  metrics: FounderCockpitMetric[];
  insights: FounderCockpitSectionInsight[];
  risks: string[];
  wins: string[];
}

// ============================================================
// D. Cockpit Snapshot Types
// ============================================================

export type FounderCockpitSnapshotType = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface FounderCockpitRisk {
  category: string;
  severity: FounderRiskLevel;
  title: string;
  description: string;
  affectedEntities: string[];
  recommendation: string;
  createdAt?: Date;
}

export interface FounderCockpitSnapshot {
  id: string;
  snapshotType: FounderCockpitSnapshotType;
  period: { start: Date; end: Date };
  sections: FounderCockpitSection[];
  overallHealth: FounderHealthStatus;
  healthScore: number;
  topRisks: FounderCockpitRisk[];
  topWins: string[];
  decisionsSummary: {
    pending: number;
    critical: number;
    high: number;
  };
  followupsSummary: {
    pending: number;
    stale: number;
  };
  createdAt: Date;
}

// ============================================================
// E. Weekly Operating Review Types
// ============================================================

export type WeeklyReviewStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface WeeklyTrendChange {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface WeeklyOperatingSummary {
  overallHealth: FounderHealthStatus;
  overallScore: number;
  keyChanges: WeeklyTrendChange[];
  riskAreas: string[];
  winAreas: string[];
}

export interface WeeklyBlockerItem {
  id: string;
  category: string;
  severity: FounderDecisionSeverity;
  title: string;
  description: string;
  affectedEntity?: string;
  recommendation: string;
  createdAt: Date;
}

export interface WeeklyPriorityItem {
  id: string;
  title: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueAt?: Date;
  assignee?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface WeeklyDecisionReference {
  id: string;
  title: string;
  severity: FounderDecisionSeverity;
}

export interface WeeklyFollowupReference {
  id: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface WeeklyOperatingReview {
  id: string;
  reviewKey: string;
  period: { start: Date; end: Date };
  status: WeeklyReviewStatus;
  summary: WeeklyOperatingSummary;
  blockers: WeeklyBlockerItem[];
  priorities: WeeklyPriorityItem[];
  decisionIds: WeeklyDecisionReference[];
  followupIds: WeeklyFollowupReference[];
  trends: WeeklyTrendChange[];
  generatedAt: Date;
  completedAt?: Date;
}

// ============================================================
// F. Strategic Review Pack Types
// ============================================================

export type StrategicReviewType = 'weekly' | 'monthly' | 'quarterly' | 'growth' | 'quality' | 'commercial' | 'release' | 'founder';

export type StrategicPackStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface StrategicPackSummary {
  overallHealth: FounderHealthStatus;
  overallScore: number;
  keyInsights: string[];
  areasOfFocus: string[];
}

export interface StrategicFinding {
  category: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedEntities: string[];
}

export interface StrategicRecommendation {
  id: string;
  area: FounderDecisionArea;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  rationale: string;
  expectedImpact: string;
}

export interface StrategicReviewPack {
  id: string;
  reviewType: StrategicReviewType;
  period: { start: Date; end: Date };
  status: StrategicPackStatus;
  summary: StrategicPackSummary;
  findings: StrategicFinding[];
  recommendations: StrategicRecommendation[];
  decisionIds: WeeklyDecisionReference[];
  createdAt: Date;
}

// ============================================================
// G. Follow-up Types
// ============================================================

export type FollowupSourceType = 'decision' | 'blocker' | 'priority' | 'risk' | 'governance' | 'strategic';

export type FollowupStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type FollowupPriority = 'critical' | 'high' | 'medium' | 'low';

export interface OperatingFollowupRecord {
  id: string;
  sourceType: FollowupSourceType;
  sourceId?: string;
  status: FollowupStatus;
  priority: FollowupPriority;
  payload: {
    title: string;
    description?: string;
    context?: string;
  };
  assignedTo?: string;
  dueAt?: Date;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================
// H. Audit Types
// ============================================================

export type AuditAction = 'created' | 'updated' | 'resolved' | 'completed' | 'deleted' | 'escalated';

export interface FounderReviewAudit {
  id: string;
  entityType: string;
  entityId?: string;
  auditAction: AuditAction;
  actorId?: string;
  actorRole?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  rationale?: string;
  createdAt: Date;
}

// ============================================================
// I. Integration Types
// ============================================================

export interface FounderIntegrationSignal {
  source: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface FounderBiSignal {
  scorecards: ExecutiveScorecard[];
  alerts: string[];
  operatorViews: Record<string, unknown>[];
}

export interface FounderGovernanceSignal {
  releaseRisks: string[];
  governanceSignals: Record<string, unknown>;
  followupSignals: Record<string, unknown>;
}

export interface FounderCommercialSignal {
  revenueQualityBalance: Record<string, unknown>;
  commercialRisks: string[];
  attributionSignals: Record<string, unknown>;
}

export interface FounderGrowthSignal {
  scalingSummary: Record<string, unknown>;
  riskSummary: string[];
  surfaceSignals: Record<string, unknown>;
}

// ============================================================
// J. API Response Types
// ============================================================

export interface FounderCockpitResponse {
  id: string;
  snapshotWindow: { start: string; end: string };
  snapshotType: string;
  overallHealth: string;
  healthScore: number;
  sections: FounderCockpitSection[];
  topRisks: FounderCockpitRisk[];
  topWins: string[];
  decisionsSummary: { pending: number; critical: number; high: number };
  followupsSummary: { pending: number; stale: number };
  createdAt: string;
}

export interface WeeklyReviewResponse {
  id: string;
  reviewKey: string;
  period: { start: string; end: string };
  status: string;
  summary: WeeklyOperatingSummary;
  blockers: WeeklyBlockerItem[];
  priorities: WeeklyPriorityItem[];
  trends: WeeklyTrendChange[];
  generatedAt: string;
  completedAt?: string;
}

export interface StrategicPackResponse {
  id: string;
  reviewType: string;
  period: { start: string; end: string };
  status: string;
  summary: StrategicPackSummary;
  findings: StrategicFinding[];
  recommendations: StrategicRecommendation[];
  createdAt: string;
}

// ============================================================
// K. Utility Types
// ============================================================

export interface FounderCockpitResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: string;
    duration: number;
  };
}

export interface FounderCockpitQueryParams {
  startDate?: Date;
  endDate?: Date;
  snapshotType?: FounderCockpitSnapshotType;
  limit?: number;
  offset?: number;
}
