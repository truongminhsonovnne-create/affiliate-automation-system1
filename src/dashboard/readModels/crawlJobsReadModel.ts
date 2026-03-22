/**
 * Dashboard Crawl Jobs Read Model
 *
 * Builds read models for crawl jobs with timing, errors, and counts.
 * Matches the actual crawl_jobs table schema.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import type {
  CrawlJobDashboardRecord,
  CrawlJobDashboardDetail,
  CrawlJobType,
  CrawlJobStatus,
} from '../types.js';
import { buildPagination, buildSorting, buildDateRangeFilter } from '../query/queryBuilder.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ALLOWED_SORT_FIELDS, DEFAULT_TIME_RANGE } from '../constants.js';
import { getCachedDashboardResult, setCachedDashboardResult, CacheKeys } from '../query/cache.js';
import { CACHE_TTL_SECONDS } from '../constants.js';

const logger = createLogger({ subsystem: 'dashboard_crawl_jobs_read_model' });

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
 * Map database row to crawl job record
 * Matches actual crawl_jobs table schema
 */
function mapToCrawlJobRecord(row: any): CrawlJobDashboardRecord {
  // Calculate duration if we have start and end times
  let duration: number | undefined;
  if (row.started_at && row.finished_at) {
    duration = Math.round(
      (new Date(row.finished_at).getTime() - new Date(row.started_at).getTime()) / 1000
    );
  }

  return {
    id: row.id,
    type: (row.source_type || 'search') as CrawlJobType, // Map source_type to type
    status: mapToCrawlJobStatus(row.status),
    source: row.platform || '', // platform is the source
    keyword: row.source_keyword || undefined,
    url: row.product_url || undefined,
    shopId: row.shop_name || undefined,
    itemsFound: row.items_found || 0,
    itemsNew: 0, // Not in current schema
    itemsUpdated: 0, // Not in current schema
    itemsFailed: row.items_failed || 0,
    duration,
    startedAt: row.started_at || undefined,
    completedAt: row.finished_at || undefined,
    createdAt: row.created_at,
    errorSummary: row.error_message || undefined,
    metadata: undefined, // Not in current schema
  };
}

/**
 * Map database status to crawl job status
 */
function mapToCrawlJobStatus(status?: string): CrawlJobStatus {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'running':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

/**
 * Get crawl job list with filters
 */
export async function getCrawlJobDashboardList(
  filters: {
    status?: CrawlJobStatus | CrawlJobStatus[];
    type?: CrawlJobType | CrawlJobType[];
    source?: string;
    shopId?: string;
    keyword?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    timeRange?: { start: Date; end: Date };
  },
  options?: { useCache?: boolean }
): Promise<{
  items: CrawlJobDashboardRecord[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.list('crawlJobs', filters as any);

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<{ items: CrawlJobDashboardRecord[]; total: number }>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached crawl jobs list');
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
      ALLOWED_SORT_FIELDS.crawlJobs as any,
      { defaultField: 'created_at', defaultDirection: 'desc' }
    );

    // Build query
    let query = supabase
      .from('crawl_jobs')
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

    // Apply source_type filter (maps to 'type' in filter)
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      query = query.in('source_type', types);
    }

    // Apply platform filter
    if (filters.source) {
      query = query.eq('platform', filters.source);
    }

    // Apply keyword filter
    if (filters.keyword) {
      query = query.ilike('source_keyword', `%${filters.keyword}%`);
    }

    // Apply search
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`source_keyword.ilike.${searchTerm},platform.ilike.${searchTerm}`);
    }

    // Apply sorting - map to actual column names
    const sortFieldMap: Record<string, string> = {
      'created_at': 'created_at',
      'started_at': 'started_at',
      'completed_at': 'finished_at',
      'status': 'status',
      'items_found': 'items_found',
      'duration': 'started_at', // Approximate with started_at
    };
    const dbSortField = sortFieldMap[sorting.field] || 'created_at';
    query = query.order(dbSortField, { ascending: sorting.direction === 'asc' });

    // Apply pagination
    query = query.range(pagination.offset, pagination.offset + pagination.pageSize - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const items = (data || []).map(mapToCrawlJobRecord);
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
    logger.error('Failed to get crawl job dashboard list', err);
    return {
      items: [],
      total: 0,
      page: filters.page || 1,
      pageSize: filters.pageSize || DEFAULT_PAGE_SIZE,
    };
  }
}

/**
 * Get crawl job detail with items and errors
 */
export async function getCrawlJobDashboardDetail(
  jobId: string,
  options?: { useCache?: boolean }
): Promise<CrawlJobDashboardDetail | null> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.detail('crawlJob', jobId);

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<CrawlJobDashboardDetail>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached crawl job detail', { jobId });
      return cached.data;
    }
  }

  try {
    const supabase = await getSupabaseClient();

    // Get job
    const { data: job, error: jobError } = await supabase
      .from('crawl_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      logger.warn('Crawl job not found', { jobId, error: jobError });
      return null;
    }

    const record = mapToCrawlJobRecord(job);

    // Get products from this job (via platform + source_keyword matching)
    // This is an approximation since there's no direct foreign key
    const { data: products } = await supabase
      .from('affiliate_products')
      .select('id, external_product_id, title, price, product_url')
      .eq('platform', job.platform)
      .eq('source_type', job.source_type)
      .order('created_at', { ascending: false })
      .limit(50);

    if (products) {
      (record as any).items = products.map((item) => ({
        id: item.id,
        externalId: item.external_product_id,
        title: item.title,
        price: item.price,
        status: 'crawled',
      }));
    }

    // Add timeline events
    (record as any).timeline = buildCrawlJobTimeline(job);

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, record, { ttl: CACHE_TTL_SECONDS.detail });
    }

    return record;
  } catch (err) {
    logger.error('Failed to get crawl job dashboard detail', err, { jobId });
    return null;
  }
}

/**
 * Build crawl job timeline from job data
 */
function buildCrawlJobTimeline(job: any): any[] {
  const timeline = [];

  // Created
  timeline.push({
    timestamp: job.created_at,
    event: 'Job created',
    details: { platform: job.platform, sourceType: job.source_type },
  });

  // Started
  if (job.started_at) {
    timeline.push({
      timestamp: job.started_at,
      event: 'Crawl started',
      details: { sourceKeyword: job.source_keyword },
    });
  }

  // Completed or Failed
  if (job.finished_at) {
    timeline.push({
      timestamp: job.finished_at,
      event: job.status === 'completed' ? 'Crawl completed' : 'Crawl failed',
      details: {
        itemsFound: job.items_found,
        itemsCrawled: job.items_crawled,
        itemsFailed: job.items_failed,
        errorMessage: job.error_message,
      },
    });
  }

  return timeline;
}

/**
 * Get crawl job trend summary
 */
export async function getCrawlJobTrendSummary(
  options?: {
    timeRange?: { start: Date; end: Date };
    bucketSize?: 'hour' | 'day';
  }
): Promise<{
  total: number;
  success: number;
  failed: number;
  avgDuration: number;
  byType: Record<string, number>;
}> {
  try {
    const supabase = await getSupabaseClient();
    const timeRange = options?.timeRange || buildDateRangeFilter(DEFAULT_TIME_RANGE, undefined);

    let query = supabase
      .from('crawl_jobs')
      .select('status, source_type, started_at, finished_at');

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const summary = {
      total: 0,
      success: 0,
      failed: 0,
      avgDuration: 0,
      byType: {} as Record<string, number>,
    };

    let totalDuration = 0;

    for (const job of data || []) {
      summary.total++;

      // Calculate duration
      if (job.started_at && job.finished_at) {
        const duration = Math.round(
          (new Date(job.finished_at).getTime() - new Date(job.started_at).getTime()) / 1000
        );
        totalDuration += duration;
      }

      if (job.status === 'completed') {
        summary.success++;
      } else if (job.status === 'failed') {
        summary.failed++;
      }

      const type = job.source_type || 'unknown';
      summary.byType[type] = (summary.byType[type] || 0) + 1;
    }

    summary.avgDuration = summary.total > 0 ? totalDuration / summary.total : 0;

    return summary;
  } catch (err) {
    logger.error('Failed to get crawl job trend summary', err);
    return {
      total: 0,
      success: 0,
      failed: 0,
      avgDuration: 0,
      byType: {},
    };
  }
}
