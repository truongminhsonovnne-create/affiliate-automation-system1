/**
 * Operator Actions - UI Guards
 * Pre-mutation validation for safe action execution
 */

import type {
  OperatorActionType,
  OperatorActionContext,
  OperatorActionGuardResult,
  OperatorActionEligibility,
} from '../types';
import { PUBLISH_JOB_STATES, DEAD_LETTER_STATES, GUARD_CONFIG } from '../constants';

/**
 * Guard function type
 */
type GuardFunction = (
  context: OperatorActionContext
) => OperatorActionGuardResult;

// =============================================================================
// GUARD EXECUTION
// =============================================================================

/**
 * Execute all guards for an action
 */
export function executeGuards(
  actionType: OperatorActionType,
  context: OperatorActionContext
): OperatorActionGuardResult[] {
  const guards = getGuardsForAction(actionType);
  return guards.map((guard) => guard(context));
}

/**
 * Get guards for a specific action type
 */
function getGuardsForAction(actionType: OperatorActionType): GuardFunction[] {
  switch (actionType) {
    case 'RETRY_PUBLISH_JOB':
      return [guardRetryPublishJobAction];
    case 'CANCEL_PUBLISH_JOB':
      return [guardCancelPublishJobAction];
    case 'UNLOCK_PUBLISH_JOB':
      return [guardUnlockPublishJobAction];
    case 'REQUEUE_DEAD_LETTER':
      return [guardRequeueDeadLetterAction];
    case 'RESOLVE_DEAD_LETTER':
      return [guardResolveDeadLetterAction];
    case 'TRIGGER_FLASH_SALE_CRAWL':
    case 'TRIGGER_SEARCH_CRAWL':
    case 'TRIGGER_AI_ENRICHMENT':
    case 'TRIGGER_PUBLISH_PREPARATION':
    case 'TRIGGER_PUBLISHER_RUN':
      return [guardManualRunAction];
    default:
      return [];
  }
}

// =============================================================================
// PUBLISH JOB GUARDS
// =============================================================================

/**
 * Guard for retry publish job action
 */
export function guardRetryPublishJobAction(
  context: OperatorActionContext
): OperatorActionGuardResult {
  const targetState = context.targetState ?? {};
  const status = targetState.status as string | undefined;

  // Check status
  const allowedStatuses = [
    PUBLISH_JOB_STATES.FAILED,
    PUBLISH_JOB_STATES.CANCELLED,
    PUBLISH_JOB_STATES.COMPLETED,
  ];

  if (status && !allowedStatuses.includes(status as typeof PUBLISH_JOB_STATES.FAILED)) {
    if (status === PUBLISH_JOB_STATES.RUNNING) {
      return {
        passed: false,
        guard: 'retry_publish_job',
        reason: 'Cannot retry a job that is currently running.',
        severity: 'warning',
      };
    }

    if (status === PUBLISH_JOB_STATES.PENDING) {
      return {
        passed: false,
        guard: 'retry_publish_job',
        reason: 'This job is pending. Wait for it to start or cancel it first.',
        severity: 'warning',
      };
    }
  }

  // Check retry count
  const retryCount = (targetState.retryCount as number) ?? 0;
  if (retryCount >= GUARD_CONFIG.MAX_RETRY_COUNT) {
    return {
      passed: true,
      guard: 'retry_publish_job',
      warnings: [`This job has already been retried ${retryCount} times.`],
      severity: 'warning',
    };
  }

  return {
    passed: true,
    guard: 'retry_publish_job',
    warnings: generateRetryWarnings(targetState),
  };
}

/**
 * Guard for cancel publish job action
 */
export function guardCancelPublishJobAction(
  context: OperatorActionContext
): OperatorActionGuardResult {
  const targetState = context.targetState ?? {};
  const status = targetState.status as string | undefined;

  // Check if already finished
  if (status === PUBLISH_JOB_STATES.COMPLETED) {
    return {
      passed: false,
      guard: 'cancel_publish_job',
      reason: 'Cannot cancel a job that has already completed.',
      severity: 'warning',
    };
  }

  if (status === PUBLISH_JOB_STATES.CANCELLED) {
    return {
      passed: false,
      guard: 'cancel_publish_job',
      reason: 'This job has already been cancelled.',
      severity: 'warning',
    };
  }

  // Check if can be cancelled
  const cancellableStatuses = [PUBLISH_JOB_STATES.PENDING, PUBLISH_JOB_STATES.RUNNING];
  if (status && !cancellableStatuses.includes(status as typeof PUBLISH_JOB_STATES.PENDING)) {
    return {
      passed: false,
      guard: 'cancel_publish_job',
      reason: `Cannot cancel a job with status: ${status}`,
      severity: 'warning',
    };
  }

  // Generate warnings
  const warnings: string[] = [];
  const progress = (targetState.progress as number) ?? 0;

  if (progress > 80) {
    warnings.push('This job is over 80% complete. Cancelling may waste progress.');
  }

  if (status === PUBLISH_JOB_STATES.RUNNING) {
    warnings.push('This will immediately stop the running job.');
  }

  // Check cancel count
  const cancelCount = (targetState.cancelCount as number) ?? 0;
  if (cancelCount >= GUARD_CONFIG.MAX_CANCEL_COUNT) {
    warnings.push('This job has been cancelled multiple times.');
  }

  return {
    passed: true,
    guard: 'cancel_publish_job',
    warnings,
    severity: 'destructive',
  };
}

/**
 * Guard for unlock publish job action
 */
export function guardUnlockPublishJobAction(
  context: OperatorActionContext
): OperatorActionGuardResult {
  const targetState = context.targetState ?? {};
  const isStale = targetState.isStale as boolean | undefined;
  const status = targetState.status as string | undefined;

  // Check if explicitly marked stale
  if (isStale || status === PUBLISH_JOB_STATES.STALE) {
    return {
      passed: true,
      guard: 'unlock_publish_job',
      warnings: [
        'This will force-unlock the job.',
        'Any running operations may be interrupted.',
      ],
      severity: 'warning',
    };
  }

  // Check for time-based staleness
  const updatedAt = targetState.updatedAt as string | undefined;
  if (updatedAt) {
    const hoursSinceUpdate =
      (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60);

    if (hoursSinceUpdate > GUARD_CONFIG.STALE_JOB_THRESHOLD_HOURS) {
      return {
        passed: true,
        guard: 'unlock_publish_job',
        warnings: [
          `This job hasn't been updated in ${Math.round(hoursSinceUpdate)} hours.`,
          'It may be stuck and needs to be unlocked.',
        ],
        severity: 'warning',
      };
    }
  }

  // Check if currently locked
  const lockedBy = targetState.lockedBy as string | undefined;
  if (lockedBy) {
    return {
      passed: true,
      guard: 'unlock_publish_job',
      warnings: [
        `This job is currently locked by ${lockedBy}.`,
        'Force unlocking may cause conflicts.',
      ],
      severity: 'warning',
    };
  }

  // Not stale
  return {
    passed: false,
    guard: 'unlock_publish_job',
    reason: 'This job does not appear to be stale or locked.',
    severity: 'info',
  };
}

// =============================================================================
// DEAD LETTER GUARDS
// =============================================================================

/**
 * Guard for requeue dead letter action
 */
export function guardRequeueDeadLetterAction(
  context: OperatorActionContext
): OperatorActionGuardResult {
  const targetState = context.targetState ?? {};
  const status = targetState.status as string | undefined;

  // Check if already resolved
  if (status === DEAD_LETTER_STATES.RESOLVED) {
    return {
      passed: false,
      guard: 'requeue_dead_letter',
      reason: 'This item has already been resolved.',
      severity: 'warning',
    };
  }

  // Check if currently processing
  if (status === DEAD_LETTER_STATES.PROCESSING) {
    return {
      passed: false,
      guard: 'requeue_dead_letter',
      reason: 'This item is currently being processed.',
      severity: 'warning',
    };
  }

  // Generate warnings
  const warnings: string[] = [];
  const requeueCount = (targetState.requeueCount as number) ?? 0;

  if (requeueCount > 0) {
    warnings.push(`This item has been requeued ${requeueCount} times before.`);
  }

  const errorMessage = targetState.error as string | undefined;
  if (errorMessage) {
    warnings.push(`Previous error: ${errorMessage}`);
  }

  return {
    passed: true,
    guard: 'requeue_dead_letter',
    warnings,
  };
}

/**
 * Guard for resolve dead letter action
 */
export function guardResolveDeadLetterAction(
  context: OperatorActionContext
): OperatorActionGuardResult {
  const targetState = context.targetState ?? {};
  const status = targetState.status as string | undefined;

  // Check if already resolved
  if (status === DEAD_LETTER_STATES.RESOLVED) {
    return {
      passed: false,
      guard: 'resolve_dead_letter',
      reason: 'This item has already been resolved.',
      severity: 'warning',
    };
  }

  // Check if already requeued (and likely processing)
  if (status === DEAD_LETTER_STATES.REQUEUED) {
    return {
      passed: false,
      guard: 'resolve_dead_letter',
      reason: 'This item is queued for processing. Wait for it to complete first.',
      severity: 'warning',
    };
  }

  return {
    passed: true,
    guard: 'resolve_dead_letter',
    warnings: [
      'This action is irreversible.',
      'The item will be marked as resolved without reprocessing.',
    ],
    severity: 'warning',
  };
}

// =============================================================================
// MANUAL OPERATION GUARDS
// =============================================================================

/**
 * Guard for manual run actions
 */
export function guardManualRunAction(
  context: OperatorActionContext
): OperatorActionGuardResult {
  const targetState = context.targetState ?? {};
  const payload = context.metadata?.payload as Record<string, unknown> | undefined;

  // Validate payload if required
  if (!payload || Object.keys(payload).length === 0) {
    return {
      passed: true,
      guard: 'manual_run',
      warnings: ['No specific targets selected. This will run for all available items.'],
    };
  }

  // Check for large batch sizes
  const limit = payload.limit as number | undefined;
  if (limit && limit > 1000) {
    return {
      passed: true,
      guard: 'manual_run',
      warnings: ['Large batch size may take significant time to process.'],
    };
  }

  // Check for concurrent operations
  const hasRunningOperation = targetState.hasRunningOperation as boolean | undefined;
  if (hasRunningOperation) {
    return {
      passed: true,
      guard: 'manual_run',
      warnings: ['There is already an operation running. This will be queued.'],
    };
  }

  return {
    passed: true,
    guard: 'manual_run',
  };
}

// =============================================================================
// COMBINED GUARD CHECK
// =============================================================================

/**
 * Check if all guards pass for an action
 */
export function checkAllGuards(
  actionType: OperatorActionType,
  context: OperatorActionContext
): {
  passed: boolean;
  results: OperatorActionGuardResult[];
  allWarnings: string[];
} {
  const results = executeGuards(actionType, context);
  const allWarnings = results.flatMap((r) => r.warnings ?? []);
  const passed = results.every((r) => r.passed);

  return { passed, results, allWarnings };
}

/**
 * Build eligibility from guard results
 */
export function buildEligibilityFromGuards(
  actionType: OperatorActionType,
  context: OperatorActionContext
): OperatorActionEligibility {
  const { passed, allWarnings } = checkAllGuards(actionType, context);

  if (!passed) {
    const failedResult = executeGuards(actionType, context).find((r) => !r.passed);
    return {
      eligible: false,
      reason: failedResult?.reason,
      warnings: allWarnings,
    };
  }

  return {
    eligible: true,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate warnings for retry action
 */
function generateRetryWarnings(targetState: Record<string, unknown>): string[] {
  const warnings: string[] = [];

  const retryCount = (targetState.retryCount as number) ?? 0;
  if (retryCount > 0) {
    warnings.push(`This will be retry attempt #${retryCount + 1}.`);
  }

  const previousError = targetState.error as string | undefined;
  if (previousError) {
    warnings.push(`Previous error: ${previousError}`);
  }

  return warnings;
}
