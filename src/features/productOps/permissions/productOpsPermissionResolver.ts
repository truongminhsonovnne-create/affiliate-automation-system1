/**
 * Product Ops Permission Resolver
 *
 * Role-aware and state-aware permission resolution for Product Ops UI
 */

import type {
  ProductOpsUserRole,
  ProductOpsPermissionState,
  ProductOpsAssignmentState,
  ProductOpsCaseDetailModel,
  ProductOpsRemediationDetailModel,
  ProductOpsCaseStatus,
  ProductOpsRemediationStatus,
  ProductOpsUserContext,
} from '../types';

// ============================================================================
// Role Permissions
// ============================================================================

const ROLE_PERMISSIONS: Record<ProductOpsUserRole, ProductOpsPermissionState> = {
  [ProductOpsUserRole.ADMIN]: {
    canView: true,
    canReview: true,
    canAssign: true,
    canApproveRemediation: true,
    canRejectRemediation: true,
    canExecuteRemediation: true,
    canViewAuditLog: true,
  },
  [ProductOpsUserRole.PRODUCT_OPS]: {
    canView: true,
    canReview: true,
    canAssign: true,
    canApproveRemediation: true,
    canRejectRemediation: true,
    canExecuteRemediation: true,
    canViewAuditLog: true,
  },
  [ProductOpsUserRole.REVIEWER]: {
    canView: true,
    canReview: true,
    canAssign: false,
    canApproveRemediation: false,
    canRejectRemediation: false,
    canExecuteRemediation: false,
    canViewAuditLog: false,
  },
  [ProductOpsUserRole.VIEWER]: {
    canView: true,
    canReview: false,
    canAssign: false,
    canApproveRemediation: false,
    canRejectRemediation: false,
    canExecuteRemediation: false,
    canViewAuditLog: false,
  },
};

// ============================================================================
// Status-based Permissions
// ============================================================================

const REVIWABLE_STATUSES: ProductOpsCaseStatus[] = [
  ProductOpsCaseStatus.OPEN,
  ProductOpsCaseStatus.IN_REVIEW,
  ProductOpsCaseStatus.PENDING_DECISION,
  ProductOpsCaseStatus.DEFERRED,
  ProductOpsCaseStatus.NEEDS_MORE_EVIDENCE,
];

const ASSIGNABLE_STATUSES: ProductOpsCaseStatus[] = [
  ProductOpsCaseStatus.OPEN,
  ProductOpsCaseStatus.IN_REVIEW,
  ProductOpsCaseStatus.PENDING_DECISION,
  ProductOpsCaseStatus.DEFERRED,
  ProductOpsCaseStatus.NEEDS_MORE_EVIDENCE,
];

const REMEDIATION_APPROVABLE_STATUSES: ProductOpsRemediationStatus[] = [
  ProductOpsRemediationStatus.PENDING_APPROVAL,
];

const REMEDIATION_REJECTABLE_STATUSES: ProductOpsRemediationStatus[] = [
  ProductOpsRemediationStatus.PENDING_APPROVAL,
];

const REMEDIATION_EXECUTABLE_STATUSES: ProductOpsRemediationStatus[] = [
  ProductOpsRemediationStatus.APPROVED,
  ProductOpsRemediationStatus.IN_PROGRESS,
];

// ============================================================================
// Permission Functions
// ============================================================================

/**
 * Build complete permission state from user context
 */
export function buildProductOpsPermissionState(
  userRole: ProductOpsUserRole,
  overrides?: Partial<ProductOpsPermissionState>
): ProductOpsPermissionState {
  const basePermissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS[ProductOpsUserRole.VIEWER];
  return {
    ...basePermissions,
    ...overrides,
  };
}

/**
 * Check if user can view a Product Ops case
 */
export function canViewProductOpsCase(
  permissions: ProductOpsPermissionState,
  _case: ProductOpsCaseDetailModel
): boolean {
  return permissions.canView;
}

/**
 * Check if user can review a Product Ops case
 */
export function canReviewProductOpsCase(
  permissions: ProductOpsPermissionState,
  caseDetail: ProductOpsCaseDetailModel
): { canReview: boolean; reason?: string } {
  if (!permissions.canReview) {
    return { canReview: false, reason: 'You do not have review permissions' };
  }

  if (!REVIWABLE_STATUSES.includes(caseDetail.status)) {
    return {
      canReview: false,
      reason: `Case is ${caseDetail.status} and cannot be reviewed`,
    };
  }

  if (caseDetail.status === ProductOpsCaseStatus.CLOSED) {
    return { canReview: false, reason: 'Closed cases cannot be reviewed' };
  }

  return { canReview: true };
}

/**
 * Check if user can assign a case
 */
export function canAssignReviewCase(
  permissions: ProductOpsPermissionState,
  caseDetail: ProductOpsCaseDetailModel
): { canAssign: boolean; reason?: string } {
  if (!permissions.canAssign) {
    return { canAssign: false, reason: 'You do not have assignment permissions' };
  }

  if (!ASSIGNABLE_STATUSES.includes(caseDetail.status)) {
    return {
      canAssign: false,
      reason: `Case status ${caseDetail.status} does not allow assignment`,
    };
  }

  return { canAssign: true };
}

/**
 * Check if user can approve a remediation
 */
export function canApproveRemediation(
  permissions: ProductOpsPermissionState,
  remediation: ProductOpsRemediationDetailModel
): { canApprove: boolean; reason?: string } {
  if (!permissions.canApproveRemediation) {
    return { canApprove: false, reason: 'You do not have remediation approval permissions' };
  }

  if (!REMEDIATION_APPROVABLE_STATUSES.includes(remediation.status)) {
    return {
      canApprove: false,
      reason: `Remediation is ${remediation.status} and cannot be approved`,
    };
  }

  return { canApprove: true };
}

/**
 * Check if user can reject a remediation
 */
export function canRejectRemediation(
  permissions: ProductOpsPermissionState,
  remediation: ProductOpsRemediationDetailModel
): { canReject: boolean; reason?: string } {
  if (!permissions.canRejectRemediation) {
    return { canReject: false, reason: 'You do not have remediation rejection permissions' };
  }

  if (!REMEDIATION_REJECTABLE_STATUSES.includes(remediation.status)) {
    return {
      canReject: false,
      reason: `Remediation is ${remediation.status} and cannot be rejected`,
    };
  }

  return { canReject: true };
}

/**
 * Check if user can mark a remediation as executed
 */
export function canMarkRemediationExecuted(
  permissions: ProductOpsPermissionState,
  remediation: ProductOpsRemediationDetailModel
): { canExecute: boolean; reason?: string } {
  if (!permissions.canExecuteRemediation) {
    return { canExecute: false, reason: 'You do not have execution permissions' };
  }

  if (!REMEDIATION_EXECUTABLE_STATUSES.includes(remediation.status)) {
    return {
      canExecute: false,
      reason: `Remediation is ${remediation.status} and cannot be marked as executed`,
    };
  }

  return { canExecute: true };
}

// ============================================================================
// Assignment State
// ============================================================================

/**
 * Build assignment state for a case
 */
export function buildProductOpsAssignmentState(
  caseDetail: ProductOpsCaseDetailModel,
  currentUserId: string
): ProductOpsAssignmentState {
  const isAssigned = !!caseDetail.assigneeId;
  const isAssignedToMe = caseDetail.assigneeId === currentUserId;
  const canReassign = isAssigned && isAssignedToMe;

  return {
    isAssigned,
    isAssignedToMe,
    canReassign,
    currentAssigneeId: caseDetail.assigneeId,
    currentAssigneeName: caseDetail.assigneeName,
  };
}

/**
 * Check if case is assigned to current user
 */
export function isCaseAssignedToMe(
  caseDetail: ProductOpsCaseDetailModel,
  currentUserId: string
): boolean {
  return caseDetail.assigneeId === currentUserId;
}

// ============================================================================
// Disabled Reason Helpers
// ============================================================================

/**
 * Get disabled reason for a decision action
 */
export function getDecisionDisabledReason(
  decisionType: string,
  permissions: ProductOpsPermissionState,
  caseDetail: ProductOpsCaseDetailModel
): string | undefined {
  const reviewCheck = canReviewProductOpsCase(permissions, caseDetail);
  if (!reviewCheck.canReview) {
    return reviewCheck.reason;
  }

  // Additional status-specific checks
  if (caseDetail.status === ProductOpsCaseStatus.ACCEPTED) {
    if (decisionType === 'accept') {
      return 'Case is already accepted';
    }
  }

  if (caseDetail.status === ProductOpsCaseStatus.REJECTED) {
    if (decisionType === 'reject') {
      return 'Case is already rejected';
    }
  }

  if (caseDetail.status === ProductOpsCaseStatus.CLOSED) {
    return 'Case is closed';
  }

  return undefined;
}

/**
 * Get disabled reason for remediation action
 */
export function getRemediationDisabledReason(
  action: 'approve' | 'reject' | 'execute',
  permissions: ProductOpsPermissionState,
  remediation: ProductOpsRemediationDetailModel
): string | undefined {
  switch (action) {
    case 'approve': {
      const check = canApproveRemediation(permissions, remediation);
      return check.canApprove ? undefined : check.reason;
    }
    case 'reject': {
      const check = canRejectRemediation(permissions, remediation);
      return check.canReject ? undefined : check.reason;
    }
    case 'execute': {
      const check = canMarkRemediationExecuted(permissions, remediation);
      return check.canExecute ? undefined : check.reason;
    }
    default:
      return undefined;
  }
}
