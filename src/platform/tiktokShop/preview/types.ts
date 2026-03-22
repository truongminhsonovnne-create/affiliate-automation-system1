/**
 * TikTok Shop Preview Intelligence Types
 *
 * Core types for TikTok Shop preview intelligence,
 * commercial attribution readiness, and monetization governance.
 */

// ============================================================
// Preview Event Types
// ============================================================

/**
 * Preview event types for funnel tracking
 */
export type TikTokShopPreviewEventType =
  | 'preview_surface_viewed'
  | 'preview_input_submitted'
  | 'preview_resolution_attempted'
  | 'preview_resolution_supported'
  | 'preview_resolution_partial'
  | 'preview_resolution_unavailable'
  | 'preview_candidate_viewed'
  | 'preview_copy_attempted'
  | 'preview_open_attempted'
  | 'preview_blocked_by_gate'
  | 'preview_abandoned'
  | 'preview_error';

/**
 * Preview stage (enablement phase)
 */
export type TikTokShopPreviewStage =
  | 'sandbox_preview'
  | 'limited_public_preview'
  | 'production_candidate';

/**
 * Preview support states
 */
export type TikTokShopPreviewSupportState =
  | 'unsupported'
  | 'not_ready'
  | 'sandbox_only'
  | 'gated'
  | 'partially_supported'
  | 'supported'
  | 'production_enabled';

// ============================================================
// Session & Event Models
// ============================================================

/**
 * Preview session
 */
export interface TikTokShopPreviewSession {
  id: string;
  sessionKey: string;
  anonymousSubjectKey: string | null;
  previewEntrySurface: string | null;
  previewStage: TikTokShopPreviewStage;
  supportState: TikTokShopPreviewSupportState;
  contextPayload: Record<string, unknown> | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
}

/**
 * Preview event
 */
export interface TikTokShopPreviewEvent {
  id: string;
  sessionId: string | null;
  eventType: TikTokShopPreviewEventType;
  supportState: TikTokShopPreviewSupportState | null;
  resolutionRunId: string | null;
  eventPayload: Record<string, unknown> | null;
  createdAt: Date;
}

/**
 * New preview session input
 */
export interface CreateTikTokShopPreviewSessionInput {
  sessionKey: string;
  anonymousSubjectKey?: string;
  previewEntrySurface?: string;
  previewStage: TikTokShopPreviewStage;
  supportState: TikTokShopPreviewSupportState;
  contextPayload?: Record<string, unknown>;
}

/**
 * New preview event input
 */
export interface CreateTikTokShopPreviewEventInput {
  sessionId?: string;
  eventType: TikTokShopPreviewEventType;
  supportState?: TikTokShopPreviewSupportState;
  resolutionRunId?: string;
  eventPayload?: Record<string, unknown>;
}

// ============================================================
// Quality Review Models
// ============================================================

/**
 * Preview quality review types
 */
export type TikTokShopPreviewQualityReviewType =
  | 'usefulness'
  | 'stability'
  | 'comprehensive';

/**
 * Preview quality review status
 */
export type TikTokShopPreviewQualityReviewStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed';

/**
 * Preview quality review
 */
export interface TikTokShopPreviewQualityReview {
  id: string;
  reviewType: TikTokShopPreviewQualityReviewType;
  reviewStatus: TikTokShopPreviewQualityReviewStatus;
  qualityScore: number | null;
  usefulnessScore: number | null;
  stabilityScore: number | null;
  reviewPayload: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Preview quality review input
 */
export interface CreateTikTokShopPreviewQualityReviewInput {
  reviewType: TikTokShopPreviewQualityReviewType;
  reviewPayload: Record<string, unknown>;
}

// ============================================================
// Commercial Readiness Models
// ============================================================

/**
 * Commercial readiness review types
 */
export type TikTokShopCommercialReadinessReviewType =
  | 'attribution_lineage'
  | 'monetization_safety'
  | 'comprehensive';

/**
 * Commercial readiness status
 */
export type TikTokShopCommercialReadinessStatus =
  | 'not_ready'
  | 'insufficient_evidence'
  | 'proceed_cautiously'
  | 'ready_for_preview_monetization'
  | 'ready_for_production';

/**
 * Commercial readiness review
 */
export interface TikTokShopCommercialReadinessReview {
  id: string;
  reviewType: TikTokShopCommercialReadinessReviewType;
  readinessStatus: TikTokShopCommercialReadinessStatus;
  readinessScore: number | null;
  blockerCount: number;
  warningCount: number;
  reviewPayload: Record<string, unknown>;
  createdAt: Date;
  finalizedAt: Date | null;
}

/**
 * Commercial readiness input
 */
export interface CreateTikTokShopCommercialReadinessInput {
  reviewType: TikTokShopCommercialReadinessReviewType;
  reviewPayload: Record<string, unknown>;
}

// ============================================================
// Click Lineage Models
// ============================================================

/**
 * Preview click lineage
 */
export interface TikTokShopPreviewClickLineage {
  id: string;
  previewSessionId: string | null;
  lineageKey: string;
  supportState: TikTokShopPreviewSupportState;
  platformStage: TikTokShopPreviewStage;
  resolutionContext: Record<string, unknown> | null;
  clickPayload: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Create click lineage input
 */
export interface CreateTikTokShopPreviewClickLineageInput {
  previewSessionId?: string;
  supportState: TikTokShopPreviewSupportState;
  platformStage: TikTokShopPreviewStage;
  resolutionContext?: Record<string, unknown>;
  clickPayload: Record<string, unknown>;
}

// ============================================================
// Monetization Governance Models
// ============================================================

/**
 * Monetization governance action types
 */
export type TikTokShopMonetizationGovernanceActionType =
  | 'enable_sandbox_monetization'
  | 'enable_preview_monetization'
  | 'enable_production_monetization'
  | 'hold_monetization'
  | 'rollback_monetization'
  | 'extend_preview'
  | 'request_review';

/**
 * Monetization governance action status
 */
export type TikTokShopMonetizationGovernanceActionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'cancelled';

/**
 * Monetization enablement stage
 */
export type TikTokShopMonetizationEnablementStage =
  | 'disabled'
  | 'internal_validation_only'
  | 'preview_signal_collection'
  | 'limited_monetization_preview'
  | 'production_candidate'
  | 'production_enabled';

/**
 * Monetization governance action
 */
export interface TikTokShopMonetizationGovernanceAction {
  id: string;
  actionType: TikTokShopMonetizationGovernanceActionType;
  actionStatus: TikTokShopMonetizationGovernanceActionStatus;
  targetEntityType: string | null;
  targetEntityId: string | null;
  actionPayload: Record<string, unknown>;
  rationale: string | null;
  actorId: string | null;
  actorRole: string | null;
  createdAt: Date;
  executedAt: Date | null;
}

/**
 * Create governance action input
 */
export interface CreateTikTokShopMonetizationGovernanceActionInput {
  actionType: TikTokShopMonetizationGovernanceActionType;
  targetEntityType?: string;
  targetEntityId?: string;
  actionPayload: Record<string, unknown>;
  rationale?: string;
  actorId?: string;
  actorRole?: string;
}

// ============================================================
// Preview Backlog Models
// ============================================================

/**
 * Preview backlog item types
 */
export type TikTokShopPreviewBacklogItemType =
  | 'data_gap'
  | 'context_gap'
  | 'quality_issue'
  | 'stability_issue'
  | 'lineage_gap'
  | 'governance_gap'
  | 'ops_gap';

/**
 * Preview backlog item status
 */
export type TikTokShopPreviewBacklogItemStatus =
  | 'open'
  | 'in_progress'
  | 'blocked'
  | 'resolved'
  | 'won_t_fix';

/**
 * Preview backlog priority
 */
export type TikTokShopPreviewBacklogItemPriority =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

/**
 * Preview backlog item
 */
export interface TikTokShopPreviewBacklogItem {
  id: string;
  backlogType: TikTokShopPreviewBacklogItemType;
  backlogStatus: TikTokShopPreviewBacklogItemStatus;
  priority: TikTokShopPreviewBacklogItemPriority;
  backlogPayload: Record<string, unknown>;
  assignedTo: string | null;
  dueAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * Create backlog item input
 */
export interface CreateTikTokShopPreviewBacklogItemInput {
  backlogType: TikTokShopPreviewBacklogItemType;
  backlogStatus?: TikTokShopPreviewBacklogItemStatus;
  priority: TikTokShopPreviewBacklogItemPriority;
  backlogPayload: Record<string, unknown>;
  assignedTo?: string;
  dueAt?: Date;
}

// ============================================================
// Preview Funnel Summary
// ============================================================

/**
 * Preview funnel summary
 */
export interface TikTokShopPreviewFunnelSummary {
  periodStart: Date;
  periodEnd: Date;
  totalSessions: number;
  totalEvents: number;

  // Funnel stages
  surfaceViews: number;
  inputSubmissions: number;
  resolutionAttempts: number;

  // Outcomes
  supportedResolutions: number;
  partialResolutions: number;
  unavailableResolutions: number;
  gateBlockedEvents: number;

  // Interactions
  candidateViews: number;
  copyAttempts: number;
  openAttempts: number;

  // Dropoff
  abandonmentHints: number;
  noMatchPatterns: number;

  // Support states distribution
  supportStateDistribution: Record<TikTokShopPreviewSupportState, number>;
}

// ============================================================
// Usefulness Result
// ============================================================

/**
 * Preview usefulness dimensions
 */
export interface TikTokShopPreviewUsefulnessDimensions {
  clarity: number;
  honestRepresentation: number;
  outcomeQuality: number;
  userActionability: number;
}

/**
 * Preview usefulness result
 */
export interface TikTokShopPreviewUsefulnessResult {
  overallScore: number;
  dimensions: TikTokShopPreviewUsefulnessDimensions;
  strengths: string[];
  weaknesses: string[];
  warnings: string[];
}

// ============================================================
// Stability Result
// ============================================================

/**
 * Preview stability result
 */
export interface TikTokShopPreviewStabilityResult {
  overallScore: number;
  supportStateStability: number;
  outcomeConsistency: number;
  errorRate: number;
  driftRisk: number;
  risks: string[];
  warnings: string[];
}

// ============================================================
// Commercial Readiness Result
// ============================================================

/**
 * Commercial readiness dimensions
 */
export interface TikTokShopCommercialReadinessDimensions {
  supportStateStability: number;
  previewUsefulness: number;
  clickLineageCompleteness: number;
  productContextCompleteness: number;
  governanceReadiness: number;
  operatorReadiness: number;
  biIntegrationReadiness: number;
}

/**
 * Commercial readiness result
 */
export interface TikTokShopCommercialReadinessResult {
  overallScore: number;
  status: TikTokShopCommercialReadinessStatus;
  dimensions: TikTokShopCommercialReadinessDimensions;
  blockers: TikTokShopPreviewWarning[];
  warnings: TikTokShopPreviewWarning[];
  readinessLevel: string;
}

// ============================================================
// Monetization Guardrail Result
// ============================================================

/**
 * Monetization guardrail decision
 */
export type TikTokShopMonetizationGuardrailDecision =
  | 'hold'
  | 'proceed_cautiously'
  | 'proceed'
  | 'production_ready';

/**
 * Monetization guardrail result
 */
export interface TikTokShopMonetizationGuardrailResult {
  decision: TikTokShopMonetizationGuardrailDecision;
  overallScore: number;
  blockers: TikTokShopPreviewWarning[];
  warnings: TikTokShopPreviewWarning[];
  guardrailChecks: Record<string, boolean>;
}

// ============================================================
// Governance Summary
// ============================================================

/**
 * Preview governance summary
 */
export interface TikTokShopPreviewGovernanceSummary {
  currentStage: TikTokShopMonetizationEnablementStage;
  stageHistory: TikTokShopMonetizationGovernanceAction[];
  recentActions: TikTokShopMonetizationGovernanceAction[];
  pendingActions: TikTokShopMonetizationGovernanceAction[];
  openBlockers: TikTokShopPreviewBacklogItem[];
  riskLevel: 'low' | 'medium' | 'high';
}

// ============================================================
// Decision Support
// ============================================================

/**
 * Preview decision support
 */
export interface TikTokShopPreviewDecisionSupport {
  recommendation: 'hold' | 'extend_preview' | 'proceed_cautiously' | 'proceed_to_production';
  summary: string;
  evidence: Record<string, unknown>;
  nextSteps: string[];
  blockers: TikTokShopPreviewWarning[];
  warnings: TikTokShopPreviewWarning[];
}

// ============================================================
// Warnings & Errors
// ============================================================

/**
 * Preview warning
 */
export interface TikTokShopPreviewWarning {
  code: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  details?: Record<string, unknown>;
}

/**
 * Preview error
 */
export interface TikTokShopPreviewError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================
// Preview Backlog Report
// ============================================================

/**
 * Preview backlog report
 */
export interface TikTokShopPreviewBacklogReport {
  totalItems: number;
  openItems: number;
  inProgressItems: number;
  blockedItems: number;
  resolvedItems: number;
  byType: Record<TikTokShopPreviewBacklogItemType, number>;
  byPriority: Record<TikTokShopPreviewBacklogItemPriority, number>;
  criticalItems: TikTokShopPreviewBacklogItem[];
  highPriorityItems: TikTokShopPreviewBacklogItem[];
}

// ============================================================
// Integration Payloads
// ============================================================

/**
 * Public preview evidence bundle
 */
export interface TikTokPublicPreviewEvidenceBundle {
  sessionCount: number;
  eventCount: number;
  funnelSummary: TikTokShopPreviewFunnelSummary;
  qualityReview: TikTokShopPreviewQualityReview | null;
  stabilityReview: TikTokShopPreviewStabilityResult | null;
  supportSummary: Record<TikTokShopPreviewSupportState, number>;
}

/**
 * Commercial confidence summary
 */
export interface TikTokCommercialConfidenceSummary {
  lineageConfidence: number;
  attributionConfidence: number;
  overallConfidence: number;
  readinessLevel: TikTokShopCommercialReadinessStatus;
  blockers: TikTokShopPreviewWarning[];
  warnings: TikTokShopPreviewWarning[];
}

// ============================================================
// Funnel Snapshot
// ============================================================

/**
 * Preview funnel snapshot
 */
export interface TikTokShopPreviewFunnelSnapshot {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  snapshotPayload: TikTokShopPreviewFunnelSummary;
  createdAt: Date;
}
