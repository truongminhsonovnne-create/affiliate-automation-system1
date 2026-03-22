/**
 * Lifecycle Management Module
 *
 * Handles job status transitions and execution history
 */

import type {
  PublishExecutionStatus,
  LifecycleUpdateOptions,
  PublishAttemptRecordInput,
} from './types.js';
import type { PublishJobRecord } from '../repositories/publishJobRepository.js';
import { getPublishJobRepository, type PublishJobRepository } from '../repositories/publishJobRepository.js';
import { getPublishAttemptRepository, type PublishAttemptRepository } from './repositories/publishJobExecutionRepository.js';
import { info, debug, error as logError } from '../../utils/logger.js';

// ============================================
// Lifecycle Transitions
// ============================================

/**
 * Valid status transitions
 */
const VALID_TRANSITIONS: Record<string, PublishExecutionStatus[]> = {
  pending: ['scheduled', 'ready', 'publishing', 'cancelled'],
  scheduled: ['ready', 'publishing', 'cancelled', 'failed'],
  ready: ['publishing', 'cancelled', 'failed'],
  publishing: ['published', 'failed', 'retry_scheduled'],
  published: [], // Terminal state
  failed: ['retry_scheduled', 'cancelled'], // Can retry
  retry_scheduled: ['ready', 'publishing', 'cancelled'],
  cancelled: [], // Terminal state
};

/**
 * Check if transition is valid
 */
function isValidTransition(from: string, to: PublishExecutionStatus): boolean {
  const validTargets = VALID_TRANSITIONS[from] ?? [];
  return validTargets.includes(to);
}

// ============================================
// Lifecycle Functions
// ============================================

/**
 * Mark job as publishing (starting execution)
 */
export async function markJobPublishing(
  jobId: string,
  options?: {
    attemptNumber?: number;
    workerIdentity?: string;
    executionMetadata?: Record<string, unknown>;
  },
  repository?: PublishJobRepository
): Promise<boolean> {
  const repo = repository ?? getPublishJobRepository();

  const updateFields: Record<string, unknown> = {
    status: 'publishing',
    last_attempt_at: new Date().toISOString(),
    attempt_count: (options?.attemptNumber ?? 0) + 1,
  };

  // Add execution metadata if provided
  if (options?.executionMetadata) {
    updateFields.execution_metadata = options.executionMetadata;
  }

  try {
    const success = await repo.updatePublishJobStatus(jobId, 'publishing', {
      attempt_count: options?.attemptNumber,
    });

    if (success) {
      debug('Job marked as publishing', { jobId, attemptNumber: options?.attemptNumber });
    }

    return success;
  } catch (err) {
    logError('Failed to mark job as publishing', err, { jobId });
    return false;
  }
}

/**
 * Mark job as successfully published
 */
export async function markJobPublished(
  jobId: string,
  options?: {
    publishedUrl?: string;
    externalPostId?: string;
    executionMetadata?: Record<string, unknown>;
  },
  repository?: PublishJobRepository
): Promise<boolean> {
  const repo = repository ?? getPublishJobRepository();

  debug('Marking job as published', { jobId, publishedUrl: options?.publishedUrl });

  try {
    const success = await repo.updatePublishJobStatus(jobId, 'published', {
      published_at: new Date(),
      published_url: options?.publishedUrl,
      external_post_id: options?.externalPostId,
      execution_metadata: options?.executionMetadata,
    });

    if (success) {
      info('Job marked as published', {
        jobId,
        publishedUrl: options?.publishedUrl,
        externalPostId: options?.externalPostId,
      });
    }

    return success;
  } catch (err) {
    logError('Failed to mark job as published', err, { jobId });
    return false;
  }
}

/**
 * Mark job as failed
 */
export async function markJobFailed(
  jobId: string,
  options?: {
    errorMessage?: string;
    errorCode?: string;
    errorCategory?: string;
    executionMetadata?: Record<string, unknown>;
  },
  repository?: PublishJobRepository
): Promise<boolean> {
  const repo = repository ?? getPublishJobRepository();

  debug('Marking job as failed', { jobId, error: options?.errorMessage });

  try {
    // Build execution metadata
    const metadata: Record<string, unknown> = {
      ...(options?.executionMetadata ?? {}),
      last_error: options?.errorMessage,
      error_code: options?.errorCode,
      error_category: options?.errorCategory,
    };

    const success = await repo.updatePublishJobStatus(jobId, 'failed', {
      error_message: options?.errorMessage,
      execution_metadata: metadata,
    });

    if (success) {
      info('Job marked as failed', {
        jobId,
        errorMessage: options?.errorMessage,
        errorCode: options?.errorCode,
      });
    }

    return success;
  } catch (err) {
    logError('Failed to mark job as failed', err, { jobId });
    return false;
  }
}

/**
 * Mark job for retry
 */
export async function markJobRetryScheduled(
  jobId: string,
  options?: {
    nextRetryAt?: Date;
    errorMessage?: string;
    executionMetadata?: Record<string, unknown>;
  },
  repository?: PublishJobRepository
): Promise<boolean> {
  const repo = repository ?? getPublishJobRepository();

  debug('Marking job for retry', { jobId, nextRetryAt: options?.nextRetryAt });

  try {
    // Build execution metadata
    const metadata: Record<string, unknown> = {
      ...(options?.executionMetadata ?? {}),
      retry_scheduled_at: new Date().toISOString(),
      last_error: options?.errorMessage,
    };

    const success = await repo.updatePublishJobStatus(jobId, 'retry_scheduled', {
      next_retry_at: options?.nextRetryAt,
      execution_metadata: metadata,
    });

    if (success) {
      info('Job marked for retry', {
        jobId,
        nextRetryAt: options?.nextRetryAt,
      });
    }

    return success;
  } catch (err) {
    logError('Failed to mark job for retry', err, { jobId });
    return false;
  }
}

/**
 * Mark job as cancelled
 */
export async function markJobCancelled(
  jobId: string,
  options?: {
    reason?: string;
    executionMetadata?: Record<string, unknown>;
  },
  repository?: PublishJobRepository
): Promise<boolean> {
  const repo = repository ?? getPublishJobRepository();

  debug('Marking job as cancelled', { jobId, reason: options?.reason });

  try {
    const metadata: Record<string, unknown> = {
      ...(options?.executionMetadata ?? {}),
      cancelled_at: new Date().toISOString(),
      cancellation_reason: options?.reason,
    };

    const success = await repo.updatePublishJobStatus(jobId, 'cancelled', {
      execution_metadata: metadata,
    });

    if (success) {
      info('Job marked as cancelled', { jobId, reason: options?.reason });
    }

    return success;
  } catch (err) {
    logError('Failed to mark job as cancelled', err, { jobId });
    return false;
  }
}

/**
 * Append publish attempt record
 */
export async function appendPublishAttemptRecord(
  input: PublishAttemptRecordInput,
  repository?: PublishAttemptRepository
): Promise<string | null> {
  const repo = repository ?? getPublishAttemptRepository();

  try {
    const id = await repo.insertPublishAttempt(input);

    if (id) {
      debug('Attempt record appended', {
        jobId: input.publishJobId,
        attemptNumber: input.attemptNumber,
        status: input.status,
      });
    }

    return id;
  } catch (err) {
    logError('Failed to append attempt record', err, {
      jobId: input.publishJobId,
      attemptNumber: input.attemptNumber,
    });
    return null;
  }
}

// ============================================
// Lifecycle Helpers
// ============================================

/**
 * Get next status based on execution result
 */
export function getNextStatus(
  currentStatus: string,
  executionResult: {
    success: boolean;
    shouldRetry: boolean;
    nextRetryAt?: Date;
  }
): PublishExecutionStatus {
  // If already in terminal state, don't change
  if (['published', 'cancelled'].includes(currentStatus)) {
    return currentStatus as PublishExecutionStatus;
  }

  if (executionResult.success) {
    return 'published';
  }

  if (executionResult.shouldRetry && executionResult.nextRetryAt) {
    return 'retry_scheduled';
  }

  return 'failed';
}

/**
 * Check if job can be retried
 */
export function canJobBeRetried(job: PublishJobRecord, maxRetries: number = 3): boolean {
  // Must be in failed or retry_scheduled state
  if (!['failed', 'retry_scheduled'].includes(job.status)) {
    return false;
  }

  // Must have attempts remaining
  if (job.attempt_count >= maxRetries) {
    return false;
  }

  // If retry_scheduled, check if it's time to retry
  if (job.status === 'retry_scheduled' && job.next_retry_at) {
    const nextRetry = new Date(job.next_retry_at);
    if (nextRetry > new Date()) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate attempt number for next attempt
 */
export function calculateNextAttemptNumber(currentAttemptCount: number): number {
  return currentAttemptCount + 1;
}
