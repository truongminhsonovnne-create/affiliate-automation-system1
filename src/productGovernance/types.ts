/**
 * Product Governance Types
 *
 * Core type definitions for Product Quality Governance + Release Readiness Review
 */

// ============================================================================
// Enums
// ============================================================================

export enum ProductGovernanceSignalType {
  PRODUCT_OPS_CASE = 'product_ops_case',
  EXPERIMENT_GUARDRAIL = 'experiment_guardrail',
  NO_MATCH_SPIKE = 'no_match_spike',
  QA_REGRESSION = 'qa_regression',
  OPERATIONAL_ISSUE = 'operational_issue',
  RELEASE_VERIFICATION = 'release_verification',
  RANKING_QUALITY = 'ranking_quality',
  TUNING_CHANGE = 'tuning_change',
  STAGING_FAILURE = 'staging_failure',
}

export enum ProductGovernanceSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum ProductGovernanceDecisionType {
  RELEASE_READY = 'release_ready',
  RELEASE_BLOCKED = 'release_blocked',
  RELEASE_CONDITIONALLY_APPROVED = 'release_conditionally_approved',
  RELEASE_DEFERRED = 'release_deferred',
  ROLLBACK_RECOMMENDED = 'rollback_recommended',
  MITIGATION_REQUIRED = 'mitigation_required',
  QUALITY_REVIEW = 'quality_review',
  EXPERIMENT_APPROVAL = 'experiment_approval',
  TUNING_APPROVAL = 'tuning_approval',
}

export enum ProductGovernanceDecisionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUPERSEDED = 'superseded',
}

export enum ReleaseReadinessStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  READY = 'ready',
  CONDITIONALLY_READY = 'conditionally_ready',
  BLOCKED = 'blocked',
  NEEDS_REVIEW = 'needs_review',
  ROLLBACK_RECOMMENDED = 'rollback_recommended',
  FINALIZED = 'finalized',
}

export enum ProductGovernanceFollowupType {
  MITIGATION = 'mitigation',
  ROLLBACK_REVIEW = 'rollback_review',
  QUALITY_INVESTIGATION = 'quality_investigation',
  REMEDIATION_VERIFICATION = 'remediation_verification',
  EXPERIMENT_MONITORING = 'experiment_monitoring',
  TUNING_ADJUSTMENT = 'tuning_adjustment',
  DOCUMENTATION_UPDATE = 'documentation_update',
  STAKEHOLDER_NOTIFICATION = 'stakeholder_notification',
}

export enum ProductGovernanceFollowupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum ProductQualityCadenceType {
  WEEKLY_QUALITY = 'weekly_quality',
  RELEASE = 'release',
  POST_RELEASE_REVIEW = 'post_release_review',
  MONTHLY_GOVERNANCE = 'monthly_governance',
  INCIDENT_REVIEW = 'incident_review',
}

export enum ProductQualityCadenceStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// ============================================================================
// Core Domain Types
// ============================================================================

export interface ReleaseReadinessScore {
  overall: number;
  signals: SignalScore[];
  breakdown: ScoreBreakdown;
}

export interface SignalScore {
  signalType: ProductGovernanceSignalType;
  score: number;
  weight: number;
  issues: number;
}

export interface ScoreBreakdown {
  productQuality: number;
  experiments: number;
  operations: number;
  qaVerification: number;
  releaseReadiness: number;
}

export interface ReleaseBlockingIssue {
  id: string;
  signalType: ProductGovernanceSignalType;
  signalSource: string;
  severity: ProductGovernanceSeverity;
  targetEntityType: string;
  targetEntityId: string;
  title: string;
  description: string;
  createdAt: Date;
  payload: Record<string, unknown>;
}

export interface ReleaseWarningIssue {
  id: string;
  signalType: ProductGovernanceSignalType;
  signalSource: string;
  severity: ProductGovernanceSeverity;
  targetEntityType: string;
  targetEntityId: string;
  title: string;
  description: string;
  createdAt: Date;
  payload: Record<string, unknown>;
}

// ============================================================================
// Release Readiness Review
// ============================================================================

export interface ReleaseReadinessReview {
  id: string;
  releaseKey: string;
  environment: string;
  status: ReleaseReadinessStatus;
  readinessScore: number | null;
  blockingIssuesCount: number;
  warningIssuesCount: number;
  summary: ReleaseReadinessSummary;
  decisionPayload: ReleaseDecisionPayload | null;
  reviewedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt: Date | null;
}

export interface ReleaseReadinessSummary {
  signalsEvaluated: number;
  signalsBySource: Record<string, number>;
  signalsBySeverity: Record<string, number>;
  topBlockingIssues: ReleaseBlockingIssue[];
  topWarningIssues: ReleaseWarningIssue[];
  experimentStatus: ExperimentGovernanceSummary;
  productOpsStatus: ProductOpsGovernanceSummary;
  operationalStatus: OperationalGovernanceSummary;
  qaStatus: QaGovernanceSummary;
}

export interface ExperimentGovernanceSummary {
  activeGuardrailBreaches: number;
  unsafeTuningChanges: number;
  experimentsNeedingReview: number;
}

export interface ProductOpsGovernanceSummary {
  openHighSeverityCases: number;
  unresolvedRemediations: number;
  staleCasesCount: number;
}

export interface OperationalGovernanceSummary {
  errorRateAnomalies: number;
  latencyDegradations: number;
  rankingQualityIssues: number;
}

export interface QaGovernanceSummary {
  stagingFailures: number;
  regressionIssues: number;
  verificationGaps: number;
}

export interface ReleaseDecisionPayload {
  decision: ProductGovernanceDecisionType;
  conditions?: string[];
  mitigations?: string[];
  rollbackPlan?: string;
  alternativeStrategy?: string;
}

// ============================================================================
// Governance Signals
// ============================================================================

export interface ProductGovernanceSignal {
  id: string;
  signalType: ProductGovernanceSignalType;
  signalSource: string;
  severity: ProductGovernanceSeverity;
  targetEntityType: string | null;
  targetEntityId: string | null;
  payload: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
}

// Signal builders
export interface ProductOpsCaseSignalPayload {
  caseId: string;
  caseKey: string;
  caseType: string;
  severity: string;
  status: string;
  isStale: boolean;
  daysInQueue: number;
  hasRecommendation: boolean;
}

export interface ExperimentGuardrailSignalPayload {
  experimentId: string;
  experimentName: string;
  guardrailType: string;
  breachSeverity: string;
  affectedUsers: number;
  metric: string;
  currentValue: number;
  threshold: number;
}

export interface NoMatchSpikeSignalPayload {
  metric: string;
  currentValue: number;
  baselineValue: number;
  spikePercentage: number;
  affectedVouchers: number;
  timeWindow: string;
}

export interface QaRegressionSignalPayload {
  testSuiteId: string;
  testName: string;
  regressionSeverity: string;
  failureRate: number;
  firstFailedAt: Date;
  affectedFeatures: string[];
}

export interface OperationalIssueSignalPayload {
  issueId: string;
  issueType: string;
  severity: string;
  errorRate?: number;
  latencyP99?: number;
  affectedEndpoints: string[];
  detectedAt: Date;
}

// ============================================================================
// Governance Decisions
// ============================================================================

export interface ProductGovernanceDecision {
  id: string;
  decisionType: ProductGovernanceDecisionType;
  decisionStatus: ProductGovernanceDecisionStatus;
  targetEntityType: string;
  targetEntityId: string | null;
  payload: Record<string, unknown>;
  rationale: string | null;
  actorId: string | null;
  actorRole: string | null;
  createdAt: Date;
}

// ============================================================================
// Follow-ups
// ============================================================================

export interface ProductGovernanceFollowup {
  id: string;
  sourceDecisionId: string | null;
  followupType: ProductGovernanceFollowupType;
  followupStatus: ProductGovernanceFollowupStatus;
  targetEntityType: string | null;
  targetEntityId: string | null;
  payload: Record<string, unknown>;
  assignedTo: string | null;
  dueAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

// ============================================================================
// Cadence Runs
// ============================================================================

export interface ProductQualityCadenceRun {
  id: string;
  cadenceType: ProductQualityCadenceType;
  status: ProductQualityCadenceStatus;
  periodStart: Date;
  periodEnd: Date;
  summary: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

// ============================================================================
// Review Packs & Reports
// ============================================================================

export interface ProductGovernanceReviewPack {
  releaseKey: string;
  environment: string;
  generatedAt: Date;
  reviewStatus: ReleaseReadinessStatus;
  readinessScore: number | null;
  summary: ReleaseReadinessSummary;
  blockingIssues: ReleaseBlockingIssue[];
  warningIssues: ReleaseWarningIssue[];
  decisionSupport: DecisionSupport;
  openFollowups: ProductGovernanceFollowup[];
}

export interface DecisionSupport {
  canApprove: boolean;
  canConditionalApprove: boolean;
  canBlock: boolean;
  canDefer: boolean;
  recommendedActions: RecommendedAction[];
  risks: string[];
}

export interface RecommendedAction {
  action: 'approve' | 'conditionally_approve' | 'block' | 'defer' | 'rollback';
  priority: number;
  rationale: string;
  requiredMitigations?: string[];
}

export interface ContinuousImprovementReport {
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  qualityTrends: QualityTrendSummary;
  improvementBacklog: ImprovementBacklog;
  governanceEffectiveness: GovernanceEffectivenessSummary;
  unresolvedHotspots: UnresolvedHotspot[];
}

export interface QualityTrendSummary {
  signalsTrend: TrendData[];
  resolutionRate: number;
  averageResolutionTime: number;
  recurringIssueCount: number;
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
}

export interface ImprovementBacklog {
  totalOpen: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  overdueCount: number;
}

export interface GovernanceEffectivenessSummary {
  decisionsMade: number;
  decisionsOverturned: number;
  followupCompletionRate: number;
  averageResolutionTime: number;
}

export interface UnresolvedHotspot {
  entityType: string;
  entityId: string;
  title: string;
  severity: ProductGovernanceSeverity;
  daysOpen: number;
  lastActivity: Date;
}

// ============================================================================
// API DTOs
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

export interface ProductGovernanceSignalDto {
  id: string;
  signalType: ProductGovernanceSignalType;
  signalSource: string;
  severity: ProductGovernanceSeverity;
  targetEntityType: string | null;
  targetEntityId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

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

export interface ContinuousImprovementReportDto {
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  qualityTrends: QualityTrendSummary;
  improvementBacklog: ImprovementBacklog;
  governanceEffectiveness: GovernanceEffectivenessSummary;
  unresolvedHotspots: UnresolvedHotspot[];
}

// ============================================================================
// Warnings & Errors
// ============================================================================

export interface ProductGovernanceWarning {
  type: 'stale_followup' | 'unresolved_signal' | 'missed_cadence' | 'governance_gap';
  message: string;
  details?: string;
}

export interface ProductGovernanceError {
  type: 'validation_error' | 'state_transition_error' | 'permission_error' | 'not_found' | 'internal_error';
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Context Types
// ============================================================================

export interface ProductGovernanceContext {
  userId: string;
  userName: string;
  userRole: string;
  permissions: ProductGovernancePermissions;
}

export interface ProductGovernancePermissions {
  canReviewRelease: boolean;
  canApproveRelease: boolean;
  canBlockRelease: boolean;
  canViewGovernanceData: boolean;
  canManageFollowups: boolean;
  canRunCadence: boolean;
}

export interface ReleaseContext {
  releaseKey: string;
  environment: string;
  version?: string;
  scheduledAt?: Date;
}
