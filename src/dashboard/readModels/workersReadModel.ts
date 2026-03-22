/**
 * Dashboard Workers Read Model
 *
 * Builds read models for worker status and heartbeats.
 * Matches the actual worker_heartbeats table schema.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import type { WorkerDashboardRecord } from '../types.js';
import { buildPagination, buildSorting } from '../query/queryBuilder.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ALLOWED_SORT_FIELDS, WORKER_STALE_THRESHOLD_MS, WORKER_CRITICAL_STALE_THRESHOLD_MS } from '../constants.js';
import { getCachedDashboardResult, setCachedDashboardResult, CacheKeys } from '../query/cache.js';
import { CACHE_TTL_SECONDS } from '../constants.js';

const logger = createLogger({ subsystem: 'dashboard_workers_read_model' });

/**
 * Get Supabase client
 */
async function getSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Map database row to worker dashboard record
 * Matches actual worker_heartbeats table schema
 */
function mapToWorkerRecord(row: any, now: number): WorkerDashboardRecord {
  const lastSeen = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
  const timeSinceLastSeen = now - lastSeen;

  // Determine status based on last_seen_at and current_operation
  let status: 'active' | 'idle' | 'stale' | 'offline' = 'offline';

  if (timeSinceLastSeen < WORKER_STALE_THRESHOLD_MS) {
    // Has recent heartbeat
    status = row.current_operation ? 'active' : 'idle';
  } else if (timeSinceLastSeen < WORKER_CRITICAL_STALE_THRESHOLD_MS) {
    // Has heartbeat but stale
    status = 'stale';
  } else {
    // No recent heartbeat
    status = 'offline';
  }

  // Calculate uptime
  const uptime = row.started_at ? now - new Date(row.started_at).getTime() : undefined;

  return {
    identity: row.worker_id,
    type: row.worker_name || 'unknown', // Use worker_name as type
    status,
    lastSeenAt: row.last_seen_at,
    currentJob: row.current_job_id || undefined,
    jobsCompleted: 0, // Not tracked in current schema
    jobsFailed: 0, // Not tracked in current schema
    uptime,
    metadata: row.metadata || undefined,
  };
}

/**
 * Get worker list with filters
 */
export async function getWorkerDashboardList(
  filters: {
    status?: 'active' | 'idle' | 'stale' | 'offline' | ('active' | 'idle' | 'stale' | 'offline')[];
    type?: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
  },
  options?: { useCache?: boolean }
): Promise<{
  items: WorkerDashboardRecord[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.list('workers', filters as any);

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<{ items: WorkerDashboardRecord[]; total: number }>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached workers list');
      return {
        ...cached.data,
        page: filters.page || 1,
        pageSize: filters.pageSize || DEFAULT_PAGE_SIZE,
      };
    }
  }

  try {
    const supabase = await getSupabaseClient();
    const now = Date.now();

    const pagination = buildPagination(filters, { defaultPageSize: DEFAULT_PAGE_SIZE, maxPageSize: MAX_PAGE_SIZE });
    const sorting = buildSorting(
      { field: filters.sortField, direction: filters.sortDirection },
      ALLOWED_SORT_FIELDS.workers as any,
      { defaultField: 'last_seen_at', defaultDirection: 'desc' }
    );

    // Build query
    let query = supabase
      .from('worker_heartbeats')
      .select('*', { count: 'exact' });

    // Apply status filter - filter by last_seen_at threshold
    // This is a simplified approach; real implementation might use a view
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      const hasActive = statuses.includes('active');
      const hasIdle = statuses.includes('idle');
      const hasStale = statuses.includes('stale');
      const hasOffline = statuses.includes('offline');

      // We'll filter after fetching since we need to calculate based on timestamps
      // This is not ideal for large datasets but works for worker lists which are typically small
    }

    // Apply sorting
    const sortFieldMap: Record<string, string> = {
      'last_seen_at': 'last_seen_at',
      'identity': 'worker_id',
      'type': 'worker_name',
      'status': 'status',
    };
    const dbSortField = sortFieldMap[sorting.field] || 'last_seen_at';
    query = query.order(dbSortField, { ascending: sorting.direction === 'asc' });

    // Apply pagination
    query = query.range(pagination.offset, pagination.offset + pagination.pageSize - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Map to records
    let items = (data || []).map((row) => mapToWorkerRecord(row, now));

    // Filter by status if needed
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      items = items.filter((w) => statuses.includes(w.status));
    }

    const result = {
      items,
      total: count || 0,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, { items, total: count || 0 }, { ttl: CACHE_TTL_SECONDS.list });
    }

    return result;
  } catch (err) {
    logger.error('Failed to get worker dashboard list', err);
    return {
      items: [],
      total: 0,
      page: filters.page || 1,
      pageSize: filters.pageSize || DEFAULT_PAGE_SIZE,
    };
  }
}

/**
 * Get worker detail
 */
export async function getWorkerDashboardDetail(
  workerIdentity: string,
  options?: { useCache?: boolean }
): Promise<WorkerDashboardRecord | null> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.detail('worker', workerIdentity);

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<WorkerDashboardRecord>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached worker detail', { workerIdentity });
      return cached.data;
    }
  }

  try {
    const supabase = await getSupabaseClient();
    const now = Date.now();

    const { data, error } = await supabase
      .from('worker_heartbeats')
      .select('*')
      .eq('worker_id', workerIdentity)
      .single();

    if (error || !data) {
      logger.warn('Worker not found', { workerIdentity, error });
      return null;
    }

    const record = mapToWorkerRecord(data, now);

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, record, { ttl: CACHE_TTL_SECONDS.detail });
    }

    return record;
  } catch (err) {
    logger.error('Failed to get worker dashboard detail', err, { workerIdentity });
    return null;
  }
}

/**
 * Get worker health summary
 */
export async function getWorkerHealthSummary(
  options?: { useCache?: boolean }
): Promise<{
  total: number;
  active: number;
  idle: number;
  stale: number;
  offline: number;
  byType: Record<string, number>;
  workers: WorkerDashboardRecord[];
}> {
  const { useCache = true } = options || {};
  const cacheKey = 'workers:health';

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<{
      total: number;
      active: number;
      idle: number;
      stale: number;
      offline: number;
      byType: Record<string, number>;
      workers: WorkerDashboardRecord[];
    }>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached worker health summary');
      return cached.data;
    }
  }

  try {
    const supabase = await getSupabaseClient();
    const now = Date.now();

    const { data, error } = await supabase
      .from('worker_heartbeats')
      .select('*');

    if (error) throw error;

    const summary = {
      total: 0,
      active: 0,
      idle: 0,
      stale: 0,
      offline: 0,
      byType: {} as Record<string, number>,
      workers: [] as WorkerDashboardRecord[],
    };

    for (const worker of data || []) {
      const record = mapToWorkerRecord(worker, now);
      summary.total++;
      summary[record.status]++;
      summary.workers.push(record);

      const workerType = record.type;
      summary.byType[workerType] = (summary.byType[workerType] || 0) + 1;
    }

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, summary, { ttl: CACHE_TTL_SECONDS.health });
    }

    return summary;
  } catch (err) {
    logger.error('Failed to get worker health summary', err);
    return {
      total: 0,
      active: 0,
      idle: 0,
      stale: 0,
      offline: 0,
      byType: {},
      workers: [],
    };
  }
}
