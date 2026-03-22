/**
 * Operator Actions - Audit Hints
 * Builds audit-aware hints for UI display
 */

import type {
  OperatorActionType,
  OperatorActionAuditHint,
  OperatorActionContext,
} from '../types';
import { AUDIT_NOTICES, DESTRUCTIVE_ACTIONS } from '../constants';

/**
 * Build audit hint for an action
 */
export function buildOperatorActionAuditHint(
  actionType: OperatorActionType,
  context?: Partial<OperatorActionContext>
): OperatorActionAuditHint {
  const isDestructive = DESTRUCTIVE_ACTIONS.has(actionType);
  const isManualRun = isManualOperation(actionType);

  // Always auditable
  const hint: OperatorActionAuditHint = {
    auditable: true,
  };

  if (isDestructive) {
    hint.notice = AUDIT_NOTICES.destructive;
  } else if (isManualRun) {
    hint.notice = AUDIT_NOTICES.manual_run;
  } else {
    hint.notice = AUDIT_NOTICES.default;
  }

  // Add metadata
  hint.metadata = {
    actionType,
    actorId: context?.actor?.id,
    targetId: context?.targetId,
    timestamp: new Date().toISOString(),
  };

  return hint;
}

/**
 * Get audit notice text for an action
 */
export function getOperatorActionAuditNotice(actionType: OperatorActionType): string {
  const isDestructive = DESTRUCTIVE_ACTIONS.has(actionType);
  const isManualRun = isManualOperation(actionType);

  if (isDestructive) {
    return AUDIT_NOTICES.destructive;
  }

  if (isManualRun) {
    return AUDIT_NOTICES.manual_run;
  }

  return AUDIT_NOTICES.default;
}

/**
 * Check if action should show audit indicator in UI
 */
export function shouldShowAuditIndicator(actionType: OperatorActionType): boolean {
  // All actions are auditable
  return true;
}

/**
 * Get audit severity hint for action
 * This helps UI decide how prominent to display the audit notice
 */
export function getAuditSeverityHint(actionType: OperatorActionType): 'low' | 'medium' | 'high' {
  const isDestructive = DESTRUCTIVE_ACTIONS.has(actionType);

  if (isDestructive) {
    return 'high';
  }

  return 'medium';
}

/**
 * Build audit trail entry metadata
 * This is what gets sent to the backend for logging
 */
export function buildAuditTrailMetadata(
  actionType: OperatorActionType,
  context: OperatorActionContext,
  result?: {
    success: boolean;
    message?: string;
  }
): Record<string, unknown> {
  return {
    actionType,
    actor: {
      id: context.actor.id,
      name: context.actor.name,
      email: context.actor.email,
      capability: context.actor.capability,
    },
    target: {
      type: context.targetType,
      id: context.targetId,
    },
    context: context.metadata,
    result: {
      success: result?.success ?? true,
      message: result?.message,
    },
    timestamp: new Date().toISOString(),
    version: '1.0',
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if action is a manual operation
 */
function isManualOperation(actionType: OperatorActionType): boolean {
  return [
    'TRIGGER_FLASH_SALE_CRAWL',
    'TRIGGER_SEARCH_CRAWL',
    'TRIGGER_AI_ENRICHMENT',
    'TRIGGER_PUBLISH_PREPARATION',
    'TRIGGER_PUBLISHER_RUN',
  ].includes(actionType);
}
