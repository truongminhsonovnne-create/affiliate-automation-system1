/**
 * Job Claiming Module
 *
 * Handles safe job claiming/locking for distributed workers
 */

import type {
  PublisherWorkerIdentity,
  PublishJobClaimOptions,
  PublishJobClaimResult,
} from './types.js';
import type { PublishJobRecord } from '../repositories/publishJobRepository.js';
import { getPublishJobRepository, type PublishJobRepository } from '../repositories/publishJobRepository.js';
import { LOCK_DEFAULTS, SELECTION_DEFAULTS } from './constants.js';
import { info, debug } from '../../utils/logger.js';

// ============================================
// Job Claiming
// ============================================

/**
 * Claim a single publish job for execution
 *
 * Uses optimistic locking with conditional updates to prevent race conditions:
 * - Only claims if job is not already claimed OR if claim has expired
 * - Uses claimed_at and lock_expires_at for tracking
 */
export async function claimPublishJob(
  jobId: string,
  workerIdentity: PublisherWorkerIdentity,
  options?: PublishJobClaimOptions,
  repository?: PublishJobRepository
): Promise<PublishJobClaimResult> {
  const repo = repository ?? getPublishJobRepository();

  const lockDurationMs = options?.lockDurationMs ?? LOCK_DEFAULTS.DEFAULT_LOCK_DURATION_MS;
  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + lockDurationMs);

  debug('Attempting to claim job', { jobId, workerId: workerIdentity.workerId });

  try {
    // Try to claim using conditional update
    // This is atomic - only one worker can succeed
    const claimed = await repo.claimJobAtomic(
      jobId,
      workerIdentity.workerId,
      now,
      lockExpiresAt
    );

    if (claimed) {
      info('Job claimed', { jobId, workerId: workerIdentity.workerId });

      return {
        success: true,
        jobId,
        lockExpiresAt,
      };
    }

    // Check if job was claimed by someone else
    const existingJob = await repo.findById(jobId);

    if (!existingJob) {
      return {
        success: false,
        jobId,
        error: 'Job not found',
      };
    }

    // Check if claim is stale
    if (existingJob.claimed_at && existingJob.lock_expires_at) {
      const lockExpires = new Date(existingJob.lock_expires_at);
      const claimedAt = new Date(existingJob.claimed_at);

      // If lock has expired, try to recover
      if (lockExpires < now) {
        debug('Attempting to recover stale lock', {
          jobId,
          claimedBy: existingJob.claimed_by,
          expiredAt: existingJob.lock_expires_at,
        });

        const recovered = await repo.claimJobAtomic(
          jobId,
          workerIdentity.workerId,
          now,
          lockExpiresAt
        );

        if (recovered) {
          info('Recovered stale lock', { jobId, workerId: workerIdentity.workerId });

          return {
            success: true,
            jobId,
            staleClaimRecovered: true,
            lockExpiresAt,
          };
        }
      }

      return {
        success: false,
        jobId,
        alreadyClaimed: true,
        error: `Job already claimed by ${existingJob.claimed_by}`,
      };
    }

    return {
      success: false,
      jobId,
      alreadyClaimed: true,
      error: 'Job could not be claimed',
    };
  } catch (err) {
    debug('Error claiming job', { jobId, error: err });

    return {
      success: false,
      jobId,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Claim multiple jobs in batch
 */
export async function claimPublishJobs(
  jobIds: string[],
  workerIdentity: PublisherWorkerIdentity,
  options?: PublishJobClaimOptions,
  repository?: PublishJobRepository
): Promise<PublishJobClaimResult[]> {
  const results: PublishJobClaimResult[] = [];

  for (const jobId of jobIds) {
    const result = await claimPublishJob(jobId, workerIdentity, options, repository);
    results.push(result);

    // Brief delay to avoid overwhelming the database
    if (jobIds.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  return results;
}

/**
 * Release a job claim (for cleanup or when worker is shutting down)
 */
export async function releasePublishJobClaim(
  jobId: string,
  workerIdentity: PublisherWorkerIdentity,
  options?: {
    force?: boolean;
  },
  repository?: PublishJobRepository
): Promise<boolean> {
  const repo = repository ?? getPublishJobRepository();

  debug('Releasing job claim', { jobId, workerId: workerIdentity.workerId });

  try {
    const job = await repo.findById(jobId);

    if (!job) {
      return false;
    }

    // Check if this worker owns the claim
    if (!options?.force && job.claimed_by !== workerIdentity.workerId) {
      debug('Cannot release job - not owned by worker', {
        jobId,
        ownedBy: job.claimed_by,
        workerId: workerIdentity.workerId,
      });
      return false;
    }

    // Release the claim
    const released = await repo.releaseJobClaim(jobId);

    if (released) {
      info('Job claim released', { jobId, workerId: workerIdentity.workerId });
    }

    return released;
  } catch (err) {
    debug('Error releasing job claim', { jobId, error: err });
    return false;
  }
}

/**
 * Refresh a job lock to extend its expiration
 */
export async function refreshPublishJobLock(
  jobId: string,
  workerIdentity: PublisherWorkerIdentity,
  options?: {
    lockDurationMs?: number;
  },
  repository?: PublishJobRepository
): Promise<boolean> {
  const repo = repository ?? getPublishJobRepository();

  const lockDurationMs = options?.lockDurationMs ?? LOCK_DEFAULTS.DEFAULT_LOCK_DURATION_MS;
  const lockExpiresAt = new Date(Date.now() + lockDurationMs);

  try {
    const refreshed = await repo.refreshJobLock(jobId, workerIdentity.workerId, lockExpiresAt);

    if (refreshed) {
      debug('Job lock refreshed', { jobId, newExpiresAt: lockExpiresAt });
    }

    return refreshed;
  } catch (err) {
    debug('Error refreshing job lock', { jobId, error: err });
    return false;
  }
}

/**
 * Cleanup stale locks from dead workers
 */
export async function cleanupStaleLocks(
  repository?: PublishJobRepository
): Promise<number> {
  const repo = repository ?? getPublishJobRepository();

  try {
    const cleaned = await repo.cleanupStaleLocks();

    if (cleaned > 0) {
      info('Cleaned stale locks', { count: cleaned });
    }

    return cleaned;
  } catch (err) {
    debug('Error cleaning stale locks', { error: err });
    return 0;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique worker identity
 */
export function createWorkerIdentity(options?: {
  workerId?: string;
  workerName?: string;
}): PublisherWorkerIdentity {
  return {
    workerId: options?.workerId ?? `worker-${process.pid}-${Date.now()}`,
    workerName: options?.workerName ?? 'Publisher Worker',
    hostname: process.env.HOSTNAME ?? 'unknown',
    pid: process.pid,
  };
}
