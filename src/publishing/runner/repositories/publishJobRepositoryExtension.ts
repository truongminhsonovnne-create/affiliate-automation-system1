/**
 * Publish Job Repository Extension
 *
 * Extended methods for publisher runner (claiming, locking, retry)
 * These are added to work with the existing repository structure
 */

import { getSupabaseClient } from '../../../db/supabaseClient.js';
import { debug, error as logError, info } from '../../../utils/logger.js';
import type { PublishingChannel } from '../../types.js';

// ============================================
// Extended Repository
// ============================================

/**
 * Extended publish job repository with runner methods
 */
export class ExtendedPublishJobRepository {
  private tableName = 'publish_jobs';

  /**
   * Atomically claim a job (for distributed locking)
   */
  async claimJobAtomic(
    jobId: string,
    workerId: string,
    claimedAt: Date,
    lockExpiresAt: Date
  ): Promise<boolean> {
    try {
      const client = getSupabaseClient();

      // Use a conditional update - only succeeds if job is not claimed or lock has expired
      const { data, error } = await client
        .from(this.tableName)
        .update({
          status: 'publishing',
          claimed_by: workerId,
          claimed_at: claimedAt.toISOString(),
          lock_expires_at: lockExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .in('status', ['pending', 'scheduled', 'ready'])
        .or(
          `claimed_at.is.null,lock_expires_at.lt.${new Date().toISOString()}`
        )
        .select()
        .single();

      if (error || !data) {
        // Could not claim - another worker got it
        return false;
      }

      return true;
    } catch (err) {
      debug('Error claiming job', { jobId, error: err });
      return false;
    }
  }

  /**
   * Release a job claim
   */
  async releaseJobClaim(jobId: string): Promise<boolean> {
    try {
      const client = getSupabaseClient();

      const { error } = await client
        .from(this.tableName)
        .update({
          status: 'ready',
          claimed_by: null,
          claimed_at: null,
          lock_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (error) {
        return false;
      }

      return true;
    } catch (err) {
      debug('Error releasing job claim', { jobId, error: err });
      return false;
    }
  }

  /**
   * Refresh job lock (extend expiration)
   */
  async refreshJobLock(
    jobId: string,
    workerId: string,
    newLockExpiresAt: Date
  ): Promise<boolean> {
    try {
      const client = getSupabaseClient();

      const { error } = await client
        .from(this.tableName)
        .update({
          lock_expires_at: newLockExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .eq('claimed_by', workerId);

      if (error) {
        return false;
      }

      return true;
    } catch (err) {
      debug('Error refreshing job lock', { jobId, error: err });
      return false;
    }
  }

  /**
   * Get retry-eligible jobs
   */
  async getRetryEligibleJobs(filters?: {
    channel?: PublishingChannel;
    limit?: number;
  }): Promise<any[]> {
    try {
      const client = getSupabaseClient();

      let query = client
        .from(this.tableName)
        .select('*')
        .eq('status', 'failed')
        .eq('attempt_count', 1) // First failure
        .or('next_retry_at.is.null,next_retry_at.lt.' + new Date().toISOString())
        .order('priority', { ascending: false })
        .order('next_retry_at', { ascending: true });

      if (filters?.channel) {
        query = query.eq('channel', filters.channel);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        debug('Error getting retry-eligible jobs', { error });
        return [];
      }

      return data ?? [];
    } catch (err) {
      debug('Error getting retry-eligible jobs', { error: err });
      return [];
    }
  }

  /**
   * Cleanup stale locks from dead workers
   */
  async cleanupStaleLocks(): Promise<number> {
    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from(this.tableName)
        .update({
          status: 'ready',
          claimed_by: null,
          claimed_at: null,
          lock_expires_at: null,
        })
        .eq('claimed_at', true) // This is simplified
        .lt('lock_expires_at', new Date().toISOString())
        .select();

      if (error) {
        return 0;
      }

      return data?.length ?? 0;
    } catch (err) {
      debug('Error cleaning stale locks', { error: err });
      return 0;
    }
  }

  /**
   * Update job with full lifecycle fields
   */
  async updateJobLifecycle(
    jobId: string,
    updates: {
      status?: string;
      published_url?: string;
      external_post_id?: string;
      next_retry_at?: Date;
      error_message?: string;
      execution_metadata?: Record<string, unknown>;
    }
  ): Promise<boolean> {
    try {
      const client = getSupabaseClient();

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.status) {
        updateData.status = updates.status;
      }
      if (updates.published_url) {
        updateData.published_url = updates.published_url;
      }
      if (updates.external_post_id) {
        updateData.external_post_id = updates.external_post_id;
      }
      if (updates.next_retry_at) {
        updateData.next_retry_at = updates.next_retry_at.toISOString();
      }
      if (updates.error_message) {
        updateData.error_message = updates.error_message;
      }
      if (updates.execution_metadata) {
        updateData.execution_metadata = updates.execution_metadata;
      }

      const { error } = await client
        .from(this.tableName)
        .update(updateData)
        .eq('id', jobId);

      if (error) {
        debug('Error updating job lifecycle', { jobId, error });
        return false;
      }

      return true;
    } catch (err) {
      debug('Error updating job lifecycle', { jobId, error: err });
      return false;
    }
  }
}

// Singleton instance
let extendedRepoInstance: ExtendedPublishJobRepository | null = null;

export function getExtendedPublishJobRepository(): ExtendedPublishJobRepository {
  if (!extendedRepoInstance) {
    extendedRepoInstance = new ExtendedPublishJobRepository();
  }
  return extendedRepoInstance;
}

export default ExtendedPublishJobRepository;
