/**
 * Dashboard Publish Jobs Read Model
 *
 * Builds read models for publish jobs with lifecycle, attempts, and timeline.
 * Matches the actual publish_jobs table schema.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import type {
  PublishJobDashboardRecord,
  PublishJobDashboardDetail,
  PublishJobStatus,
  Channel,
  PublishJobAttempt,
  PublishJobTimelineEvent,
} from '../types.js';
import { buildPagination, buildSorting, buildDateRangeFilter } from '../query/queryBuilder.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ALLOWED_SORT_FIELDS, DEFAULT_TIME_RANGE } from '../constants.js';
import { getCachedDashboardResult, setCachedDashboardResult, CacheKeys } from '../query/cache.js';
import { CACHE_TTL_SECONDS } from '../constants.js';

const logger = createLogger({ subsystem: 'dashboard_publish_jobs_read_model' });

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
 * Map database row to publish job record
 * Matches actual publish_jobs table schema
 */
function mapToPublishJobRecord(row: any): PublishJobDashboardRecord {
  return {
    id: row.id,
    channel: (row.channel || 'website') as Channel,
    status: mapToPublishJobStatus(row.status),
    productId: row.product_id,
    productTitle: row.source_metadata?.productTitle as string || undefined,
    scheduledAt: row.scheduled_at || undefined,
    publishedAt: row.published_at || undefined,
    claimedAt: undefined, // Not in current schema
    claimedBy: undefined, // Not in current schema
    priority: row.priority || 0,
    attemptCount: row.attempt_count || 0,
    maxAttempts: 3, // Default max attempts
    lastError: row.error_message || undefined,
    publishedUrl: undefined, // Not in current schema - would be in payload
    executionMetadata: row.source_metadata || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map database status to publish job status
 */
function mapToPublishJobStatus(status?: string): PublishJobStatus {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'scheduled':
      return 'scheduled';
    case 'ready':
      return 'ready';
    case 'publishing':
      return 'publishing';
    case 'published':
      return 'published';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    case 'retry_scheduled':
      return 'retry_scheduled';
    default:
      return 'pending';
  }
}

/**
 * Get publish job list with filters
 */
export async function getPublishJobDashboardList(
  filters: {
    status?: PublishJobStatus | PublishJobStatus[];
    channel?: Channel | Channel[];
    priority?: number | number[];
    claimedBy?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    timeRange?: { start: Date; end: Date };
  },
  options?: { useCache?: boolean }
): Promise<{
  items: PublishJobDashboardRecord[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.list('publishJobs', filters as any);

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<{ items: PublishJobDashboardRecord[]; total: number }>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached publish jobs list');
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
      ALLOWED_SORT_FIELDS.publishJobs as any,
      { defaultField: 'created_at', defaultDirection: 'desc' }
    );

    // Build query - join with products to get product title
    let query = supabase
      .from('publish_jobs')
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

    // Apply channel filter
    if (filters.channel) {
      const channels = Array.isArray(filters.channel) ? filters.channel : [filters.channel];
      query = query.in('channel', channels);
    }

    // Apply priority filter
    if (filters.priority !== undefined) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
      query = query.in('priority', priorities);
    }

    // Apply search on product_id or content_id
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`product_id.ilike.${searchTerm},content_id.ilike.${searchTerm}`);
    }

    // Apply sorting - map to actual column names
    const sortFieldMap: Record<string, string> = {
      'created_at': 'created_at',
      'scheduled_at': 'scheduled_at',
      'published_at': 'published_at',
      'priority': 'priority',
      'status': 'status',
      'attempt_count': 'attempt_count',
    };
    const dbSortField = sortFieldMap[sorting.field] || 'created_at';
    query = query.order(dbSortField, { ascending: sorting.direction === 'asc' });

    // Apply pagination
    query = query.range(pagination.offset, pagination.offset + pagination.pageSize - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const items = (data || []).map(mapToPublishJobRecord);
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
    logger.error('Failed to get publish job dashboard list', err);
    return {
      items: [],
      total: 0,
      page: filters.page || 1,
      pageSize: filters.pageSize || DEFAULT_PAGE_SIZE,
    };
  }
}

/**
 * Get publish job detail with attempts and timeline
 */
export async function getPublishJobDashboardDetail(
  jobId: string,
  options?: { useCache?: boolean }
): Promise<PublishJobDashboardDetail | null> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.detail('publishJob', jobId);

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<PublishJobDashboardDetail>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached publish job detail', { jobId });
      return cached.data;
    }
  }

  try {
    const supabase = await getSupabaseClient();

    // Get job
    const { data: job, error: jobError } = await supabase
      .from('publish_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      logger.warn('Publish job not found', { jobId, error: jobError });
      return null;
    }

    const record = mapToPublishJobRecord(job);

    // Get related product info
    const { data: product } = await supabase
      .from('affiliate_products')
      .select('id, title, platform, image_url, product_url')
      .eq('id', job.product_id)
      .single();

    if (product) {
      (record as any).product = {
        id: product.id,
        title: product.title,
        platform: product.platform,
        imageUrl: product.image_url,
        productUrl: product.product_url,
      };
    }

    // Get related content info
    const { data: content } = await supabase
      .from('affiliate_contents')
      .select('id, rewritten_title, social_caption, ai_model, prompt_version')
      .eq('id', job.content_id)
      .single();

    if (content) {
      (record as any).content = {
        id: content.id,
        rewrittenTitle: content.rewritten_title,
        socialCaption: content.social_caption,
        aiModel: content.ai_model,
        promptVersion: content.prompt_version,
      };
    }

    // Note: publish_job_attempts table may not exist in current schema
    // If needed, we'd need to track attempts separately or via system_events

    // Build timeline
    (record as any).timeline = buildPublishJobTimeline(job);

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, record, { ttl: CACHE_TTL_SECONDS.detail });
    }

    return record;
  } catch (err) {
    logger.error('Failed to get publish job dashboard detail', err, { jobId });
    return null;
  }
}

/**
 * Build publish job timeline from job data
 */
function buildPublishJobTimeline(job: any): PublishJobTimelineEvent[] {
  const timeline: PublishJobTimelineEvent[] = [];

  // Created
  timeline.push({
    timestamp: job.created_at,
    event: 'Job created',
    details: { channel: job.channel, priority: job.priority },
  });

  // Scheduled
  if (job.scheduled_at) {
    timeline.push({
      timestamp: job.scheduled_at,
      event: 'Job scheduled',
    });
  }

  // Ready
  if (job.ready_at) {
    timeline.push({
      timestamp: job.ready_at,
      event: 'Job ready for publishing',
    });
  }

  // Published
  if (job.published_at) {
    timeline.push({
      timestamp: job.published_at,
      event: 'Content published',
      details: { attemptCount: job.attempt_count },
    });
  }

  // Failed
  if (job.status === 'failed' && job.error_message) {
    timeline.push({
      timestamp: job.updated_at,
      event: 'Job failed',
      details: { error: job.error_message, attempts: job.attempt_count },
    });
  }

  return timeline;
}

/**
 * Get publish queue summary
 */
export async function getPublishQueueSummary(
  options?: { useCache?: boolean }
): Promise<{
  pending: number;
  ready: number;
  inProgress: number;
  completed: number;
  failed: number;
  oldestPendingAge?: number;
  byChannel: Record<string, number>;
}> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.queueSummary();

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<{
      pending: number;
      ready: number;
      inProgress: number;
      completed: number;
      failed: number;
      byChannel: Record<string, number>;
    }>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached publish queue summary');
      return {
        ...cached.data,
        oldestPendingAge: undefined,
      };
    }
  }

  try {
    const supabase = await getSupabaseClient();

    // Get all publish jobs
    const { data: jobs, error } = await supabase
      .from('publish_jobs')
      .select('status, channel, created_at, scheduled_at');

    if (error) throw error;

    const summary = {
      pending: 0,
      ready: 0,
      inProgress: 0,
      completed: 0,
      failed: 0,
      oldestPendingAge: undefined as number | undefined,
      byChannel: {} as Record<string, number>,
    };

    let oldestPendingTime: number | null = null;

    for (const job of jobs || []) {
      // Count by status
      switch (job.status) {
        case 'pending':
        case 'scheduled':
        case 'retry_scheduled':
          summary.pending++;
          if (!oldestPendingTime || new Date(job.created_at).getTime() < oldestPendingTime) {
            oldestPendingTime = new Date(job.created_at).getTime();
          }
          break;
        case 'ready':
          summary.ready++;
          break;
        case 'publishing':
          summary.inProgress++;
          break;
        case 'published':
          summary.completed++;
          break;
        case 'failed':
          summary.failed++;
          break;
      }

      // Count by channel
      summary.byChannel[job.channel] = (summary.byChannel[job.channel] || 0) + 1;
    }

    // Calculate oldest pending age
    if (oldestPendingTime) {
      summary.oldestPendingAge = Date.now() - oldestPendingTime;
    }

    // Cache the result
    if (useCache) {
      const { oldestPendingAge, ...cacheData } = summary;
      setCachedDashboardResult(cacheKey, cacheData, { ttl: CACHE_TTL_SECONDS.queueSummary });
    }

    return summary;
  } catch (err) {
    logger.error('Failed to get publish queue summary', err);
    return {
      pending: 0,
      ready: 0,
      inProgress: 0,
      completed: 0,
      failed: 0,
      byChannel: {},
    };
  }
}

/**
 * Get publish failure summary
 */
export async function getPublishFailureSummary(
  options?: { timeRange?: { start: Date; end: Date } }
): Promise<{
  total: number;
  byChannel: Record<string, number>;
  byReason: Record<string, number>;
  recentFailures: Array<{ id: string; channel: string; error: string; failedAt: string }>;
}> {
  try {
    const supabase = await getSupabaseClient();
    const timeRange = options?.timeRange || buildDateRangeFilter(DEFAULT_TIME_RANGE, undefined);

    let query = supabase
      .from('publish_jobs')
      .select('id, channel, error_message, updated_at')
      .eq('status', 'failed');

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const summary = {
      total: (data || []).length,
      byChannel: {} as Record<string, number>,
      byReason: {} as Record<string, number>,
      recentFailures: [] as Array<{ id: string; channel: string; error: string; failedAt: string }>,
    };

    for (const job of data || []) {
      // Count by channel
      summary.byChannel[job.channel] = (summary.byChannel[job.channel] || 0) + 1;

      // Count by reason (truncate error message)
      const reason = job.error_message?.substring(0, 100) || 'Unknown error';
      summary.byReason[reason] = (summary.byReason[reason] || 0) + 1;

      // Add to recent failures
      summary.recentFailures.push({
        id: job.id,
        channel: job.channel,
        error: job.error_message || '',
        failedAt: job.updated_at,
      });
    }

    // Sort recent failures by date and limit
    summary.recentFailures.sort((a, b) =>
      new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime()
    );
    summary.recentFailures = summary.recentFailures.slice(0, 10);

    return summary;
  } catch (err) {
    logger.error('Failed to get publish failure summary', err);
    return {
      total: 0,
      byChannel: {},
      byReason: {},
      recentFailures: [],
    };
  }
}
