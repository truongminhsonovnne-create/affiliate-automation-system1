/**
 * System Event Repository
 *
 * Database persistence for system events for auditing and analysis.
 */

import { createLogger } from '../logger/structuredLogger.js';
import type { SystemEvent, SystemEventCategory, SystemEventSeverity } from '../types.js';
import { EVENT_RETENTION_DAYS } from '../constants.js';

const logger = createLogger({ subsystem: 'system_event_repository' });

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
 * Create system_events table if not exists
 */
export async function initializeTable(): Promise<void> {
  try {
    const client = await getClient();

    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.system_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id TEXT UNIQUE,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        correlation_id TEXT,
        operation TEXT,
        channel TEXT,
        job_id TEXT,
        worker_id TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_system_events_category ON public.system_events(category)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_system_events_severity ON public.system_events(severity)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON public.system_events(created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_system_events_correlation_id ON public.system_events(correlation_id)
    `);

    logger.info('System events table initialized');
  } catch (err) {
    logger.error('Failed to initialize system events table', err as Error);
  }
}

/**
 * Save system event to database
 */
export async function save(event: SystemEvent): Promise<void> {
  try {
    const client = await getClient();

    await client.from('system_events').insert({
      event_id: event.eventId,
      category: event.category,
      severity: event.severity,
      message: event.message,
      correlation_id: event.correlationId,
      operation: event.operation,
      channel: event.channel,
      job_id: event.jobId,
      worker_id: event.workerId,
      metadata: event.metadata,
      created_at: event.createdAt,
    });

    logger.debug('System event saved', { eventId: event.eventId, category: event.category });
  } catch (err) {
    logger.error('Failed to save system event', err as Error);
  }
}

/**
 * Save multiple events in batch
 */
export async function saveBatch(events: SystemEvent[]): Promise<number> {
  if (events.length === 0) return 0;

  try {
    const client = await getClient();

    const records = events.map(e => ({
      event_id: e.eventId,
      category: e.category,
      severity: e.severity,
      message: e.message,
      correlation_id: e.correlationId,
      operation: e.operation,
      channel: e.channel,
      job_id: e.jobId,
      worker_id: e.workerId,
      metadata: e.metadata,
      created_at: e.createdAt,
    }));

    const { error } = await client.from('system_events').insert(records);

    if (error) {
      logger.error('Failed to save batch system events', error);
      return 0;
    }

    return events.length;
  } catch (err) {
    logger.error('Failed to save batch system events', err as Error);
    return 0;
  }
}

/**
 * Query system events
 */
export async function query(filter: {
  category?: SystemEventCategory;
  severity?: SystemEventSeverity;
  since?: string;
  until?: string;
  correlationId?: string;
  operation?: string;
  channel?: string;
  jobId?: string;
  workerId?: string;
  limit?: number;
  offset?: number;
}): Promise<SystemEvent[]> {
  try {
    const client = await getClient();

    let query = client.from('system_events').select('*').order('created_at', { ascending: false });

    if (filter.category) {
      query = query.eq('category', filter.category);
    }

    if (filter.severity) {
      query = query.eq('severity', filter.severity);
    }

    if (filter.since) {
      query = query.gte('created_at', filter.since);
    }

    if (filter.until) {
      query = query.lte('created_at', filter.until);
    }

    if (filter.correlationId) {
      query = query.eq('correlation_id', filter.correlationId);
    }

    if (filter.operation) {
      query = query.eq('operation', filter.operation);
    }

    if (filter.channel) {
      query = query.eq('channel', filter.channel);
    }

    if (filter.jobId) {
      query = query.eq('job_id', filter.jobId);
    }

    if (filter.workerId) {
      query = query.eq('worker_id', filter.workerId);
    }

    if (filter.limit) {
      query = query.limit(filter.limit);
    }

    if (filter.offset) {
      // Pagination requires range
      const rangeEnd = (filter.offset || 0) + (filter.limit || 100) - 1;
      query = query.range(filter.offset, rangeEnd);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to query system events', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      eventId: row.event_id,
      category: row.category,
      severity: row.severity,
      message: row.message,
      correlationId: row.correlation_id,
      operation: row.operation,
      channel: row.channel,
      jobId: row.job_id,
      workerId: row.worker_id,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  } catch (err) {
    logger.error('Failed to query system events', err as Error);
    return [];
  }
}

/**
 * Get events by correlation ID
 */
export async function getByCorrelationId(correlationId: string): Promise<SystemEvent[]> {
  return query({ correlationId, limit: 100 });
}

/**
 * Get events for a specific job
 */
export async function getByJobId(jobId: string): Promise<SystemEvent[]> {
  return query({ jobId, limit: 50 });
}

/**
 * Get events for a specific worker
 */
export async function getByWorkerId(workerId: string): Promise<SystemEvent[]> {
  return query({ workerId, limit: 50 });
}

/**
 * Get recent events
 */
export async function getRecent(limit: number = 100): Promise<SystemEvent[]> {
  return query({ limit });
}

/**
 * Get error events
 */
export async function getErrors(since?: string, limit: number = 100): Promise<SystemEvent[]> {
  return query({ severity: 'error', since, limit });
}

/**
 * Get critical events
 */
export async function getCritical(since?: string, limit: number = 100): Promise<SystemEvent[]> {
  return query({ severity: 'critical', since, limit });
}

/**
 * Get event counts by category
 */
export async function getCountsByCategory(since?: string): Promise<Record<string, number>> {
  try {
    const client = await getClient();

    let query = client
      .from('system_events')
      .select('category', { count: 'exact', head: true });

    if (since) {
      query = query.gte('created_at', since);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get event counts', error);
      return {};
    }

    // Group by category manually
    const allEvents = await query({ limit: 10000, ...(since ? { since } : {}) });
    const counts: Record<string, number> = {};

    for (const event of allEvents) {
      counts[event.category] = (counts[event.category] || 0) + 1;
    }

    return counts;
  } catch (err) {
    logger.error('Failed to get event counts by category', err as Error);
    return {};
  }
}

/**
 * Delete old events
 */
export async function deleteOldEvents(daysOld: number = EVENT_RETENTION_DAYS): Promise<number> {
  try {
    const client = await getClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { count, error } = await client
      .from('system_events')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id', { count: 'exact', head: true });

    if (error) {
      logger.error('Failed to delete old events', error);
      return 0;
    }

    if (count && count > 0) {
      logger.info(`Deleted ${count} old system events`);
    }

    return count || 0;
  } catch (err) {
    logger.error('Failed to delete old events', err as Error);
    return 0;
  }
}
