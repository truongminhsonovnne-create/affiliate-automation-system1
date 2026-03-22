/**
 * Result Builder Module
 *
 * Builds structured results for publish preparation
 */

import type {
  PublishingChannel,
  PublishPreparationWarning,
  PublishPreparationError,
  ChannelPreparationResult,
  PublishPreparationResult,
  PublishPreparationBatchResult,
  PublishingMetadata,
} from './types.js';

// ============================================
// Result Builder
// ============================================

/**
 * Build a single product publish preparation result
 */
export function buildPublishPreparationResult(
  context: {
    productId: string;
    channels: PublishingChannel[];
    channelResults: ChannelPreparationResult[];
    startTime: Date;
    endTime: Date;
    schedulingPolicyUsed: string;
  }
): PublishPreparationResult {
  const { productId, channels, channelResults, startTime, endTime, schedulingPolicyUsed } = context;

  // Calculate counters
  const processedCount = channelResults.length;
  const eligibleCount = channelResults.filter((r) => r.eligible).length;
  const payloadBuiltCount = channelResults.filter((r) => r.payloadBuilt).length;
  const scheduledCount = channelResults.filter((r) => r.scheduled).length;
  const persistedCount = channelResults.filter((r) => r.persisted).length;
  const skippedCount = channelResults.filter((r) => r.warning?.code === 'SKIPPED').length;
  const failedCount = channelResults.filter((r) => r.error).length;

  // Collect warnings and errors
  const warnings: PublishPreparationWarning[] = channelResults
    .filter((r) => r.warning)
    .map((r) => r.warning!);

  const errors: PublishPreparationError[] = channelResults
    .filter((r) => r.error)
    .map((r) => r.error!);

  // Determine overall status
  let status: 'success' | 'partial_success' | 'failed';
  if (failedCount === processedCount) {
    status = 'failed';
  } else if (persistedCount > 0) {
    status = 'success';
  } else {
    status = 'partial_success';
  }

  // Build metadata
  const metadata: PublishingMetadata = {
    startTime,
    endTime,
    channels,
    channelsProcessed: channels,
    schedulingPolicyUsed,
    payloadBuildStats: {
      total: processedCount,
      succeeded: payloadBuiltCount,
      failed: processedCount - payloadBuiltCount,
    },
    persistenceStats: {
      total: processedCount,
      inserted: persistedCount,
      updated: 0,
      skipped: skippedCount,
      failed: failedCount,
    },
    eligibilityStats: {
      total: processedCount,
      eligible: eligibleCount,
      ineligible: processedCount - eligibleCount,
    },
    schedulingStats: {
      total: processedCount,
      scheduled: scheduledCount,
      immediate: scheduledCount - channelResults.filter((r) => r.scheduledAt).length,
      failed: 0,
    },
  };

  return {
    ok: status === 'success',
    status,
    productId,
    channels,
    channelsProcessed: channels,
    processedCount,
    eligibleCount,
    payloadBuiltCount,
    scheduledCount,
    persistedCount,
    skippedCount,
    failedCount,
    warnings,
    errors,
    metadata,
    channelResults,
  };
}

/**
 * Build counters for batch result
 */
export function buildPublishPreparationCounters(
  results: PublishPreparationResult[]
): {
  totalProducts: number;
  successfulProducts: number;
  failedProducts: number;
  processedCount: number;
  eligibleCount: number;
  payloadBuiltCount: number;
  scheduledCount: number;
  persistedCount: number;
  skippedCount: number;
  failedCount: number;
} {
  let totalProducts = 0;
  let successfulProducts = 0;
  let failedProducts = 0;
  let processedCount = 0;
  let eligibleCount = 0;
  let payloadBuiltCount = 0;
  let scheduledCount = 0;
  let persistedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const result of results) {
    totalProducts++;

    if (result.status === 'success') {
      successfulProducts++;
    } else if (result.status === 'failed') {
      failedProducts++;
    }

    processedCount += result.processedCount;
    eligibleCount += result.eligibleCount;
    payloadBuiltCount += result.payloadBuiltCount;
    scheduledCount += result.scheduledCount;
    persistedCount += result.persistedCount;
    skippedCount += result.skippedCount;
    failedCount += result.failedCount;
  }

  return {
    totalProducts,
    successfulProducts,
    failedProducts,
    processedCount,
    eligibleCount,
    payloadBuiltCount,
    scheduledCount,
    persistedCount,
    skippedCount,
    failedCount,
  };
}

/**
 * Summarize warnings from all results
 */
export function summarizePublishPreparationWarnings(
  results: PublishPreparationResult[]
): PublishPreparationWarning[] {
  const allWarnings: PublishPreparationWarning[] = [];

  for (const result of results) {
    allWarnings.push(...result.warnings);
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  allWarnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return allWarnings;
}

/**
 * Summarize errors from all results
 */
export function summarizePublishPreparationErrors(
  results: PublishPreparationResult[]
): PublishPreparationError[] {
  const allErrors: PublishPreparationError[] = [];

  for (const result of results) {
    allErrors.push(...result.errors);
  }

  return allErrors;
}

/**
 * Build batch preparation result
 */
export function buildPublishPreparationBatchResult(
  context: {
    channels: PublishingChannel[];
    productResults: PublishPreparationResult[];
    startTime: Date;
    endTime: Date;
    schedulingPolicyUsed: string;
  }
): PublishPreparationBatchResult {
  const { channels, productResults, startTime, endTime, schedulingPolicyUsed } = context;

  const counters = buildPublishPreparationCounters(productResults);
  const warnings = summarizePublishPreparationWarnings(productResults);
  const errors = summarizePublishPreparationErrors(productResults);

  // Determine overall status
  let status: 'success' | 'partial_success' | 'failed';
  if (counters.failedProducts === counters.totalProducts) {
    status = 'failed';
  } else if (counters.persistedCount > 0) {
    status = 'success';
  } else {
    status = 'partial_success';
  }

  const metadata: PublishingMetadata = {
    startTime,
    endTime,
    channels,
    channelsProcessed: channels,
    schedulingPolicyUsed,
    payloadBuildStats: {
      total: counters.processedCount,
      succeeded: counters.payloadBuiltCount,
      failed: counters.processedCount - counters.payloadBuiltCount,
    },
    persistenceStats: {
      total: counters.processedCount,
      inserted: counters.persistedCount,
      updated: 0,
      skipped: counters.skippedCount,
      failed: counters.failedCount,
    },
    eligibilityStats: {
      total: counters.processedCount,
      eligible: counters.eligibleCount,
      ineligible: counters.processedCount - counters.eligibleCount,
    },
    schedulingStats: {
      total: counters.processedCount,
      scheduled: counters.scheduledCount,
      immediate: 0,
      failed: 0,
    },
  };

  return {
    ok: status === 'success',
    status,
    totalProducts: counters.totalProducts,
    processedProducts: counters.totalProducts,
    successfulProducts: counters.successfulProducts,
    failedProducts: counters.failedProducts,
    channels,
    processedCount: counters.processedCount,
    eligibleCount: counters.eligibleCount,
    payloadBuiltCount: counters.payloadBuiltCount,
    scheduledCount: counters.scheduledCount,
    persistedCount: counters.persistedCount,
    skippedCount: counters.skippedCount,
    failedCount: counters.failedCount,
    warnings,
    errors,
    metadata,
    productResults,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create a channel preparation result
 */
export function createChannelPreparationResult(
  channel: PublishingChannel,
  productId: string,
  contentId: string,
  data: {
    eligible?: boolean;
    payloadBuilt?: boolean;
    scheduled?: boolean;
    persisted?: boolean;
    scheduledAt?: Date;
    jobId?: string;
    warning?: PublishPreparationWarning;
    error?: PublishPreparationError;
  }
): ChannelPreparationResult {
  return {
    channel,
    productId,
    contentId,
    eligible: data.eligible ?? false,
    payloadBuilt: data.payloadBuilt ?? false,
    scheduled: data.scheduled ?? false,
    persisted: data.persisted ?? false,
    scheduledAt: data.scheduledAt,
    jobId: data.jobId,
    warning: data.warning,
    error: data.error,
  };
}

/**
 * Create a preparation warning
 */
export function createPreparationWarning(
  code: string,
  message: string,
  options?: {
    channel?: PublishingChannel;
    productId?: string;
    contentId?: string;
    severity?: 'low' | 'medium' | 'high';
  }
): PublishPreparationWarning {
  return {
    channel: options?.channel,
    productId: options?.productId ?? '',
    contentId: options?.contentId,
    code,
    message,
    severity: options?.severity ?? 'medium',
  };
}

/**
 * Create a preparation error
 */
export function createPreparationError(
  code: string,
  message: string,
  options?: {
    channel?: PublishingChannel;
    productId?: string;
    contentId?: string;
    error?: unknown;
  }
): PublishPreparationError {
  return {
    channel: options?.channel,
    productId: options?.productId ?? '',
    contentId: options?.contentId,
    code,
    message,
    error: options?.error,
  };
}
