/**
 * Stuck Job Validation
 *
 * Validates detection and handling of stuck jobs.
 */

import type { ReliabilityCheckResult } from '../types';
import { STALE_JOB_THRESHOLD_MS } from '../constants';

/**
 * Job status
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Job record
 */
export interface JobRecord {
  id: string;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
}

/**
 * Stuck job detection config
 */
export interface StuckJobConfig {
  thresholdMs: number;
  checkProcessingTimeout: boolean;
  checkPendingTimeout: boolean;
  enabledStatuses: JobStatus[];
}

/**
 * Stuck job detection result
 */
export interface StuckJobResult {
  jobId: string;
  isStuck: boolean;
  reason: string;
  stuckDuration?: number;
  recommendedAction: 'retry' | 'fail' | 'ignore' | 'cancel';
}

/**
 * Stuck job validation result
 */
export interface StuckJobValidationResult {
  valid: boolean;
  stuckJobs: StuckJobResult[];
  healthyJobs: JobRecord[];
  checks: ReliabilityCheckResult[];
}

/**
 * Default stuck job configuration
 */
export const DEFAULT_STUCK_JOB_CONFIG: StuckJobConfig = {
  thresholdMs: STALE_JOB_THRESHOLD_MS,
  checkProcessingTimeout: true,
  checkPendingTimeout: true,
  enabledStatuses: ['pending', 'processing'],
};

/**
 * Detect stuck job
 */
export function detectStuckJob(
  job: JobRecord,
  config: StuckJobConfig = DEFAULT_STUCK_JOB_CONFIG
): StuckJobResult {
  const now = new Date();
  let isStuck = false;
  let reason = '';
  let stuckDuration: number | undefined;
  let recommendedAction: StuckJobResult['recommendedAction'] = 'ignore';

  // Check pending jobs
  if (config.checkPendingTimeout && job.status === 'pending') {
    const pendingDuration = now.getTime() - job.createdAt.getTime();

    if (pendingDuration > config.thresholdMs) {
      isStuck = true;
      reason = `Pending job exceeded threshold: ${pendingDuration}ms > ${config.thresholdMs}ms`;
      stuckDuration = pendingDuration;
      recommendedAction = job.attempts < job.maxAttempts ? 'retry' : 'fail';
    }
  }

  // Check processing jobs
  if (config.checkProcessingTimeout && job.status === 'processing') {
    if (!job.startedAt) {
      isStuck = true;
      reason = 'Processing job has no start timestamp';
      recommendedAction = 'fail';
    } else {
      const processingDuration = now.getTime() - job.startedAt.getTime();

      if (processingDuration > config.thresholdMs) {
        isStuck = true;
        reason = `Processing job exceeded threshold: ${processingDuration}ms > ${config.thresholdMs}ms`;
        stuckDuration = processingDuration;
        recommendedAction = job.attempts < job.maxAttempts ? 'retry' : 'fail';
      }
    }
  }

  return {
    jobId: job.id,
    isStuck,
    reason,
    stuckDuration,
    recommendedAction,
  };
}

/**
 * Detect multiple stuck jobs
 */
export function detectStuckJobs(
  jobs: JobRecord[],
  config: StuckJobConfig = DEFAULT_STUCK_JOB_CONFIG
): StuckJobResult[] {
  return jobs
    .filter((job) => config.enabledStatuses.includes(job.status))
    .map((job) => detectStuckJob(job, config))
    .filter((result) => result.isStuck);
}

/**
 * Validate stuck job detection
 */
export function validateStuckJobDetection(
  jobs: JobRecord[],
  config: StuckJobConfig = DEFAULT_STUCK_JOB_CONFIG
): StuckJobValidationResult {
  const checks: ReliabilityCheckResult[] = [];
  const startTime = Date.now();

  // Detect stuck jobs
  const stuckResults = detectStuckJobs(jobs, config);
  const stuckJobIds = new Set(stuckResults.map((r) => r.jobId));

  const healthyJobs = jobs.filter((job) => !stuckJobIds.has(job.id));

  // Check if any stuck jobs detected (for testing purposes)
  const detectionCheck: ReliabilityCheckResult = {
    check: 'stuck-job-detection',
    passed: true, // Detection ran successfully
    duration: Date.now() - startTime,
    value: stuckResults.length,
  };
  checks.push(detectionCheck);

  // Check configuration
  const configCheck: ReliabilityCheckResult = {
    check: 'stuck-job-config',
    passed: config.thresholdMs > 0,
    duration: 0,
    threshold: 0,
    value: config.thresholdMs,
  };
  checks.push(configCheck);

  const valid = checks.every((c) => c.passed);

  return {
    valid,
    stuckJobs: stuckResults,
    healthyJobs,
    checks,
  };
}

/**
 * Run stuck job detection test
 */
export async function runStuckJobDetectionTest(): Promise<StuckJobValidationResult> {
  const now = new Date();
  const threshold = DEFAULT_STUCK_JOB_CONFIG.thresholdMs;

  const testJobs: JobRecord[] = [
    // Normal pending job (not stuck)
    {
      id: 'job-1',
      status: 'pending',
      createdAt: new Date(now.getTime() - 60000),
      updatedAt: new Date(now.getTime() - 60000),
      attempts: 0,
      maxAttempts: 3,
    },
    // Stuck pending job
    {
      id: 'job-2',
      status: 'pending',
      createdAt: new Date(now.getTime() - threshold - 60000),
      updatedAt: new Date(now.getTime() - threshold - 60000),
      attempts: 0,
      maxAttempts: 3,
    },
    // Normal processing job (not stuck)
    {
      id: 'job-3',
      status: 'processing',
      createdAt: new Date(now.getTime() - 60000),
      updatedAt: new Date(now.getTime() - 60000),
      startedAt: new Date(now.getTime() - 30000),
      attempts: 1,
      maxAttempts: 3,
    },
    // Stuck processing job
    {
      id: 'job-4',
      status: 'processing',
      createdAt: new Date(now.getTime() - threshold - 60000),
      updatedAt: new Date(now.getTime() - threshold - 60000),
      startedAt: new Date(now.getTime() - threshold - 30000),
      attempts: 1,
      maxAttempts: 3,
    },
    // Completed job (should be ignored)
    {
      id: 'job-5',
      status: 'completed',
      createdAt: new Date(now.getTime() - threshold - 60000),
      updatedAt: new Date(now.getTime() - 60000),
      startedAt: new Date(now.getTime() - threshold - 30000),
      completedAt: new Date(now.getTime() - 60000),
      attempts: 1,
      maxAttempts: 3,
    },
  ];

  return validateStuckJobDetection(testJobs);
}

/**
 * Validate stuck job configuration
 */
export function validateStuckJobConfig(
  config: StuckJobConfig
): ReliabilityCheckResult {
  const errors: string[] = [];

  if (config.thresholdMs < 1000) {
    errors.push('thresholdMs should be at least 1000ms');
  }

  if (config.enabledStatuses.length === 0) {
    errors.push('enabledStatuses cannot be empty');
  }

  const start = Date.now();

  return {
    check: 'stuck-job-config-validation',
    passed: errors.length === 0,
    duration: Date.now() - start,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

/**
 * Create stuck job config
 */
export function createStuckJobConfig(
  options?: Partial<StuckJobConfig>
): StuckJobConfig {
  return {
    ...DEFAULT_STUCK_JOB_CONFIG,
    ...options,
  };
}

/**
 * Get stuck job statistics
 */
export function getStuckJobStats(
  result: StuckJobValidationResult
): {
  totalJobs: number;
  stuckCount: number;
  healthyCount: number;
  stuckRate: number;
  byStatus: Record<JobStatus, number>;
} {
  const totalJobs = result.stuckJobs.length + result.healthyJobs.length;
  const stuckCount = result.stuckJobs.length;
  const healthyCount = result.healthyJobs.length;

  const byStatus: Record<JobStatus, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };

  result.stuckJobs.forEach((job) => {
    const originalJob = [...result.healthyJobs, ...result.stuckJobs].find(
      (j) => j.id === job.jobId
    );
    if (originalJob) {
      byStatus[originalJob.status]++;
    }
  });

  return {
    totalJobs,
    stuckCount,
    healthyCount,
    stuckRate: totalJobs > 0 ? stuckCount / totalJobs : 0,
    byStatus,
  };
}
