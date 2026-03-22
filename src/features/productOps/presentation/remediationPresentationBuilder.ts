/**
 * Remediation Presentation Builder
 *
 * Maps backend remediation data to presentation models
 */

import type {
  ProductOpsRemediationRowModel,
  ProductOpsRemediationDetailModel,
  ProductOpsRemediationRisk,
  ProductOpsRemediationStatus,
} from '../types';
import { REMEDIATION_CONFIG } from '../constants';

// ============================================================================
// Row Model Builder
// ============================================================================

/**
 * Build remediation row model from backend data
 */
export function buildRemediationRowModel(
  data: Record<string, unknown>
): ProductOpsRemediationRowModel {
  return {
    id: data.id as string,
    remediationKey: data.remediationKey as string,
    title: data.title as string,
    caseId: data.caseId as string,
    caseKey: data.caseKey as string,
    risk: (data.risk as ProductOpsRemediationRisk) || ProductOpsRemediationRisk.MEDIUM,
    status: (data.status as ProductOpsRemediationStatus) || ProductOpsRemediationStatus.PENDING_APPROVAL,
    targetEntityType: data.targetEntityType as string,
    targetEntityId: data.targetEntityId as string,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
    dueAt: data.dueAt ? new Date(data.dueAt as string) : undefined,
    approvedAt: data.approvedAt ? new Date(data.approvedAt as string) : undefined,
    executedAt: data.executedAt ? new Date(data.executedAt as string) : undefined,
    approvalRequestedAt: data.approvalRequestedAt
      ? new Date(data.approvalRequestedAt as string)
      : undefined,
  };
}

// ============================================================================
// Detail Model Builder
// ============================================================================

/**
 * Build full remediation detail model
 */
export function buildRemediationDetailModel(
  data: Record<string, unknown>
): ProductOpsRemediationDetailModel {
  return {
    id: data.id as string,
    remediationKey: data.remediationKey as string,
    title: data.title as string,
    description: data.description as string || '',
    caseId: data.caseId as string,
    caseKey: data.caseKey as string,
    caseTitle: data.caseTitle as string || '',

    // Risk & Status
    risk: (data.risk as ProductOpsRemediationRisk) || ProductOpsRemediationRisk.MEDIUM,
    status: (data.status as ProductOpsRemediationStatus) || ProductOpsRemediationStatus.PENDING_APPROVAL,

    // Target
    targetEntityType: data.targetEntityType as string,
    targetEntityId: data.targetEntityId as string,
    targetSummary: data.targetSummary as string || '',

    // Actions
    actions: buildRemediationActions(data.actions as Array<Record<string, unknown>> | undefined),
    actionPlan: data.actionPlan as string || '',

    // Approval
    approvalRequestedAt: data.approvalRequestedAt
      ? new Date(data.approvalRequestedAt as string)
      : undefined,
    approvedAt: data.approvedAt ? new Date(data.approvedAt as string) : undefined,
    approvedBy: data.approvedBy as string | undefined,
    rejectedAt: data.rejectedAt ? new Date(data.rejectedAt as string) : undefined,
    rejectedBy: data.rejectedBy as string | undefined,
    rejectionReason: data.rejectionReason as string | undefined,

    // Execution
    executedAt: data.executedAt ? new Date(data.executedAt as string) : undefined,
    executedBy: data.executedBy as string | undefined,
    executionNotes: data.executionNotes as string | undefined,
    executionEvidence: data.executionEvidence as Record<string, unknown> | undefined,

    // Timestamps
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
    dueAt: data.dueAt ? new Date(data.dueAt as string) : undefined,

    // Permissions
    canApprove: canApprove(data.status as ProductOpsRemediationStatus),
    canReject: canReject(data.status as ProductOpsRemediationStatus),
    canMarkExecuted: canMarkExecuted(data.status as ProductOpsRemediationStatus),

    // Metadata
    version: (data.version as number) || 1,
  };
}

// ============================================================================
// Action Summary Builder
// ============================================================================

/**
 * Build remediation action summary
 */
export function buildRemediationActionSummary(
  remediation: ProductOpsRemediationDetailModel
): {
  totalActions: number;
  executedActions: number;
  pendingActions: number;
  actionSummary: string;
} {
  const totalActions = remediation.actions.length;
  const executedActions = remediation.actions.filter((a) => a.isExecuted).length;
  const pendingActions = totalActions - executedActions;

  let actionSummary: string;
  if (totalActions === 0) {
    actionSummary = 'No actions defined';
  } else if (executedActions === totalActions) {
    actionSummary = 'All actions completed';
  } else if (executedActions === 0) {
    actionSummary = `${pendingActions} action(s) pending execution`;
  } else {
    actionSummary = `${executedActions}/${totalActions} actions completed`;
  }

  return {
    totalActions,
    executedActions,
    pendingActions,
    actionSummary,
  };
}

// ============================================================================
// Risk Presentation Builder
// ============================================================================

/**
 * Build remediation risk presentation
 */
export function buildRemediationRiskPresentation(
  risk: ProductOpsRemediationRisk
): {
  label: string;
  color: string;
  description: string;
} {
  const config = REMEDIATION_CONFIG.RISK_COLORS;
  const labels = REMEDIATION_CONFIG.RISK_LABELS;

  const descriptions: Record<ProductOpsRemediationRisk, string> = {
    [ProductOpsRemediationRisk.CRITICAL]:
      'Critical risk - requires immediate attention and careful review',
    [ProductOpsRemediationRisk.HIGH]:
      'High risk - should be reviewed and approved promptly',
    [ProductOpsRemediationRisk.MEDIUM]:
      'Medium risk - standard review process applies',
    [ProductOpsRemediationRisk.LOW]:
      'Low risk - routine approval process',
  };

  return {
    label: labels[risk] || risk,
    color: config[risk] || '#6b7280',
    description: descriptions[risk] || 'Risk level not specified',
  };
}

// ============================================================================
// Status Presentation Builder
// ============================================================================

/**
 * Build remediation status presentation
 */
export function buildRemediationStatusPresentation(
  status: ProductOpsRemediationStatus
): {
  label: string;
  color: string;
  isTerminal: boolean;
  isApprovalRequired: boolean;
} {
  const labels = REMEDIATION_CONFIG.STATUS_LABELS;

  const terminalStatuses = [
    ProductOpsRemediationStatus.EXECUTED,
    ProductOpsRemediationStatus.REJECTED,
    ProductOpsRemediationStatus.CANCELLED,
    ProductOpsRemediationStatus.FAILED,
  ];

  const approvalRequiredStatuses = [
    ProductOpsRemediationStatus.PENDING_APPROVAL,
  ];

  return {
    label: labels[status] || status,
    color: getStatusColor(status),
    isTerminal: terminalStatuses.includes(status),
    isApprovalRequired: approvalRequiredStatuses.includes(status),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build remediation actions
 */
function buildRemediationActions(
  actions?: Array<Record<string, unknown>>
): ProductOpsRemediationDetailModel['actions'] {
  if (!actions) return [];

  return actions.map((action) => ({
    id: action.id as string,
    actionType: action.actionType as string,
    description: action.description as string,
    targetSystem: action.targetSystem as string,
    expectedOutcome: action.expectedOutcome as string,
    riskLevel: (action.riskLevel as ProductOpsRemediationRisk) || ProductOpsRemediationRisk.MEDIUM,
    isExecuted: action.isExecuted as boolean || false,
    executedAt: action.executedAt ? new Date(action.executedAt as string) : undefined,
    executedBy: action.executedBy as string | undefined,
    result: action.result as string | undefined,
  }));
}

/**
 * Check if remediation can be approved
 */
function canApprove(status?: ProductOpsRemediationStatus): boolean {
  if (!status) return true;
  return status === ProductOpsRemediationStatus.PENDING_APPROVAL;
}

/**
 * Check if remediation can be rejected
 */
function canReject(status?: ProductOpsRemediationStatus): boolean {
  if (!status) return true;
  return status === ProductOpsRemediationStatus.PENDING_APPROVAL;
}

/**
 * Check if remediation can be marked as executed
 */
function canMarkExecuted(status?: ProductOpsRemediationStatus): boolean {
  if (!status) return true;
  return (
    status === ProductOpsRemediationStatus.APPROVED ||
    status === ProductOpsRemediationStatus.IN_PROGRESS
  );
}

/**
 * Get status color
 */
function getStatusColor(status: ProductOpsRemediationStatus): string {
  const colors: Record<ProductOpsRemediationStatus, string> = {
    [ProductOpsRemediationStatus.PENDING_APPROVAL]: '#f59e0b',
    [ProductOpsRemediationStatus.APPROVED]: '#3b82f6',
    [ProductOpsRemediationStatus.REJECTED]: '#ef4444',
    [ProductOpsRemediationStatus.IN_PROGRESS]: '#8b5cf6',
    [ProductOpsRemediationStatus.EXECUTED]: '#10b981',
    [ProductOpsRemediationStatus.FAILED]: '#dc2626',
    [ProductOpsRemediationStatus.CANCELLED]: '#6b7280',
  };

  return colors[status] || '#6b7280';
}
