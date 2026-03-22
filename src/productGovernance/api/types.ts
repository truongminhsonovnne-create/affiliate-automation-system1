/**
 * Product Governance API Types
 *
 * DTO/Contract types for API layer.
 */

import {
  ReleaseReadinessStatus,
  ProductGovernanceSignalType,
  ProductGovernanceSeverity,
  ProductGovernanceDecisionType,
  ProductGovernanceDecisionStatus,
  ProductGovernanceFollowupType,
  ProductGovernanceFollowupStatus,
} from '../types';

// ============================================================================
// Release Readiness DTOs
// ============================================================================

export interface ReleaseReadinessReviewDto {
  id: string;
  releaseKey: string;
  environment: string;
  status: ReleaseReadinessStatus;
  readinessScore: number | null;
  blockingIssuesCount: number;
  warningIssuesCount: number;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  finalizedAt: string | null;
}

export interface ReleaseBlockingIssueDto {
  id: string;
  signalType: ProductGovernanceSignalType;
  signalSource: string;
  severity: ProductGovernanceSeverity;
  targetEntityType: string;
  targetEntityId: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface ReleaseWarningIssueDto {
  id: string;
  signalType: ProductGovernanceSignalType;
  signalSource: string;
  severity: ProductGovernanceSeverity;
  targetEntityType: string;
  targetEntityId: string;
  title: string;
  description: string;
  createdAt: string;
}

// ============================================================================
// Signal DTOs
// ============================================================================

export interface ProductGovernanceSignalDto {
  id: string;
  signalType: ProductGovernanceSignalType;
  signalSource: string;
  severity: ProductGovernanceSeverity;
  targetEntityType: string | null;
  targetEntityId: string | null;
  payload: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface CreateSignalDto {
  signalType: ProductGovernanceSignalType;
  signalSource: string;
  severity: ProductGovernanceSeverity;
  targetEntityType?: string;
  targetEntityId?: string;
  payload: Record<string, unknown>;
}

// ============================================================================
// Decision DTOs
// ============================================================================

export interface ProductGovernanceDecisionDto {
  id: string;
  decisionType: ProductGovernanceDecisionType;
  decisionStatus: ProductGovernanceDecisionStatus;
  targetEntityType: string;
  targetEntityId: string | null;
  payload: Record<string, unknown>;
  rationale: string | null;
  actorId: string | null;
  actorRole: string | null;
  createdAt: string;
}

export interface CreateDecisionDto {
  decisionType: ProductGovernanceDecisionType;
  targetEntityType: string;
  targetEntityId?: string;
  payload?: Record<string, unknown>;
  rationale?: string;
  actorId?: string;
  actorRole?: string;
}

// ============================================================================
// Follow-up DTOs
// ============================================================================

export interface GovernanceFollowupDto {
  id: string;
  followupType: ProductGovernanceFollowupType;
  followupStatus: ProductGovernanceFollowupStatus;
  targetEntityType: string | null;
  targetEntityId: string | null;
  payload: Record<string, unknown>;
  assignedTo: string | null;
  dueAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CompleteFollowupDto {
  completionNotes?: string;
}

// ============================================================================
// Cadence DTOs
// ============================================================================

export interface QualityCadenceRunDto {
  id: string;
  cadenceType: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  summary: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ============================================================================
// Report DTOs
// ============================================================================

export interface ContinuousImprovementReportDto {
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  qualityTrends: QualityTrendDto;
  improvementBacklog: ImprovementBacklogDto;
  governanceEffectiveness: GovernanceEffectivenessDto;
  unresolvedHotspots: UnresolvedHotspotDto[];
}

export interface QualityTrendDto {
  signalsTrend: TrendDataDto[];
  resolutionRate: number;
  averageResolutionTime: number;
  recurringIssueCount: number;
}

export interface TrendDataDto {
  period: string;
  value: number;
  change: number;
}

export interface ImprovementBacklogDto {
  totalOpen: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  overdueCount: number;
}

export interface GovernanceEffectivenessDto {
  decisionsMade: number;
  decisionsOverturned: number;
  followupCompletionRate: number;
  averageResolutionTime: number;
}

export interface UnresolvedHotspotDto {
  entityType: string;
  entityId: string;
  title: string;
  severity: ProductGovernanceSeverity;
  daysOpen: number;
  lastActivity: string;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface ReleaseReviewRequest {
  releaseKey: string;
  environment: string;
}

export interface ReleaseDecisionRequest {
  releaseKey: string;
  environment: string;
  decision: 'approve' | 'conditional_approve' | 'block' | 'defer' | 'rollback_recommended';
  rationale?: string;
  conditions?: string[];
  mitigations?: string[];
  actorId: string;
  actorRole: string;
}

export interface SignalListQuery {
  signalType?: ProductGovernanceSignalType;
  severity?: ProductGovernanceSeverity;
  source?: string;
  active?: boolean;
}

export interface FollowupListQuery {
  status?: ProductGovernanceFollowupStatus;
  assignedTo?: string;
  type?: ProductGovernanceFollowupType;
}
