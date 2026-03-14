/**
 * Crawl Job Repository
 *
 * Database operations for crawl_jobs table
 */

import { getSupabaseClient } from '../supabaseClient.js';
import { log } from '../../utils/logger.js';
import type { CrawlJob, CreateCrawlJobDTO, UpdateCrawlJobDTO } from '../../types/database.js';

// ============================================
// Constants
// ============================================

const TABLE_NAME = 'crawl_jobs';

// ============================================
// Repository Class
// ============================================

export class CrawlJobRepository {
  private tableName = TABLE_NAME;

  // ============================================
  // Insert Operations
  // ============================================

  /**
   * Create a new crawl job
   */
  async createCrawlJob(data: CreateCrawlJobDTO): Promise<CrawlJob | null> {
    try {
      const client = getSupabaseClient();

      const insertData = {
        platform: data.platform,
        source_type: data.source_type,
        source_keyword: data.source_keyword || null,
        status: data.status || 'pending',
        items_found: 0,
        items_crawled: 0,
        items_failed: 0,
        error_message: null,
        started_at: new Date().toISOString(),
        finished_at: null,
      };

      const { data: result, error } = await client
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        log.error({ error, platform: data.platform }, 'Failed to create crawl job');
        return null;
      }

      log.debug({ id: result.id, platform: data.platform }, 'Crawl job created');
      return result as CrawlJob;
    } catch (error) {
      log.error({ error }, 'Error creating crawl job');
      return null;
    }
  }

  // ============================================
  // Query Operations
  // ============================================

  /**
   * Find job by ID
   */
  async findById(id: string): Promise<CrawlJob | null> {
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

      return data as CrawlJob;
    } catch (error) {
      log.error({ error, id }, 'Error finding job by ID');
      return null;
    }
  }

  /**
   * Find jobs by status
   */
  async findByStatus(status: string, limit: number = 10): Promise<CrawlJob[]> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        log.error({ error, status }, 'Failed to fetch jobs by status');
        return [];
      }

      return (data || []) as CrawlJob[];
    } catch (error) {
      log.error({ error, status }, 'Error fetching jobs by status');
      return [];
    }
  }

  /**
   * Find latest job by platform and source
   */
  async findLatest(
    platform: string,
    sourceType: string,
    sourceKeyword?: string
  ): Promise<CrawlJob | null> {
    try {
      const client = getSupabaseClient();
      let query = client
        .from(this.tableName)
        .select('*')
        .eq('platform', platform)
        .eq('source_type', sourceType)
        .order('created_at', { ascending: false })
        .limit(1);

      if (sourceKeyword) {
        query = query.eq('source_keyword', sourceKeyword);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return null;
      }

      return data as CrawlJob;
    } catch (error) {
      return null;
    }
  }

  /**
   * Find pending jobs
   */
  async findPendingJobs(limit: number = 10): Promise<CrawlJob[]> {
    return this.findByStatus('pending', limit);
  }

  // ============================================
  // Update Operations
  // ============================================

  /**
   * Update job by ID
   */
  async updateById(id: string, updateData: UpdateCrawlJobDTO): Promise<boolean> {
    try {
      const client = getSupabaseClient();

      const dataToUpdate: Record<string, unknown> = { ...updateData };

      // Handle finished_at
      if (updateData.finished_at) {
        dataToUpdate.finished_at = updateData.finished_at instanceof Date
          ? updateData.finished_at.toISOString()
          : updateData.finished_at;
      }

      const { error } = await client
        .from(this.tableName)
        .update(dataToUpdate)
        .eq('id', id);

      if (error) {
        log.error({ error, id }, 'Failed to update crawl job');
        return false;
      }

      return true;
    } catch (error) {
      log.error({ error, id }, 'Error updating crawl job');
      return false;
    }
  }

  /**
   * Mark crawl job as running
   */
  async markCrawlJobRunning(jobId: string): Promise<boolean> {
    return this.updateById(jobId, { status: 'running' });
  }

  /**
   * Mark crawl job as success
   */
  async markCrawlJobSuccess(
    jobId: string,
    itemsFound: number,
    itemsCrawled: number = 0,
    itemsFailed: number = 0
  ): Promise<boolean> {
    return this.updateById(jobId, {
      status: 'completed',
      items_found: itemsFound,
      items_crawled: itemsCrawled,
      items_failed: itemsFailed,
      finished_at: new Date(),
    });
  }

  /**
   * Mark crawl job as failed
   */
  async markCrawlJobFailed(jobId: string, errorMessage: string): Promise<boolean> {
    return this.updateById(jobId, {
      status: 'failed',
      error_message: errorMessage,
      finished_at: new Date(),
    });
  }

  /**
   * Update job progress
   */
  async updateJobProgress(
    jobId: string,
    itemsFound: number,
    itemsCrawled: number,
    itemsFailed: number
  ): Promise<boolean> {
    return this.updateById(jobId, {
      items_found: itemsFound,
      items_crawled: itemsCrawled,
      items_failed: itemsFailed,
    });
  }

  // ============================================
  // Delete Operations
  // ============================================

  /**
   * Delete job by ID
   */
  async deleteById(id: string): Promise<boolean> {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        log.error({ error, id }, 'Failed to delete crawl job');
        return false;
      }

      return true;
    } catch (error) {
      log.error({ error, id }, 'Error deleting crawl job');
      return false;
    }
  }

  // ============================================
  // Utility Operations
  // ============================================

  /**
   * Count jobs
   */
  async count(): Promise<number> {
    try {
      const client = getSupabaseClient();
      const { count, error } = await client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        log.error({ error }, 'Failed to count jobs');
        return 0;
      }

      return count || 0;
    } catch (error) {
      log.error({ error }, 'Error counting jobs');
      return 0;
    }
  }

  /**
   * Count jobs by status
   */
  async countByStatus(status: string): Promise<number> {
    try {
      const client = getSupabaseClient();
      const { count, error } = await client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('status', status);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

let repositoryInstance: CrawlJobRepository | null = null;

export function getCrawlJobRepository(): CrawlJobRepository {
  if (!repositoryInstance) {
    repositoryInstance = new CrawlJobRepository();
  }
  return repositoryInstance;
}

// ============================================
// Convenience Functions
// ============================================

export async function createCrawlJob(data: CreateCrawlJobDTO): Promise<CrawlJob | null> {
  return getCrawlJobRepository().createCrawlJob(data);
}

export async function markCrawlJobSuccess(
  jobId: string,
  itemsFound: number,
  itemsCrawled?: number,
  itemsFailed?: number
): Promise<boolean> {
  return getCrawlJobRepository().markCrawlJobSuccess(jobId, itemsFound, itemsCrawled, itemsFailed);
}

export async function markCrawlJobFailed(
  jobId: string,
  errorMessage: string
): Promise<boolean> {
  return getCrawlJobRepository().markCrawlJobFailed(jobId, errorMessage);
}

export default CrawlJobRepository;
