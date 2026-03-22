/**
 * Heartbeat Repository
 *
 * Database persistence for worker heartbeats.
 */

import { createLogger } from '../logger/structuredLogger.js';
import type { WorkerHeartbeat } from '../types.js';

const logger = createLogger({ subsystem: 'heartbeat_repository' });

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
 * Create worker_heartbeats table if not exists
 */
export async function initializeTable(): Promise<void> {
  try {
    const client = await getClient();

    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.worker_heartbeats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        worker_id TEXT UNIQUE NOT NULL,
        worker_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'alive',
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        current_job_id TEXT,
        current_operation TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_worker_id ON public.worker_heartbeats(worker_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_status ON public.worker_heartbeats(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_last_seen_at ON public.worker_heartbeats(last_seen_at DESC)
    `);

    logger.info('Worker heartbeats table initialized');
  } catch (err) {
    logger.error('Failed to initialize worker heartbeats table', err as Error);
  }
}

/**
 * Save or update worker heartbeat
 */
export async function save(heartbeat: WorkerHeartbeat): Promise<void> {
  try {
    const client = await getClient();

    await client.from('worker_heartbeats').upsert({
      worker_id: heartbeat.workerId,
      worker_name: heartbeat.workerName,
      status: heartbeat.status,
      last_seen_at: heartbeat.lastSeenAt,
      started_at: heartbeat.startedAt,
      current_job_id: heartbeat.currentJobId,
      current_operation: heartbeat.currentOperation,
      metadata: heartbeat.metadata,
    }, {
      onConflict: 'worker_id',
    });

    logger.debug('Worker heartbeat saved', { workerId: heartbeat.workerId });
  } catch (err) {
    logger.error('Failed to save worker heartbeat', err as Error);
  }
}

/**
 * Find worker by ID
 */
export async function findById(workerId: string): Promise<WorkerHeartbeat | null> {
  try {
    const client = await getClient();

    const { data, error } = await client
      .from('worker_heartbeats')
      .select('*')
      .eq('worker_id', workerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      logger.error('Failed to find worker heartbeat', error);
      return null;
    }

    return mapRowToHeartbeat(data);
  } catch (err) {
    logger.error('Failed to find worker heartbeat', err as Error);
    return null;
  }
}

/**
 * Find all active workers
 */
export async function findActive(maxAgeMs: number = 60000): Promise<WorkerHeartbeat[]> {
  try {
    const client = await getClient();

    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

    const { data, error } = await client
      .from('worker_heartbeats')
      .select('*')
      .eq('status', 'alive')
      .gte('last_seen_at', cutoff)
      .order('last_seen_at', { ascending: false });

    if (error) {
      logger.error('Failed to find active workers', error);
      return [];
    }

    return (data || []).map(mapRowToHeartbeat);
  } catch (err) {
    logger.error('Failed to find active workers', err as Error);
    return [];
  }
}

/**
 * Find stale workers (missed heartbeats)
 */
export async function findStale(maxAgeMs: number = 60000): Promise<WorkerHeartbeat[]> {
  try {
    const client = await getClient();

    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

    const { data, error } = await client
      .from('worker_heartbeats')
      .select('*')
      .eq('status', 'alive')
      .lt('last_seen_at', cutoff)
      .order('last_seen_at', { ascending: true });

    if (error) {
      logger.error('Failed to find stale workers', error);
      return [];
    }

    return (data || []).map(mapRowToHeartbeat);
  } catch (err) {
    logger.error('Failed to find stale workers', err as Error);
    return [];
  }
}

/**
 * Update last seen timestamp
 */
export async function updateLastSeen(workerId: string): Promise<void> {
  try {
    const client = await getClient();

    await client
      .from('worker_heartbeats')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('worker_id', workerId);
  } catch (err) {
    logger.error('Failed to update worker last seen', err as Error);
  }
}

/**
 * Update worker status
 */
export async function updateStatus(workerId: string, status: 'alive' | 'shutting_down' | 'dead'): Promise<void> {
  try {
    const client = await getClient();

    await client
      .from('worker_heartbeats')
      .update({ status })
      .eq('worker_id', workerId);

    logger.info(`Worker ${workerId} status updated to ${status}`);
  } catch (err) {
    logger.error('Failed to update worker status', err as Error);
  }
}

/**
 * Update current job
 */
export async function updateCurrentJob(
  workerId: string,
  jobId: string | null,
  operation: string | null
): Promise<void> {
  try {
    const client = await getClient();

    await client
      .from('worker_heartbeats')
      .update({
        current_job_id: jobId,
        current_operation: operation,
      })
      .eq('worker_id', workerId);
  } catch (err) {
    logger.error('Failed to update worker current job', err as Error);
  }
}

/**
 * Delete worker heartbeat
 */
export async function deleteHeartbeat(workerId: string): Promise<void> {
  try {
    const client = await getClient();

    await client
      .from('worker_heartbeats')
      .delete()
      .eq('worker_id', workerId);

    logger.info(`Worker heartbeat deleted: ${workerId}`);
  } catch (err) {
    logger.error('Failed to delete worker heartbeat', err as Error);
  }
}

/**
 * Delete old heartbeats
 */
export async function deleteOld(maxAgeMs: number = 3600000): Promise<number> {
  try {
    const client = await getClient();

    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

    const { count, error } = await client
      .from('worker_heartbeats')
      .delete()
      .lt('last_seen_at', cutoff)
      .eq('status', 'dead')
      .select('id', { count: 'exact', head: true });

    if (error) {
      logger.error('Failed to delete old heartbeats', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    logger.error('Failed to delete old heartbeats', err as Error);
    return 0;
  }
}

/**
 * Map database row to WorkerHeartbeat
 */
function mapRowToHeartbeat(row: any): WorkerHeartbeat {
  return {
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    status: row.status,
    lastSeenAt: row.last_seen_at,
    startedAt: row.started_at,
    currentJobId: row.current_job_id,
    currentOperation: row.current_operation,
    metadata: row.metadata,
  };
}
