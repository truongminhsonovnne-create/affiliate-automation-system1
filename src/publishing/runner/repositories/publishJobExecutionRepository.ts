/**
 * Publish Job Execution Repository
 *
 * Database operations for publish_job_attempts table
 */

import { getSupabaseClient } from '../../../db/supabaseClient.js';
import { info, debug, error as logError } from '../../../utils/logger.js';
import type { PublishAttemptRecordInput } from '../types.js';

// ============================================
// Types
// ============================================

/**
 * Attempt record from database
 */
export interface PublishAttemptRecord {
  id: string;
  publish_job_id: string;
  attempt_number: number;
  channel: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  error_code: string | null;
  error_category: string | null;
  response_metadata: Record<string, unknown> | null;
  published_url: string | null;
  external_post_id: string | null;
  worker_identity: string | null;
  created_at: string;
}

// ============================================
// Repository Class
// ============================================

export class PublishAttemptRepository {
  private tableName = 'publish_job_attempts';

  /**
   * Insert a new attempt record
   */
  async insertPublishAttempt(input: PublishAttemptRecordInput): Promise<string | null> {
    try {
      const client = getSupabaseClient();

      const insertData = {
        publish_job_id: input.publishJobId,
        attempt_number: input.attemptNumber,
        channel: input.channel,
        status: input.status,
        started_at: input.startedAt.toISOString(),
        finished_at: input.finishedAt?.toISOString() ?? null,
        duration_ms: input.durationMs ?? null,
        error_message: input.errorMessage ?? null,
        error_code: input.errorCode ?? null,
        error_category: input.errorCategory ?? null,
        response_metadata: input.responseMetadata ?? null,
        published_url: input.publishedUrl ?? null,
        external_post_id: input.externalPostId ?? null,
        worker_identity: input.workerIdentity ?? null,
      };

      const { data, error } = await client
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        logError({ error, jobId: input.publishJobId }, 'Failed to insert attempt record');
        return null;
      }

      debug({ attemptId: data.id, jobId: input.publishJobId }, 'Attempt record inserted');
      return data.id;
    } catch (err) {
      logError({ err, jobId: input.publishJobId }, 'Error inserting attempt record');
      return null;
    }
  }

  /**
   * Get attempts for a job
   */
  async getAttemptsForJob(jobId: string): Promise<PublishAttemptRecord[]> {
    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('publish_job_id', jobId)
        .order('attempt_number', { ascending: true });

      if (error) {
        logError({ error, jobId }, 'Failed to get attempts for job');
        return [];
      }

      return (data ?? []) as PublishAttemptRecord[];
    } catch (err) {
      logError({ err, jobId }, 'Error getting attempts for job');
      return [];
    }
  }

  /**
   * Get latest attempt for a job
   */
  async getLatestAttemptForJob(jobId: string): Promise<PublishAttemptRecord | null> {
    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('publish_job_id', jobId)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return data as PublishAttemptRecord;
    } catch (err) {
      return null;
    }
  }

  /**
   * Get attempt count for a job
   */
  async getAttemptCount(jobId: string): Promise<number> {
    try {
      const client = getSupabaseClient();

      const { count, error } = await client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('publish_job_id', jobId);

      if (error) {
        return 0;
      }

      return count ?? 0;
    } catch (err) {
      return 0;
    }
  }

  /**
   * Get failed attempts for analytics
   */
  async getFailedAttempts(options?: {
    channel?: string;
    limit?: number;
    since?: Date;
  }): Promise<PublishAttemptRecord[]> {
    try {
      const client = getSupabaseClient();

      let query = client
        .from(this.tableName)
        .select('*')
        .eq('status', 'failed')
        .order('created_at', { ascending: false });

      if (options?.channel) {
        query = query.eq('channel', options.channel);
      }

      if (options?.since) {
        query = query.gte('created_at', options.since.toISOString());
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        logError({ error }, 'Failed to get failed attempts');
        return [];
      }

      return (data ?? []) as PublishAttemptRecord[];
    } catch (err) {
      logError({ err }, 'Error getting failed attempts');
      return [];
    }
  }

  /**
   * Get success rate by channel
   */
  async getSuccessRateByChannel(): Promise<Record<string, { total: number; succeeded: number; rate: number }>> {
    try {
      const client = getSupabaseClient();

      // This would be better done with a SQL view or RPC
      // For now, return empty - would need aggregation query
      return {};
    } catch (err) {
      return {};
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

let repositoryInstance: PublishAttemptRepository | null = null;

export function getPublishAttemptRepository(): PublishAttemptRepository {
  if (!repositoryInstance) {
    repositoryInstance = new PublishAttemptRepository();
  }
  return repositoryInstance;
}

export default PublishAttemptRepository;
