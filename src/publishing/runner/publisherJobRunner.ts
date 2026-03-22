/**
 * Publisher Job Runner
 *
 * Top-level orchestrator for the publisher execution layer
 */

import type {
  PublisherChannel,
  PublisherRunOptions,
  PublisherRunResult,
  PublisherWorkerIdentity,
} from './types.js';
import { WORKER_DEFAULTS, EXECUTION_DEFAULTS } from './constants.js';
import { createWorkerIdentity } from './jobClaiming.js';
import { buildJobSelectionCriteria, selectReadyPublishJobs } from './jobSelector.js';
import { getPublisherAdapter, getAllPublisherAdapters } from './channelAdapters/index.js';
import { executePublishJob } from './execution.js';
import { claimPublishJob, releasePublishJobClaim } from './jobClaiming.js';
import { buildPublisherRunResult } from './resultBuilder.js';
import { info, debug, warn, error as logError } from '../../utils/logger.js';

// ============================================
// Publisher Runner
// ============================================

/**
 * Run publisher once - select, claim, execute jobs
 */
export async function runPublisherOnce(
  options?: PublisherRunOptions
): Promise<PublisherRunResult> {
  const startTime = new Date();

  // Setup worker identity
  const workerIdentity = options?.workerIdentity ?? createWorkerIdentity({
    workerName: WORKER_DEFAULTS.DEFAULT_WORKER_NAME,
  });

  const {
    channels,
    dryRun = EXECUTION_DEFAULTS.DRY_RUN_DEFAULT,
    limit = WORKER_DEFAULTS.DEFAULT_POLL_BATCH_SIZE,
    concurrency = EXECUTION_DEFAULTS.DEFAULT_CONCURRENCY,
    claimLockDurationMs,
    retryEnabled = true,
    executionTimeoutMs,
    selectOptions,
    claimOptions,
  } = options ?? {};

  info('Starting publisher run', {
    workerId: workerIdentity.workerId,
    channels,
    dryRun,
    limit,
  });

  // Initialize stats
  const selectionStats = { totalCandidates: 0, retryEligible: 0, selected: 0 };
  const claimStats = { claimed: 0, alreadyClaimed: 0, staleRecovered: 0, failed: 0 };
  const executionStats = { executed: 0, succeeded: 0, failed: 0, retried: 0 };
  const lifecycleStats = { published: 0, failed: 0, retryScheduled: 0, cancelled: 0 };
  const warnings: Array<any> = [];
  const errors: Array<any> = [];

  try {
    // Step 1: Select jobs
    debug('Selecting jobs', { channels, limit });

    const criteria = buildJobSelectionCriteria({ channels, limit });
    const jobs = await selectReadyPublishJobs(criteria, selectOptions);

    selectionStats.totalCandidates = jobs.length;
    selectionStats.selected = jobs.length;

    debug('Jobs selected', { count: jobs.length });

    if (jobs.length === 0) {
      warn('No jobs to process');
    }

    // Step 2: Get adapters
    const adapters = getAllPublisherAdapters();

    // Step 3: Process each job
    for (const job of jobs) {
      try {
        // Claim job
        const claimResult = await claimPublishJob(
          job.id,
          workerIdentity,
          { lockDurationMs: claimLockDurationMs }
        );

        if (!claimResult.success) {
          claimStats.alreadyClaimed++;
          warnings.push({
            jobId: job.id,
            channel: job.channel,
            code: 'CLAIM_FAILED',
            message: claimResult.error || 'Could not claim job',
            severity: 'low',
          });
          continue;
        }

        claimStats.claimed++;
        if (claimResult.staleClaimRecovered) {
          claimStats.staleRecovered++;
        }

        // Get adapter
        const adapter = adapters.get(job.channel as PublisherChannel);
        if (!adapter) {
          warn('No adapter for channel', { channel: job.channel });
          errors.push({
            jobId: job.id,
            channel: job.channel,
            code: 'NO_ADAPTER',
            message: `No adapter for channel: ${job.channel}`,
          });

          // Release claim
          await releasePublishJobClaim(job.id, workerIdentity);
          continue;
        }

        // Execute
        debug('Executing job', { jobId: job.id, channel: job.channel });

        const result = await executePublishJob(job, adapter, {
          dryRun,
          timeoutMs: executionTimeoutMs,
          retryEnabled,
          workerIdentity: workerIdentity.workerId,
        });

        executionStats.executed++;

        if (result.published) {
          lifecycleStats.published++;
          executionStats.succeeded++;
        } else if (result.retryScheduled) {
          lifecycleStats.retryScheduled++;
          executionStats.retried++;
        } else if (result.failed) {
          lifecycleStats.failed++;
          executionStats.failed++;

          if (result.error) {
            errors.push({
              jobId: job.id,
              channel: job.channel,
              code: 'EXECUTION_FAILED',
              message: result.error,
            });
          }
        }

        // Release claim
        if (!dryRun) {
          await releasePublishJobClaim(job.id, workerIdentity);
        }

      } catch (err) {
        const error = err as Error;
        logError('Error processing job', error, { jobId: job.id });

        executionStats.failed++;
        lifecycleStats.failed++;

        errors.push({
          jobId: job.id,
          channel: job.channel,
          code: 'PROCESSING_ERROR',
          message: error.message,
          error,
        });

        // Try to release claim
        try {
          await releasePublishJobClaim(job.id, workerIdentity);
        } catch {
          // Ignore
        }
      }
    }

    const endTime = new Date();

    // Build result
    const result = buildPublisherRunResult({
      workerIdentity,
      dryRun,
      startTime,
      endTime,
      selectionStats,
      claimStats,
      executionStats,
      lifecycleStats,
      warnings,
      errors,
      channels: channels ?? ['tiktok', 'facebook', 'website'],
    });

    info('Publisher run completed', {
      workerId: workerIdentity.workerId,
      status: result.status,
      selected: result.selectedCount,
      claimed: result.claimedCount,
      published: result.publishedCount,
      failed: result.failedCount,
      retryScheduled: result.retryScheduledCount,
      durationMs: result.durationMs,
    });

    return result;

  } catch (err) {
    const endTime = new Date();
    const error = err as Error;

    logError('Publisher run failed', error);

    return buildPublisherRunResult({
      workerIdentity,
      dryRun,
      startTime,
      endTime,
      selectionStats,
      claimStats,
      executionStats,
      lifecycleStats,
      warnings,
      errors: [
        ...errors,
        {
          code: 'RUN_ERROR',
          message: error.message,
          error,
        },
      ],
      channels: channels ?? ['tiktok', 'facebook', 'website'],
    });
  }
}

/**
 * Run publisher for a specific channel
 */
export async function runPublisherForChannel(
  channel: PublisherChannel,
  options?: Omit<PublisherRunOptions, 'channels'>
): Promise<PublisherRunResult> {
  return runPublisherOnce({
    ...options,
    channels: [channel],
  });
}

/**
 * Run publisher in dry-run mode
 */
export async function runPublisherDryRun(
  options?: Omit<PublisherRunOptions, 'dryRun'>
): Promise<PublisherRunResult> {
  return runPublisherOnce({
    ...options,
    dryRun: true,
  });
}

// ============================================
// Utility Functions
// ============================================

/**
 * Run publisher continuously (for long-running workers)
 */
export async function runPublisherContinuous(
  options?: {
    intervalMs?: number;
    maxIterations?: number;
    onIteration?: (result: PublisherRunResult) => Promise<boolean>;
  } & PublisherRunOptions
): Promise<{
  iterations: number;
  lastResult: PublisherRunResult;
}> {
  const {
    intervalMs = WORKER_DEFAULTS.DEFAULT_POLL_INTERVAL_MS,
    maxIterations,
    onIteration,
    ...runOptions
  } = options ?? {};

  let iterations = 0;
  let lastResult: PublisherRunResult | null = null;

  while (true) {
    // Check max iterations
    if (maxIterations && iterations >= maxIterations) {
      break;
    }

    iterations++;

    // Run
    lastResult = await runPublisherOnce(runOptions);

    // Check if should continue
    if (onIteration) {
      const shouldContinue = await onIteration(lastResult);
      if (!shouldContinue) {
        break;
      }
    }

    // Wait for next iteration
    if (!lastResult.ok || lastResult.selectedCount === 0) {
      // If no jobs or error, wait longer
      await new Promise(resolve => setTimeout(resolve, intervalMs * 2));
    } else {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  return {
    iterations,
    lastResult: lastResult!,
  };
}

export default {
  runPublisherOnce,
  runPublisherForChannel,
  runPublisherDryRun,
  runPublisherContinuous,
};
