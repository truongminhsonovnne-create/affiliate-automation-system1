/**
 * Dashboard Trends Read Model
 *
 * Builds time-series trend data for charts.
 * Provides bucket aggregation for hourly/daily trends.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import type {
  DashboardTrendPoint,
  DashboardTrendSeries,
  TrendSummary,
} from '../types.js';
import { buildDateRangeFilter } from '../query/queryBuilder.js';
import { DEFAULT_TIME_RANGE, TIME_RANGE_MS } from '../constants.js';

const logger = createLogger({ subsystem: 'dashboard_trends_read_model' });

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
 * Determine bucket size based on time range
 */
function determineBucketSize(timeRange?: string): 'hour' | 'day' {
  if (!timeRange) return 'day';
  const ms = TIME_RANGE_MS[timeRange as keyof typeof TIME_RANGE_MS];
  if (!ms) return 'day';

  // 1h and 6h use hour buckets, longer ranges use day buckets
  return ms <= 6 * 60 * 60 * 1000 ? 'hour' : 'day';
}

/**
 * Format bucket key
 */
function formatBucketKey(date: Date, bucketSize: 'hour' | 'day'): string {
  if (bucketSize === 'hour') {
    return date.toISOString().substring(0, 13) + ':00:00Z';
  }
  return date.toISOString().substring(0, 10) + 'T00:00:00Z';
}

/**
 * Get crawl trend series
 */
export async function getCrawlTrendSeries(
  options?: {
    timeRange?: string;
    customTimeRange?: { start: Date; end: Date };
    bucketSize?: 'hour' | 'day';
  }
): Promise<DashboardTrendSeries> {
  try {
    const bucketSize = options?.bucketSize || determineBucketSize(options?.timeRange);
    const timeRange = options?.customTimeRange || buildDateRangeFilter(options?.timeRange as any, undefined);

    if (!timeRange) {
      return { metric: 'crawl_jobs', bucketSize, dataPoints: [], summary: { total: 0, success: 0, failed: 0 } };
    }

    const supabase = await getSupabaseClient();

    // Get all crawl jobs in time range
    const { data, error } = await supabase
      .from('crawl_jobs')
      .select('status, created_at')
      .gte('created_at', timeRange.start.toISOString())
      .lte('created_at', timeRange.end.toISOString());

    if (error) throw error;

    // Group by bucket
    const buckets = new Map<string, { total: number; success: number; failed: number; pending: number; inProgress: number }>();

    for (const job of data || []) {
      const bucketKey = formatBucketKey(new Date(job.created_at), bucketSize);
      const bucket = buckets.get(bucketKey) || { total: 0, success: 0, failed: 0, pending: 0, inProgress: 0 };

      bucket.total++;
      switch (job.status) {
        case 'completed':
          bucket.success++;
          break;
        case 'failed':
          bucket.failed++;
          break;
        case 'pending':
          bucket.pending++;
          break;
        case 'running':
          bucket.inProgress++;
          break;
      }

      buckets.set(bucketKey, bucket);
    }

    // Convert to trend points
    const dataPoints: DashboardTrendPoint[] = Array.from(buckets.entries())
      .map(([bucket, counts]) => ({
        timestamp: bucket,
        bucket,
        total: counts.total,
        success: counts.success,
        failed: counts.failed,
        pending: counts.pending,
        inProgress: counts.inProgress,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Calculate summary
    const summary: TrendSummary = {
      total: 0,
      success: 0,
      failed: 0,
    };

    for (const point of dataPoints) {
      summary.total += point.total;
      summary.success += point.success;
      summary.failed += point.failed;
    }

    summary.avgRate = summary.total > 0 ? (summary.success / summary.total) * 100 : 0;

    return { metric: 'crawl_jobs', bucketSize, dataPoints, summary };
  } catch (err) {
    logger.error('Failed to get crawl trend series', err);
    return { metric: 'crawl_jobs', bucketSize: 'day', dataPoints: [], summary: { total: 0, success: 0, failed: 0 } };
  }
}

/**
 * Get publish trend series
 */
export async function getPublishTrendSeries(
  options?: {
    timeRange?: string;
    customTimeRange?: { start: Date; end: Date };
    bucketSize?: 'hour' | 'day';
  }
): Promise<DashboardTrendSeries> {
  try {
    const bucketSize = options?.bucketSize || determineBucketSize(options?.timeRange);
    const timeRange = options?.customTimeRange || buildDateRangeFilter(options?.timeRange as any, undefined);

    if (!timeRange) {
      return { metric: 'publish_jobs', bucketSize, dataPoints: [], summary: { total: 0, success: 0, failed: 0 } };
    }

    const supabase = await getSupabaseClient();

    // Get all publish jobs in time range
    const { data, error } = await supabase
      .from('publish_jobs')
      .select('status, created_at')
      .gte('created_at', timeRange.start.toISOString())
      .lte('created_at', timeRange.end.toISOString());

    if (error) throw error;

    // Group by bucket
    const buckets = new Map<string, { total: number; success: number; failed: number; pending: number; inProgress: number }>();

    for (const job of data || []) {
      const bucketKey = formatBucketKey(new Date(job.created_at), bucketSize);
      const bucket = buckets.get(bucketKey) || { total: 0, success: 0, failed: 0, pending: 0, inProgress: 0 };

      bucket.total++;
      switch (job.status) {
        case 'published':
          bucket.success++;
          break;
        case 'failed':
          bucket.failed++;
          break;
        case 'pending':
        case 'ready':
        case 'scheduled':
        case 'retry_scheduled':
          bucket.pending++;
          break;
        case 'publishing':
          bucket.inProgress++;
          break;
      }

      buckets.set(bucketKey, bucket);
    }

    // Convert to trend points
    const dataPoints: DashboardTrendPoint[] = Array.from(buckets.entries())
      .map(([bucket, counts]) => ({
        timestamp: bucket,
        bucket,
        total: counts.total,
        success: counts.success,
        failed: counts.failed,
        pending: counts.pending,
        inProgress: counts.inProgress,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Calculate summary
    const summary: TrendSummary = {
      total: 0,
      success: 0,
      failed: 0,
    };

    for (const point of dataPoints) {
      summary.total += point.total;
      summary.success += point.success;
      summary.failed += point.failed;
    }

    summary.avgRate = summary.total > 0 ? (summary.success / summary.total) * 100 : 0;

    return { metric: 'publish_jobs', bucketSize, dataPoints, summary };
  } catch (err) {
    logger.error('Failed to get publish trend series', err);
    return { metric: 'publish_jobs', bucketSize: 'day', dataPoints: [], summary: { total: 0, success: 0, failed: 0 } };
  }
}

/**
 * Get AI enrichment trend series
 */
export async function getAiEnrichmentTrendSeries(
  options?: {
    timeRange?: string;
    customTimeRange?: { start: Date; end: Date };
    bucketSize?: 'hour' | 'day';
  }
): Promise<DashboardTrendSeries> {
  try {
    const bucketSize = options?.bucketSize || determineBucketSize(options?.timeRange);
    const timeRange = options?.customTimeRange || buildDateRangeFilter(options?.timeRange as any, undefined);

    if (!timeRange) {
      return { metric: 'ai_enrichment', bucketSize, dataPoints: [], summary: { total: 0, success: 0, failed: 0 } };
    }

    const supabase = await getSupabaseClient();

    // Get all AI content in time range
    const { data, error } = await supabase
      .from('affiliate_contents')
      .select('status, created_at')
      .gte('created_at', timeRange.start.toISOString())
      .lte('created_at', timeRange.end.toISOString());

    if (error) throw error;

    // Group by bucket
    const buckets = new Map<string, { total: number; success: number; failed: number; pending: number; inProgress: number }>();

    for (const content of data || []) {
      const bucketKey = formatBucketKey(new Date(content.created_at), bucketSize);
      const bucket = buckets.get(bucketKey) || { total: 0, success: 0, failed: 0, pending: 0, inProgress: 0 };

      bucket.total++;
      switch (content.status) {
        case 'completed':
          bucket.success++;
          break;
        case 'failed':
          bucket.failed++;
          break;
        case 'pending':
          bucket.pending++;
          break;
        case 'processing':
          bucket.inProgress++;
          break;
      }

      buckets.set(bucketKey, bucket);
    }

    // Convert to trend points
    const dataPoints: DashboardTrendPoint[] = Array.from(buckets.entries())
      .map(([bucket, counts]) => ({
        timestamp: bucket,
        bucket,
        total: counts.total,
        success: counts.success,
        failed: counts.failed,
        pending: counts.pending,
        inProgress: counts.inProgress,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Calculate summary
    const summary: TrendSummary = {
      total: 0,
      success: 0,
      failed: 0,
    };

    for (const point of dataPoints) {
      summary.total += point.total;
      summary.success += point.success;
      summary.failed += point.failed;
    }

    summary.avgRate = summary.total > 0 ? (summary.success / summary.total) * 100 : 0;

    return { metric: 'ai_enrichment', bucketSize, dataPoints, summary };
  } catch (err) {
    logger.error('Failed to get AI enrichment trend series', err);
    return { metric: 'ai_enrichment', bucketSize: 'day', dataPoints: [], summary: { total: 0, success: 0, failed: 0 } };
  }
}

/**
 * Get all trend series in one call
 */
export async function getAllTrendSeries(
  options?: {
    timeRange?: string;
    customTimeRange?: { start: Date; end: Date };
    bucketSize?: 'hour' | 'day';
  }
): Promise<{
  crawl: DashboardTrendSeries;
  publish: DashboardTrendSeries;
  aiEnrichment: DashboardTrendSeries;
}> {
  const [crawl, publish, aiEnrichment] = await Promise.all([
    getCrawlTrendSeries(options),
    getPublishTrendSeries(options),
    getAiEnrichmentTrendSeries(options),
  ]);

  return { crawl, publish, aiEnrichment };
}
