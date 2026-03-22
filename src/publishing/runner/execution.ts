/**
 * Execution Module
 *
 * Handles execution of a single publish job through an adapter
 */

import type {
  PublisherAdapter,
  PublisherAdapterRequest,
  PublisherAdapterExecuteOptions,
} from './channelAdapters/types.js';
import type {
  PublishJobClaimResult,
  RetryContext,
  RetryDecision,
} from './types.js';
import type { PublishJobRecord } from '../repositories/publishJobRepository.js';
import { EXECUTION_DEFAULTS } from './constants.js';
import { decidePublishRetry } from './retryPolicy.js';
import {
  markJobPublishing,
  markJobPublished,
  markJobFailed,
  markJobRetryScheduled,
  appendPublishAttemptRecord,
} from './lifecycle.js';
import { info, debug, error as logError } from '../../utils/logger.js';

// ============================================
// Execution
// ============================================

/**
 * Execute a single publish job through its adapter
 */
export async function executePublishJob(
  job: PublishJobRecord,
  adapter: PublisherAdapter,
  options?: {
    dryRun?: boolean;
    timeoutMs?: number;
    retryEnabled?: boolean;
    maxRetries?: number;
    workerIdentity?: string;
  }
): Promise<{
  success: boolean;
  jobId: string;
  channel: string;
  published?: boolean;
  failed?: boolean;
  retryScheduled?: boolean;
  retryDecision?: RetryDecision;
  error?: string;
}> {
  const {
    dryRun = EXECUTION_DEFAULTS.DRY_RUN_DEFAULT,
    timeoutMs,
    retryEnabled = true,
    maxRetries = 3,
    workerIdentity,
  } = options ?? {};

  const jobId = job.id;
  const channel = job.channel;

  info('Executing publish job', { jobId, channel, dryRun });

  // Build adapter request
  const request = buildPublisherAdapterRequest(job);

  // Start attempt tracking
  const attemptStartTime = new Date();

  try {
    // Mark as publishing
    await markJobPublishing(jobId, {
      attemptNumber: job.attempt_count,
      workerIdentity,
    });

    // Execute through adapter
    let result;
    if (dryRun) {
      result = await adapter.dryRun(request, { timeoutMs });
    } else {
      result = await adapter.execute(request, { timeoutMs, dryRun: false });
    }

    const durationMs = Date.now() - attemptStartTime.getTime();

    // Record attempt
    await appendPublishAttemptRecord({
      publishJobId: jobId,
      attemptNumber: job.attempt_count + 1,
      channel: channel as any,
      status: result.response.success ? 'completed' : 'failed',
      startedAt: attemptStartTime,
      finishedAt: new Date(),
      durationMs,
      errorMessage: result.response.errorMessage,
      errorCode: result.response.errorCode,
      errorCategory: result.response.errorCategory,
      responseMetadata: result.response.responseMetadata,
      publishedUrl: result.response.publishedUrl,
      externalPostId: result.response.externalPostId,
      workerIdentity,
    });

    // Handle result
    if (result.response.success) {
      // Success - mark as published
      await markJobPublished(jobId, {
        publishedUrl: result.response.publishedUrl,
        externalPostId: result.response.externalPostId,
        executionMetadata: {
          publishedAt: new Date().toISOString(),
          durationMs,
          adapterResponse: result.response.responseMetadata,
        },
      });

      info('Job published successfully', {
        jobId,
        channel,
        publishedUrl: result.response.publishedUrl,
      });

      return {
        success: true,
        jobId,
        channel,
        published: true,
      };
    }

    // Failure - handle retry logic
    if (retryEnabled) {
      const retryContext: RetryContext = {
        jobId,
        channel: channel as any,
        attemptNumber: job.attempt_count + 1,
        maxRetries,
        lastError: result.response,
      };

      const retryDecision = decidePublishRetry(result.response, retryContext);

      if (retryDecision.shouldRetry) {
        // Schedule retry
        await markJobRetryScheduled(jobId, {
          nextRetryAt: retryDecision.nextRetryAt,
          errorMessage: result.response.errorMessage,
          executionMetadata: {
            retryAttempt: job.attempt_count + 1,
            nextRetryAt: retryDecision.nextRetryAt?.toISOString(),
            errorCategory: retryDecision.errorCategory,
          },
        });

        info('Job retry scheduled', {
          jobId,
          channel,
          nextRetryAt: retryDecision.nextRetryAt,
          attemptNumber: job.attempt_count + 1,
        });

        return {
          success: false,
          jobId,
          channel,
          retryScheduled: true,
          retryDecision,
        };
      }
    }

    // Permanent failure
    await markJobFailed(jobId, {
      errorMessage: result.response.errorMessage,
      errorCode: result.response.errorCode,
      errorCategory: result.response.errorCategory,
      executionMetadata: {
        durationMs,
        adapterResponse: result.response.responseMetadata,
      },
    });

    logError('Job execution failed', new Error(result.response.errorMessage || 'Unknown error'), {
      jobId,
      channel,
      errorCode: result.response.errorCode,
    });

    return {
      success: false,
      jobId,
      channel,
      failed: true,
      error: result.response.errorMessage,
    };
  } catch (err) {
    const durationMs = Date.now() - attemptStartTime.getTime();
    const error = err as Error;

    // Record failed attempt
    await appendPublishAttemptRecord({
      publishJobId: jobId,
      attemptNumber: job.attempt_count + 1,
      channel: channel as any,
      status: 'failed',
      startedAt: attemptStartTime,
      finishedAt: new Date(),
      durationMs,
      errorMessage: error.message,
      workerIdentity,
    });

    // Mark as failed
    await markJobFailed(jobId, {
      errorMessage: error.message,
      errorCode: 'EXECUTION_ERROR',
      errorCategory: 'external',
    });

    logError('Job execution error', error, { jobId, channel });

    return {
      success: false,
      jobId,
      channel,
      failed: true,
      error: error.message,
    };
  }
}

/**
 * Execute a dry-run (simulation without actual publishing)
 */
export async function executePublishJobDryRun(
  job: PublishJobRecord,
  adapter: PublisherAdapter,
  options?: {
    timeoutMs?: number;
    validatePayload?: boolean;
  }
): Promise<{
  valid: boolean;
  jobId: string;
  channel: string;
  wouldPublish: boolean;
  errors: string[];
  warnings: string[];
}> {
  const { timeoutMs, validatePayload = true } = options ?? {};

  const jobId = job.id;
  const channel = job.channel;

  debug('Dry-run for job', { jobId, channel });

  // Build request
  const request = buildPublisherAdapterRequest(job);

  // Validate payload if requested
  if (validatePayload) {
    const validation = adapter.validatePayload(request.payload);
    if (!validation.valid) {
      return {
        valid: false,
        jobId,
        channel,
        wouldPublish: false,
        errors: validation.errors,
        warnings: validation.warnings || [],
      };
    }
  }

  // Run dry-run
  const result = await adapter.dryRun(request, { timeoutMs });

  return {
    valid: result.valid,
    jobId,
    channel,
    wouldPublish: result.wouldPublish,
    errors: result.validationErrors,
    warnings: result.warnings,
  };
}

// ============================================
// Helpers
// ============================================

/**
 * Build adapter request from job record
 */
export function buildPublisherAdapterRequest(job: PublishJobRecord): PublisherAdapterRequest {
  return {
    jobId: job.id,
    productId: job.product_id,
    contentId: job.content_id,
    channel: job.channel as any,
    payload: job.payload as Record<string, unknown>,
    metadata: {
      attemptNumber: job.attempt_count + 1,
      scheduledAt: job.scheduled_at ? new Date(job.scheduled_at) : undefined,
      priority: job.priority,
      sourceMetadata: job.source_metadata as Record<string, unknown> | undefined,
    },
  };
}

/**
 * Execute multiple jobs through their respective adapters
 */
export async function executePublishJobs(
  jobs: PublishJobRecord[],
  adapters: Map<string, PublisherAdapter>,
  options?: {
    dryRun?: boolean;
    timeoutMs?: number;
    retryEnabled?: boolean;
    maxRetries?: number;
    workerIdentity?: string;
    concurrency?: number;
  }
): Promise<Array<{
  success: boolean;
  jobId: string;
  channel: string;
  published?: boolean;
  failed?: boolean;
  retryScheduled?: boolean;
  error?: string;
}>> {
  const concurrency = options?.concurrency ?? EXECUTION_DEFAULTS.DEFAULT_CONCURRENCY;
  const results: Array<any> = [];

  // Process in batches
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);

    const batchPromises = batch.map(async (job) => {
      const adapter = adapters.get(job.channel);
      if (!adapter) {
        return {
          success: false,
          jobId: job.id,
          channel: job.channel,
          failed: true,
          error: `No adapter for channel: ${job.channel}`,
        };
      }

      return executePublishJob(job, adapter, options);
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}
