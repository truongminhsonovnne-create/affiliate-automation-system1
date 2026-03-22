/**
 * Shopee Pipeline - Job Lifecycle Management
 *
 * Manages crawl job lifecycle with Supabase integration.
 */

import type { PipelineLogger } from './types.js';
import type { CrawlJobRepository } from '../../repositories/crawlJobRepository.js';

export interface CrawlJobRecord {
  id?: string;
  source_type: string;
  source_keyword?: string;
  status: 'pending' | 'started' | 'running' | 'success' | 'partial_success' | 'failed';
  total_items?: number;
  processed_items?: number;
  success_items?: number;
  failed_items?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Build crawl job payload for creation
 */
export function buildCrawlJobPayload(
  sourceType: string,
  options: {
    keyword?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Partial<CrawlJobRecord> {
  return {
    source_type: sourceType,
    source_keyword: options.keyword,
    status: 'pending',
    total_items: 0,
    processed_items: 0,
    success_items: 0,
    failed_items: 0,
    metadata: options.metadata || {},
  };
}

/**
 * Start Shopee crawl job
 */
export async function startShopeeCrawlJob(
  repository: CrawlJobRepository,
  sourceType: string,
  options: {
    keyword?: string;
    metadata?: Record<string, unknown>;
    logger?: PipelineLogger;
  } = {}
): Promise<{
  ok: boolean;
  jobId?: string;
  error?: string;
}> {
  const { keyword, metadata, logger } = options;

  try {
    const payload = buildCrawlJobPayload(sourceType, { keyword, metadata });

    const job = await repository.create(payload);

    logger?.info('Crawl job started', {
      jobId: job.id,
      sourceType,
      keyword,
    });

    return {
      ok: true,
      jobId: job.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error('Failed to start crawl job', { error: errorMessage });
    return {
      ok: false,
      error: errorMessage,
    };
  }
}

/**
 * Mark Shopee crawl job as started
 */
export async function markShopeeCrawlJobStarted(
  repository: CrawlJobRepository,
  jobId: string,
  options: {
    logger?: PipelineLogger;
  } = {}
): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { logger } = options;

  try {
    await repository.updateStatus(jobId, 'started', {
      started_at: new Date().toISOString(),
    });

    logger?.debug('Crawl job marked as started', { jobId });

    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error('Failed to mark job as started', { jobId, error: errorMessage });
    return { ok: false, error: errorMessage };
  }
}

/**
 * Mark Shopee crawl job as success
 */
export async function markShopeeCrawlJobSuccess(
  repository: CrawlJobRepository,
  jobId: string,
  options: {
    totalItems?: number;
    processedItems?: number;
    successItems?: number;
    failedItems?: number;
    metadata?: Record<string, unknown>;
    logger?: PipelineLogger;
  } = {}
): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { totalItems, processedItems, successItems, failedItems, metadata, logger } = options;

  try {
    await repository.updateStatus(jobId, 'success', {
      total_items: totalItems,
      processed_items: processedItems,
      success_items: successItems,
      failed_items: failedItems,
      completed_at: new Date().toISOString(),
      metadata,
    });

    logger?.info('Crawl job completed successfully', {
      jobId,
      totalItems,
      successItems,
    });

    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error('Failed to mark job as success', { jobId, error: errorMessage });
    return { ok: false, error: errorMessage };
  }
}

/**
 * Mark Shopee crawl job as partial success
 */
export async function markShopeeCrawlJobPartialSuccess(
  repository: CrawlJobRepository,
  jobId: string,
  options: {
    totalItems?: number;
    processedItems?: number;
    successItems?: number;
    failedItems?: number;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
    logger?: PipelineLogger;
  } = {}
): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { totalItems, processedItems, successItems, failedItems, errorMessage, metadata, logger } = options;

  try {
    await repository.updateStatus(jobId, 'partial_success', {
      total_items: totalItems,
      processed_items: processedItems,
      success_items: successItems,
      failed_items: failedItems,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
      metadata,
    });

    logger?.warn('Crawl job completed with partial success', {
      jobId,
      successItems,
      failedItems,
    });

    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error('Failed to mark job as partial success', { jobId, error: errorMessage });
    return { ok: false, error: errorMessage };
  }
}

/**
 * Mark Shopee crawl job as failed
 */
export async function markShopeeCrawlJobFailed(
  repository: CrawlJobRepository,
  jobId: string,
  options: {
    errorMessage: string;
    metadata?: Record<string, unknown>;
    logger?: PipelineLogger;
  } = {}
): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { errorMessage, metadata, logger } = options;

  try {
    await repository.updateStatus(jobId, 'failed', {
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
      metadata,
    });

    logger?.error('Crawl job failed', {
      jobId,
      error: errorMessage,
    });

    return { ok: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger?.error('Failed to mark job as failed', { jobId, error: errorMsg });
    return { ok: false, error: errorMsg };
  }
}

/**
 * Update crawl job progress
 */
export async function updateShopeeCrawlJobProgress(
  repository: CrawlJobRepository,
  jobId: string,
  options: {
    processedItems?: number;
    successItems?: number;
    failedItems?: number;
    metadata?: Record<string, unknown>;
    logger?: PipelineLogger;
  } = {}
): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { processedItems, successItems, failedItems, metadata, logger } = options;

  try {
    await repository.update(jobId, {
      processed_items: processedItems,
      success_items: successItems,
      failed_items: failedItems,
      metadata,
    });

    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.debug('Failed to update job progress', { jobId, error: errorMessage });
    return { ok: false, error: errorMessage };
  }
}
