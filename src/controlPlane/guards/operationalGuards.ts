/**
 * Operational Guards
 *
 * Production-grade safeguard checks before executing admin actions.
 * Ensures safety policies are followed and validates action preconditions.
 */

import type {
  AdminActor,
  ControlPlaneGuardDecision,
  ManualCrawlRequest,
  ManualPublisherRunRequest,
  RetryPublishJobRequest,
  CancelPublishJobRequest,
  UnlockStalePublishJobRequest,
  RequeueDeadLetterRequest,
  MarkDeadLetterResolvedRequest,
} from '../types.js';
import {
  MAX_CONCURRENT_CRAWLS,
  MAX_PUBLISHER_RUN_JOBS,
  REQUIRE_REASON_FOR_DESTRUCTIVE,
  DESTRUCTIVE_ACTIONS,
  STALE_LOCK_THRESHOLD_MS,
  CRITICAL_STALE_LOCK_THRESHOLD_MS,
} from '../constants.js';
import { createLogger } from '../../observability/logger/structuredLogger.js';
import { getAllRetryBudgets, getRateLimit } from '../../observability/safeguards/rateLimitGuard.js';
import { getRetryBudget } from '../../observability/safeguards/retryBudget.js';

const logger = createLogger({ subsystem: 'operational_guards' });

/**
 * Guard for manual crawl request
 */
export function guardManualCrawlRequest(
  actor: AdminActor,
  request: ManualCrawlRequest
): ControlPlaneGuardDecision {
  const warnings: string[] = [];
  const metadata: Record<string, unknown> = {};

  // Check if crawl rate limit is near capacity
  const crawlLimit = getRateLimit('crawl_navigation');
  const usagePercent = (crawlLimit.current / crawlLimit.max) * 100;

  if (usagePercent >= 80) {
    warnings.push(`Crawl rate limit at ${usagePercent.toFixed(0)}% capacity`);
  }

  if (crawlLimit.blocked) {
    return {
      allowed: false,
      reason: 'Crawl rate limit is currently blocked',
      warnings,
      metadata,
    };
  }

  // Validate URL if provided
  if (request.url) {
    try {
      const url = new URL(request.url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return {
          allowed: false,
          reason: 'Invalid URL protocol. Only HTTP and HTTPS are allowed.',
          warnings,
          metadata,
        };
      }
    } catch {
      return {
        allowed: false,
        reason: 'Invalid URL format',
        warnings,
        metadata,
      };
    }
  }

  return {
    allowed: true,
    warnings,
    metadata,
  };
}

/**
 * Guard for manual publisher run request
 */
export function guardManualPublisherRunRequest(
  actor: AdminActor,
  request: ManualPublisherRunRequest
): ControlPlaneGuardDecision {
  const warnings: string[] = [];
  const metadata: Record<string, unknown> = {};

  // Check limit
  const limit = request.limit || 10;
  if (limit > MAX_PUBLISHER_RUN_JOBS) {
    return {
      allowed: false,
      reason: `Job limit exceeds maximum allowed (${MAX_PUBLISHER_RUN_JOBS})`,
      warnings,
      metadata,
    };
  }

  // Warn if dry run is not set for production runs
  if (!request.dryRun) {
    warnings.push('Running in production mode (not dry-run)');
  }

  // Check concurrent runs budget
  const retryBudget = getRetryBudget('publish_job');
  if (!retryBudget.available) {
    warnings.push('Publish job retry budget is exhausted - some retries may fail');
  }

  return {
    allowed: true,
    warnings,
    metadata,
  };
}

/**
 * Guard for retry publish job request
 */
export async function guardRetryPublishJobRequest(
  actor: AdminActor,
  request: RetryPublishJobRequest
): Promise<ControlPlaneGuardDecision> {
  const warnings: string[] = [];
  const metadata: Record<string, unknown> = {};
  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return {
      allowed: false,
      reason: 'Database not configured',
      warnings,
      metadata,
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get job details
  const { data: job, error } = await supabase
    .from('publish_jobs')
    .select('id, status, attempt_count, last_attempt_at')
    .eq('id', request.jobId)
    .single();

  if (error || !job) {
    return {
      allowed: false,
      reason: 'Publish job not found',
      warnings,
      metadata: { jobId: request.jobId },
    };
  }

  metadata.jobStatus = job.status;
  metadata.attemptCount = job.attempt_count;

  // Check current status allows retry
  const retryableStatuses = ['failed', 'retry_scheduled'];
  if (!retryableStatuses.includes(job.status)) {
    return {
      allowed: false,
      reason: `Cannot retry job in '${job.status}' status. Only failed or retry_scheduled jobs can be retried.`,
      warnings,
      metadata,
    };
  }

  // Check if already being processed
  if (job.status === 'publishing') {
    return {
      allowed: false,
      reason: 'Job is currently being processed',
      warnings,
      metadata,
    };
  }

  // Check force flag for already retried jobs
  if (job.attempt_count > 0 && !request.options?.force) {
    warnings.push(`Job has been attempted ${job.attempt_count} times already`);
  }

  return {
    allowed: true,
    warnings,
    metadata,
  };
}

/**
 * Guard for cancel publish job request
 */
export async function guardCancelPublishJobRequest(
  actor: AdminActor,
  request: CancelPublishJobRequest
): Promise<ControlPlaneGuardDecision> {
  const warnings: string[] = [];
  const metadata: Record<string, unknown> = {};

  if (REQUIRE_REASON_FOR_DESTRUCTIVE && !request.reason) {
    return {
      allowed: false,
      reason: 'Cancellation reason is required',
      warnings,
      metadata,
    };
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return {
      allowed: false,
      reason: 'Database not configured',
      warnings,
      metadata,
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get job details
  const { data: job, error } = await supabase
    .from('publish_jobs')
    .select('id, status, published_url')
    .eq('id', request.jobId)
    .single();

  if (error || !job) {
    return {
      allowed: false,
      reason: 'Publish job not found',
      warnings,
      metadata: { jobId: request.jobId },
    };
  }

  metadata.jobStatus = job.status;

  // Cannot cancel already published jobs
  if (job.status === 'published') {
    return {
      allowed: false,
      reason: 'Cannot cancel already published job',
      warnings,
      metadata,
    };
  }

  // Warn if job is currently publishing
  if (job.status === 'publishing' && !request.force) {
    warnings.push('Job is currently being published - force flag recommended');
  }

  return {
    allowed: true,
    warnings,
    metadata,
  };
}

/**
 * Guard for unlock stale publish job request
 */
export async function guardUnlockStalePublishJobRequest(
  actor: AdminActor,
  request: UnlockStalePublishJobRequest
): Promise<ControlPlaneGuardDecision> {
  const warnings: string[] = [];
  const metadata: Record<string, unknown> = {};

  if (REQUIRE_REASON_FOR_DESTRUCTIVE && !request.reason) {
    return {
      allowed: false,
      reason: 'Unlock reason is required',
      warnings,
      metadata,
    };
  }

  // Only super_admin can unlock
  if (actor.role !== 'super_admin') {
    return {
      allowed: false,
      reason: 'Only super_admin can unlock stale jobs',
      warnings,
      metadata,
    };
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return {
      allowed: false,
      reason: 'Database not configured',
      warnings,
      metadata,
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get job details
  const { data: job, error } = await supabase
    .from('publish_jobs')
    .select('id, status, claimed_at, lock_expires_at, claimed_by')
    .eq('id', request.jobId)
    .single();

  if (error || !job) {
    return {
      allowed: false,
      reason: 'Publish job not found',
      warnings,
      metadata: { jobId: request.jobId },
    };
  }

  metadata.jobStatus = job.status;
  metadata.claimedBy = job.claimed_by;

  // Check if lock is actually stale
  if (job.status !== 'publishing') {
    return {
      allowed: false,
      reason: 'Job is not in publishing status - no lock to release',
      warnings,
      metadata,
    };
  }

  const claimedAt = job.claimed_at ? new Date(job.claimed_at).getTime() : 0;
  const now = Date.now();
  const lockAge = now - claimedAt;

  if (lockAge < STALE_LOCK_THRESHOLD_MS && !request.force) {
    return {
      allowed: false,
      reason: `Lock is not stale yet (${Math.round(lockAge / 1000)}s old). Use force flag to override.`,
      warnings,
      metadata: { lockAgeMs: lockAge },
    };
  }

  if (lockAge >= CRITICAL_STALE_LOCK_THRESHOLD_MS) {
    warnings.push(`Critical: Lock has been held for ${Math.round(lockAge / 60000)} minutes`);
  }

  return {
    allowed: true,
    warnings,
    metadata,
  };
}

/**
 * Guard for requeue dead letter request
 */
export async function guardDeadLetterRequeueRequest(
  actor: AdminActor,
  request: RequeueDeadLetterRequest
): Promise<ControlPlaneGuardDecision> {
  const warnings: string[] = [];
  const metadata: Record<string, unknown> = {};

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return {
      allowed: false,
      reason: 'Database not configured',
      warnings,
      metadata,
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get dead letter details
  const { data: dl, error } = await supabase
    .from('dead_letter_jobs')
    .select('id, status, attempt_count, error_category')
    .eq('id', request.deadLetterId)
    .single();

  if (error || !dl) {
    return {
      allowed: false,
      reason: 'Dead letter record not found',
      warnings,
      metadata: { deadLetterId: request.deadLetterId },
    };
  }

  metadata.status = dl.status;
  metadata.attemptCount = dl.attempt_count;

  // Check current status allows requeue
  const requeueableStatuses = ['quarantined', 'review'];
  if (!requeueableStatuses.includes(dl.status)) {
    return {
      allowed: false,
      reason: `Cannot requeue dead letter in '${dl.status}' status`,
      warnings,
      metadata,
    };
  }

  // Warn about multiple previous attempts
  if (dl.attempt_count >= 3) {
    warnings.push(`Record has failed ${dl.attempt_count} times previously`);
  }

  return {
    allowed: true,
    warnings,
    metadata,
  };
}

/**
 * Guard for mark dead letter resolved request
 */
export async function guardMarkDeadLetterResolvedRequest(
  actor: AdminActor,
  request: MarkDeadLetterResolvedRequest
): Promise<ControlPlaneGuardDecision> {
  const warnings: string[] = [];
  const metadata: Record<string, unknown> = {};

  if (!request.resolution) {
    return {
      allowed: false,
      reason: 'Resolution description is required',
      warnings,
      metadata,
    };
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return {
      allowed: false,
      reason: 'Database not configured',
      warnings,
      metadata,
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get dead letter details
  const { data: dl, error } = await supabase
    .from('dead_letter_jobs')
    .select('id, status')
    .eq('id', request.deadLetterId)
    .single();

  if (error || !dl) {
    return {
      allowed: false,
      reason: 'Dead letter record not found',
      warnings,
      metadata: { deadLetterId: request.deadLetterId },
    };
  }

  metadata.status = dl.status;

  // Check current status allows resolution
  if (dl.status === 'resolved' || dl.status === 'discarded') {
    return {
      allowed: false,
      reason: `Dead letter is already in '${dl.status}' status`,
      warnings,
      metadata,
    };
  }

  return {
    allowed: true,
    warnings,
    metadata,
  };
}
