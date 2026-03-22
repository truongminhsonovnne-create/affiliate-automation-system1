/**
 * Product Ops Audit Notice
 *
 * Builds audit-aware notices for UI display
 */

import type { ProductOpsAuditInfo } from '../types';

// ============================================================================
// Decision Audit Notice
// ============================================================================

/**
 * Build audit notice for a decision action
 */
export function buildDecisionAuditNotice(params: {
  decisionType: string;
  actorName: string;
  timestamp: Date;
  rationale?: string;
}): string {
  const { decisionType, actorName, timestamp, rationale } = params;

  const decisionLabels: Record<string, string> = {
    accept: 'Accepted',
    reject: 'Rejected',
    defer: 'Deferred',
    needs_more_evidence: 'Requested more evidence',
    close: 'Closed',
  };

  const decisionLabel = decisionLabels[decisionType] || decisionType;
  const formattedTime = formatTimestamp(timestamp);

  let notice = `${actorName} ${decisionLabel.toLowerCase()} this case on ${formattedTime}`;

  if (rationale) {
    const truncatedRationale = rationale.length > 100
      ? rationale.substring(0, 100) + '...'
      : rationale;
    notice += `. Rationale: "${truncatedRationale}"`;
  }

  return notice;
}

/**
 * Build short audit notice for decision
 */
export function buildShortDecisionAuditNotice(params: {
  decisionType: string;
  actorName: string;
}): string {
  const { decisionType, actorName } = params;

  const decisionLabels: Record<string, string> = {
    accept: 'accepted',
    reject: 'rejected',
    defer: 'deferred',
    needs_more_evidence: 'requested more evidence',
    close: 'closed',
  };

  const decisionLabel = decisionLabels[decisionType] || decisionType;
  return `${actorName} ${decisionLabel}`;
}

// ============================================================================
// Remediation Audit Notice
// ============================================================================

/**
 * Build audit notice for remediation action
 */
export function buildRemediationAuditNotice(params: {
  actionType: 'approve' | 'reject' | 'execute';
  actorName: string;
  timestamp: Date;
  rationale?: string;
}): string {
  const { actionType, actorName, timestamp, rationale } = params;

  const actionLabels: Record<string, string> = {
    approve: 'approved',
    reject: 'rejected',
    execute: 'executed',
  };

  const actionLabel = actionLabels[actionType] || actionType;
  const formattedTime = formatTimestamp(timestamp);

  let notice = `${actorName} ${actionLabel} this remediation on ${formattedTime}`;

  if (rationale && actionType === 'reject') {
    const truncatedRationale = rationale.length > 100
      ? rationale.substring(0, 100) + '...'
      : rationale;
    notice += `. Reason: "${truncatedRationale}"`;
  }

  return notice;
}

// ============================================================================
// Assignment Audit Notice
// ============================================================================

/**
 * Build audit notice for assignment action
 */
export function buildAssignmentAuditNotice(params: {
  assigneeName: string;
  assignerName: string;
  timestamp: Date;
}): string {
  const { assigneeName, assignerName, timestamp } = params;
  const formattedTime = formatTimestamp(timestamp);

  if (assignerName === assigneeName) {
    return `${assigneeName} self-assigned this case on ${formattedTime}`;
  }

  return `${assignerName} assigned this case to ${assigneeName} on ${formattedTime}`;
}

// ============================================================================
// Generic Audit Notice
// ============================================================================

/**
 * Build generic audit notice from audit info
 */
export function buildGenericAuditNotice(auditInfo: ProductOpsAuditInfo): string {
  const formattedTime = formatTimestamp(auditInfo.timestamp);
  let notice = `${auditInfo.actorName} ${auditInfo.action.toLowerCase()}`;

  if (auditInfo.details) {
    notice += `. ${auditInfo.details}`;
  }

  notice += ` on ${formattedTime}`;

  return notice;
}

// ============================================================================
// Audit Warning Notice
// ============================================================================

/**
 * Build warning notice for audit-required actions
 */
export function buildAuditWarningNotice(actionType: string): string {
  const warnings: Record<string, string> = {
    reject: 'This rejection will be logged and included in reports.',
    close: 'Closing this case will archive it permanently. This action is audited.',
    needs_more_evidence: 'Your request for additional evidence will be logged.',
    'remediation-reject': 'This rejection will be logged and included in audit reports.',
  };

  return warnings[actionType] || 'This action will be logged for audit purposes.';
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return 'just now';
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }

  if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  if (days < 7) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  // Format as date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Build list of recent audit events for display
 */
export function buildAuditEventList(
  auditEvents: ProductOpsAuditInfo[],
  maxItems: number = 5
): Array<{
  id: string;
  notice: string;
  timestamp: Date;
}> {
  return auditEvents.slice(0, maxItems).map((event) => ({
    id: event.timestamp.toISOString(),
    notice: buildGenericAuditNotice(event),
    timestamp: event.timestamp,
  }));
}
