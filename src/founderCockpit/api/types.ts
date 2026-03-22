/**
 * Founder Cockpit API Types - DTOs for external/API consumption
 */

import type {
  FounderCockpitSnapshot,
  FounderDecisionItem,
  WeeklyOperatingReview,
  StrategicReviewPack,
  OperatingFollowupRecord,
} from '../types.js';

// ============================================================
// A. Cockpit DTOs
// ============================================================

export interface FounderCockpitDto {
  id: string;
  snapshotWindow: {
    start: string;
    end: string;
  };
  snapshotType: string;
  overallHealth: string;
  healthScore: number;
  sections: FounderSectionDto[];
  topRisks: FounderRiskDto[];
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
  createdAt: string;
}

export interface FounderSectionDto {
  type: string;
  name: string;
  healthStatus: 'healthy' | 'neutral' | 'at-risk' | 'critical';
  score: number;
  metrics: FounderMetricDto[];
  insights: string[];
  trend: 'up' | 'down' | 'stable';
}

export interface FounderMetricDto {
  key: string;
  name: string;
  value: number;
  unit: string;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface FounderRiskDto {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedEntities: string[];
  recommendation: string;
  createdAt: string;
}

// ============================================================
// B. Decision DTOs
// ============================================================

export interface FounderDecisionItemDto {
  id: string;
  decisionArea: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'resolved' | 'deferred';
  title: string;
  summary: string;
  evidence: FounderDecisionEvidenceDto;
  recommendation: FounderDecisionRecommendationDto;
  targetEntity: {
    type: string | null;
    id: string | null;
  } | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface FounderDecisionEvidenceDto {
  metrics: Array<{
    key: string;
    value: number;
    threshold: number;
    direction: 'above' | 'below';
  }>;
  context: string;
}

export interface FounderDecisionRecommendationDto {
  action: 'scale' | 'pause' | 'deindex' | 'retune' | 'approve' | 'block' | 'prioritize' | 'investigate';
  confidence: number;
  tradeoffs: Array<{
    factor: string;
    impact: 'positive' | 'negative';
    description: string;
  }>;
  nextSteps: string[];
}

export interface FounderDecisionQueueDto {
  decisions: FounderDecisionItemDto[];
  summary: {
    total: number;
    pending: number;
    resolved: number;
    bySeverity: Record<string, number>;
    byArea: Record<string, number>;
  };
}

// ============================================================
// C. Weekly Review DTOs
// ============================================================

export interface WeeklyOperatingReviewDto {
  id: string;
  reviewKey: string;
  period: {
    start: string;
    end: string;
  };
  status: 'pending' | 'in_progress' | 'completed';
  summary: WeeklySummaryDto;
  blockers: WeeklyBlockerDto[];
  priorities: WeeklyPriorityDto[];
  decisions: FounderDecisionItemDto[];
  followups: FounderFollowupDto[];
  trends: WeeklyTrendDto[];
  generatedAt: string;
  completedAt: string | null;
}

export interface WeeklySummaryDto {
  overallHealth: string;
  healthScore: number;
  keyChanges: Array<{
    metric: string;
    change: number;
    direction: 'up' | 'down';
  }>;
  riskAreas: string[];
  winAreas: string[];
}

export interface WeeklyBlockerDto {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedEntity: string | null;
  recommendation: string;
  createdAt: string;
}

export interface WeeklyPriorityDto {
  id: string;
  title: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueDate: string | null;
  assignee: string | null;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface WeeklyTrendDto {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  trend: 'improving' | 'stable' | 'declining';
}

// ============================================================
// D. Strategic Review DTOs
// ============================================================

export interface StrategicReviewPackDto {
  id: string;
  reviewType: string;
  period: {
    start: string;
    end: string;
  };
  status: 'pending' | 'generating' | 'completed' | 'failed';
  summary: StrategicPackSummaryDto;
  findings: StrategicFindingDto[];
  recommendations: StrategicRecommendationDto[];
  decisions: FounderDecisionItemDto[];
  createdAt: string;
}

export interface StrategicPackSummaryDto {
  overallHealth: string;
  healthScore: number;
  keyInsights: string[];
  areasOfFocus: string[];
}

export interface StrategicFindingDto {
  category: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedEntities: string[];
}

export interface StrategicRecommendationDto {
  id: string;
  area: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  rationale: string;
  expectedImpact: string;
}

// ============================================================
// E. Follow-up DTOs
// ============================================================

export interface FounderFollowupDto {
  id: string;
  sourceType: string;
  sourceId: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  assignedTo: string | null;
  dueAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface FounderFollowupBacklogDto {
  followups: FounderFollowupDto[];
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    stale: number;
    overdue: number;
    byPriority: Record<string, number>;
  };
}

// ============================================================
// F. Health DTOs
// ============================================================

export interface FounderHealthDto {
  overallScore: number;
  overallStatus: 'healthy' | 'neutral' | 'at-risk' | 'critical';
  componentScores: ComponentHealthDto[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  attentionRequired: string[];
}

export interface ComponentHealthDto {
  component: string;
  score: number;
  status: 'healthy' | 'neutral' | 'at-risk' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
  issues: string[];
}

// ============================================================
// G. Request/Response Types
// ============================================================

export interface GetCockpitRequest {
  startDate?: string;
  endDate?: string;
  snapshotType?: string;
}

export interface GetDecisionsRequest {
  status?: 'pending' | 'resolved' | 'deferred';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  area?: string;
  limit?: number;
  offset?: number;
}

export interface GetFollowupsRequest {
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  sourceType?: string;
  stale?: boolean;
}

export interface RunWeeklyReviewRequest {
  startDate: string;
  endDate: string;
}

export interface RunStrategicReviewRequest {
  reviewType: 'weekly' | 'monthly' | 'quarterly' | 'growth' | 'quality' | 'commercial' | 'release';
  startDate: string;
  endDate: string;
}

export interface ResolveDecisionRequest {
  resolution: string;
  resolvedBy: string;
  action: 'approved' | 'rejected' | 'deferred';
}

export interface UpdateFollowupRequest {
  status?: 'pending' | 'in_progress' | 'completed';
  assignedTo?: string;
  dueAt?: string;
}

// ============================================================
// H. API Response Wrappers
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      total: number;
      limit: number;
      offset: number;
    };
  };
}

export type CockpitResponse = ApiResponse<FounderCockpitDto>;
export type DecisionQueueResponse = ApiResponse<FounderDecisionQueueDto>;
export type WeeklyReviewResponse = ApiResponse<WeeklyOperatingReviewDto>;
export type StrategicPackResponse = ApiResponse<StrategicReviewPackDto>;
export type FollowupBacklogResponse = ApiResponse<FounderFollowupBacklogDto>;
export type HealthResponse = ApiResponse<FounderHealthDto>;
