/**
 * Batch Runner Module
 *
 * Handles batch execution of multiple publish jobs with concurrency control
 */

import type { PublisherChannel, PublisherWorkerIdentity } from './types.js';
import type { PublishJobRecord } from '../repositories/publishJobRepository.js';
import type { PublisherAdapter } from './channelAdapters/types.js';
import { EXECUTION_DEFAULTS } from './constants.js';
import { executePublishJob } from './execution.js';
import { claimPublishJob, releasePublishJobClaim } from './jobClaiming.js';
import { buildJobSelectionCriteria, selectReadyPublishJobs } from './jobSelector.js';
import { getPublisherAdapter } from './channelAdapters/index.js';
import { info, debug, warn, error as logError } from '../../utils/logger.js';

// ============================================
// Batch Execution
// ============================================

/**
 * Run a batch of publish jobs
 */
export async function runPublishJobBatch(
  options?: {
    channels?: PublisherChannel[];
    dryRun?: boolean;
    limit?: number;
    concurrency?: number;
    workerIdentity?: PublisherWorkerIdentity;
    claimLockDurationMs?: number;
    retryEnabled?: boolean;
    executionTimeoutMs?: number;
  }
): Promise<{
  selected: number;
  claimed: number;
  executed: number;
  published: number;
  failed: number;
  retryScheduled: number;
  skipped: number;
  results: Array<{
    jobId: string;
    channel: PublisherChannel;
    success: boolean;
    published?: boolean;
    failed?: boolean;
    retryScheduled?: boolean;
    error?: string;
  }>;
}> {
  const {
    channels,
    dryRun = false,
    limit = EXECUTION_DEFAULTS.DEFAULT_POLL_BATCH_SIZE,
    concurrency = EXECUTION_DEFAULTS.DEFAULT_CONCURRENCY,
    workerIdentity,
    claimLockDurationMs,
    retryEnabled = true,
    executionTimeoutMs,
  } = options ?? {};

  const results: Array<any> = [];

  // Step 1: Select jobs
  debug('Selecting jobs for batch', { channels, limit });

  const criteria = buildJobSelectionCriteria({ channels, limit });
  const jobs = await selectReadyPublishJobs(criteria);

  const selected = jobs.length;
  debug('Jobs selected', { selected });

  if (selected === 0) {
    return {
      selected: 0,
      claimed: 0,
      executed: 0,
      published: 0,
      failed: 0,
      retryScheduled: 0,
      skipped: 0,
      results: [],
    };
  }

  // Step 2: Claim jobs
  let claimed = 0;
  const claimedJobs: Array<{ job: PublishJobRecord; claimResult: any }> = [];

  for (const job of jobs) {
    const claimResult = await claimPublishJob(
      job.id,
      workerIdentity!,
      { lockDurationMs: claimLockDurationMs }
    );

    if (claimResult.success) {
      claimed++;
      claimedJobs.push({ job, claimResult });
    } else {
      warn('Job claim failed', { jobId: job.id, reason: claimResult.error });
    }
  }

  debug('Jobs claimed', { claimed });

  // Step 3: Group by channel
  const jobsByChannel = new Map<PublisherChannel, PublishJobRecord[]>();

  for (const { job } of claimedJobs) {
    const channel = job.channel as PublisherChannel;
    if (!jobsByChannel.has(channel)) {
      jobsByChannel.set(channel, []);
    }
    jobsByChannel.get(channel)!.push(job);
  }

  // Step 4: Execute jobs by channel
  let executed = 0;
  let published = 0;
  let failed = 0;
  let retryScheduled = 0;
  let skipped = 0;

  for (const [channel, channelJobs] of jobsByChannel) {
    const adapter = getPublisherAdapter(channel);

    // Execute in concurrency batches
    for (let i = 0; i < channelJobs.length; i += concurrency) {
      const batch = channelJobs.slice(i, i + concurrency);

      const batchPromises = batch.map(async (job) => {
        const result = await executePublishJob(job, adapter, {
          dryRun,
          timeoutMs: executionTimeoutMs,
          retryEnabled,
          workerIdentity: workerIdentity?.workerId,
        });

        // Release claim (cleanup)
        if (!dryRun) {
          await releasePublishJobClaim(job.id, workerIdentity!);
        }

        return result;
      });

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        executed++;

        if (result.published) {
          published++;
        } else if (result.retryScheduled) {
          retryScheduled++;
        } else if (result.failed) {
          failed++;
        }

        results.push({
          jobId: result.jobId,
          channel: result.channel,
          success: result.success,
          published: result.published,
          failed: result.failed,
          retryScheduled: result.retryScheduled,
          error: result.error,
        });
      }
    }
  }

  // Skipped = selected - claimed
  skipped = selected - claimed;

  info('Batch execution completed', {
    selected,
    claimed,
    executed,
    published,
    failed,
    retryScheduled,
    skipped,
  });

  return {
    selected,
    claimed,
    executed,
    published,
    failed,
    retryScheduled,
    skipped,
    results,
  };
}

/**
 * Run a batch of already-claimed jobs
 */
export async function runClaimedPublishJobs(
  jobs: PublishJobRecord[],
  options?: {
    dryRun?: boolean;
    concurrency?: number;
    workerIdentity?: PublisherWorkerIdentity;
    retryEnabled?: boolean;
    executionTimeoutMs?: number;
  }
): Promise<{
  executed: number;
  published: number;
  failed: number;
  retryScheduled: number;
  results: Array<any>;
}> {
  const {
    dryRun = false,
    concurrency = EXECUTION_DEFAULTS.DEFAULT_CONCURRENCY,
    workerIdentity,
    retryEnabled = true,
    executionTimeoutMs,
  } = options ?? {};

  const results: Array<any> = [];

  // Group by channel
  const jobsByChannel = new Map<PublisherChannel, PublishJobRecord[]>();

  for (const job of jobs) {
    const channel = job.channel as PublisherChannel;
    if (!jobsByChannel.has(channel)) {
      jobsByChannel.set(channel, []);
    }
    jobsByChannel.get(channel)!.push(job);
  }

  let executed = 0;
  let published = 0;
  let failed = 0;
  let retryScheduled = 0;

  // Execute
  for (const [channel, channelJobs] of jobsByChannel) {
    const adapter = getPublisherAdapter(channel);

    for (let i = 0; i < channelJobs.length; i += concurrency) {
      const batch = channelJobs.slice(i, i + concurrency);

      const batchPromises = batch.map(async (job) => {
        return executePublishJob(job, adapter, {
          dryRun,
          timeoutMs: executionTimeoutMs,
          retryEnabled,
          workerIdentity: workerIdentity?.workerId,
        });
      });

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        executed++;

        if (result.published) {
          published++;
        } else if (result.retryScheduled) {
          retryScheduled++;
        } else if (result.failed) {
          failed++;
        }

        results.push(result);
      }
    }
  }

  return {
    executed,
    published,
    failed,
    retryScheduled,
    results,
  };
}

/**
 * Chunk jobs for batch processing
 */
export function chunkPublishJobs<T>(
  jobs: T[],
  batchSize: number
): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < jobs.length; i += batchSize) {
    chunks.push(jobs.slice(i, i + batchSize));
  }

  return chunks;
}
