// =============================================================================
// Voucher Ingestion Run Repository
// Production-grade repository for voucher ingestion runs
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { VoucherIngestionRun, VoucherIngestionRunStatus } from '../types.js';
import { logger } from '../../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLE_NAME = 'voucher_ingestion_runs';

/**
 * Voucher Ingestion Run Repository
 */
export const voucherIngestionRunRepository = {
  /**
   * Find run by ID
   */
  async findById(id: string): Promise<VoucherIngestionRun | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error({ id, error }, 'Failed to find ingestion run');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Find runs by source ID
   */
  async findBySourceId(sourceId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<VoucherIngestionRun[]> {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('source_id', sourceId)
      .order('started_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ sourceId, error }, 'Failed to find ingestion runs by source');
      throw error;
    }

    return data.map(mapToDomain);
  },

  /**
   * Find latest run for a source
   */
  async findLatestBySourceId(sourceId: string): Promise<VoucherIngestionRun | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('source_id', sourceId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error({ sourceId, error }, 'Failed to find latest ingestion run');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Find runs by status
   */
  async findByStatus(status: VoucherIngestionRunStatus, options?: {
    limit?: number;
    offset?: number;
  }): Promise<VoucherIngestionRun[]> {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('run_status', status)
      .order('started_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ status, error }, 'Failed to find ingestion runs by status');
      throw error;
    }

    return data.map(mapToDomain);
  },

  /**
   * Find all runs with pagination
   */
  async findAll(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ runs: VoucherIngestionRun[]; total: number }> {
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact' });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query.order('started_at', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to find all ingestion runs');
      throw error;
    }

    return {
      runs: data.map(mapToDomain),
      total: count || 0,
    };
  },

  /**
   * Create a new run
   */
  async create(run: VoucherIngestionRun): Promise<VoucherIngestionRun> {
    const dbRun = mapToDb(run);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(dbRun)
      .select()
      .single();

    if (error) {
      logger.error({ run, error }, 'Failed to create ingestion run');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Update a run
   */
  async update(id: string, updates: Partial<VoucherIngestionRun>): Promise<VoucherIngestionRun> {
    const dbUpdates = mapToDb(updates);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ id, updates, error }, 'Failed to update ingestion run');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Delete runs older than a date
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .lt('created_at', date.toISOString())
      .select('id');

    if (error) {
      logger.error({ date, error }, 'Failed to delete old ingestion runs');
      throw error;
    }

    return data?.length || 0;
  },

  /**
   * Get run statistics
   */
  async getStatistics(): Promise<{
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    runningRuns: number;
    totalItemsProcessed: number;
  }> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('run_status, items_seen, items_inserted, items_updated, items_failed');

    if (error) {
      logger.error({ error }, 'Failed to get ingestion run statistics');
      throw error;
    }

    const stats = {
      totalRuns: data.length,
      completedRuns: 0,
      failedRuns: 0,
      runningRuns: 0,
      totalItemsProcessed: 0,
    };

    for (const run of data) {
      switch (run.run_status) {
        case 'completed':
        case 'completed_with_errors':
          stats.completedRuns++;
          break;
        case 'failed':
          stats.failedRuns++;
          break;
        case 'running':
          stats.runningRuns++;
          break;
      }
      stats.totalItemsProcessed += run.items_seen || 0;
    }

    return stats;
  },
};

// =============================================================================
// Mapping Functions
// =============================================================================

function mapToDomain(data: Record<string, unknown>): VoucherIngestionRun {
  return {
    id: data.id as string,
    sourceId: data.source_id as string,
    runStatus: data.run_status as VoucherIngestionRunStatus,
    itemsSeen: data.items_seen as number,
    itemsInserted: data.items_inserted as number,
    itemsUpdated: data.items_updated as number,
    itemsSkipped: data.items_skipped as number,
    itemsFailed: data.items_failed as number,
    errorSummary: data.error_summary as string | null,
    startedAt: new Date(data.started_at as string),
    finishedAt: data.finished_at ? new Date(data.finished_at as string) : null,
    createdAt: new Date(data.created_at as string),
  };
}

function mapToDb(run: Partial<VoucherIngestionRun>): Record<string, unknown> {
  return {
    source_id: run.sourceId,
    run_status: run.runStatus,
    items_seen: run.itemsSeen,
    items_inserted: run.itemsInserted,
    items_updated: run.itemsUpdated,
    items_skipped: run.itemsSkipped,
    items_failed: run.itemsFailed,
    error_summary: run.errorSummary,
    started_at: run.startedAt?.toISOString(),
    finished_at: run.finishedAt?.toISOString(),
  };
}
