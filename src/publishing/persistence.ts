/**
 * Persistence Module
 *
 * Handles persisting publish jobs to the database
 */

import type {
  PublishingChannel,
  ChannelPublishPayload,
  PublishJobRecordInput,
  PersistPublishJobResult,
  PersistPublishJobsResult,
  PersistenceOptions,
} from './types.js';
import { getPublishJobRepository, type PublishJobRepository } from './repositories/publishJobRepository.js';
import { DEDUPE_CONFIG } from './constants.js';
import { log, info, warn, error, debug } from '../utils/logger.js';

// ============================================
// Constants
// ============================================

/**
 * Default persistence options
 */
const DEFAULT_PERSISTENCE_OPTIONS: Required<PersistenceOptions> = {
  skipIfExists: DEDUPE_CONFIG.SKIP_IF_EQUIVALENT_PENDING,
  updateIfBetter: DEDUPE_CONFIG.UPDATE_IF_BETTER_PAYLOAD,
  idempotencyEnabled: DEDUPE_CONFIG.ENABLED,
};

// ============================================
// Persistence Functions
// ============================================

/**
 * Persist a single publish job
 */
export async function persistPublishJob(
  input: PublishJobRecordInput,
  options?: PersistenceOptions,
  repository?: PublishJobRepository
): Promise<PersistPublishJobResult> {
  const repo = repository ?? getPublishJobRepository();
  const opts = { ...DEFAULT_PERSISTENCE_OPTIONS, ...options };

  try {
    // Generate idempotency key
    const idempotencyKey = opts.idempotencyEnabled
      ? generateIdempotencyKey(input)
      : undefined;

    // Check for existing equivalent job
    if (opts.skipIfExists || opts.updateIfBetter) {
      const existingJob = await repo.findEquivalentPendingOrScheduledJob(
        input.productId,
        input.contentId,
        input.channel
      );

      if (existingJob) {
        if (opts.skipIfExists) {
          debug(
            { productId: input.productId, channel: input.channel },
            'Skipping - equivalent job already exists'
          );
          return {
            success: true,
            jobId: existingJob.id,
            action: 'skipped',
            reason: 'Equivalent pending/scheduled job already exists',
            existingJobId: existingJob.id,
          };
        }

        if (opts.updateIfBetter) {
          // Could implement payload comparison here
          // For now, skip
          debug(
            { productId: input.productId, channel: input.channel },
            'Skipping - equivalent job exists, update not implemented'
          );
          return {
            success: true,
            jobId: existingJob.id,
            action: 'skipped',
            reason: 'Equivalent job exists, update not better',
            existingJobId: existingJob.id,
          };
        }
      }
    }

    // Create the job record
    const jobData = mapToJobRecord(input, idempotencyKey);
    const insertedJob = await repo.insertPublishJob(jobData);

    if (!insertedJob) {
      return {
        success: false,
        action: 'failed',
        error: 'Failed to insert publish job',
      };
    }

    info(
      { jobId: insertedJob.id, channel: input.channel },
      'Publish job persisted successfully'
    );

    return {
      success: true,
      jobId: insertedJob.id,
      action: 'inserted',
    };
  } catch (err) {
    error(
      { productId: input.productId, channel: input.channel },
      'Failed to persist publish job'
    );

    return {
      success: false,
      action: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Persist multiple publish jobs
 */
export async function persistPublishJobs(
  inputs: PublishJobRecordInput[],
  options?: PersistenceOptions,
  repository?: PublishJobRepository
): Promise<PersistPublishJobsResult> {
  if (inputs.length === 0) {
    return {
      total: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      results: [],
    };
  }

  const results: PersistPublishJobResult[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  // Process each job
  for (const input of inputs) {
    const result = await persistPublishJob(input, options, repository);
    results.push(result);

    if (result.action === 'inserted') {
      inserted++;
    } else if (result.action === 'updated') {
      updated++;
    } else if (result.action === 'skipped') {
      skipped++;
    } else if (result.action === 'failed') {
      failed++;
    }
  }

  const total = inputs.length;

  info(
    { total, inserted, updated, skipped, failed },
    'Batch publish jobs persistence completed'
  );

  return {
    total,
    inserted,
    updated,
    skipped,
    failed,
    results,
  };
}

// ============================================
// Idempotency
// ============================================

/**
 * Resolve idempotency - check if we should create a new job
 */
export async function resolvePublishJobIdempotency(
  productId: string,
  contentId: string,
  channel: PublishingChannel,
  options?: PersistenceOptions,
  repository?: PublishJobRepository
): Promise<{
  shouldCreate: boolean;
  existingJobId?: string;
  reason?: string;
}> {
  const repo = repository ?? getPublishJobRepository();
  const opts = { ...DEFAULT_PERSISTENCE_OPTIONS, ...options };

  if (!opts.skipIfExists && !opts.updateIfBetter) {
    return { shouldCreate: true };
  }

  const existingJob = await repo.findEquivalentPendingOrScheduledJob(
    productId,
    contentId,
    channel
  );

  if (existingJob) {
    return {
      shouldCreate: false,
      existingJobId: existingJob.id,
      reason: `Equivalent job already exists with status: ${existingJob.status}`,
    };
  }

  return { shouldCreate: true };
}

// ============================================
// Mapping
// ============================================

/**
 * Map prepared payload to publish job record input
 */
export function mapPreparedPayloadToPublishJobRecord(
  payload: ChannelPublishPayload,
  options?: {
    status?: 'pending' | 'scheduled';
    scheduledAt?: Date;
    priority?: number;
    idempotencyKey?: string;
  }
): PublishJobRecordInput {
  return {
    productId: payload.productId,
    contentId: payload.contentId,
    channel: payload.channel,
    status: options?.scheduledAt ? 'scheduled' : (options?.status ?? 'pending'),
    scheduledAt: options?.scheduledAt,
    priority: options?.priority ?? 0,
    payload,
    idempotencyKey: options?.idempotencyKey,
    sourceMetadata: {
      platform: payload.source.platform,
      aiModel: payload.source.aiModel,
      promptVersion: payload.source.promptVersion,
      confidenceScore: payload.source.confidenceScore,
    },
  };
}

// ============================================
// Private Helpers
// ============================================

/**
 * Generate idempotency key for a publish job
 */
function generateIdempotencyKey(input: PublishJobRecordInput): string {
  return `publish:${input.productId}:${input.contentId}:${input.channel}`;
}

/**
 * Map input to database record format
 */
function mapToJobRecord(
  input: PublishJobRecordInput,
  idempotencyKey?: string
): {
  product_id: string;
  content_id: string;
  channel: PublishingChannel;
  status: 'pending' | 'scheduled';
  scheduled_at?: string;
  priority: number;
  payload: ChannelPublishPayload;
  idempotency_key?: string;
  source_metadata: Record<string, unknown>;
} {
  return {
    product_id: input.productId,
    content_id: input.contentId,
    channel: input.channel,
    status: input.status,
    scheduled_at: input.scheduledAt?.toISOString(),
    priority: input.priority ?? 0,
    payload: input.payload,
    idempotency_key: idempotencyKey,
    source_metadata: input.sourceMetadata ?? {},
  };
}
