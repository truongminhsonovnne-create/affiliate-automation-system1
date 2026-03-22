/**
 * Platform Production Candidate & Enablement Decision System Types
 *
 * Production-grade type definitions for multi-platform production enablement.
 */

// =============================================================================
// Candidate Status Types
// =============================================================================

/**
 * Platform production candidate status
 */
export type PlatformCandidateStatus =
  | 'not_ready'
  | 'hold'
  | 'proceed_cautiously'
  | 'production_candidate'
  | 'production_candidate_with_conditions'
  | 'rollback_to_preview_only';

/**
 * Review status
 */
export type PlatformCandidateReviewStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

// =============================================================================
// Enablement Decision Types
// =============================================================================

/**
 * Enablement decision types
 */
export type PlatformEnablementDecisionType =
  | 'not_ready'
  | 'hold'
  | 'proceed_cautiously'
  | 'mark_production_candidate'
  | 'mark_production_candidate_with_conditions'
  | 'rollback_to_preview_only';

/**
 * Enablement decision status
 */
export type PlatformEnablementDecisionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'expired'
  | 'cancelled';

/**
 * Target stages for enablement
 */
export type PlatformEnablementTargetStage =
  | 'disabled'
  | 'internal_only'
  | 'sandbox_preview'
  | 'limited_public_preview'
  | 'production_candidate'
  | 'production_enabled';

// =============================================================================
// Condition & Blocker Types
// =============================================================================

/**
 * Condition types
 */
export type PlatformEnablementConditionType =
  | 'domain_maturity'
  | 'data_quality'
  | 'acquisition_stability'
  | 'resolution_quality'
  | 'preview_quality'
  | 'commercial_readiness'
  | 'governance_safety'
  | 'remediation_load'
  | 'operator_readiness';

/**
 * Condition status
 */
export type PlatformEnablementConditionStatus =
  | 'pending'
  | 'in_progress'
  | 'satisfied'
  | 'expired'
  | 'waived';

/**
 * Condition severity
 */
export type PlatformEnablementConditionSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

/**
 * Blocker types
 */
export type PlatformEnablementBlockerType =
  | 'domain_gap'
  | 'data_gap'
  | 'acquisition_failure'
  | 'resolution_failure'
  | 'preview_instability'
  | 'commercial_incomplete'
  | 'governance_risk'
  | 'remediation_overload'
  | 'operator_unready';

/**
 * Blocker status
 */
export type PlatformEnablementBlockerStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'accepted_risk'
  | 'waived';

/**
 * Blocker severity
 */
export type PlatformEnablementBlockerSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

/**
 * Warning types
 */
export type PlatformEnablementWarningType =
  | 'domain_immaturity'
  | 'data_quality_concern'
  | 'acquisition_volatility'
  | 'resolution_quality_issues'
  | 'preview_stability_concern'
  | 'commercial_partial_readiness'
  | 'governance_partial_approval'
  | 'remediation_backlog';

/**
 * Warning severity
 */
export type PlatformEnablementWarningSeverity =
  | 'high'
  | 'medium'
  | 'low';

// =============================================================================
// Readiness Dimensions
// =============================================================================

/**
 * Platform readiness dimensions
 */
export interface PlatformReadinessDimension {
  dimension: string;
  score: number | null;
  weight: number;
  status: 'pass' | 'warning' | 'fail' | 'unknown';
  evidence: Record<string, unknown>;
  details: string;
}

/**
 * Platform readiness scores
 */
export interface PlatformProductionCandidateScore {
  overall: number | null;
  domainMaturity: number | null;
  dataFoundational: number | null;
  acquisitionStability: number | null;
  sandboxQuality: number | null;
  previewUsefulness: number | null;
  previewStability: number | null;
  commercialReadiness: number | null;
  governanceSafety: number | null;
  remediationLoad: number | null;
  operatorReadiness: number | null;
  dimensions: PlatformReadinessDimension[];
}

// =============================================================================
// Evidence Types
// =============================================================================

/**
 * Platform evidence bundle
 */
export interface PlatformEvidenceBundle {
  platformKey: string;
  collectedAt: Date;
  domainEvidence: DomainEvidence;
  dataFoundationEvidence: DataFoundationEvidence;
  acquisitionEvidence: AcquisitionEvidence;
  previewEvidence: PreviewEvidence;
  commercialEvidence: CommercialEvidence;
  governanceEvidence: GovernanceEvidence;
  remediationEvidence: RemediationEvidence;
  operatorEvidence: OperatorEvidence;
  confidenceSummary: EvidenceConfidenceSummary;
}

/**
 * Domain evidence
 */
export interface DomainEvidence {
  platformIdentified: boolean;
  domainUnderstood: boolean;
  documentationComplete: boolean;
  apiSurfaceKnown: boolean;
  platformPeculiarities: string[];
  score: number | null;
  evidence: Record<string, unknown>;
}

/**
 * Data foundation evidence
 */
export interface DataFoundationEvidence {
  dataModelsExist: boolean;
  schemaDefined: boolean;
  storageConfigured: boolean;
  dataQualityAcceptable: boolean;
  etlPipelinesOperational: boolean;
  score: number | null;
  evidence: Record<string, unknown>;
}

/**
 * Acquisition evidence
 */
export interface AcquisitionEvidence {
  acquisitionPipelineExists: boolean;
  acquisitionHealthy: boolean;
  errorRateAcceptable: boolean;
  throughputAdequate: boolean;
  runtimeStable: boolean;
  score: number | null;
  evidence: Record<string, unknown>;
}

/**
 * Preview evidence
 */
export interface PreviewEvidence {
  previewAvailable: boolean;
  usefulnessScore: number | null;
  stabilityScore: number | null;
  supportStateStable: boolean;
  userFeedbackPositive: boolean;
  conversionMetrics: Record<string, number>;
  score: number | null;
  evidence: Record<string, unknown>;
}

/**
 * Commercial evidence
 */
export interface CommercialEvidence {
  attributionReady: boolean;
  monetizationReady: boolean;
  lineageConfidence: number;
  revenueModelDefined: boolean;
  commercialOpsReady: boolean;
  score: number | null;
  evidence: Record<string, unknown>;
}

/**
 * Governance evidence
 */
export interface GovernanceEvidence {
  complianceApproved: boolean;
  securityReviewed: boolean;
  privacyAssessed: boolean;
  legalCleared: boolean;
  riskAccepted: boolean;
  score: number | null;
  evidence: Record<string, unknown>;
}

/**
 * Remediation evidence
 */
export interface RemediationEvidence {
  openBlockers: number;
  criticalBlockers: number;
  highPriorityBlockers: number;
  remediationBacklogSize: number;
  estimatedResolutionDays: number | null;
  score: number | null;
  evidence: Record<string, unknown>;
}

/**
 * Operator evidence
 */
export interface OperatorEvidence {
  teamOnboarded: boolean;
  runbooksComplete: boolean;
  monitoringConfigured: boolean;
  escalationPathsDefined: boolean;
  incidentResponseReady: boolean;
  score: number | null;
  evidence: Record<string, unknown>;
}

/**
 * Evidence confidence summary
 */
export interface EvidenceConfidenceSummary {
  overallConfidence: number;
  dataCompleteness: number;
  sourceReliability: number;
  stalenessDays: number;
  gaps: string[];
}

// =============================================================================
// Review & Decision Models
// =============================================================================

/**
 * Platform production candidate review
 */
export interface PlatformProductionCandidateReview {
  id: string;
  platformKey: string;
  reviewStatus: PlatformCandidateReviewStatus;
  candidateStatus: PlatformCandidateStatus;
  readinessScore: PlatformProductionCandidateScore;
  blockerCount: number;
  warningCount: number;
  conditionCount: number;
  reviewPayload: Record<string, unknown>;
  evidenceSources: string[];
  reviewSummary: string | null;
  nextReviewAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt: Date | null;
}

/**
 * Enablement condition
 */
export interface PlatformEnablementCondition {
  id: string;
  reviewId: string | null;
  decisionId: string | null;
  conditionType: PlatformEnablementConditionType;
  conditionStatus: PlatformEnablementConditionStatus;
  severity: PlatformEnablementConditionSeverity;
  title: string;
  description: string;
  category: string;
  evidenceRef: Record<string, unknown>;
  remediationAction: string | null;
  estimatedResolutionDays: number | null;
  assignedTo: string | null;
  conditionPayload: Record<string, unknown>;
  createdAt: Date;
  satisfiedAt: Date | null;
  expiredAt: Date | null;
}

/**
 * Enablement blocker
 */
export interface PlatformEnablementBlocker {
  id: string;
  reviewId: string | null;
  decisionId: string | null;
  blockerType: PlatformEnablementBlockerType;
  blockerStatus: PlatformEnablementBlockerStatus;
  severity: PlatformEnablementBlockerSeverity;
  title: string;
  description: string;
  category: string;
  evidenceRef: Record<string, unknown>;
  resolutionAction: string | null;
  estimatedResolutionDays: number | null;
  blockerPayload: Record<string, unknown>;
  createdAt: Date;
  resolvedAt: Date | null;
}

/**
 * Enablement warning
 */
export interface PlatformEnablementWarning {
  id: string;
  reviewId: string | null;
  decisionId: string | null;
  warningType: PlatformEnablementWarningType;
  severity: PlatformEnablementWarningSeverity;
  title: string;
  description: string;
  category: string;
  evidenceRef: Record<string, unknown>;
  warningPayload: Record<string, unknown>;
  acknowledgedAt: Date | null;
  createdAt: Date;
}

/**
 * Enablement decision
 */
export interface PlatformEnablementDecision {
  id: string;
  platformKey: string;
  decisionType: PlatformEnablementDecisionType;
  decisionStatus: PlatformEnablementDecisionStatus;
  targetStage: PlatformEnablementTargetStage;
  previousStage: PlatformEnablementTargetStage | null;
  decisionPayload: Record<string, unknown>;
  rationale: string | null;
  actorId: string | null;
  actorRole: string | null;
  reviewId: string | null;
  conditionsJson: PlatformEnablementCondition[];
  warningsJson: PlatformEnablementWarning[];
  createdAt: Date;
  executedAt: Date | null;
  expiresAt: Date | null;
}

// =============================================================================
// Risk & Error Types
// =============================================================================

/**
 * Platform enablement risk
 */
export interface PlatformEnablementRisk {
  riskId: string;
  riskType: string;
  likelihood: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
  residualRisk: string;
  evidence: Record<string, unknown>;
}

/**
 * Platform enablement error
 */
export interface PlatformEnablementError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  context?: string;
}

// =============================================================================
// Review Pack Types
// =============================================================================

/**
 * Platform enablement review pack
 */
export interface PlatformEnablementReviewPack {
  platformKey: string;
  generatedAt: Date;
  review: PlatformProductionCandidateReview | null;
  score: PlatformProductionCandidateScore;
  blockers: PlatformEnablementBlocker[];
  warnings: PlatformEnablementWarning[];
  conditions: PlatformEnablementCondition[];
  risks: PlatformEnablementRisk[];
  evidenceBundle: PlatformEvidenceBundle;
  decisionSupport: PlatformEnablementDecisionSupport;
  issueSections: IssueSection[];
  nextSteps: string[];
}

/**
 * Decision support
 */
export interface PlatformEnablementDecisionSupport {
  recommendation: PlatformCandidateStatus;
  summary: string;
  confidence: number;
  evidenceSummary: Record<string, unknown>;
  tradeoffs: TradeoffItem[];
  nextSteps: string[];
  blockersSummary: string[];
  warningsSummary: string[];
  conditionsSummary: string[];
}

/**
 * Tradeoff item
 */
export interface TradeoffItem {
  dimension: string;
  pros: string[];
  cons: string[];
  recommendation: string;
}

/**
 * Issue section for review pack
 */
export interface IssueSection {
  sectionTitle: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issues: IssueItem[];
  actionRequired: string;
}

/**
 * Issue item
 */
export interface IssueItem {
  issueId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  evidence: Record<string, unknown>;
  suggestedResolution?: string;
}

// =============================================================================
// Enablement Stage History
// =============================================================================

/**
 * Platform enablement stage history
 */
export interface PlatformEnablementStageHistory {
  id: string;
  platformKey: string;
  fromStage: PlatformEnablementTargetStage;
  toStage: PlatformEnablementTargetStage;
  triggerType: 'automatic' | 'manual_approval' | 'emergency_rollback' | 'scheduled';
  reviewId: string | null;
  decisionId: string | null;
  initiatedBy: string | null;
  rationale: string | null;
  metadata: Record<string, unknown>;
  executedAt: Date;
}

// =============================================================================
// Audit Types
// =============================================================================

/**
 * Platform enablement audit
 */
export interface PlatformEnablementAudit {
  id: string;
  platformKey: string;
  entityType: 'candidate_review' | 'enablement_decision' | 'condition' | 'blocker' | 'warning';
  entityId: string | null;
  auditAction: string;
  actorId: string | null;
  actorRole: string | null;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  rationale: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Create review input
 */
export interface CreatePlatformCandidateReviewInput {
  platformKey: string;
  createdBy?: string;
  from?: Date;
  to?: Date;
}

/**
 * Create decision input
 */
export interface CreatePlatformEnablementDecisionInput {
  platformKey: string;
  decisionType: PlatformEnablementDecisionType;
  actorId?: string;
  actorRole?: string;
  rationale?: string;
  reviewId?: string;
  conditions?: Partial<PlatformEnablementCondition>[];
  warnings?: Partial<PlatformEnablementWarning>[];
}

// =============================================================================
// Response Types
// =============================================================================

/**
 * Review run response
 */
export interface PlatformCandidateReviewRunResponse {
  success: boolean;
  reviewId: string | null;
  candidateStatus: PlatformCandidateStatus;
  readinessScore: PlatformProductionCandidateScore;
  blockerCount: number;
  warningCount: number;
  conditionCount: number;
  reviewPack: PlatformEnablementReviewPack;
  errors: PlatformEnablementError[];
}

/**
 * Decision response
 */
export interface PlatformEnablementDecisionResponse {
  success: boolean;
  decision: PlatformEnablementDecision | null;
  errors: PlatformEnablementError[];
}
