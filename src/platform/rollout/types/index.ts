/**
 * Platform Production Rollout Types
 *
 * Production-grade type definitions for rollout planning and execution.
 */

// =============================================================================
// Rollout Status Types
// =============================================================================

/**
 * Platform rollout status
 */
export type PlatformRolloutStatus =
  | 'planned'
  | 'staged'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'rolled_back'
  | 'cancelled';

/**
 * Rollout stage status
 */
export type PlatformRolloutStageStatus =
  | 'pending'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'paused'
  | 'skipped'
  | 'rolled_back';

/**
 * Rollout stage type
 */
export type PlatformRolloutStageType =
  | 'internal_only'
  | 'limited_production_candidate'
  | 'limited_production'
  | 'controlled_ramp'
  | 'broader_ramp'
  | 'full_production';

/**
 * Exposure scope
 */
export type PlatformExposureScope =
  | 'internal_only'
  | 'limited_cohort'
  | 'limited_public'
  | 'controlled_ramp'
  | 'broader_ramp'
  | 'full_production';

// =============================================================================
// Checkpoint Types
// =============================================================================

/**
 * Checkpoint type
 */
export type PlatformRolloutCheckpointType =
  | 'support_state_stability'
  | 'resolution_quality'
  | 'no_match_regression'
  | 'latency_quality'
  | 'error_quality'
  | 'commercial_impact'
  | 'governance_clearance'
  | 'ops_readiness'
  | 'usability_assessment';

/**
 * Checkpoint status
 */
export type PlatformRolloutCheckpointStatus =
  | 'pending'
  | 'in_progress'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'expired';

// =============================================================================
// Rollback Types
// =============================================================================

/**
 * Rollback type
 */
export type PlatformRollbackType =
  | 'previous_stage'
  | 'preview_only'
  | 'monetization_only'
  | 'emergency_stop'
  | 'governance_hold';

/**
 * Rollback status
 */
export type PlatformRollbackStatus =
  | 'pending'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'cancelled';

// =============================================================================
// Backlog Types
// =============================================================================

/**
 * Post-enablement backlog type
 */
export type PlatformPostEnablementBacklogType =
  | 'quality_gap'
  | 'stability_issue'
  | 'no_match_fix'
  | 'latency_improvement'
  | 'governance_gap'
  | 'ops_gap'
  | 'monitoring_gap'
  | 'documentation_gap';

/**
 * Backlog priority
 */
export type PlatformPostEnablementPriority =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

/**
 * Backlog status
 */
export type PlatformPostEnablementBacklogStatus =
  | 'open'
  | 'in_progress'
  | 'blocked'
  | 'resolved'
  | 'won_t_fix';

// =============================================================================
// Review Types
// =============================================================================

/**
 * Guardrail review type
 */
export type PlatformGuardrailReviewType =
  | 'stage_approval'
  | 'checkpoint_approval'
  | 'rollout_continuation'
  | 'rollback_approval'
  | 'production_approval';

/**
 * Guardrail review status
 */
export type PlatformGuardrailReviewStatus =
  | 'pending'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'cancelled';

// =============================================================================
// Event Types
// =============================================================================

/**
 * Rollout event type
 */
export type PlatformRolloutEventType =
  | 'plan_created'
  | 'plan_finalized'
  | 'stage_started'
  | 'stage_completed'
  | 'stage_paused'
  | 'stage_advanced'
  | 'checkpoint_passed'
  | 'checkpoint_failed'
  | 'checkpoint_evaluated'
  | 'rollback_triggered'
  | 'rollback_completed'
  | 'pause_triggered'
  | 'resume_triggered'
  | 'monitoring_alert'
  | 'guardrail_breach';

// =============================================================================
// Domain Models
// =============================================================================

/**
 * Platform rollout plan
 */
export interface PlatformRolloutPlan {
  id: string;
  platformKey: string;
  rolloutKey: string;
  rolloutStatus: PlatformRolloutStatus;
  targetEnablementStage: string;
  rolloutPayload: Record<string, unknown>;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Platform rollout stage
 */
export interface PlatformRolloutStage {
  id: string;
  rolloutPlanId: string;
  stageKey: string;
  stageOrder: number;
  stageStatus: PlatformRolloutStageStatus;
  exposureScope: PlatformExposureScope;
  trafficPercentage: number | null;
  stagePayload: Record<string, unknown>;
  startedAt: Date | null;
  completedAt: Date | null;
  pausedAt: Date | null;
  createdAt: Date;
}

/**
 * Platform rollout checkpoint
 */
export interface PlatformRolloutCheckpoint {
  id: string;
  rolloutStageId: string;
  checkpointType: PlatformRolloutCheckpointType;
  checkpointStatus: PlatformRolloutCheckpointStatus;
  checkpointPayload: Record<string, unknown>;
  guardrailScore: number | null;
  blockerCount: number;
  warningCount: number;
  evaluatedAt: Date | null;
  decision: string | null;
  createdAt: Date;
}

/**
 * Platform rollout event
 */
export interface PlatformRolloutEvent {
  id: string;
  rolloutPlanId: string | null;
  rolloutStageId: string | null;
  eventType: PlatformRolloutEventType;
  eventPayload: Record<string, unknown>;
  actorId: string | null;
  actorRole: string | null;
  createdAt: Date;
}

/**
 * Platform rollout guardrail review
 */
export interface PlatformRolloutGuardrailReview {
  id: string;
  rolloutPlanId: string | null;
  rolloutStageId: string | null;
  reviewType: PlatformGuardrailReviewType;
  reviewStatus: PlatformGuardrailReviewStatus;
  guardrailScore: number | null;
  blockerCount: number;
  warningCount: number;
  reviewPayload: Record<string, unknown>;
  reviewSummary: string | null;
  nextReviewAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * Platform rollback action
 */
export interface PlatformRollbackAction {
  id: string;
  rolloutPlanId: string | null;
  fromStageKey: string;
  toStageKey: string;
  rollbackType: PlatformRollbackType;
  rollbackStatus: PlatformRollbackStatus;
  rollbackPayload: Record<string, unknown>;
  rationale: string | null;
  triggerConditions: Record<string, unknown>[];
  actorId: string | null;
  actorRole: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * Post-enablement backlog item
 */
export interface PlatformPostEnablementBacklogItem {
  id: string;
  platformKey: string;
  rolloutPlanId: string | null;
  backlogType: PlatformPostEnablementBacklogType;
  backlogStatus: PlatformPostEnablementBacklogStatus;
  priority: PlatformPostEnablementPriority;
  title: string;
  description: string;
  category: string;
  backlogPayload: Record<string, unknown>;
  assignedTo: string | null;
  dueAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * Post-enablement health snapshot
 */
export interface PlatformPostEnablementSnapshot {
  id: string;
  platformKey: string;
  rolloutPlanId: string | null;
  snapshotType: string;
  snapshotPayload: Record<string, unknown>;
  healthScore: number | null;
  createdAt: Date;
}

// =============================================================================
// Signal & Summary Types
// =============================================================================

/**
 * Rollout checkpoint signal
 */
export interface PlatformRolloutCheckpointSignal {
  checkpointType: PlatformRolloutCheckpointType;
  score: number | null;
  status: 'pass' | 'fail' | 'warning' | 'unknown';
  blockers: string[];
  warnings: string[];
}

/**
 * Rollout guardrail summary
 */
export interface PlatformRolloutGuardrailSummary {
  overallScore: number | null;
  checkpointSignals: PlatformRolloutCheckpointSignal[];
  canProceed: boolean;
  blockers: string[];
  warnings: string[];
}

/**
 * Post-enablement health summary
 */
export interface PlatformPostEnablementHealthSummary {
  healthScore: number | null;
  stabilityScore: number | null;
  qualityScore: number | null;
  latencyScore: number | null;
  errorScore: number | null;
  issuesDetected: string[];
  driftDetected: boolean;
}

/**
 * Rollout decision support
 */
export interface PlatformRolloutDecisionSupport {
  recommendation: 'proceed' | 'hold' | 'rollback';
  summary: string;
  confidence: number;
  guardrailSummary: PlatformRolloutGuardrailSummary;
  nextSteps: string[];
  blockers: string[];
  warnings: string[];
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Create rollout plan input
 */
export interface CreateRolloutPlanInput {
  platformKey: string;
  targetEnablementStage: string;
  createdBy?: string;
  rolloutPayload?: Record<string, unknown>;
}

/**
 * Start rollout input
 */
export interface StartRolloutInput {
  platformKey: string;
  actorId?: string;
  actorRole?: string;
}

/**
 * Start stage input
 */
export interface StartStageInput {
  rolloutPlanId: string;
  stageKey: string;
  actorId?: string;
  actorRole?: string;
}

/**
 * Complete stage input
 */
export interface CompleteStageInput {
  rolloutPlanId: string;
  stageKey: string;
  actorId?: string;
  actorRole?: string;
  reviewPayload?: Record<string, unknown>;
}

/**
 * Rollback input
 */
export interface RollbackInput {
  platformKey: string;
  rollbackType: PlatformRollbackType;
  rationale: string;
  actorId?: string;
  actorRole?: string;
}

// =============================================================================
// Response Types
// =============================================================================

/**
 * Rollout plan build response
 */
export interface RolloutPlanBuildResponse {
  success: boolean;
  plan: PlatformRolloutPlan | null;
  stages: PlatformRolloutStage[];
  errors: Array<{ code: string; message: string }>;
}

/**
 * Rollout execution response
 */
export interface RolloutExecutionResponse {
  success: boolean;
  currentStage: PlatformRolloutStage | null;
  checkpointResults: PlatformRolloutCheckpointSignal[];
  decision: PlatformRolloutDecisionSupport;
  errors: Array<{ code: string; message: string }>;
}

/**
 * Post-enablement review response
 */
export interface PostEnablementReviewResponse {
  success: boolean;
  healthSummary: PlatformPostEnablementHealthSummary;
  guardrailSummary: PlatformRolloutGuardrailSummary;
  newBacklogItems: PlatformPostEnablementBacklogItem[];
  recommendation: 'proceed' | 'hold' | 'rollback';
  errors: Array<{ code: string; message: string }>;
}
