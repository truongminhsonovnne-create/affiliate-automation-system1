/**
 * Dashboard Dead Letter Read Model
 *
 * Builds read models for dead letter/quarantine records.
 * Matches the actual dead_letter_jobs table schema.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import type {
  DeadLetterDashboardRecord,
  DeadLetterStatus,
} from '../types.js';
import { buildPagination, buildSorting, buildDateRangeFilter } from '../query/queryBuilder.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ALLOWED_SORT_FIELDS, DEFAULT_TIME_RANGE } from '../constants.js';
import { getCachedDashboardResult, setCachedDashboardResult, CacheKeys } from '../query/cache.js';
import { CACHE_TTL_SECONDS } from '../constants.js';

const logger = createLogger({ subsystem: 'dashboard_dead_letter_read_model' });

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
 * Map database row to dead letter record
 * Matches actual dead_letter_jobs table schema
 */
function mapToDeadLetterRecord(row: any): DeadLetterDashboardRecord {
  return {
    id: row.id,
    jobType: row.operation || '', // Use operation as job type
    operation: row.operation || '',
    status: mapToDeadLetterStatus(row.status),
    errorCode: row.error_code || undefined,
    errorMessage: row.error_message || '',
    errorCategory: row.error_category || undefined,
    payload: row.payload || undefined,
    attemptCount: row.attempt_count || 0,
    firstAttemptAt: row.created_at, // Use created_at as first attempt
    lastAttemptAt: row.last_attempt_at || row.created_at,
    resolvedAt: row.resolved_at || undefined,
    resolution: row.resolution || undefined,
    createdAt: row.created_at,
    updatedAt: row.created_at, // Use created_at as fallback
  };
}

/**
 * Map database status to dead letter status
 */
function mapToDeadLetterStatus(status?: string): DeadLetterStatus {
  switch (status) {
    case 'quarantined':
      return 'quarantined';
    case 'review':
      return 'review';
    case 'resolved':
      return 'resolved';
    case 'discarded':
      return 'discarded';
    default:
      return 'quarantined';
  }
}

/**
 * Get dead letter list with filters
 */
export async function getDeadLetterDashboardList(
  filters: {
    status?: DeadLetterStatus | DeadLetterStatus[];
    jobType?: string;
    operation?: string;
    errorCategory?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    timeRange?: { start: Date; end: Date };
  },
  options?: { useCache?: boolean }
): Promise<{
  items: DeadLetterDashboardRecord[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.list('deadLetters', filters as any);

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<{ items: DeadLetterDashboardRecord[]; total: number }>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached dead letter list');
      return {
        ...cached.data,
        page: filters.page || 1,
        pageSize: filters.pageSize || DEFAULT_PAGE_SIZE,
      };
    }
  }

  try {
    const supabase = await getSupabaseClient();

    const pagination = buildPagination(filters, { defaultPageSize: DEFAULT_PAGE_SIZE, maxPageSize: MAX_PAGE_SIZE });
    const sorting = buildSorting(
      { field: filters.sortField, direction: filters.sortDirection },
      ALLOWED_SORT_FIELDS.deadLetters as any,
      { defaultField: 'created_at', defaultDirection: 'desc' }
    );

    // Build query
    let query = supabase
      .from('dead_letter_jobs')
      .select('*', { count: 'exact' });

    // Apply date range filter
    if (filters.timeRange) {
      query = query
        .gte('created_at', filters.timeRange.start.toISOString())
        .lte('created_at', filters.timeRange.end.toISOString());
    }

    // Apply status filter
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      query = query.in('status', statuses);
    }

    // Apply operation filter
    if (filters.operation) {
      query = query.eq('operation', filters.operation);
    }

    // Apply channel filter (maps to channel in schema)
    if (filters.jobType) {
      query = query.eq('channel', filters.jobType);
    }

    // Apply error category filter
    if (filters.errorCategory) {
      query = query.eq('error_category', filters.errorCategory);
    }

    // Apply search on error message or ID
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`error_message.ilike.${searchTerm},id.ilike.${searchTerm}`);
    }

    // Apply sorting
    const sortFieldMap: Record<string, string> = {
      'created_at': 'created_at',
      'last_attempt_at': 'last_attempt_at',
      'status': 'status',
      'attempt_count': 'attempt_count',
      'error_category': 'error_category',
    };
    const dbSortField = sortFieldMap[sorting.field] || 'created_at';
    query = query.order(dbSortField, { ascending: sorting.direction === 'asc' });

    // Apply pagination
    query = query.range(pagination.offset, pagination.offset + pagination.pageSize - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const items = (data || []).map(mapToDeadLetterRecord);
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
    logger.error('Failed to get dead letter dashboard list', err);
    return {
      items: [],
      total: 0,
      page: filters.page || 1,
      pageSize: filters.pageSize || DEFAULT_PAGE_SIZE,
    };
  }
}

/**
 * Get dead letter detail
 */
export async function getDeadLetterDashboardDetail(
  id: string,
  options?: { useCache?: boolean }
): Promise<DeadLetterDashboardRecord | null> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.detail('deadLetter', id);

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<DeadLetterDashboardRecord>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached dead letter detail', { id });
      return cached.data;
    }
  }

  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('dead_letter_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      logger.warn('Dead letter not found', { id, error });
      return null;
    }

    const record = mapToDeadLetterRecord(data);

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, record, { ttl: CACHE_TTL_SECONDS.detail });
    }

    return record;
  } catch (err) {
    logger.error('Failed to get dead letter dashboard detail', err, { id });
    return null;
  }
}

/**
 * Get dead letter summary
 */
export async function getDeadLetterSummary(
  options?: { useCache?: boolean }
): Promise<{
  total: number;
  byStatus: { status: string; count: number }[];
  byChannel: { channel: string; count: number }[];
  byOperation: { operation: string; count: number }[];
  oldestPending: string | null;
}> {
  const { useCache = true } = options || {};
  const cacheKey = 'deadLetter:summary';

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<{
      total: number;
      byStatus: { status: string; count: number }[];
      byChannel: { channel: string; count: number }[];
      byOperation: { operation: string; count: number }[];
      oldestPending: string | null;
    }>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached dead letter summary');
      return cached.data;
    }
  }

  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('dead_letter_jobs')
      .select('status, channel, operation, created_at');

    if (error) throw error;

    const statusCounts: Record<string, number> = {};
    const channelCounts: Record<string, number> = {};
    const operationCounts: Record<string, number> = {};
    let oldestPending: string | null = null;
    let oldestPendingTime: number | null = null;

    for (const dl of data || []) {
      // Count by status
      statusCounts[dl.status] = (statusCounts[dl.status] || 0) + 1;

      // Count by channel
      if (dl.channel) {
        channelCounts[dl.channel] = (channelCounts[dl.channel] || 0) + 1;
      }

      // Count by operation
      if (dl.operation) {
        operationCounts[dl.operation] = (operationCounts[dl.operation] || 0) + 1;
      }

      // Track oldest pending
      if (dl.status === 'quarantined' || dl.status === 'review') {
        const createdTime = new Date(dl.created_at).getTime();
        if (!oldestPendingTime || createdTime < oldestPendingTime) {
          oldestPendingTime = createdTime;
          oldestPending = dl.created_at;
        }
      }
    }

    const summary = {
      total: (data || []).length,
      byStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      byChannel: Object.entries(channelCounts).map(([channel, count]) => ({ channel, count })),
      byOperation: Object.entries(operationCounts).map(([operation, count]) => ({ operation, count })),
      oldestPending,
    };

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, summary, { ttl: CACHE_TTL_SECONDS.list });
    }

    return summary;
  } catch (err) {
    logger.error('Failed to get dead letter summary', err);
    return {
      total: 0,
      byStatus: [],
      byChannel: [],
      byOperation: [],
      oldestPending: null,
    };
  }
}
