/**
 * Stuck Job Detector
 *
 * Production-grade detection of stuck, orphaned, or zombie jobs
 * with severity assessment and resolution recommendations.
 */

import { createLogger } from '../logger/structuredLogger.js';
import type { StuckJobInfo } from '../types.js';
import {
  JOB_STUCK_THRESHOLD_MS,
  LOCK_STALE_THRESHOLD_MS,
  JOB_ORPHANED_THRESHOLD_MS,
  WORKER_DEAD_THRESHOLD_MS,
} from '../constants.js';
import { incrementCounter } from '../metrics/inMemoryMetrics.js';
import { SAFEGUARD_METRICS } from '../metrics/metricNames.js';
import { isWorkerAlive } from '../health/heartbeat.js';

const logger = createLogger({ subsystem: 'stuck_job_detector' });

/** Stuck job cache */
const stuckJobCache: Map<string, StuckJobInfo> = new Map();

/** Last detection timestamps */
const lastDetectionTimes: Map<string, number> = new Map();

/**
 * Check for stale locks (claimed but lock expired)
 */
export async function detectStaleLocks(): Promise<StuckJobInfo[]> {
  const stuckJobs: StuckJobInfo[] = [];

  try {
    // Query for jobs with expired locks
    const { createClient } = await import('@supabase/supabase-js');

    // Use environment variable for Supabase URL
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      logger.debug('Supabase not configured, skipping stale lock detection');
      return stuckJobs;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: jobs, error } = await supabase
      .from('publish_jobs')
      .select('id, channel, status, claimed_by, claimed_at, lock_expires_at, updated_at')
      .in('status', ['publishing'])
      .lt('lock_expires_at', new Date().toISOString());

    if (error) {
      logger.error('Failed to query for stale locks', error);
      return stuckJobs;
    }

    for (const job of jobs || []) {
      const lockExpiresAt = job.lock_expires_at ? new Date(job.lock_expires_at).getTime() : 0;
      const now = Date.now();
      const ageMs = now - lockExpiresAt;

      if (ageMs > LOCK_STALE_THRESHOLD_MS) {
        const stuckJob: StuckJobInfo = {
          jobId: job.id,
          channel: job.channel,
          issue: 'stale_lock',
          detectedAt: new Date().toISOString(),
          lockHeldBy: job.claimed_by,
          lockExpiresAt: job.lock_expires_at,
          lastUpdateAt: job.updated_at,
          ageMs,
          severity: ageMs > LOCK_STALE_THRESHOLD_MS * 3 ? 'critical' : 'high',
          recommendation: `Release stale lock held by ${job.claimed_by}. Reset job to 'ready' status.`,
        };

        stuckJobs.push(stuckJob);
        stuckJobCache.set(job.id, stuckJob);
        incrementCounter(SAFEGUARD_METRICS.STUCK_JOBS_DETECTED, { issue: 'stale_lock' });

        logger.warn(`Detected stale lock on job ${job.id}`, {
          claimedBy: job.claimed_by,
          ageMs,
        });
      }
    }
  } catch (err) {
    logger.error('Error detecting stale locks', err as Error);
  }

  return stuckJobs;
}

/**
 * Check for execution timeouts (jobs in publishing too long)
 */
export async function detectExecutionTimeouts(): Promise<StuckJobInfo[]> {
  const stuckJobs: StuckJobInfo[] = [];

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return stuckJobs;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: jobs, error } = await supabase
      .from('publish_jobs')
      .select('id, channel, status, claimed_by, claimed_at, updated_at')
      .eq('status', 'publishing');

    if (error) {
      logger.error('Failed to query for execution timeouts', error);
      return stuckJobs;
    }

    const now = Date.now();

    for (const job of jobs || []) {
      const claimedAt = job.claimed_at ? new Date(job.claimed_at).getTime() : 0;
      const ageMs = now - claimedAt;

      if (claimedAt > 0 && ageMs > JOB_STUCK_THRESHOLD_MS) {
        // Check if worker is still alive
        const workerAlive = job.claimed_by ? isWorkerAlive(job.claimed_by) : false;

        const stuckJob: StuckJobInfo = {
          jobId: job.id,
          channel: job.channel,
          issue: 'execution_timeout',
          detectedAt: new Date().toISOString(),
          lockHeldBy: job.claimed_by,
          lastUpdateAt: job.updated_at,
          ageMs,
          severity: ageMs > JOB_STUCK_THRESHOLD_MS * 2 ? 'critical' : 'high',
          recommendation: workerAlive
            ? `Worker ${job.claimed_by} still alive but job timed out. Investigate worker.`
            : `Worker ${job.claimed_by} appears dead. Release lock and reset job.`,
        };

        stuckJobs.push(stuckJob);
        stuckJobCache.set(job.id, stuckJob);
        incrementCounter(SAFEGUARD_METRICS.STUCK_JOBS_DETECTED, { issue: 'execution_timeout' });

        logger.warn(`Detected execution timeout on job ${job.id}`, {
          claimedBy: job.claimed_by,
          workerAlive,
          ageMs,
        });
      }
    }
  } catch (err) {
    logger.error('Error detecting execution timeouts', err as Error);
  }

  return stuckJobs;
}

/**
 * Check for orphaned jobs (very old jobs never completed)
 */
export async function detectOrphanedJobs(): Promise<StuckJobInfo[]> {
  const stuckJobs: StuckJobInfo[] = [];

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return stuckJobs;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const cutoffDate = new Date(Date.now() - JOB_ORPHANED_THRESHOLD_MS).toISOString();

    const { data: jobs, error } = await supabase
      .from('publish_jobs')
      .select('id, channel, status, created_at, updated_at')
      .lt('created_at', cutoffDate)
      .in('status', ['pending', 'scheduled', 'ready', 'publishing']);

    if (error) {
      logger.error('Failed to query for orphaned jobs', error);
      return stuckJobs;
    }

    const now = Date.now();

    for (const job of jobs || []) {
      const createdAt = new Date(job.created_at).getTime();
      const ageMs = now - createdAt;

      const stuckJob: StuckJobInfo = {
        jobId: job.id,
        channel: job.channel,
        issue: 'orphaned',
        detectedAt: new Date().toISOString(),
        lastUpdateAt: job.updated_at,
        ageMs,
        severity: ageMs > JOB_ORPHANED_THRESHOLD_MS * 7 ? 'critical' : 'medium',
        recommendation: `Job is orphaned (${Math.round(ageMs / 86400000)} days old). Consider archiving or removing.`,
      };

      stuckJobs.push(stuckJob);
      stuckJobCache.set(job.id, stuckJob);
      incrementCounter(SAFEGUARD_METRICS.STUCK_JOBS_DETECTED, { issue: 'orphaned' });

      logger.warn(`Detected orphaned job ${job.id}`, {
        status: job.status,
        ageDays: Math.round(ageMs / 86400000),
      });
    }
  } catch (err) {
    logger.error('Error detecting orphaned jobs', err as Error);
  }

  return stuckJobs;
}

/**
 * Check for stale worker heartbeats
 */
export async function detectStaleHeartbeats(): Promise<StuckJobInfo[]> {
  const stuckJobs: StuckJobInfo[] = [];

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return stuckJobs;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const cutoffDate = new Date(Date.now() - WORKER_DEAD_THRESHOLD_MS).toISOString();

    // Find jobs being processed by workers that haven't sent heartbeats
    const { data: jobs, error } = await supabase
      .from('publish_jobs')
      .select('id, channel, status, claimed_by, claimed_at, updated_at')
      .eq('status', 'publishing')
      .not('claimed_by', 'is', null);

    if (error) {
      logger.error('Failed to query for stale worker jobs', error);
      return stuckJobs;
    }

    // Check each worker's heartbeat status
    for (const job of jobs || []) {
      if (job.claimed_by) {
        // Check worker status through Supabase if available
        const { data: workerRecords } = await supabase
          .from('worker_heartbeats')
          .select('last_seen_at')
          .eq('worker_id', job.claimed_by)
          .gte('last_seen_at', cutoffDate)
          .limit(1);

        if (!workerRecords || workerRecords.length === 0) {
          // Worker hasn't sent heartbeat recently
          const stuckJob: StuckJobInfo = {
            jobId: job.id,
            channel: job.channel,
            issue: 'stale_heartbeat',
            detectedAt: new Date().toISOString(),
            lockHeldBy: job.claimed_by,
            lastUpdateAt: job.updated_at,
            ageMs: Date.now() - new Date(job.claimed_at).getTime(),
            severity: 'high',
            recommendation: `Worker ${job.claimed_by} heartbeat stale. Release lock and reset job.`,
          };

          stuckJobs.push(stuckJob);
          stuckJobCache.set(job.id, stuckJob);
          incrementCounter(SAFEGUARD_METRICS.STUCK_JOBS_DETECTED, { issue: 'stale_heartbeat' });

          logger.warn(`Detected stale heartbeat for worker ${job.claimed_by} on job ${job.id}`);
        }
      }
    }
  } catch (err) {
    logger.error('Error detecting stale heartbeats', err as Error);
  }

  return stuckJobs;
}

/**
 * Run all stuck job detection checks
 */
export async function detectAllStuckJobs(): Promise<StuckJobInfo[]> {
  const allStuck: StuckJobInfo[] = [];

  const [staleLocks, timeouts, orphaned, staleHeartbeats] = await Promise.all([
    detectStaleLocks(),
    detectExecutionTimeouts(),
    detectOrphanedJobs(),
    detectStaleHeartbeats(),
  ]);

  allStuck.push(...staleLocks, ...timeouts, ...orphaned, ...staleHeartbeats);

  // Remove duplicates
  const unique = new Map<string, StuckJobInfo>();
  for (const job of allStuck) {
    const existing = unique.get(job.jobId);
    if (!existing || getSeverityPriority(job.severity) > getSeverityPriority(existing.severity)) {
      unique.set(job.jobId, job);
    }
  }

  return Array.from(unique.values());
}

/**
 * Get severity priority for comparison
 */
function getSeverityPriority(severity: string): number {
  const priorities: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return priorities[severity] || 0;
}

/**
 * Get stuck job info
 */
export function getStuckJob(jobId: string): StuckJobInfo | undefined {
  return stuckJobCache.get(jobId);
}

/**
 * Get all stuck jobs
 */
export function getAllStuckJobs(): StuckJobInfo[] {
  return Array.from(stuckJobCache.values());
}

/**
 * Get stuck jobs by severity
 */
export function getStuckJobsBySeverity(severity: string): StuckJobInfo[] {
  return Array.from(stuckJobCache.values()).filter(j => j.severity === severity);
}

/**
 * Get critical stuck jobs
 */
export function getCriticalStuckJobs(): StuckJobInfo[] {
  return getStuckJobsBySeverity('critical');
}

/**
 * Clear stuck job cache
 */
export function clearStuckJobCache(): void {
  stuckJobCache.clear();
}

/**
 * Release stuck job (unlock and reset)
 */
export async function releaseStuckJob(jobId: string): Promise<boolean> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Reset job to ready status and clear locks
    const { error } = await supabase
      .from('publish_jobs')
      .update({
        status: 'ready',
        claimed_by: null,
        claimed_at: null,
        lock_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      logger.error(`Failed to release stuck job ${jobId}`, error);
      return false;
    }

    // Remove from cache
    stuckJobCache.delete(jobId);

    logger.info(`Released stuck job ${jobId}`);
    return true;
  } catch (err) {
    logger.error(`Error releasing stuck job ${jobId}`, err as Error);
    return false;
  }
}

/**
 * Auto-release all critical stuck jobs
 */
export async function autoReleaseCriticalStuckJobs(): Promise<number> {
  const criticalJobs = getCriticalStuckJobs();
  let released = 0;

  for (const job of criticalJobs) {
    const success = await releaseStuckJob(job.jobId);
    if (success) {
      released++;
    }
  }

  if (released > 0) {
    logger.info(`Auto-released ${released} critical stuck jobs`);
  }

  return released;
}
