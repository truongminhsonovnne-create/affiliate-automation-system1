/**
 * Launch Closure Layer - Type Definitions
 * Production-grade types for final stabilization and launch closure
 */

import { z } from 'zod';

// =============================================================================
// Launch Review Status Enums
// =============================================================================

export const LaunchReviewStatus = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FINALIZED: 'finalized',
  CANCELLED: 'cancelled',
} as const;

export type LaunchReviewStatus = (typeof LaunchReviewStatus)[keyof typeof LaunchReviewStatus];

export const LaunchReadinessStatus = {
  PENDING: 'pending',
  READY: 'ready',
  CONDITIONAL_GO: 'conditional_go',
  NO_GO: 'no_go',
  BLOCKED: 'blocked',
  WATCH_REQUIRED: 'watch_required',
  STABILIZATION_INCOMPLETE: 'stabilization_incomplete',
} as const;

export type LaunchReadinessStatus = (typeof LaunchReadinessStatus)[keyof typeof LaunchReadinessStatus];

// =============================================================================
// Checklist Status
// =============================================================================

export const LaunchChecklistStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
  FAILED: 'failed',
} as const;

export type LaunchChecklistStatus = (typeof LaunchChecklistStatus)[keyof typeof LaunchChecklistStatus];

// =============================================================================
// Risk Enums
// =============================================================================

export const LaunchRiskSeverity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
} as const;

export type LaunchRiskSeverity = (typeof LaunchRiskSeverity)[keyof typeof LaunchRiskSeverity];

export const LaunchRiskStatus = {
  OPEN: 'open',
  MITIGATED: 'mitigated',
  ACCEPTED: 'accepted',
  RESOLVED: 'resolved',
  WONT_FIX: 'wont_fix',
} as const;

export type LaunchRiskStatus = (typeof LaunchRiskStatus)[keyof typeof LaunchRiskStatus];

export const LaunchRiskType = {
  RUNTIME: 'runtime',
  PUBLIC_FLOW: 'public_flow',
  COMMERCIAL: 'commercial',
  GOVERNANCE: 'governance',
  QUALITY: 'quality',
  MULTI_PLATFORM: 'multi_platform',
  OPS: 'ops',
  SECURITY: 'security',
  COMPLIANCE: 'compliance',
} as const;

export type LaunchRiskType = (typeof LaunchRiskType)[keyof typeof LaunchRiskType];

// =============================================================================
// Signoff Enums
// =============================================================================

export const LaunchSignoffStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CONDITIONAL: 'conditional',
} as const;

export type LaunchSignoffStatus = (typeof LaunchSignoffStatus)[keyof typeof LaunchSignoffStatus];

export const LaunchSignoffArea = {
  PRODUCT_QUALITY: 'product_quality',
  RELEASE_RUNTIME: 'release_runtime',
  COMMERCIAL_SAFETY: 'commercial_safety',
  MULTI_PLATFORM_SUPPORT: 'multi_platform_support',
  GOVERNANCE_OPS: 'governance_ops',
} as const;

export type LaunchSignoffArea = (typeof LaunchSignoffArea)[keyof typeof LaunchSignoffArea];

// =============================================================================
// Watch Plan Status
// =============================================================================

export const LaunchWatchPlanStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type LaunchWatchPlanStatus = (typeof LaunchWatchPlanStatus)[keyof typeof LaunchWatchPlanStatus];

// =============================================================================
// Domain Models
// =============================================================================

export interface LaunchReadinessReview {
  id: string;
  launchKey: string;
  reviewStatus: LaunchReviewStatus;
  readinessStatus: LaunchReadinessStatus;
  readinessScore?: number;
  blockerCount: number;
  warningCount: number;
  reviewPayload: Record<string, unknown>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
}

export interface LaunchHardeningChecklist {
  id: string;
  launchReviewId?: string;
  checklistKey: string;
  checklistStatus: LaunchChecklistStatus;
  checklistPayload: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
}

export interface LaunchChecklistItem {
  itemId: string;
  itemKey: string;
  itemLabel: string;
  category: string;
  isCritical: boolean;
  status: LaunchChecklistStatus;
  evidence?: string;
  completedAt?: Date;
}

export interface LaunchRiskRecord {
  id: string;
  launchReviewId?: string;
  riskType: LaunchRiskType;
  severity: LaunchRiskSeverity;
  riskStatus: LaunchRiskStatus;
  riskPayload: Record<string, unknown>;
  ownerId?: string;
  ownerRole?: string;
  dueAt?: Date;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface LaunchSignoffRecord {
  id: string;
  launchReviewId?: string;
  signoffArea: LaunchSignoffArea;
  signoffStatus: LaunchSignoffStatus;
  signoffPayload: Record<string, unknown>;
  actorId?: string;
  actorRole?: string;
  createdAt: Date;
}

export interface LaunchWatchPlan {
  id: string;
  launchReviewId?: string;
  planStatus: LaunchWatchPlanStatus;
  watchWindowStart?: Date;
  watchWindowEnd?: Date;
  planPayload: Record<string, unknown>;
  createdAt: Date;
}

// =============================================================================
// Decision Models
// =============================================================================

export interface LaunchGoNoGoDecision {
  decision: 'go' | 'conditional_go' | 'no_go';
  readinessStatus: LaunchReadinessStatus;
  readinessScore: number;
  blockerCount: number;
  warningCount: number;
  blockers: LaunchBlocker[];
  warnings: LaunchWarning[];
  signoffStatus: Record<LaunchSignoffArea, LaunchSignoffStatus>;
  rationale: string;
  decidedAt: Date;
  decidedBy?: string;
}

export interface LaunchBlocker {
  riskId: string;
  riskType: LaunchRiskType;
  severity: LaunchRiskSeverity;
  description: string;
  ownerId?: string;
  ownerRole?: string;
  dueAt?: Date;
}

export interface LaunchWarning {
  riskId: string;
  riskType: LaunchRiskType;
  severity: LaunchRiskSeverity;
  description: string;
  isWatchItem: boolean;
}

export interface LaunchClosureReport {
  reportId: string;
  launchKey: string;
  generatedAt: Date;
  readinessStatus: LaunchReadinessStatus;
  readinessScore: number;
  goNoGoDecision: LaunchGoNoGoDecision;
  checklistCompletion: ChecklistCompletionSummary;
  riskSummary: RiskSummary;
  signoffSummary: SignoffSummary;
  watchPlan?: LaunchWatchPlan;
  closureArtifacts: ClosureArtifact[];
}

// =============================================================================
// Summary Models
// =============================================================================

export interface ChecklistCompletionSummary {
  totalItems: number;
  completedItems: number;
  failedItems: number;
  skippedItems: number;
  pendingItems: number;
  criticalItems: number;
  criticalCompleted: number;
  completionPercentage: number;
}

export interface RiskSummary {
  totalRisks: number;
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  openRisks: number;
  mitigatedRisks: number;
  resolvedRisks: number;
  launchBlockers: LaunchBlocker[];
}

export interface SignoffSummary {
  totalRequired: number;
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  totalConditional: number;
  missingSignoffs: LaunchSignoffArea[];
}

// =============================================================================
// Closure Artifacts
// =============================================================================

export interface ClosureArtifact {
  artifactType: string;
  artifactKey: string;
  artifactPayload: Record<string, unknown>;
  createdAt: Date;
}

// =============================================================================
// Input Types
// =============================================================================

export interface LaunchReadinessReviewInput {
  launchKey: string;
  reviewPayload: Record<string, unknown>;
  createdBy?: string;
}

export interface LaunchChecklistInput {
  launchReviewId?: string;
  checklistKey: string;
  checklistPayload: Record<string, unknown>;
}

export interface LaunchRiskInput {
  launchReviewId?: string;
  riskType: LaunchRiskType;
  severity: LaunchRiskSeverity;
  riskPayload: Record<string, unknown>;
  ownerId?: string;
  ownerRole?: string;
  dueAt?: Date;
}

export interface LaunchSignoffInput {
  launchReviewId?: string;
  signoffArea: LaunchSignoffArea;
  signoffPayload: Record<string, unknown>;
  actorId?: string;
  actorRole?: string;
}

export interface LaunchWatchPlanInput {
  launchReviewId?: string;
  planPayload: Record<string, unknown>;
  watchWindowStart?: Date;
  watchWindowEnd?: Date;
}

// =============================================================================
// Decision Support
// =============================================================================

export interface LaunchDecisionSupport {
  readinessStatus: LaunchReadinessStatus;
  readinessScore: number;
  blockerCount: number;
  warningCount: number;
  criticalUnresolvedRisks: number;
  missingCriticalSignoffs: LaunchSignoffArea[];
  freezePolicyStatus: 'active' | 'inactive';
  watchPlanStatus: 'ready' | 'not_ready';
  recommendations: LaunchRecommendation[];
}

export interface LaunchRecommendation {
  recommendationType: 'fix_blocker' | 'address_warning' | 'complete_signoff' | 'prepare_watch' | 'activate_freeze';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedArea: string;
}

// =============================================================================
// Zod Schemas
// =============================================================================

export const LaunchReviewStatusSchema = z.enum(Object.values(LaunchReviewStatus) as [string, ...string[]]);

export const LaunchReadinessStatusSchema = z.enum(Object.values(LaunchReadinessStatus) as [string, ...string[]]);

export const LaunchChecklistStatusSchema = z.enum(Object.values(LaunchChecklistStatus) as [string, ...string[]]);

export const LaunchRiskSeveritySchema = z.enum(Object.values(LaunchRiskSeverity) as [string, ...string[]]);

export const LaunchRiskStatusSchema = z.enum(Object.values(LaunchRiskStatus) as [string, ...string[]]);

export const LaunchRiskTypeSchema = z.enum(Object.values(LaunchRiskType) as [string, ...string[]]);

export const LaunchSignoffStatusSchema = z.enum(Object.values(LaunchSignoffStatus) as [string, ...string[]]);

export const LaunchSignoffAreaSchema = z.enum(Object.values(LaunchSignoffArea) as [string, ...string[]]);

export const LaunchWatchPlanStatusSchema = z.enum(Object.values(LaunchWatchPlanStatus) as [string, ...string[]]);

export const LaunchReadinessReviewSchema = z.object({
  id: z.string().uuid(),
  launchKey: z.string(),
  reviewStatus: LaunchReviewStatusSchema,
  readinessStatus: LaunchReadinessStatusSchema,
  readinessScore: z.number().nullable(),
  blockerCount: z.number(),
  warningCount: z.number(),
  reviewPayload: z.record(z.unknown()),
  createdBy: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  finalizedAt: z.date().nullable(),
});

export const LaunchRiskRecordSchema = z.object({
  id: z.string().uuid(),
  launchReviewId: z.string().uuid().nullable(),
  riskType: LaunchRiskTypeSchema,
  severity: LaunchRiskSeveritySchema,
  riskStatus: LaunchRiskStatusSchema,
  riskPayload: z.record(z.unknown()),
  ownerId: z.string().nullable(),
  ownerRole: z.string().nullable(),
  dueAt: z.date().nullable(),
  createdAt: z.date(),
  resolvedAt: z.date().nullable(),
});

export const LaunchSignoffRecordSchema = z.object({
  id: z.string().uuid(),
  launchReviewId: z.string().uuid().nullable(),
  signoffArea: LaunchSignoffAreaSchema,
  signoffStatus: LaunchSignoffStatusSchema,
  signoffPayload: z.record(z.unknown()),
  actorId: z.string().nullable(),
  actorRole: z.string().nullable(),
  createdAt: z.date(),
});
