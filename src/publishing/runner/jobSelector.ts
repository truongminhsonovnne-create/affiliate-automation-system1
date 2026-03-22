/**
 * Job Selector Module
 *
 * Selects jobs that are ready to be executed
 */

import type {
  PublisherChannel,
  JobSelectionCriteria,
  JobSelectionOptions,
} from './types.js';
import type { PublishJobRecord } from '../repositories/publishJobRepository.js';
import { getPublishJobRepository, type PublishJobRepository } from '../repositories/publishJobRepository.js';
import { SELECTION_DEFAULTS } from './constants.js';
import { info, debug } from '../../utils/logger.js';

// ============================================
// Job Selection
// ============================================

/**
 * Select jobs that are ready to be published
 */
export async function selectReadyPublishJobs(
  criteria: JobSelectionCriteria,
  options?: JobSelectionOptions,
  repository?: PublishJobRepository
): Promise<PublishJobRecord[]> {
  const repo = repository ?? getPublishJobRepository();

  const {
    channel,
    status,
    scheduledFrom,
    scheduledTo,
    priorityMin,
    priorityMax,
    limit,
    includeRetryEligible,
  } = criteria;

  const {
    retryEnabled = SELECTION_DEFAULTS.RETRY_ENABLED,
    staleLockThresholdMs = SELECTION_DEFAULTS.STALE_LOCK_THRESHOLD_MS,
  } = options ?? {};

  debug('Selecting ready publish jobs', {
    channel,
    status,
    includeRetryEligible,
    limit,
  });

  try {
    // Build the query
    const filters: {
      channel?: PublisherChannel;
      status?: string[];
      scheduled_from?: Date;
      scheduled_to?: Date;
      limit?: number;
    } = {};

    // Channel filter
    if (channel) {
      if (Array.isArray(channel)) {
        // Will be handled in query
      } else {
        filters.channel = channel;
      }
    }

    // Status filter - include pending, scheduled, ready by default
    const defaultStatuses = ['pending', 'scheduled', 'ready'];
    if (status) {
      filters.status = Array.isArray(status) ? status : [status];
    } else {
      filters.status = defaultStatuses;
    }

    // Time filters
    if (scheduledFrom) {
      filters.scheduled_from = scheduledFrom;
    }
    if (scheduledTo) {
      filters.scheduled_to = scheduledTo;
    }

    // Limit
    if (limit && limit > 0) {
      filters.limit = Math.min(limit, SELECTION_DEFAULTS.MAX_LIMIT);
    } else {
      filters.limit = SELECTION_DEFAULTS.DEFAULT_LIMIT;
    }

    // Get scheduled jobs
    const scheduledJobs = await repo.getScheduledPublishJobs(filters);

    // Get retry-eligible jobs if enabled
    let retryJobs: PublishJobRecord[] = [];
    if (includeRetryEligible && retryEnabled) {
      retryJobs = await repo.getRetryEligibleJobs({
        channel: channel as PublisherChannel | undefined,
        limit: filters.limit,
      });
    }

    // Combine and deduplicate
    const allJobs = [...scheduledJobs];
    const jobIds = new Set(scheduledJobs.map(j => j.id));

    for (const job of retryJobs) {
      if (!jobIds.has(job.id)) {
        allJobs.push(job);
        jobIds.add(job.id);
      }
    }

    // Apply priority filter
    let filteredJobs = allJobs;
    if (priorityMin !== undefined) {
      filteredJobs = filteredJobs.filter(j => j.priority >= priorityMin);
    }
    if (priorityMax !== undefined) {
      filteredJobs = filteredJobs.filter(j => j.priority <= priorityMax);
    }

    // Apply channel filter for arrays
    if (channel && Array.isArray(channel)) {
      filteredJobs = filteredJobs.filter(j => channel.includes(j.channel as PublisherChannel));
    }

    // Sort by priority (desc) then scheduled_at (asc)
    filteredJobs.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return aTime - bTime;
    });

    // Apply final limit
    const finalJobs = filteredJobs.slice(0, filters.limit ?? SELECTION_DEFAULTS.DEFAULT_LIMIT);

    debug('Selected jobs', {
      scheduledCount: scheduledJobs.length,
      retryCount: retryJobs.length,
      finalCount: finalJobs.length,
    });

    return finalJobs;
  } catch (err) {
    debug('Error selecting jobs', { error: err });
    return [];
  }
}

/**
 * Build job selection criteria from options
 */
export function buildJobSelectionCriteria(options?: {
  channels?: PublisherChannel[];
  limit?: number;
  includeRetryEligible?: boolean;
}): JobSelectionCriteria {
  return {
    channel: options?.channels,
    status: ['pending', 'scheduled', 'ready'],
    limit: options?.limit ?? SELECTION_DEFAULTS.DEFAULT_LIMIT,
    includeRetryEligible: options?.includeRetryEligible ?? true,
  };
}

/**
 * Filter jobs that are eligible for retry
 */
export function filterRetryEligibleJobs(
  jobs: PublishJobRecord[],
  options?: {
    maxRetries?: number;
  }
): PublishJobRecord[] {
  const maxRetries = options?.maxRetries ?? 3;

  return jobs.filter(job => {
    // Must be in failed status
    if (job.status !== 'failed') {
      return false;
    }

    // Must have attempt_count less than max
    if (job.attempt_count >= maxRetries) {
      return false;
    }

    // Must have next_retry_at set and in the past
    if (job.next_retry_at) {
      const nextRetry = new Date(job.next_retry_at);
      if (nextRetry > new Date()) {
        return false;
      }
    }

    return true;
  });
}

// ============================================
// Repository Extension
// ============================================

/**
 * Add getRetryEligibleJobs to repository if not exists
 * This is a convenience function that works with existing repository
 */
export async function getRetryEligibleJobs(
  repository: PublishJobRepository,
  filters?: {
    channel?: PublisherChannel;
    limit?: number;
  }
): Promise<PublishJobRecord[]> {
  // This uses a direct query approach
  // In production, this would be a method on the repository

  // For now, return empty array - implementation would query:
  // SELECT * FROM publish_jobs
  // WHERE status = 'failed'
  // AND attempt_count < max_retries
  // AND (next_retry_at IS NULL OR next_retry_at <= NOW())
  // ORDER BY priority DESC, next_retry_at ASC
  // LIMIT :limit

  return [];
}
