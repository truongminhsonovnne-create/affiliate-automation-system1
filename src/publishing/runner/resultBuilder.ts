/**
 * Result Builder Module
 *
 * Builds structured results for publisher runs
 */

import type {
  PublisherWorkerIdentity,
  PublisherRunResult,
  PublisherExecutionWarning,
  PublisherExecutionError,
  PublisherRunMetadata,
} from './types.js';

// ============================================
// Result Builder
// ============================================

/**
 * Build a single publisher run result
 */
export function buildPublisherRunResult(context: {
  workerIdentity: PublisherWorkerIdentity;
  dryRun: boolean;
  startTime: Date;
  endTime: Date;
  selectionStats: {
    totalCandidates: number;
    selected: number;
  };
  claimStats: {
    claimed: number;
    alreadyClaimed: number;
    failed: number;
  };
  executionStats: {
    executed: number;
    succeeded: number;
    failed: number;
    retried: number;
  };
  lifecycleStats: {
    published: number;
    failed: number;
    retryScheduled: number;
    cancelled: number;
  };
  warnings: PublisherExecutionWarning[];
  errors: PublisherExecutionError[];
  channels: string[];
}): PublisherRunResult {
  const {
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
    channels,
  } = context;

  const durationMs = endTime.getTime() - startTime.getTime();

  // Determine status
  let status: 'success' | 'partial_success' | 'failed';
  if (executionStats.executed === 0) {
    status = 'failed';
  } else if (lifecycleStats.failed === executionStats.executed) {
    status = 'failed';
  } else if (lifecycleStats.published > 0 || lifecycleStats.retryScheduled > 0) {
    status = 'success';
  } else {
    status = 'partial_success';
  }

  const metadata: PublisherRunMetadata = {
    startTime,
    endTime,
    workerIdentity,
    dryRun,
    channels: channels as any,
    channelsProcessed: channels as any,
    selectionStats,
    claimStats,
    executionStats,
    lockStats: {
      released: 0,
      refreshed: 0,
      expired: 0,
    },
    lifecycleStats,
  };

  return {
    ok: status === 'success',
    status,
    workerIdentity,
    dryRun,
    selectedCount: selectionStats.selected,
    claimedCount: claimStats.claimed,
    executedCount: executionStats.executed,
    publishedCount: lifecycleStats.published,
    failedCount: lifecycleStats.failed,
    retryScheduledCount: lifecycleStats.retryScheduled,
    skippedCount: claimStats.alreadyClaimed + (selectionStats.selected - claimStats.claimed),
    durationMs,
    warnings,
    errors,
    metadata,
  };
}

/**
 * Build batch run result
 */
export function buildPublisherBatchRunResult(
  results: PublisherRunResult[]
): {
  ok: boolean;
  status: 'success' | 'partial_success' | 'failed';
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  durationMs: number;
  results: PublisherRunResult[];
  aggregateStats: {
    selected: number;
    claimed: number;
    executed: number;
    published: number;
    failed: number;
    retryScheduled: number;
    skipped: number;
  };
  warnings: PublisherExecutionWarning[];
  errors: PublisherExecutionError[];
} {
  const totalRuns = results.length;
  let successfulRuns = 0;
  let failedRuns = 0;
  let totalDurationMs = 0;

  const aggregateStats = {
    selected: 0,
    claimed: 0,
    executed: 0,
    published: 0,
    failed: 0,
    retryScheduled: 0,
    skipped: 0,
  };

  const allWarnings: PublisherExecutionWarning[] = [];
  const allErrors: PublisherExecutionError[] = [];

  for (const result of results) {
    if (result.status === 'success') {
      successfulRuns++;
    } else if (result.status === 'failed') {
      failedRuns++;
    }

    totalDurationMs += result.durationMs;

    aggregateStats.selected += result.selectedCount;
    aggregateStats.claimed += result.claimedCount;
    aggregateStats.executed += result.executedCount;
    aggregateStats.published += result.publishedCount;
    aggregateStats.failed += result.failedCount;
    aggregateStats.retryScheduled += result.retryScheduledCount;
    aggregateStats.skipped += result.skippedCount;

    allWarnings.push(...result.warnings);
    allErrors.push(...result.errors);
  }

  let status: 'success' | 'partial_success' | 'failed';
  if (totalRuns === 0) {
    status = 'failed';
  } else if (failedRuns === totalRuns) {
    status = 'failed';
  } else if (successfulRuns > 0) {
    status = 'success';
  } else {
    status = 'partial_success';
  }

  return {
    ok: status === 'success',
    status,
    totalRuns,
    successfulRuns,
    failedRuns,
    durationMs: totalDurationMs,
    results,
    aggregateStats,
    warnings: allWarnings,
    errors: allErrors,
  };
}

/**
 * Summarize warnings from results
 */
export function summarizePublisherWarnings(
  results: PublisherRunResult[]
): PublisherExecutionWarning[] {
  const allWarnings: PublisherExecutionWarning[] = [];

  for (const result of results) {
    allWarnings.push(...result.warnings);
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  allWarnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return allWarnings;
}

/**
 * Summarize errors from results
 */
export function summarizePublisherErrors(
  results: PublisherRunResult[]
): PublisherExecutionError[] {
  const allErrors: PublisherExecutionError[] = [];

  for (const result of results) {
    allErrors.push(...result.errors);
  }

  return allErrors;
}

/**
 * Build publisher metrics
 */
export function buildPublisherMetrics(
  results: PublisherRunResult[]
): {
  totalJobs: number;
  successRate: number;
  failureRate: number;
  retryRate: number;
  averageDurationMs: number;
  channelBreakdown: Record<string, {
    attempted: number;
    published: number;
    failed: number;
    retryScheduled: number;
  }>;
} {
  let totalJobs = 0;
  let totalPublished = 0;
  let totalFailed = 0;
  let totalRetryScheduled = 0;
  let totalDurationMs = 0;

  const channelBreakdown: Record<string, {
    attempted: number;
    published: number;
    failed: number;
    retryScheduled: number;
  }> = {};

  for (const result of results) {
    totalJobs += result.executedCount;
    totalPublished += result.publishedCount;
    totalFailed += result.failedCount;
    totalRetryScheduled += result.retryScheduledCount;
    totalDurationMs += result.durationMs;

    // Aggregate by channel from metadata
    if (result.metadata?.channels) {
      for (const channel of result.metadata.channels) {
        if (!channelBreakdown[channel]) {
          channelBreakdown[channel] = {
            attempted: 0,
            published: 0,
            failed: 0,
            retryScheduled: 0,
          };
        }

        channelBreakdown[channel].attempted += result.executedCount;
        channelBreakdown[channel].published += result.publishedCount;
        channelBreakdown[channel].failed += result.failedCount;
        channelBreakdown[channel].retryScheduled += result.retryScheduledCount;
      }
    }
  }

  return {
    totalJobs,
    successRate: totalJobs > 0 ? totalPublished / totalJobs : 0,
    failureRate: totalJobs > 0 ? totalFailed / totalJobs : 0,
    retryRate: totalJobs > 0 ? totalRetryScheduled / totalJobs : 0,
    averageDurationMs: results.length > 0 ? totalDurationMs / results.length : 0,
    channelBreakdown,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create a warning
 */
export function createPublisherWarning(
  code: string,
  message: string,
  options?: {
    jobId?: string;
    channel?: string;
    severity?: 'low' | 'medium' | 'high';
  }
): PublisherExecutionWarning {
  return {
    jobId: options?.jobId,
    channel: options?.channel as any,
    code,
    message,
    severity: options?.severity ?? 'medium',
  };
}

/**
 * Create an error
 */
export function createPublisherError(
  code: string,
  message: string,
  options?: {
    jobId?: string;
    channel?: string;
    error?: unknown;
    errorCategory?: string;
  }
): PublisherExecutionError {
  return {
    jobId: options?.jobId,
    channel: options?.channel as any,
    code,
    message,
    error: options?.error,
    errorCategory: options?.errorCategory,
  };
}
