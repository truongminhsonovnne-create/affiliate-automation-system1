/**
 * Operator Actions - Confirmation Model Builder
 * Builds confirmation dialog content for each action type
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  OperatorActionType,
  OperatorActionConfirmationModel,
  OperatorActionContext,
  OperatorActionSeverity,
} from '../types';
import {
  ACTION_DEFAULT_SEVERITY,
  DEFAULT_CONFIRM_LABELS,
  DEFAULT_CANCEL_LABELS,
  ACTION_LABELS,
  ACTION_DESCRIPTIONS,
  TYPING_CONFIRMATION_ACTIONS,
  TYPING_CONFIRMATION_TEXTS,
} from '../constants';

/**
 * Build confirmation model for retry publish job
 */
export function buildRetryPublishJobConfirmation(
  context: OperatorActionContext
): OperatorActionConfirmationModel {
  const jobId = context.targetId;
  const targetState = context.targetState ?? {};

  return {
    id: uuidv4(),
    actionType: 'RETRY_PUBLISH_JOB',
    title: 'Retry Publish Job',
    summary: `Are you sure you want to retry publish job ${jobId.slice(0, 8)}...?`,
    description: ACTION_DESCRIPTIONS.RETRY_PUBLISH_JOB,
    warnings: buildRetryWarnings(targetState),
    consequences: [
      'A new retry attempt will be queued for this job.',
      'Previous progress will be reset.',
    ],
    severity: ACTION_DEFAULT_SEVERITY.RETRY_PUBLISH_JOB,
    confirmLabel: DEFAULT_CONFIRM_LABELS.RETRY_PUBLISH_JOB,
    cancelLabel: DEFAULT_CANCEL_LABELS.RETRY_PUBLISH_JOB,
    targetMetadata: {
      jobId,
      status: targetState.status,
      retryCount: targetState.retryCount,
      error: targetState.error,
    },
  };
}

/**
 * Build confirmation model for cancel publish job
 */
export function buildCancelPublishJobConfirmation(
  context: OperatorActionContext
): OperatorActionConfirmationModel {
  const jobId = context.targetId;
  const targetState = context.targetState ?? {};
  const progress = targetState.progress as number | undefined;

  return {
    id: uuidv4(),
    actionType: 'CANCEL_PUBLISH_JOB',
    title: 'Cancel Publish Job',
    summary: `Are you sure you want to cancel publish job ${jobId.slice(0, 8)}...?`,
    description: ACTION_DESCRIPTIONS.CANCEL_PUBLISH_JOB,
    warnings: buildCancelWarnings(targetState),
    consequences: [
      'This job will be stopped immediately.',
      'Any progress made will be lost.',
      'This action cannot be undone.',
    ],
    severity: ACTION_DEFAULT_SEVERITY.CANCEL_PUBLISH_JOB,
    confirmLabel: DEFAULT_CONFIRM_LABELS.CANCEL_PUBLISH_JOB,
    cancelLabel: DEFAULT_CANCEL_LABELS.CANCEL_PUBLISH_JOB,
    targetMetadata: {
      jobId,
      status: targetState.status,
      progress,
    },
    requireTypingConfirmation: true,
    typingConfirmationText: TYPING_CONFIRMATION_TEXTS.CANCEL_PUBLISH_JOB,
  };
}

/**
 * Build confirmation model for unlock publish job
 */
export function buildUnlockPublishJobConfirmation(
  context: OperatorActionContext
): OperatorActionConfirmationModel {
  const jobId = context.targetId;
  const targetState = context.targetState ?? {};
  const lockedBy = targetState.lockedBy as string | undefined;

  return {
    id: uuidv4(),
    actionType: 'UNLOCK_PUBLISH_JOB',
    title: 'Unlock Publish Job',
    summary: `Are you sure you want to force-unlock publish job ${jobId.slice(0, 8)}...?`,
    description: ACTION_DESCRIPTIONS.UNLOCK_PUBLISH_JOB,
    warnings: buildUnlockWarnings(targetState),
    consequences: [
      'The job lock will be forcibly removed.',
      'Any running operations may be interrupted.',
      'This could cause conflicts with other processes.',
    ],
    severity: ACTION_DEFAULT_SEVERITY.UNLOCK_PUBLISH_JOB,
    confirmLabel: DEFAULT_CONFIRM_LABELS.UNLOCK_PUBLISH_JOB,
    cancelLabel: DEFAULT_CANCEL_LABELS.UNLOCK_PUBLISH_JOB,
    targetMetadata: {
      jobId,
      status: targetState.status,
      isStale: targetState.isStale,
      lockedBy,
    },
  };
}

/**
 * Build confirmation model for requeue dead letter
 */
export function buildRequeueDeadLetterConfirmation(
  context: OperatorActionContext
): OperatorActionConfirmationModel {
  const deadLetterId = context.targetId;
  const targetState = context.targetState ?? {};

  return {
    id: uuidv4(),
    actionType: 'REQUEUE_DEAD_LETTER',
    title: 'Requeue Dead Letter',
    summary: `Are you sure you want to requeue dead letter ${deadLetterId.slice(0, 8)}...?`,
    description: ACTION_DESCRIPTIONS.REQUEUE_DEAD_LETTER,
    warnings: buildRequeueWarnings(targetState),
    consequences: [
      'This item will be added back to the processing queue.',
      'It will be retried according to the retry policy.',
    ],
    severity: ACTION_DEFAULT_SEVERITY.REQUEUE_DEAD_LETTER,
    confirmLabel: DEFAULT_CONFIRM_LABELS.REQUEUE_DEAD_LETTER,
    cancelLabel: DEFAULT_CANCEL_LABELS.REQUEUE_DEAD_LETTER,
    targetMetadata: {
      deadLetterId,
      status: targetState.status,
      error: targetState.error,
      requeueCount: targetState.requeueCount,
    },
  };
}

/**
 * Build confirmation model for resolve dead letter
 */
export function buildResolveDeadLetterConfirmation(
  context: OperatorActionContext
): OperatorActionConfirmationModel {
  const deadLetterId = context.targetId;
  const targetState = context.targetState ?? {};

  return {
    id: uuidv4(),
    actionType: 'RESOLVE_DEAD_LETTER',
    title: 'Resolve Dead Letter',
    summary: `Are you sure you want to resolve dead letter ${deadLetterId.slice(0, 8)}...?`,
    description: ACTION_DESCRIPTIONS.RESOLVE_DEAD_LETTER,
    warnings: [
      'This action is irreversible.',
      'The item will not be reprocessed.',
    ],
    consequences: [
      'This dead letter will be marked as resolved.',
      'It will be excluded from future processing.',
    ],
    severity: ACTION_DEFAULT_SEVERITY.RESOLVE_DEAD_LETTER,
    confirmLabel: DEFAULT_CONFIRM_LABELS.RESOLVE_DEAD_LETTER,
    cancelLabel: DEFAULT_CANCEL_LABELS.RESOLVE_DEAD_LETTER,
    targetMetadata: {
      deadLetterId,
      status: targetState.status,
      error: targetState.error,
    },
  };
}

/**
 * Build confirmation model for manual run actions
 */
export function buildManualRunConfirmation(
  actionType: OperatorActionType,
  payload?: Record<string, unknown>
): OperatorActionConfirmationModel {
  const actionLabel = ACTION_LABELS[actionType];
  const actionDescription = ACTION_DESCRIPTIONS[actionType];

  return {
    id: uuidv4(),
    actionType,
    title: `Start ${actionLabel}`,
    summary: `Are you sure you want to start ${actionLabel.toLowerCase()}?`,
    description: actionDescription,
    warnings: buildManualRunWarnings(actionType, payload),
    consequences: buildManualRunConsequences(actionType, payload),
    severity: ACTION_DEFAULT_SEVERITY[actionType],
    confirmLabel: DEFAULT_CONFIRM_LABELS[actionType],
    cancelLabel: DEFAULT_CANCEL_LABELS[actionType],
    targetMetadata: payload,
  };
}

/**
 * Factory function to build any confirmation model
 */
export function buildConfirmationModel(
  actionType: OperatorActionType,
  context?: OperatorActionContext
): OperatorActionConfirmationModel {
  switch (actionType) {
    case 'RETRY_PUBLISH_JOB':
      return buildRetryPublishJobConfirmation(context!);
    case 'CANCEL_PUBLISH_JOB':
      return buildCancelPublishJobConfirmation(context!);
    case 'UNLOCK_PUBLISH_JOB':
      return buildUnlockPublishJobConfirmation(context!);
    case 'REQUEUE_DEAD_LETTER':
      return buildRequeueDeadLetterConfirmation(context!);
    case 'RESOLVE_DEAD_LETTER':
      return buildResolveDeadLetterConfirmation(context!);
    case 'TRIGGER_FLASH_SALE_CRAWL':
    case 'TRIGGER_SEARCH_CRAWL':
    case 'TRIGGER_AI_ENRICHMENT':
    case 'TRIGGER_PUBLISH_PREPARATION':
    case 'TRIGGER_PUBLISHER_RUN':
      return buildManualRunConfirmation(actionType, context?.metadata?.payload as Record<string, unknown>);
    default:
      return buildGenericConfirmation(actionType);
  }
}

// =============================================================================
// WARNING BUILDERS
// =============================================================================

function buildRetryWarnings(targetState: Record<string, unknown>): string[] {
  const warnings: string[] = [];

  const retryCount = (targetState.retryCount as number) ?? 0;
  if (retryCount > 0) {
    warnings.push(`This job has been retried ${retryCount} time(s) already.`);
  }

  const error = targetState.error as string | undefined;
  if (error) {
    warnings.push(`Previous error: ${error}`);
  }

  return warnings;
}

function buildCancelWarnings(targetState: Record<string, unknown>): string[] {
  const warnings: string[] = [];

  const progress = (targetState.progress as number) ?? 0;
  if (progress > 50) {
    warnings.push(`This job is ${progress}% complete. Cancelling will lose all progress.`);
  }

  const status = targetState.status as string | undefined;
  if (status === 'running') {
    warnings.push('This job is currently running.');
  }

  return warnings;
}

function buildUnlockWarnings(targetState: Record<string, unknown>): string[] {
  const warnings: string[] = [];

  const lockedBy = targetState.lockedBy as string | undefined;
  if (lockedBy) {
    warnings.push(`Currently locked by: ${lockedBy}`);
  }

  const isStale = targetState.isStale as boolean | undefined;
  if (isStale) {
    warnings.push('This job is marked as stale.');
  }

  const updatedAt = targetState.updatedAt as string | undefined;
  if (updatedAt) {
    const hoursSinceUpdate = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpdate > 4) {
      warnings.push(`No update for ${Math.round(hoursSinceUpdate)} hours.`);
    }
  }

  return warnings;
}

function buildRequeueWarnings(targetState: Record<string, unknown>): string[] {
  const warnings: string[] = [];

  const requeueCount = (targetState.requeueCount as number) ?? 0;
  if (requeueCount > 0) {
    warnings.push(`Requeued ${requeueCount} time(s) before.`);
  }

  const error = targetState.error as string | undefined;
  if (error) {
    warnings.push(`Previous error: ${error}`);
  }

  return warnings;
}

function buildManualRunWarnings(
  actionType: OperatorActionType,
  payload?: Record<string, unknown>
): string[] {
  const warnings: string[] = [];

  if (actionType === 'TRIGGER_PUBLISHER_RUN') {
    const dryRun = payload?.dryRun as boolean | undefined;
    if (dryRun) {
      warnings.push('This will run in dry-run mode (no actual publishing).');
    }
  }

  const limit = payload?.limit as number | undefined;
  if (limit && limit > 500) {
    warnings.push(`Processing ${limit} items may take significant time.`);
  }

  return warnings;
}

function buildManualRunConsequences(
  actionType: OperatorActionType,
  payload?: Record<string, unknown>
): string[] {
  const consequences: string[] = [];

  switch (actionType) {
    case 'TRIGGER_FLASH_SALE_CRAWL':
      consequences.push('New crawl jobs will be created for flash sale products.');
      break;
    case 'TRIGGER_SEARCH_CRAWL':
      consequences.push('New crawl jobs will be created for specified search terms.');
      break;
    case 'TRIGGER_AI_ENRICHMENT':
      consequences.push('AI enrichment will be triggered for selected products.');
      break;
    case 'TRIGGER_PUBLISH_PREPARATION':
      consequences.push('Publish preparation will start for selected products.');
      break;
    case 'TRIGGER_PUBLISHER_RUN':
      const dryRun = payload?.dryRun as boolean | undefined;
      if (dryRun) {
        consequences.push('Dry run - no content will actually be published.');
      } else {
        consequences.push('Content will be published to selected channels.');
      }
      break;
  }

  return consequences;
}

function buildGenericConfirmation(actionType: OperatorActionType): OperatorActionConfirmationModel {
  return {
    id: uuidv4(),
    actionType,
    title: ACTION_LABELS[actionType] || 'Confirm Action',
    summary: `Are you sure you want to perform this action?`,
    warnings: [],
    consequences: [],
    severity: 'info' as OperatorActionSeverity,
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
  };
}
