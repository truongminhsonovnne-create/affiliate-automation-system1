/**
 * Dead Letter Repository
 *
 * Database persistence for dead letter items.
 */

import { createLogger } from '../logger/structuredLogger.js';
import type { DeadLetterItem, DeadLetterStatus } from '../types.js';
import { DEAD_LETTER_RETENTION_DAYS } from '../constants.js';

const logger = createLogger({ subsystem: 'dead_letter_repository' });

/** Supabase client (lazy loaded) */
let supabase: any = null;

/**
 * Initialize Supabase client
 */
async function getClient() {
  if (!supabase) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase not configured');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

/**
 * Create dead_letter_jobs table if not exists
 */
export async function initializeTable(): Promise<void> {
  try {
    const client = await getClient();

    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.dead_letter_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_job_id UUID,
        channel TEXT,
        operation TEXT NOT NULL,
        payload JSONB DEFAULT '{}',
        error_code TEXT,
        error_message TEXT NOT NULL,
        error_category TEXT,
        attempt_count INTEGER NOT NULL DEFAULT 1,
        last_attempt_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'quarantined',
        resolution TEXT,
        resolved_at TIMESTAMPTZ,
        resolved_by TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dead_letter_jobs_original_job_id ON public.dead_letter_jobs(original_job_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dead_letter_jobs_status ON public.dead_letter_jobs(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dead_letter_jobs_operation ON public.dead_letter_jobs(operation)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dead_letter_jobs_created_at ON public.dead_letter_jobs(created_at DESC)
    `);

    logger.info('Dead letter jobs table initialized');
  } catch (err) {
    logger.error('Failed to initialize dead letter jobs table', err as Error);
  }
}

/**
 * Save dead letter item
 */
export async function save(item: DeadLetterItem): Promise<void> {
  try {
    const client = await getClient();

    await client.from('dead_letter_jobs').insert({
      original_job_id: item.originalJobId,
      channel: item.channel,
      operation: item.operation,
      payload: item.payload,
      error_code: item.errorCode,
      error_message: item.errorMessage,
      error_category: item.errorCategory,
      attempt_count: item.attemptCount,
      last_attempt_at: item.lastAttemptAt,
      status: item.status,
      resolution: item.resolution,
      resolved_at: item.resolvedAt,
      resolved_by: item.resolvedBy,
      metadata: item.metadata,
      created_at: item.createdAt,
    });

    logger.debug('Dead letter item saved', { id: item.id, operation: item.operation });
  } catch (err) {
    logger.error('Failed to save dead letter item', err as Error);
  }
}

/**
 * Find by ID
 */
export async function findById(id: string): Promise<DeadLetterItem | null> {
  try {
    const client = await getClient();

    const { data, error } = await client
      .from('dead_letter_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error('Failed to find dead letter item', error);
      return null;
    }

    return mapRowToItem(data);
  } catch (err) {
    logger.error('Failed to find dead letter item', err as Error);
    return null;
  }
}

/**
 * Find by original job ID
 */
export async function findByJobId(jobId: string): Promise<DeadLetterItem | null> {
  try {
    const client = await getClient();

    const { data, error } = await client
      .from('dead_letter_jobs')
      .select('*')
      .eq('original_job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error('Failed to find dead letter by job ID', error);
      return null;
    }

    return mapRowToItem(data);
  } catch (err) {
    logger.error('Failed to find dead letter by job ID', err as Error);
    return null;
  }
}

/**
 * Find by status
 */
export async function findByStatus(status: DeadLetterStatus, limit: number = 100): Promise<DeadLetterItem[]> {
  try {
    const client = await getClient();

    const { data, error } = await client
      .from('dead_letter_jobs')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to find dead letter by status', error);
      return [];
    }

    return (data || []).map(mapRowToItem);
  } catch (err) {
    logger.error('Failed to find dead letter by status', err as Error);
    return [];
  }
}

/**
 * Find all with filters
 */
export async function findAll(filter?: {
  status?: DeadLetterStatus;
  operation?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}): Promise<DeadLetterItem[]> {
  try {
    const client = await getClient();

    let query = client
      .from('dead_letter_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    if (filter?.operation) {
      query = query.eq('operation', filter.operation);
    }

    if (filter?.since) {
      query = query.gte('created_at', filter.since);
    }

    if (filter?.until) {
      query = query.lte('created_at', filter.until);
    }

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to find all dead letters', error);
      return [];
    }

    return (data || []).map(mapRowToItem);
  } catch (err) {
    logger.error('Failed to find all dead letters', err as Error);
    return [];
  }
}

/**
 * Update status
 */
export async function updateStatus(
  id: string,
  status: DeadLetterStatus,
  resolution?: string
): Promise<void> {
  try {
    const client = await getClient();

    const update: any = { status };

    if (resolution) {
      update.resolution = resolution;
    }

    if (status === 'resolved' || status === 'discarded') {
      update.resolved_at = new Date().toISOString();
    }

    await client
      .from('dead_letter_jobs')
      .update(update)
      .eq('id', id);

    logger.debug('Dead letter status updated', { id, status });
  } catch (err) {
    logger.error('Failed to update dead letter status', err as Error);
  }
}

/**
 * Delete item
 */
export async function deleteItem(id: string): Promise<void> {
  try {
    const client = await getClient();

    await client
      .from('dead_letter_jobs')
      .delete()
      .eq('id', id);

    logger.debug('Dead letter item deleted', { id });
  } catch (err) {
    logger.error('Failed to delete dead letter item', err as Error);
  }
}

/**
 * Delete old items
 */
export async function deleteOld(daysOld: number = DEAD_LETTER_RETENTION_DAYS): Promise<number> {
  try {
    const client = await getClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { count, error } = await client
      .from('dead_letter_jobs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .in('status', ['resolved', 'discarded'])
      .select('id', { count: 'exact', head: true });

    if (error) {
      logger.error('Failed to delete old dead letters', error);
      return 0;
    }

    if (count && count > 0) {
      logger.info(`Deleted ${count} old dead letter items`);
    }

    return count || 0;
  } catch (err) {
    logger.error('Failed to delete old dead letters', err as Error);
    return 0;
  }
}

/**
 * Get counts by status
 */
export async function getCountsByStatus(): Promise<Record<DeadLetterStatus, number>> {
  try {
    const client = await getClient();

    const { data, error } = await client
      .from('dead_letter_jobs')
      .select('status', { count: 'exact', head: true });

    if (error) {
      logger.error('Failed to get dead letter counts', error);
      return { quarantined: 0, review: 0, resolved: 0, discarded: 0 };
    }

    // Group by status manually
    const all = await findAll({ limit: 10000 });
    const counts: Record<DeadLetterStatus, number> = {
      quarantined: 0,
      review: 0,
      resolved: 0,
      discarded: 0,
    };

    for (const item of all) {
      counts[item.status]++;
    }

    return counts;
  } catch (err) {
    logger.error('Failed to get dead letter counts', err as Error);
    return { quarantined: 0, review: 0, resolved: 0, discarded: 0 };
  }
}

/**
 * Map database row to DeadLetterItem
 */
function mapRowToItem(row: any): DeadLetterItem {
  return {
    id: row.id,
    originalJobId: row.original_job_id,
    channel: row.channel,
    operation: row.operation,
    payload: row.payload,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    errorCategory: row.error_category,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    status: row.status,
    resolution: row.resolution,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}
