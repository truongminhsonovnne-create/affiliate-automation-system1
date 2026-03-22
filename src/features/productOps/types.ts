/**
 * Product Ops Frontend Types
 *
 * Shared type definitions for Product Ops workbench UI
 */

// ============================================================================
// Enums
// ============================================================================

export enum ProductOpsCaseType {
  VOUCHER_QUALITY = 'voucher_quality',
  RANKING_ANOMALY = 'ranking_anomaly',
  NO_MATCH_ESCALATION = 'no_match_escalation',
  COPY_FAILURE_ANALYSIS = 'copy_failure_analysis',
  EXPERIMENT_GUARDRAIL_BREACH = 'experiment_guardrail_breach',
  CONTENT_QUALITY = 'content_quality',
  SYSTEM_ANOMALY = 'system_anomaly',
  MANUAL_REVIEW = 'manual_review',
}

export enum ProductOpsCaseSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum ProductOpsCaseStatus {
  OPEN = 'open',
  IN_REVIEW = 'in_review',
  PENDING_DECISION = 'pending_decision',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  DEFERRED = 'deferred',
  NEEDS_MORE_EVIDENCE = 'needs_more_evidence',
  CLOSED = 'closed',
}

export enum ProductOpsDecisionType {
  ACCEPT = 'accept',
  REJECT = 'reject',
  DEFER = 'defer',
  NEEDS_MORE_EVIDENCE = 'needs_more_evidence',
  CLOSE = 'close',
}

export enum ProductOpsRemediationStatus {
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IN_PROGRESS = 'in_progress',
  EXECUTED = 'executed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ProductOpsRemediationRisk {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum ProductOpsUserRole {
  ADMIN = 'admin',
  PRODUCT_OPS = 'product_ops',
  REVIEWER = 'reviewer',
  VIEWER = 'viewer',
}

// ============================================================================
// Queue Types
// ============================================================================

export interface ProductOpsQueueFilters {
  severity?: ProductOpsCaseSeverity[];
  status?: ProductOpsCaseStatus[];
  caseType?: ProductOpsCaseType[];
  assigneeId?: string;
  assignedToMe?: boolean;
  searchQuery?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  staleOnly?: boolean;
}

export type ProductOpsQueueSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'severity'
  | 'status'
  | 'caseType'
  | 'assigneeId';

export interface ProductOpsQueueSort {
  field: ProductOpsQueueSortField;
  direction: 'asc' | 'desc';
}

export interface ProductOpsQueuePagination {
  page: number;
  pageSize: number;
  total?: number;
}

// ============================================================================
// Case Types
// ============================================================================

export interface ProductOpsCaseRowModel {
  id: string;
  caseKey: string;
  title: string;
  caseType: ProductOpsCaseType;
  severity: ProductOpsCaseSeverity;
  status: ProductOpsCaseStatus;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: Date;
  updatedAt: Date;
  dueAt?: Date;
  isStale: boolean;
  daysInQueue: number;
  evidenceCount: number;
  hasRecommendation: boolean;
}

export interface ProductOpsCaseDetailModel {
  id: string;
  caseKey: string;
  title: string;
  description: string;
  caseType: ProductOpsCaseType;
  severity: ProductOpsCaseSeverity;
  status: ProductOpsCaseStatus;
  priority: number;

  // Assignment
  assigneeId?: string;
  assigneeName?: string;
  assignedAt?: Date;
  assignedBy?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  dueAt?: Date;
  resolvedAt?: Date;

  // Content
  evidence: ProductOpsEvidencePanelModel;
  recommendation?: ProductOpsRecommendationModel;
  snapshots: ProductOpsSnapshotModel[];
  linkedEntities: ProductOpsLinkedEntity[];

  // History
  history: ProductOpsHistoryEntry[];

  // Remediation
  linkedRemediationId?: string;

  // Metadata
  isStale: boolean;
  canBeAssigned: boolean;
  canBeReviewed: boolean;
  version: number;
}

export interface ProductOpsEvidencePanelModel {
  summary: string;
  sections: ProductOpsEvidenceSection[];
  keyFindings: string[];
  rawEvidence?: Record<string, unknown>;
}

export interface ProductOpsEvidenceSection {
  title: string;
  content: string;
  type: 'text' | 'table' | 'code' | 'list';
  data?: Record<string, unknown>[];
}

export interface ProductOpsRecommendationModel {
  recommendation: string;
  confidence: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedActions: string[];
  riskAssessment?: string;
  alternatives?: string[];
}

export interface ProductOpsSnapshotModel {
  id: string;
  snapshotType: string;
  title: string;
  createdAt: Date;
  data: Record<string, unknown>;
  summary: string;
}

export interface ProductOpsLinkedEntity {
  entityType: string;
  entityId: string;
  entityKey: string;
  relation: string;
}

export interface ProductOpsHistoryEntry {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  timestamp: Date;
  details?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Decision Types
// ============================================================================

export interface ProductOpsDecisionActionModel {
  type: ProductOpsDecisionType;
  label: string;
  description: string;
  requiresRationale: boolean;
  requiresConfirmation: boolean;
  disabled?: boolean;
  disabledReason?: string;
  isDangerous?: boolean;
}

export interface ProductOpsDecisionDraft {
  caseId: string;
  decisionType: ProductOpsDecisionType;
  rationale?: string;
  metadata?: Record<string, unknown>;
}

export interface ProductOpsDecisionResult {
  success: boolean;
  caseId: string;
  newStatus: ProductOpsCaseStatus;
  decisionType: ProductOpsDecisionType;
  decidedAt: Date;
  decidedBy: string;
  message?: string;
  error?: string;
}

// ============================================================================
// Remediation Types
// ============================================================================

export interface ProductOpsRemediationRowModel {
  id: string;
  remediationKey: string;
  title: string;
  caseId: string;
  caseKey: string;
  risk: ProductOpsRemediationRisk;
  status: ProductOpsRemediationStatus;
  targetEntityType: string;
  targetEntityId: string;
  createdAt: Date;
  updatedAt: Date;
  dueAt?: Date;
  approvedAt?: Date;
  executedAt?: Date;
  approvalRequestedAt?: Date;
}

export interface ProductOpsRemediationDetailModel {
  id: string;
  remediationKey: string;
  title: string;
  description: string;
  caseId: string;
  caseKey: string;
  caseTitle: string;

  // Risk & Status
  risk: ProductOpsRemediationRisk;
  status: ProductOpsRemediationStatus;

  // Target
  targetEntityType: string;
  targetEntityId: string;
  targetSummary: string;

  // Actions
  actions: ProductOpsRemediationAction[];
  actionPlan: string;

  // Required actions and plan (for UI display)
  requiredActions: string[];
  executionPlan?: string;
  verificationSteps: string[];

  // Approval
  approvalRequestedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;

  // Execution
  executedAt?: Date;
  executedBy?: string;
  executionNotes?: string;
  executionEvidence?: Record<string, unknown>;

  // Related evidence
  relatedEvidence?: Array<{
    title: string;
    link: string;
  }>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  dueAt?: Date;

  // Status flags
  isOverdue: boolean;

  // Permissions
  canApprove: boolean;
  canReject: boolean;
  canMarkExecuted: boolean;

  // Metadata
  version: number;
}

export interface ProductOpsRemediationAction {
  id: string;
  actionType: string;
  description: string;
  targetSystem: string;
  expectedOutcome: string;
  riskLevel: ProductOpsRemediationRisk;
  isExecuted: boolean;
  executedAt?: Date;
  executedBy?: string;
  result?: string;
}

// Remediation action model for UI components
export interface ProductOpsRemediationActionModel {
  type: 'approve' | 'reject' | 'mark_executed';
  label: string;
  description: string;
  requiresRationale: boolean;
  requiresConfirmation: boolean;
  disabled?: boolean;
  disabledReason?: string;
  isDangerous?: boolean;
}

// Remediation queue item
export interface ProductOpsRemediationQueueItem {
  id: string;
  remediationKey: string;
  caseKey: string;
  status: ProductOpsRemediationStatus;
  risk: ProductOpsRemediationRisk;
  assigneeName?: string;
  dueAt?: Date;
  isOverdue: boolean;
  isHighPriority: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductOpsRemediationDecisionDraft {
  remediationId: string;
  decisionType: 'approve' | 'reject';
  rationale?: string;
  metadata?: Record<string, unknown>;
}

export interface ProductOpsRemediationDecisionResult {
  success: boolean;
  remediationId: string;
  newStatus: ProductOpsRemediationStatus;
  message?: string;
  error?: string;
}

// ============================================================================
// Workbench Summary Types
// ============================================================================

export interface ProductOpsWorkbenchSummaryModel {
  overview: ProductOpsOverviewSummary;
  queueHealth: ProductOpsQueueHealth;
  aging: ProductOpsAgingSummary;
  assignments: ProductOpsAssignmentSummary;
  remediations: ProductOpsRemediationSummary;
}

export interface ProductOpsOverviewSummary {
  totalOpenCases: number;
  totalInReview: number;
  totalPendingDecision: number;
  totalResolvedToday: number;
  avgResolutionTimeHours: number;
}

export interface ProductOpsQueueHealth {
  criticalCount: number;
  highCount: number;
  staleCount: number;
  newTodayCount: number;
  queueVelocity: number; // cases per day
}

export interface ProductOpsAgingSummary {
  lessThan24h: number;
  between1to3Days: number;
  between3to7Days: number;
  between7to14Days: number;
  moreThan14Days: number;
}

export interface ProductOpsAssignmentSummary {
  assignedToMe: number;
  unassigned: number;
  byAssignee: Array<{
    assigneeId: string;
    assigneeName: string;
    count: number;
  }>;
}

export interface ProductOpsRemediationSummary {
  pendingApproval: number;
  approvedNotExecuted: number;
  inProgress: number;
  executedThisWeek: number;
}

export interface ProductOpsTrendModel {
  period: string;
  casesCreated: number;
  casesResolved: number;
  avgResolutionTime: number;
  criticalEscalations: number;
  remediationApproved: number;
  remediationExecuted: number;
}

export interface ProductOpsImpactModel {
  metric: string;
  value: number;
  unit: string;
  change: number; // percentage
  trend: 'up' | 'down' | 'stable';
  period: string;
}

// ============================================================================
// Permission Types
// ============================================================================

export interface ProductOpsPermissionState {
  canView: boolean;
  canReview: boolean;
  canAssign: boolean;
  canApproveRemediation: boolean;
  canRejectRemediation: boolean;
  canExecuteRemediation: boolean;
  canViewAuditLog: boolean;
}

export interface ProductOpsAssignmentState {
  isAssigned: boolean;
  isAssignedToMe: boolean;
  canReassign: boolean;
  currentAssigneeId?: string;
  currentAssigneeName?: string;
}

export interface ProductOpsUserContext {
  userId: string;
  userName: string;
  role: ProductOpsUserRole;
  permissions: ProductOpsPermissionState;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface ProductOpsUiWarning {
  type: 'stale' | 'conflict' | 'permission' | 'dependency' | 'rate_limit';
  message: string;
  details?: string;
  action?: string;
}

export interface ProductOpsUiError {
  type: 'permission_denied' | 'stale_state' | 'invalid_transition' | 'validation' | 'dependency' | 'audit_required' | 'internal';
  message: string;
  code?: string;
  details?: string;
  field?: string;
  retryable: boolean;
}

export interface ProductOpsConfirmationDialog {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  isDangerous: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ============================================================================
// Navigation Types
// ============================================================================

export interface ProductOpsNavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: number;
  badgeType?: 'count' | 'alert';
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ProductOpsDecisionValidation {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface ProductOpsAuditInfo {
  action: string;
  actorId: string;
  actorName: string;
  timestamp: Date;
  details?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ProductOpsApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  };
}

export interface ProductOpsApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
