/**
 * Operator Actions - Bulk Action Planner
 * Abstraction for bulk operations
 */

import type {
  OperatorActionType,
  OperatorActor,
  BulkOperatorActionInput,
  BulkOperatorActionResult,
  OperatorActionError,
} from '../types';
import { BULK_ACTION_MAX_ITEMS, BULK_ACTION_MIN_ITEMS } from '../constants';
import { canExecuteBulkOperatorAction } from '../permissions/operatorActionPermissions';

/**
 * Check if bulk action can be planned
 */
export function canPlanBulkAction(
  actor: OperatorActor,
  actionType: OperatorActionType,
  targets: Array<{ targetId: string; targetState?: Record<string, unknown> }>
): {
  canPlan: boolean;
  reason?: string;
  eligibleCount: number;
  totalCount: number;
} {
  // Check minimum items
  if (targets.length < BULK_ACTION_MIN_ITEMS) {
    return {
      canPlan: false,
      reason: `Minimum ${BULK_ACTION_MIN_ITEMS} items required for bulk action`,
      eligibleCount: 0,
      totalCount: targets.length,
    };
  }

  // Check maximum items
  if (targets.length > BULK_ACTION_MAX_ITEMS) {
    return {
      canPlan: false,
      reason: `Maximum ${BULK_ACTION_MAX_ITEMS} items allowed for bulk action`,
      eligibleCount: 0,
      totalCount: targets.length,
    };
  }

  // Check permissions
  const permissionCheck = canExecuteBulkOperatorAction(actor, actionType, targets);

  return {
    canPlan: permissionCheck.allowed,
    reason: permissionCheck.allowed
      ? undefined
      : `None of the ${targets.length} items are eligible for this action`,
    eligibleCount: permissionCheck.eligibleTargets.length,
    totalCount: targets.length,
  };
}

/**
 * Build bulk action plan
 */
export function buildBulkActionPlan(
  actor: OperatorActor,
  actionType: OperatorActionType,
  targets: Array<{ targetId: string; targetState?: Record<string, unknown> }>,
  options?: {
    payload?: Record<string, unknown>;
    reason?: string;
  }
): {
  valid: boolean;
  plan?: BulkOperatorActionInput;
  reason?: string;
  ineligibleTargets?: Array<{ targetId: string; reason: string }>;
} {
  // Check if can plan
  const canPlan = canPlanBulkAction(actor, actionType, targets);

  if (!canPlan.canPlan) {
    return {
      valid: false,
      reason: canPlan.reason,
    };
  }

  // Get eligible targets
  const permissionCheck = canExecuteBulkOperatorAction(actor, actionType, targets);

  if (!permissionCheck.allowed) {
    return {
      valid: false,
      reason: 'No eligible targets for this action',
      ineligibleTargets: Array.from(permissionCheck.ineligibleReasons.entries()).map(
        ([targetId, reason]) => ({ targetId, reason })
      ),
    };
  }

  // Build plan
  const plan: BulkOperatorActionInput = {
    actionType,
    targetIds: permissionCheck.eligibleTargets,
    payload: options?.payload,
    reason: options?.reason,
  };

  return {
    valid: true,
    plan,
    ineligibleTargets: Array.from(permissionCheck.ineligibleReasons.entries()).map(
      ([targetId, reason]) => ({ targetId, reason })
    ),
  };
}

/**
 * Execute bulk action plan
 * This would typically call a bulk API endpoint
 */
export async function executeBulkActionPlan(
  plan: BulkOperatorActionInput,
  executor: (input: BulkOperatorActionInput) => Promise<BulkOperatorActionResult>
): Promise<BulkOperatorActionResult> {
  try {
    const result = await executor(plan);
    return result;
  } catch (error) {
    // Handle execution error
    return {
      success: false,
      actionType: plan.actionType,
      total: plan.targetIds.length,
      succeeded: 0,
      failed: plan.targetIds.length,
      results: plan.targetIds.map((targetId) => ({
        targetId,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      })),
    };
  }
}

/**
 * Build summary of bulk action
 */
export function buildBulkActionSummary(
  plan: BulkOperatorActionInput,
  result: BulkOperatorActionResult
): {
  title: string;
  message: string;
  succeededCount: number;
  failedCount: number;
  totalCount: number;
} {
  const actionLabel = plan.actionType.replace(/_/g, ' ').toLowerCase();

  return {
    title: `${actionLabel} Complete`,
    message: result.failed === 0
      ? `Successfully processed ${result.succeeded} of ${result.total} items.`
      : `Processed ${result.total} items: ${result.succeeded} succeeded, ${result.failed} failed.`,
    succeededCount: result.succeeded,
    failedCount: result.failed,
    totalCount: result.total,
  };
}

// =============================================================================
// BULK ACTION HOOK (Conceptual)
// =============================================================================

/**
 * Example bulk mutation hook interface
 * This would be implemented using React Query's useMutation
 */
export interface UseBulkActionOptions {
  actionType: OperatorActionType;
  onSuccess?: (result: BulkOperatorActionResult) => void;
  onError?: (error: OperatorActionError) => void;
}

/**
 * Build bulk action from selected items
 */
export function buildBulkActionFromSelection<
  T extends { id: string; [key: string]: unknown }
>(
  actionType: OperatorActionType,
  items: T[],
  getState?: (item: T) => Record<string, unknown> | undefined
): Array<{ targetId: string; targetState?: Record<string, unknown> }> {
  return items.map((item) => ({
    targetId: item.id,
    targetState: getState ? getState(item) : undefined,
  }));
}
