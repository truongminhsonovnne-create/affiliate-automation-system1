/**
 * Publisher Runner Types
 *
 * Type definitions for the publisher execution layer
 */

import type { PublishingChannel } from '../types.js';

// ============================================
// Channel Types
// ============================================

/**
 * Supported publisher channels (same as publishing channels)
 */
export type PublisherChannel = PublishingChannel;

// ============================================
// Execution Status Types
// ============================================

/**
 * Publish execution lifecycle status
 */
export type PublishExecutionStatus =
  | 'ready'        // Job is ready to be published
  | 'publishing'   // Job is currently being published
  | 'published'    // Successfully published
  | 'failed'       // Failed (permanent or after retries exhausted)
  | 'retry_scheduled'  // Failed but will retry
  | 'cancelled';   // Job was cancelled

/**
 * Attempt status
 */
export type AttemptStatus =
  | 'started'
  | 'completed'
  | 'failed'
  | 'retry_scheduled'
  | 'cancelled';

// ============================================
// Job Selection Types
// ============================================

/**
 * Job selection criteria
 */
export interface JobSelectionCriteria {
  channel?: PublisherChannel | PublisherChannel[];
  status?: PublishExecutionStatus | PublishExecutionStatus[];
  scheduledFrom?: Date;
  scheduledTo?: Date;
  priorityMin?: number;
  priorityMax?: number;
  limit?: number;
  includeRetryEligible?: boolean;
}

/**
 * Job selection options
 */
export interface JobSelectionOptions {
  retryEnabled?: boolean;
  staleLockThresholdMs?: number;
}

// ============================================
// Job Claiming Types
// ============================================

/**
 * Worker identity
 */
export interface PublisherWorkerIdentity {
  workerId: string;
  workerName?: string;
  hostname?: string;
  pid?: number;
}

/**
 * Options for job claiming
 */
export interface PublishJobClaimOptions {
  lockDurationMs?: number;
  refreshEnabled?: boolean;
}

/**
 * Result of claiming a job
 */
export interface PublishJobClaimResult {
  success: boolean;
  jobId?: string;
  alreadyClaimed?: boolean;
  staleClaimRecovered?: boolean;
  lockExpiresAt?: Date;
  error?: string;
}

// ============================================
// Execution Types
// ============================================

/**
 * Adapter request for publishing
 */
export interface PublisherAdapterRequest {
  jobId: string;
  productId: string;
  contentId: string;
  channel: PublisherChannel;
  payload: Record<string, unknown>;
  metadata?: {
    attemptNumber: number;
    scheduledAt?: Date;
    priority: number;
    sourceMetadata?: Record<string, unknown>;
  };
}

/**
 * Adapter response from publishing
 */
export interface PublisherAdapterResponse {
  success: boolean;
  channel: PublisherChannel;
  status: 'published' | 'failed' | 'rate_limited' | 'validation_error';
  externalPostId?: string;
  publishedUrl?: string;
  responseMetadata?: Record<string, unknown>;
  errorMessage?: string;
  errorCode?: string;
  errorCategory?: 'transient' | 'validation' | 'permanent' | 'rate_limit' | 'external';
  durationMs?: number;
}

/**
 * Options for adapter execution
 */
export interface PublisherAdapterExecuteOptions {
  timeoutMs?: number;
  dryRun?: boolean;
  validatePayload?: boolean;
}

/**
 * Result of adapter execution
 */
export interface PublisherAdapterExecuteResult {
  success: boolean;
  channel: PublisherChannel;
  jobId: string;
  response: PublisherAdapterResponse;
  durationMs: number;
  dryRun: boolean;
}

// ============================================
// Retry Types
// ============================================

/**
 * Retry decision
 */
export interface RetryDecision {
  shouldRetry: boolean;
  shouldRetryImmediately?: boolean;
  nextRetryAt?: Date;
  maxRetriesReached?: boolean;
  errorCategory?: 'transient' | 'validation' | 'permanent' | 'rate_limit' | 'external';
}

/**
 * Backoff policy configuration
 */
export interface BackoffPolicy {
  baseDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
  jitter: boolean;
}

/**
 * Retry context
 */
export interface RetryContext {
  jobId: string;
  channel: PublisherChannel;
  attemptNumber: number;
  maxRetries: number;
  lastError?: PublisherAdapterResponse;
}

// ============================================
// Lifecycle Types
// ============================================

/**
 * Job execution context
 */
export interface JobExecutionContext {
  job: {
    id: string;
    productId: string;
    contentId: string;
    channel: PublisherChannel;
    status: string;
    payload: Record<string, unknown>;
    attemptCount: number;
    scheduledAt?: Date;
    priority: number;
  };
  worker: PublisherWorkerIdentity;
  startTime: Date;
  adapter?: string;
  claimResult?: PublishJobClaimResult;
}

/**
 * Lifecycle update options
 */
export interface LifecycleUpdateOptions {
  errorMessage?: string;
  errorCode?: string;
  errorCategory?: string;
  publishedUrl?: string;
  externalPostId?: string;
  executionMetadata?: Record<string, unknown>;
  nextRetryAt?: Date;
}

// ============================================
// Attempt Record Types
// ============================================

/**
 * Input for creating attempt record
 */
export interface PublishAttemptRecordInput {
  publishJobId: string;
  attemptNumber: number;
  channel: PublisherChannel;
  status: AttemptStatus;
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
  errorMessage?: string;
  errorCode?: string;
  errorCategory?: string;
  responseMetadata?: Record<string, unknown>;
  publishedUrl?: string;
  externalPostId?: string;
  workerIdentity?: string;
}

// ============================================
// Runner Options Types
// ============================================

/**
 * Options for a single publisher run
 */
export interface PublisherRunOptions {
  channels?: PublisherChannel[];
  dryRun?: boolean;
  limit?: number;
  workerIdentity?: PublisherWorkerIdentity;
  concurrency?: number;
  claimLockDurationMs?: number;
  retryEnabled?: boolean;
  executionTimeoutMs?: number;
  selectOptions?: JobSelectionOptions;
  claimOptions?: PublishJobClaimOptions;
}

/**
 * Result of a single publisher run
 */
export interface PublisherRunResult {
  ok: boolean;
  status: 'success' | 'partial_success' | 'failed';
  workerIdentity: PublisherWorkerIdentity;
  dryRun: boolean;
  selectedCount: number;
  claimedCount: number;
  executedCount: number;
  publishedCount: number;
  failedCount: number;
  retryScheduledCount: number;
  skippedCount: number;
  durationMs: number;
  warnings: PublisherExecutionWarning[];
  errors: PublisherExecutionError[];
  metadata: PublisherRunMetadata;
}

/**
 * Result of batch publisher runs
 */
export interface PublisherBatchRunResult {
  ok: boolean;
  status: 'success' | 'partial_success' | 'failed';
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  durationMs: number;
  results: PublisherRunResult[];
}

// ============================================
// Warning/Error Types
// ============================================

/**
 * Execution warning
 */
export interface PublisherExecutionWarning {
  jobId?: string;
  channel?: PublisherChannel;
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Execution error
 */
export interface PublisherExecutionError {
  jobId?: string;
  channel?: PublisherChannel;
  code: string;
  message: string;
  error?: unknown;
  errorCategory?: string;
}

// ============================================
// Metadata Types
// ============================================

/**
 * Run metadata
 */
export interface PublisherRunMetadata {
  startTime: Date;
  endTime: Date;
  workerIdentity: PublisherWorkerIdentity;
  dryRun: boolean;
  channels: PublisherChannel[];
  channelsProcessed: PublisherChannel[];
  selectionStats: {
    totalCandidates: number;
    retryEligible: number;
    selected: number;
  };
  claimStats: {
    claimed: number;
    alreadyClaimed: number;
    staleRecovered: number;
    failed: number;
  };
  executionStats: {
    executed: number;
    succeeded: number;
    failed: number;
    retried: number;
  };
  lockStats: {
    released: number;
    refreshed: number;
    expired: number;
  };
  lifecycleStats: {
    published: number;
    failed: number;
    retryScheduled: number;
    cancelled: number;
  };
}

// ============================================
// Adapter Capability Types
// ============================================

/**
 * Adapter capability
 */
export type PublisherAdapterCapability =
  | 'execute'
  | 'dryRun'
  | 'healthCheck'
  | 'validatePayload'
  | 'mediaUpload'
  | 'scheduling';

/**
 * Adapter feature support
 */
export interface PublisherAdapterFeatures {
  supports: (feature: PublisherAdapterCapability) => boolean;
  validatePayload?: (payload: Record<string, unknown>) => { valid: boolean; errors: string[] };
  healthCheck?: () => Promise<PublisherAdapterHealthResult>;
}

/**
 * Health check result
 */
export interface PublisherAdapterHealthResult {
  healthy: boolean;
  channel: PublisherChannel;
  latencyMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Dry run result
 */
export interface PublisherAdapterDryRunResult {
  valid: boolean;
  channel: PublisherChannel;
  jobId: string;
  wouldPublish: boolean;
  validationErrors: string[];
  warnings: string[];
  simulatedResponse?: PublisherAdapterResponse;
}
