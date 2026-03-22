/**
 * Operator Actions - Publish Job Actions Panel
 * Action panel for publish job detail/list context
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
  useRetryPublishJobMutation,
  useCancelPublishJobMutation,
  useUnlockPublishJobMutation,
} from '../mutations/usePublishJobMutations';
import type { OperatorActionConfirmationModel } from '../types';

// =============================================================================
// PROP TYPES
// =============================================================================

export interface PublishJobActionsPanelProps {
  /** Current user */
  actor: OperatorActor;

  /** Publish job data */
  job: {
    id: string;
    status: string;
    progress?: number;
    retryCount?: number;
    cancelCount?: number;
    error?: string;
    isStale?: boolean;
    lockedBy?: string;
    updatedAt?: string;
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
 * Action panel for publish job
 */
export function PublishJobActionsPanel({
  actor,
  job,
  onSuccess,
  onError,
  className = '',
}: PublishJobActionsPanelProps) {
  const [confirmation, setConfirmation] = useState<OperatorActionConfirmationModel | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Mutations
  const retryMutation = useRetryPublishJobMutation({
    onSuccess: (result) => {
      onSuccess?.('retry');
      setConfirmation(null);
      setPendingAction(null);
    },
    onError: (error) => {
      onError?.('retry', new Error(error.message));
    },
  });

  const cancelMutation = useCancelPublishJobMutation({
    onSuccess: () => {
      onSuccess?.('cancel');
      setConfirmation(null);
      setPendingAction(null);
    },
    onError: (error) => {
      onError?.('cancel', new Error(error.message));
    },
  });

  const unlockMutation = useUnlockPublishJobMutation({
    onSuccess: () => {
      onSuccess?.('unlock');
      setConfirmation(null);
      setPendingAction(null);
    },
    onError: (error) => {
      onError?.('unlock', new Error(error.message));
    },
  });

  // Build context for actions
  const buildContext = useCallback(
    (actionType: string): OperatorActionContext => ({
      actor,
      actionType: actionType as typeof OPERATOR_ACTION_TYPES.RETRY_PUBLISH_JOB,
      targetType: 'publish_job',
      targetId: job.id,
      targetState: {
        status: job.status,
        progress: job.progress,
        retryCount: job.retryCount,
        cancelCount: job.cancelCount,
        error: job.error,
        isStale: job.isStale,
        lockedBy: job.lockedBy,
        updatedAt: job.updatedAt,
      },
    }),
    [actor, job]
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
      case 'RETRY_PUBLISH_JOB':
        await retryMutation.retry(job.id);
        break;
      case 'CANCEL_PUBLISH_JOB':
        await cancelMutation.cancel(job.id);
        break;
      case 'UNLOCK_PUBLISH_JOB':
        await unlockMutation.unlock(job.id);
        break;
    }
  }, [pendingAction, job.id, retryMutation, cancelMutation, unlockMutation]);

  // Check action states
  const retryEligibility = canExecuteAction('RETRY_PUBLISH_JOB');
  const cancelEligibility = canExecuteAction('CANCEL_PUBLISH_JOB');
  const unlockEligibility = canExecuteAction('UNLOCK_PUBLISH_JOB');

  const showRetry = canShowAction('RETRY_PUBLISH_JOB');
  const showCancel = canShowAction('CANCEL_PUBLISH_JOB');
  const showUnlock = canShowAction('UNLOCK_PUBLISH_JOB');

  return (
    <div className={`publish-job-actions-panel ${className}`}>
      <h3 className="publish-job-actions-panel__title">Actions</h3>

      <div className="publish-job-actions-panel__actions">
        {/* Retry Action */}
        {showRetry && (
          <OperatorActionButton
            actionType={OPERATOR_ACTION_TYPES.RETRY_PUBLISH_JOB}
            targetId={job.id}
            targetState={{
              status: job.status,
              retryCount: job.retryCount,
              error: job.error,
            }}
            actor={actor}
            onClick={() => handleActionClick('RETRY_PUBLISH_JOB')}
            disabledReason={!retryEligibility.eligible ? retryEligibility.reason : undefined}
            variant="secondary"
          />
        )}

        {/* Cancel Action */}
        {showCancel && (
          <OperatorActionButton
            actionType={OPERATOR_ACTION_TYPES.CANCEL_PUBLISH_JOB}
            targetId={job.id}
            targetState={{
              status: job.status,
              progress: job.progress,
            }}
            actor={actor}
            onClick={() => handleActionClick('CANCEL_PUBLISH_JOB')}
            disabledReason={!cancelEligibility.eligible ? cancelEligibility.reason : undefined}
            variant="destructive"
          />
        )}

        {/* Unlock Action */}
        {showUnlock && (
          <OperatorActionButton
            actionType={OPERATOR_ACTION_TYPES.UNLOCK_PUBLISH_JOB}
            targetId={job.id}
            targetState={{
              status: job.status,
              isStale: job.isStale,
              lockedBy: job.lockedBy,
              updatedAt: job.updatedAt,
            }}
            actor={actor}
            onClick={() => handleActionClick('UNLOCK_PUBLISH_JOB')}
            disabledReason={!unlockEligibility.eligible ? unlockEligibility.reason : undefined}
            variant="secondary"
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
          isLoading={retryMutation.isLoading || cancelMutation.isLoading || unlockMutation.isLoading}
        />
      )}
    </div>
  );
}

export default PublishJobActionsPanel;
