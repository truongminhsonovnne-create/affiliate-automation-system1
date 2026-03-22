/**
 * Operator Actions - Dead Letter Actions Panel
 * Action panel for dead letter detail/list context
 */

import React, { useState, useCallback } from 'react';
import type {
  OperatorActor,
  OperatorActionContext,
} from '../types';
import { OPERATOR_ACTION_TYPES } from '../types';
import {
  buildOperatorActionPermissionState,
} from '../permissions/operatorActionPermissions';
import {
  checkAllGuards,
} from '../guards/operatorActionGuards';
import {
  buildConfirmationModel,
} from '../confirmation/buildConfirmationModel';
import { OperatorActionButton } from './OperatorActionButton';
import { ActionConfirmationDialog } from './ActionConfirmationDialog';
import {
  useRequeueDeadLetterMutation,
  useResolveDeadLetterMutation,
} from '../mutations/useDeadLetterMutations';
import type { OperatorActionConfirmationModel } from '../types';

// =============================================================================
// PROP TYPES
// =============================================================================

export interface DeadLetterActionsPanelProps {
  /** Current user */
  actor: OperatorActor;

  /** Dead letter data */
  deadLetter: {
    id: string;
    status: string;
    error?: string;
    requeueCount?: number;
    payload?: Record<string, unknown>;
  };

  /** Callback when action completes successfully */
  onSuccess?: (action: string) => void;

  /** Callback when action fails */
  onError?: (action: string, error: Error) => void;

  /** Custom class name */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Action panel for dead letter
 */
export function DeadLetterActionsPanel({
  actor,
  deadLetter,
  onSuccess,
  onError,
  className = '',
}: DeadLetterActionsPanelProps) {
  const [confirmation, setConfirmation] = useState<OperatorActionConfirmationModel | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Mutations
  const requeueMutation = useRequeueDeadLetterMutation({
    onSuccess: () => {
      onSuccess?.('requeue');
      setConfirmation(null);
      setPendingAction(null);
    },
    onError: (error) => {
      onError?.('requeue', new Error(error.message));
    },
  });

  const resolveMutation = useResolveDeadLetterMutation({
    onSuccess: () => {
      onSuccess?.('resolve');
      setConfirmation(null);
      setPendingAction(null);
    },
    onError: (error) => {
      onError?.('resolve', new Error(error.message));
    },
  });

  // Build context for actions
  const buildContext = useCallback(
    (actionType: string): OperatorActionContext => ({
      actor,
      actionType: actionType as typeof OPERATOR_ACTION_TYPES.REQUEUE_DEAD_LETTER,
      targetType: 'dead_letter',
      targetId: deadLetter.id,
      targetState: {
        status: deadLetter.status,
        error: deadLetter.error,
        requeueCount: deadLetter.requeueCount,
        payload: deadLetter.payload,
      },
    }),
    [actor, deadLetter]
  );

  // Check if action can be shown
  const canShowAction = useCallback(
    (actionType: string) => {
      const context = buildContext(actionType);
      return buildOperatorActionPermissionState(actor, actionType as any, {
        targetState: context.targetState,
      }).canShow;
    },
    [actor, buildContext]
  );

  // Check if action can be executed
  const canExecuteAction = useCallback(
    (actionType: string) => {
      const context = buildContext(actionType);
      const permission = buildOperatorActionPermissionState(actor, actionType as any, {
        targetState: context.targetState,
      });
      if (!permission.canExecute) return { eligible: false, reason: permission.reason };

      const guards = checkAllGuards(actionType as any, context);
      return { eligible: guards.passed, warnings: guards.allWarnings };
    },
    [actor, buildContext]
  );

  // Handle action click - shows confirmation
  const handleActionClick = useCallback(
    (actionType: string) => {
      const context = buildContext(actionType);
      const confirmationModel = buildConfirmationModel(actionType as any, context);
      setConfirmation(confirmationModel);
      setPendingAction(actionType);
    },
    [buildContext]
  );

  // Handle confirmation submit
  const handleConfirm = useCallback(async () => {
    if (!pendingAction) return;

    switch (pendingAction) {
      case 'REQUEUE_DEAD_LETTER':
        await requeueMutation.requeue(deadLetter.id);
        break;
      case 'RESOLVE_DEAD_LETTER':
        await resolveMutation.resolve(deadLetter.id);
        break;
    }
  }, [pendingAction, deadLetter.id, requeueMutation, resolveMutation]);

  // Check action states
  const requeueEligibility = canExecuteAction('REQUEUE_DEAD_LETTER');
  const resolveEligibility = canExecuteAction('RESOLVE_DEAD_LETTER');

  const showRequeue = canShowAction('REQUEUE_DEAD_LETTER');
  const showResolve = canShowAction('RESOLVE_DEAD_LETTER');

  return (
    <div className={`dead-letter-actions-panel ${className}`}>
      <h3 className="dead-letter-actions-panel__title">Actions</h3>

      <div className="dead-letter-actions-panel__actions">
        {/* Requeue Action */}
        {showRequeue && (
          <OperatorActionButton
            actionType={OPERATOR_ACTION_TYPES.REQUEUE_DEAD_LETTER}
            targetId={deadLetter.id}
            targetState={{
              status: deadLetter.status,
              error: deadLetter.error,
              requeueCount: deadLetter.requeueCount,
            }}
            actor={actor}
            onClick={() => handleActionClick('REQUEUE_DEAD_LETTER')}
            disabledReason={!requeueEligibility.eligible ? requeueEligibility.reason : undefined}
            variant="secondary"
          />
        )}

        {/* Resolve Action */}
        {showResolve && (
          <OperatorActionButton
            actionType={OPERATOR_ACTION_TYPES.RESOLVE_DEAD_LETTER}
            targetId={deadLetter.id}
            targetState={{
              status: deadLetter.status,
              error: deadLetter.error,
            }}
            actor={actor}
            onClick={() => handleActionClick('RESOLVE_DEAD_LETTER')}
            disabledReason={!resolveEligibility.eligible ? resolveEligibility.reason : undefined}
            variant="destructive"
          />
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmation && (
        <ActionConfirmationDialog
          confirmation={confirmation}
          isOpen={!!confirmation}
          onClose={() => {
            setConfirmation(null);
            setPendingAction(null);
          }}
          onConfirm={handleConfirm}
          isLoading={requeueMutation.isLoading || resolveMutation.isLoading}
        />
      )}
    </div>
  );
}

export default DeadLetterActionsPanel;
