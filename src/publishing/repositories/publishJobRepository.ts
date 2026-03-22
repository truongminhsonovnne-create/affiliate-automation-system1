/**
 * Publish Job Repository
 *
 * Database operations for publish_jobs table
 */

import { getSupabaseClient } from '../../db/supabaseClient.js';
import { log, info, warn, error, debug } from '../../utils/logger.js';
import type { PublishingChannel, PublishJobStatus } from '../types.js';

// ============================================
// Types
// ============================================

/**
 * Database row type for publish_jobs
 */
export interface PublishJobRecord {
  id: string;
  product_id: string;
  content_id: string;
  channel: string;
  status: string;
  scheduled_at: string | null;
  ready_at: string | null;
  published_at: string | null;
  priority: number;
  payload: Record<string, unknown>;
  error_message: string | null;
  attempt_count: number;
  idempotency_key: string | null;
  source_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a publish job
 */
export interface CreatePublishJobInput {
  product_id: string;
  content_id: string;
  channel: PublishingChannel;
  status: PublishJobStatus;
  scheduled_at?: string | Date;
  priority?: number;
  payload: Record<string, unknown>;
  idempotency_key?: string;
  source_metadata?: Record<string, unknown>;
}

/**
 * Filters for querying publish jobs
 */
export interface PublishJobFilters {
  channel?: PublishingChannel;
  status?: PublishJobStatus | PublishJobStatus[];
  scheduled_from?: string | Date;
  scheduled_to?: string | Date;
  product_id?: string;
  content_id?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// Repository Class
// ============================================

export class PublishJobRepository {
  private tableName = 'publish_jobs';

  // ============================================
  // Insert Operations
  // ============================================

  /**
   * Insert a single publish job
   */
  async insertPublishJob(data: CreatePublishJobInput): Promise<PublishJobRecord | null> {
    try {
      const client = getSupabaseClient();

      const insertData = {
        product_id: data.product_id,
        content_id: data.content_id,
        channel: data.channel,
        status: data.status,
        scheduled_at: data.scheduled_at
          ? new Date(data.scheduled_at).toISOString()
          : null,
        priority: data.priority ?? 0,
        payload: data.payload,
        idempotency_key: data.idempotency_key ?? null,
        source_metadata: data.source_metadata ?? {},
      };

      const { data: result, error } = await client
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        error({ error, channel: data.channel }, 'Failed to insert publish job');
        return null;
      }

      debug({ jobId: result.id, channel: result.channel }, 'Publish job inserted');
      return result as PublishJobRecord;
    } catch (error) {
      error({ error }, 'Error inserting publish job');
      return null;
    }
  }

  /**
   * Insert multiple publish jobs
   */
  async insertManyPublishJobs(
    jobs: CreatePublishJobInput[]
  ): Promise<number> {
    if (jobs.length === 0) {
      return 0;
    }

    try {
      const client = getSupabaseClient();

      const insertData = jobs.map((job) => ({
        product_id: job.product_id,
        content_id: job.content_id,
        channel: job.channel,
        status: job.status,
        scheduled_at: job.scheduled_at
          ? new Date(job.scheduled_at).toISOString()
          : null,
        priority: job.priority ?? 0,
        payload: job.payload,
        idempotency_key: job.idempotency_key ?? null,
        source_metadata: job.source_metadata ?? {},
      }));

      const { data, error } = await client
        .from(this.tableName)
        .insert(insertData)
        .select();

      if (error) {
        error({ error, count: jobs.length }, 'Failed to batch insert publish jobs');
        return 0;
      }

      const insertedCount = data?.length ?? 0;
      info({ inserted: insertedCount, requested: jobs.length }, 'Batch insert publish jobs');

      return insertedCount;
    } catch (error) {
      error({ error }, 'Error batch inserting publish jobs');
      return 0;
    }
  }

  // ============================================
  // Query Operations
  // ============================================

  /**
   * Find publish job by ID
   */
  async findById(id: string): Promise<PublishJobRecord | null> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return data as PublishJobRecord;
    } catch (error) {
      error({ error, id }, 'Error finding publish job by ID');
      return null;
    }
  }

  /**
   * Find equivalent pending or scheduled job (for idempotency)
   */
  async findEquivalentPendingOrScheduledJob(
    productId: string,
    contentId: string,
    channel: PublishingChannel
  ): Promise<PublishJobRecord | null> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('product_id', productId)
        .eq('content_id', contentId)
        .eq('channel', channel)
        .in('status', ['pending', 'scheduled', 'ready'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return data as PublishJobRecord;
    } catch (error) {
      // No equivalent job found - this is fine for idempotency
      return null;
    }
  }

  /**
   * Get scheduled publish jobs
   */
  async getScheduledPublishJobs(filters?: PublishJobFilters): Promise<PublishJobRecord[]> {
    try {
      const client = getSupabaseClient();
      let query = client.from(this.tableName).select('*');

      // Apply filters
      if (filters?.channel) {
        query = query.eq('channel', filters.channel);
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.scheduled_from) {
        query = query.gte(
          'scheduled_at',
          new Date(filters.scheduled_from).toISOString()
        );
      }

      if (filters?.scheduled_to) {
        query = query.lte(
          'scheduled_at',
          new Date(filters.scheduled_to).toISOString()
        );
      }

      if (filters?.product_id) {
        query = query.eq('product_id', filters.product_id);
      }

      if (filters?.content_id) {
        query = query.eq('content_id', filters.content_id);
      }

      // Order and limit
      query = query.order('scheduled_at', { ascending: true });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit ?? 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        error({ error, filters }, 'Failed to get scheduled publish jobs');
        return [];
      }

      return (data ?? []) as PublishJobRecord[];
    } catch (error) {
      error({ error }, 'Error getting scheduled publish jobs');
      return [];
    }
  }

  /**
   * Get ready publish jobs (jobs that should be published now)
   */
  async getReadyPublishJobs(filters?: {
    channel?: PublishingChannel;
    limit?: number;
  }): Promise<PublishJobRecord[]> {
    try {
      const client = getSupabaseClient();
      const now = new Date().toISOString();

      let query = client
        .from(this.tableName)
        .select('*')
        .in('status', ['ready', 'scheduled'])
        .or('scheduled_at.is.null,scheduled_at.lte.' + now)
        .order('priority', { ascending: false })
        .order('scheduled_at', { ascending: true });

      if (filters?.channel) {
        query = query.eq('channel', filters.channel);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        error({ error, filters }, 'Failed to get ready publish jobs');
        return [];
      }

      return (data ?? []) as PublishJobRecord[];
    } catch (error) {
      error({ error }, 'Error getting ready publish jobs');
      return [];
    }
  }

  /**
   * Count publish jobs by status
   */
  async countByStatus(status?: PublishJobStatus): Promise<number> {
    try {
      const client = getSupabaseClient();
      let query = client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { count, error } = await query;

      if (error) {
        error({ error, status }, 'Failed to count publish jobs');
        return 0;
      }

      return count ?? 0;
    } catch (error) {
      error({ error }, 'Error counting publish jobs');
      return 0;
    }
  }

  // ============================================
  // Update Operations
  // ============================================

  /**
   * Update publish job status
   */
  async updatePublishJobStatus(
    jobId: string,
    status: PublishJobStatus,
    fields?: {
      error_message?: string;
      attempt_count?: number;
      published_at?: Date;
      ready_at?: Date;
      scheduled_at?: Date;
      priority?: number;
      payload?: Record<string, unknown>;
    }
  ): Promise<boolean> {
    try {
      const client = getSupabaseClient();

      const updateData: Record<string, unknown> = { status };

      if (fields) {
        if (fields.error_message !== undefined) {
          updateData.error_message = fields.error_message;
        }
        if (fields.attempt_count !== undefined) {
          updateData.attempt_count = fields.attempt_count;
        }
        if (fields.published_at) {
          updateData.published_at = fields.published_at.toISOString();
        }
        if (fields.ready_at) {
          updateData.ready_at = fields.ready_at.toISOString();
        }
        if (fields.scheduled_at) {
          updateData.scheduled_at = fields.scheduled_at.toISOString();
        }
        if (fields.priority !== undefined) {
          updateData.priority = fields.priority;
        }
        if (fields.payload) {
          updateData.payload = fields.payload;
        }
      }

      const { error } = await client
        .from(this.tableName)
        .update(updateData)
        .eq('id', jobId);

      if (error) {
        error({ error, jobId, status }, 'Failed to update publish job status');
        return false;
      }

      debug({ jobId, status }, 'Publish job status updated');
      return true;
    } catch (error) {
      error({ error, jobId }, 'Error updating publish job status');
      return false;
    }
  }

  /**
   * Mark job as ready
   */
  async markJobReady(jobId: string): Promise<boolean> {
    return this.updatePublishJobStatus(jobId, 'ready', {
      ready_at: new Date(),
    });
  }

  /**
   * Mark job as publishing
   */
  async markJobPublishing(jobId: string, attemptCount: number): Promise<boolean> {
    return this.updatePublishJobStatus(jobId, 'publishing', {
      attempt_count: attemptCount + 1,
    });
  }

  /**
   * Mark job as published
   */
  async markJobPublished(jobId: string): Promise<boolean> {
    return this.updatePublishJobStatus(jobId, 'published', {
      published_at: new Date(),
    });
  }

  /**
   * Mark job as failed
   */
  async markJobFailed(jobId: string, errorMessage: string, attemptCount: number): Promise<boolean> {
    return this.updatePublishJobStatus(jobId, 'failed', {
      error_message: errorMessage,
      attempt_count: attemptCount,
    });
  }

  /**
   * Cancel a publish job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    return this.updatePublishJobStatus(jobId, 'cancelled');
  }

  // ============================================
  // Delete Operations
  // ============================================

  /**
   * Delete publish job by ID
   */
  async deleteById(id: string): Promise<boolean> {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        error({ error, id }, 'Failed to delete publish job');
        return false;
      }

      return true;
    } catch (error) {
      error({ error, id }, 'Error deleting publish job');
      return false;
    }
  }

  // ============================================
  // Utility Operations
  // ============================================

  /**
   * Generate idempotency key
   */
  generateIdempotencyKey(
    productId: string,
    contentId: string,
    channel: PublishingChannel
  ): string {
    return `publish:${productId}:${contentId}:${channel}`;
  }
}

// ============================================
// Singleton Instance
// ============================================

let repositoryInstance: PublishJobRepository | null = null;

export function getPublishJobRepository(): PublishJobRepository {
  if (!repositoryInstance) {
    repositoryInstance = new PublishJobRepository();
  }
  return repositoryInstance;
}

// ============================================
// Convenience Functions
// ============================================

export async function insertPublishJob(
  data: CreatePublishJobInput
): Promise<PublishJobRecord | null> {
  return getPublishJobRepository().insertPublishJob(data);
}

export async function findEquivalentPendingOrScheduledJob(
  productId: string,
  contentId: string,
  channel: PublishingChannel
): Promise<PublishJobRecord | null> {
  return getPublishJobRepository().findEquivalentPendingOrScheduledJob(
    productId,
    contentId,
    channel
  );
}

export async function getScheduledPublishJobs(
  filters?: PublishJobFilters
): Promise<PublishJobRecord[]> {
  return getPublishJobRepository().getScheduledPublishJobs(filters);
}

export async function getReadyPublishJobs(
  filters?: { channel?: PublishingChannel; limit?: number }
): Promise<PublishJobRecord[]> {
  return getPublishJobRepository().getReadyPublishJobs(filters);
}

export default PublishJobRepository;
