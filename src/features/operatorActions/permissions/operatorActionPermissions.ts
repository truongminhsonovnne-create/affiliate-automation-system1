/**
 * Operator Actions - Permission System
 * Role and context-based permission checks for operator actions
 */

import type {
  OperatorActionType,
  OperatorCapability,
  OperatorActionContext,
  OperatorActor,
  OperatorActionPermissionState,
  OperatorActionEligibility,
  OperatorTargetType,
} from '../types';
import {
  OPERATOR_CAPABILITIES,
  ACTION_REQUIRED_CAPABILITY,
  OPERATOR_ACTION_TYPES,
} from '../types';
import { PUBLISH_JOB_STATES, DEAD_LETTER_STATES } from '../constants';

// =============================================================================
// CAPABILITY HIERARCHY
// =============================================================================

/** Capability level hierarchy (higher = more permissions) */
const CAPABILITY_LEVELS: Record<OperatorCapability, number> = {
  [OPERATOR_CAPABILITIES.READONLY]: 0,
  [OPERATOR_CAPABILITIES.OPERATE]: 1,
  [OPERATOR_CAPABILITIES.ADMIN]: 2,
  [OPERATOR_CAPABILITIES.SUPER_ADMIN]: 3,
};

/**
 * Check if actor has required capability
 */
function hasCapability(
  actorCapability: OperatorCapability,
  requiredCapability: OperatorCapability
): boolean {
  return CAPABILITY_LEVELS[actorCapability] >= CAPABILITY_LEVELS[requiredCapability];
}

// =============================================================================
// PERMISSION CHECKS
// =============================================================================

/**
 * Check if operator action can be shown to the actor
 * This determines visibility in UI
 */
export function canShowOperatorAction(
  actor: OperatorActor,
  actionType: OperatorActionType,
  context?: Partial<Pick<OperatorActionContext, 'targetState' | 'targetType'>>
): boolean {
  // Check basic capability requirement
  const requiredCapability = ACTION_REQUIRED_CAPABILITY[actionType] ?? OPERATOR_CAPABILITIES.OPERATE;

  if (!hasCapability(actor.capability, requiredCapability)) {
    return false;
  }

  // Additional context-based visibility checks
  return canShowByContext(actionType, actor, context);
}

/**
 * Check if operator action can be executed by the actor
 * This determines if the action button should be enabled
 */
export function canExecuteOperatorAction(
  actor: OperatorActor,
  actionType: OperatorActionType,
  context?: Partial<Pick<OperatorActionContext, 'targetState' | 'targetType'>>
): OperatorActionEligibility {
  const requiredCapability = ACTION_REQUIRED_CAPABILITY[actionType] ?? OPERATOR_CAPABILITIES.OPERATE;

  // Check capability
  if (!hasCapability(actor.capability, requiredCapability)) {
    return {
      eligible: false,
      reason: `This action requires ${requiredCapability} capability. You have ${actor.capability}.`,
    };
  }

  // Check target state eligibility
  const stateCheck = checkTargetStateEligibility(actionType, context?.targetState);
  if (!stateCheck.eligible) {
    return stateCheck;
  }

  return {
    eligible: true,
    warnings: stateCheck.warnings,
  };
}

/**
 * Build complete permission state for an action
 */
export function buildOperatorActionPermissionState(
  actor: OperatorActor,
  actionType: OperatorActionType,
  context?: Partial<Pick<OperatorActionContext, 'targetState' | 'targetType'>>
): OperatorActionPermissionState {
  const requiredCapability = ACTION_REQUIRED_CAPABILITY[actionType] ?? OPERATOR_CAPABILITIES.OPERATE;
  const canShow = canShowOperatorAction(actor, actionType, context);
  const eligibility = canExecuteOperatorAction(actor, actionType, context);

  return {
    canShow,
    canExecute: canShow && eligibility.eligible,
    reason: !canShow
      ? `You don't have permission to see this action.`
      : !eligibility.eligible
        ? eligibility.reason
        : undefined,
    warnings: eligibility.warnings,
    requiredCapability,
    actorCapability: actor.capability,
  };
}

// =============================================================================
// CONTEXT-BASED VISIBILITY
// =============================================================================

/**
 * Determine if action should be shown based on context
 */
function canShowByContext(
  actionType: OperatorActionType,
  actor: OperatorActor,
  context?: Partial<Pick<OperatorActionContext, 'targetState' | 'targetType'>>
): boolean {
  const targetState = context?.targetState;

  // Always show manual operations if capability is sufficient
  if (isManualOperationAction(actionType)) {
    return true;
  }

  // For entity-targeted actions, check if we have context
  if (!targetState && isEntityTargetedAction(actionType)) {
    // Show by default if no state available - guards will handle runtime checks
    return true;
  }

  return true;
}

/**
 * Check if action is a manual operation (no specific target)
 */
function isManualOperationAction(actionType: OperatorActionType): boolean {
  return [
    OPERATOR_ACTION_TYPES.TRIGGER_FLASH_SALE_CRAWL,
    OPERATOR_ACTION_TYPES.TRIGGER_SEARCH_CRAWL,
    OPERATOR_ACTION_TYPES.TRIGGER_AI_ENRICHMENT,
    OPERATOR_ACTION_TYPES.TRIGGER_PUBLISH_PREPARATION,
    OPERATOR_ACTION_TYPES.TRIGGER_PUBLISHER_RUN,
  ].includes(actionType);
}

/**
 * Check if action targets a specific entity
 */
function isEntityTargetedAction(actionType: OperatorActionType): boolean {
  return !isManualOperationAction(actionType);
}

// =============================================================================
// TARGET STATE ELIGIBILITY
// =============================================================================

/**
 * Check if action is eligible based on target state
 */
function checkTargetStateEligibility(
  actionType: OperatorActionType,
  targetState?: Record<string, unknown>
): OperatorActionEligibility {
  if (!targetState) {
    // No state = assume eligible (guards will handle runtime)
    return { eligible: true };
  }

  switch (actionType) {
    case OPERATOR_ACTION_TYPES.RETRY_PUBLISH_JOB:
      return checkRetryPublishJobEligibility(targetState);
    case OPERATOR_ACTION_TYPES.CANCEL_PUBLISH_JOB:
      return checkCancelPublishJobEligibility(targetState);
    case OPERATOR_ACTION_TYPES.UNLOCK_PUBLISH_JOB:
      return checkUnlockPublishJobEligibility(targetState);
    case OPERATOR_ACTION_TYPES.REQUEUE_DEAD_LETTER:
      return checkRequeueDeadLetterEligibility(targetState);
    case OPERATOR_ACTION_TYPES.RESOLVE_DEAD_LETTER:
      return checkResolveDeadLetterEligibility(targetState);
    default:
      return { eligible: true };
  }
}

// =============================================================================
// PUBLISH JOB STATE CHECKS
// =============================================================================

/**
 * Check retry publish job eligibility
 */
function checkRetryPublishJobEligibility(
  targetState: Record<string, unknown>
): OperatorActionEligibility {
  const status = targetState.status as string | undefined;

  // Can retry failed or cancelled jobs
  if (status === PUBLISH_JOB_STATES.FAILED || status === PUBLISH_JOB_STATES.CANCELLED) {
    const warnings: string[] = [];

    // Check retry count
    const retryCount = (targetState.retryCount as number) ?? 0;
    if (retryCount >= 3) {
      warnings.push('This job has been retried multiple times already.');
    }

    return { eligible: true, warnings };
  }

  // Check if already in progress
  if (status === PUBLISH_JOB_STATES.RUNNING) {
    return {
      eligible: false,
      reason: 'Cannot retry a job that is currently running.',
    };
  }

  // Completed jobs can be re-run
  if (status === PUBLISH_JOB_STATES.COMPLETED) {
    return {
      eligible: true,
      warnings: ['This will create a new publish job.'],
    };
  }

  return {
    eligible: false,
    reason: `Cannot retry a job with status: ${status ?? 'unknown'}`,
  };
}

/**
 * Check cancel publish job eligibility
 */
function checkCancelPublishJobEligibility(
  targetState: Record<string, unknown>
): OperatorActionEligibility {
  const status = targetState.status as string | undefined;

  // Can cancel pending or running jobs
  if (status === PUBLISH_JOB_STATES.PENDING || status === PUBLISH_JOB_STATES.RUNNING) {
    const warnings: string[] = [];

    // Check if job is near completion
    const progress = (targetState.progress as number) ?? 0;
    if (progress > 80) {
      warnings.push('This job is nearly complete. Cancelling now may waste progress.');
    }

    return {
      eligible: true,
      warnings,
      metadata: { canForce: status === PUBLISH_JOB_STATES.RUNNING },
    };
  }

  // Already finished jobs cannot be cancelled
  if (status === PUBLISH_JOB_STATES.COMPLETED) {
    return {
      eligible: false,
      reason: 'Cannot cancel a job that has already completed.',
    };
  }

  if (status === PUBLISH_JOB_STATES.CANCELLED) {
    return {
      eligible: false,
      reason: 'This job has already been cancelled.',
    };
  }

  return {
    eligible: false,
    reason: `Cannot cancel a job with status: ${status ?? 'unknown'}`,
  };
}

/**
 * Check unlock publish job eligibility
 */
function checkUnlockPublishJobEligibility(
  targetState: Record<string, unknown>
): OperatorActionEligibility {
  const status = targetState.status as string | undefined;
  const isStale = targetState.isStale as boolean | undefined;
  const lockedBy = targetState.lockedBy as string | undefined;

  // Can unlock stale jobs
  if (isStale || status === PUBLISH_JOB_STATES.STALE) {
    return {
      eligible: true,
      warnings: [
        'This will force-unlock the job regardless of who locked it.',
        'Any running operations may be interrupted.',
      ],
    };
  }

  // Check for stale indicators
  const updatedAt = targetState.updatedAt as string | undefined;
  if (updatedAt) {
    const hoursSinceUpdate = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpdate > 4) {
      return {
        eligible: true,
        warnings: ['This job appears to be stuck.'],
      };
    }
  }

  // No obvious stale indicators
  return {
    eligible: false,
    reason: 'This job does not appear to be stale.',
  };
}

// =============================================================================
// DEAD LETTER STATE CHECKS
// =============================================================================

/**
 * Check requeue dead letter eligibility
 */
function checkRequeueDeadLetterEligibility(
  targetState: Record<string, unknown>
): OperatorActionEligibility {
  const status = targetState.status as string | undefined;

  // Can requeue pending or failed items
  if (status === DEAD_LETTER_STATES.PENDING || status === 'failed') {
    const warnings: string[] = [];

    // Check requeue count
    const requeueCount = (targetState.requeueCount as number) ?? 0;
    if (requeueCount >= 3) {
      warnings.push('This item has been requeued multiple times.');
    }

    return { eligible: true, warnings };
  }

  // Already resolved or requeued cannot be requeued again
  if (status === DEAD_LETTER_STATES.RESOLVED) {
    return {
      eligible: false,
      reason: 'This item has already been resolved.',
    };
  }

  if (status === DEAD_LETTER_STATES.REQUEUED) {
    return {
      eligible: true,
      warnings: ['This item is already queued for processing.'],
    };
  }

  return {
    eligible: false,
    reason: `Cannot requeue a dead letter with status: ${status ?? 'unknown'}`,
  };
}

/**
 * Check resolve dead letter eligibility
 */
function checkResolveDeadLetterEligibility(
  targetState: Record<string, unknown>
): OperatorActionEligibility {
  const status = targetState.status as string | undefined;

  // Can resolve pending or failed items
  if (status === DEAD_LETTER_STATES.PENDING || status === 'failed') {
    return {
      eligible: true,
      warnings: ['This action is irreversible.'],
    };
  }

  // Already resolved cannot be resolved again
  if (status === DEAD_LETTER_STATES.RESOLVED) {
    return {
      eligible: false,
      reason: 'This item has already been resolved.',
    };
  }

  return {
    eligible: false,
    reason: `Cannot resolve a dead letter with status: ${status ?? 'unknown'}`,
  };
}

// =============================================================================
// BULK PERMISSION CHECKS
// =============================================================================

/**
 * Check if bulk action is allowed for a list of targets
 */
export function canExecuteBulkOperatorAction(
  actor: OperatorActor,
  actionType: OperatorActionType,
  targets: Array<{ targetId: string; targetState?: Record<string, unknown> }>
): {
  allowed: boolean;
  eligibleTargets: string[];
  ineligibleReasons: Map<string, string>;
} {
  const eligibleTargets: string[] = [];
  const ineligibleReasons = new Map<string, string>();

  for (const target of targets) {
    const eligibility = canExecuteOperatorAction(actor, actionType, {
      targetState: target.targetState,
    });

    if (eligibility.eligible) {
      eligibleTargets.push(target.targetId);
    } else {
      ineligibleReasons.set(target.targetId, eligibility.reason ?? 'Not eligible');
    }
  }

  return {
    allowed: eligibleTargets.length > 0,
    eligibleTargets,
    ineligibleReasons,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get all visible actions for an actor
 */
export function getVisibleActions(
  actor: OperatorActor,
  context?: Partial<Pick<OperatorActionContext, 'targetState' | 'targetType'>>
): OperatorActionType[] {
  const allActions = Object.values(OPERATOR_ACTION_TYPES);
  return allActions.filter((action) => canShowOperatorAction(actor, action, context));
}

/**
 * Get all executable actions for an actor
 */
export function getExecutableActions(
  actor: OperatorActor,
  context?: Partial<Pick<OperatorActionContext, 'targetState' | 'targetType'>>
): OperatorActionType[] {
  const allActions = Object.values(OPERATOR_ACTION_TYPES);
  return allActions.filter((action) => {
    const eligibility = canExecuteOperatorAction(actor, action, context);
    return eligibility.eligible;
  });
}

/**
 * Create a mock actor for testing
 */
export function createMockActor(capability: OperatorCapability): OperatorActor {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Test User',
    email: 'test@example.com',
    capability,
    roles: [capability],
  };
}
