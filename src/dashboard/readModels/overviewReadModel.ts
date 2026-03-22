/**
 * Dashboard Overview Read Model
 *
 * Builds read models for dashboard overview.
 * Provides aggregated data for dashboard cards and summaries.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import type {
  DashboardOverviewCards,
  DashboardHealthSummary,
  DashboardQueueSummary,
  CardSummary,
  TrendIndicator,
} from '../types.js';
import { getSystemHealthSummary } from '../../controlPlane/services/systemStatusService.js';
import { getDashboardCacheConfig, getCachedDashboardResult, setCachedDashboardResult, CacheKeys } from '../query/cache.js';
import { CACHE_TTL_SECONDS } from '../constants.js';

const logger = createLogger({ subsystem: 'dashboard_overview_read_model' });

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
 * Get count by status from table
 */
async function getCountByStatus(
  table: string,
  dateField: string = 'created_at',
  timeRange?: { start: Date; end: Date }
): Promise<Record<string, number>> {
  try {
    const supabase = await getSupabaseClient();

    let query = supabase.from(table).select('status', { count: 'exact', head: true });

    if (timeRange) {
      query = query
        .gte(dateField, timeRange.start.toISOString())
        .lte(dateField, timeRange.end.toISOString());
    }

    const { count, data, error } = await query;

    if (error) throw error;

    // If we got data, count by status
    if (data && data.length > 0) {
      const result: Record<string, number> = {};
      for (const item of data) {
        result[item.status] = (result[item.status] || 0) + 1;
      }
      return result;
    }

    return { total: count || 0 };
  } catch (err) {
    logger.error('Failed to get count by status', err, { table });
    return {};
  }
}

/**
 * Get crawl job summary
 */
async function getCrawlJobSummary(
  timeRange?: { start: Date; end: Date }
): Promise<CardSummary> {
  try {
    const supabase = await getSupabaseClient();

    let query = supabase.from('crawl_jobs').select('status');

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const summary: CardSummary = {
      total: 0,
      success: 0,
      failed: 0,
      pending: 0,
      inProgress: 0,
    };

    for (const job of data || []) {
      summary.total++;
      switch (job.status) {
        case 'completed':
          summary.success++;
          break;
        case 'failed':
          summary.failed++;
          break;
        case 'pending':
          summary.pending++;
          break;
        case 'running':
          summary.inProgress++;
          break;
      }
    }

    return summary;
  } catch (err) {
    logger.error('Failed to get crawl job summary', err);
    return { total: 0, success: 0, failed: 0, pending: 0, inProgress: 0 };
  }
}

/**
 * Get publish job summary
 */
async function getPublishJobSummary(
  timeRange?: { start: Date; end: Date }
): Promise<CardSummary> {
  try {
    const supabase = await getSupabaseClient();

    let query = supabase.from('publish_jobs').select('status');

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const summary: CardSummary = {
      total: 0,
      success: 0,
      failed: 0,
      pending: 0,
      inProgress: 0,
    };

    for (const job of data || []) {
      summary.total++;
      switch (job.status) {
        case 'published':
          summary.success++;
          break;
        case 'failed':
          summary.failed++;
          break;
        case 'pending':
        case 'ready':
        case 'scheduled':
        case 'retry_scheduled':
          summary.pending++;
          break;
        case 'publishing':
          summary.inProgress++;
          break;
      }
    }

    return summary;
  } catch (err) {
    logger.error('Failed to get publish job summary', err);
    return { total: 0, success: 0, failed: 0, pending: 0, inProgress: 0 };
  }
}

/**
 * Get AI enrichment summary
 */
async function getAiEnrichmentSummary(
  timeRange?: { start: Date; end: Date }
): Promise<CardSummary> {
  try {
    const supabase = await getSupabaseClient();

    let query = supabase.from('affiliate_contents').select('status');

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const summary: CardSummary = {
      total: 0,
      success: 0,
      failed: 0,
      pending: 0,
      inProgress: 0,
    };

    for (const content of data || []) {
      summary.total++;
      switch (content.status) {
        case 'completed':
          summary.success++;
          break;
        case 'failed':
          summary.failed++;
          break;
        case 'pending':
          summary.pending++;
          break;
        case 'processing':
          summary.inProgress++;
          break;
      }
    }

    return summary;
  } catch (err) {
    logger.error('Failed to get AI enrichment summary', err);
    return { total: 0, success: 0, failed: 0, pending: 0, inProgress: 0 };
  }
}

/**
 * Get dead letter summary
 */
async function getDeadLetterSummary(
  timeRange?: { start: Date; end: Date }
): Promise<CardSummary> {
  try {
    const supabase = await getSupabaseClient();

    let query = supabase.from('dead_letter_jobs').select('status');

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const summary: CardSummary = {
      total: 0,
      success: 0,
      failed: 0,
      pending: 0,
      inProgress: 0,
    };

    for (const dl of data || []) {
      summary.total++;
      switch (dl.status) {
        case 'resolved':
        case 'discarded':
          summary.success++;
          break;
        case 'quarantined':
        case 'review':
          summary.pending++;
          break;
      }
    }

    return summary;
  } catch (err) {
    logger.error('Failed to get dead letter summary', err);
    return { total: 0, success: 0, failed: 0, pending: 0, inProgress: 0 };
  }
}

/**
 * Get active workers count
 */
async function getActiveWorkersSummary(): Promise<CardSummary> {
  try {
    const supabase = await getSupabaseClient();
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes

    const { data, error } = await supabase
      .from('worker_heartbeats')
      .select('worker_id')
      .gte('last_seen_at', staleThreshold);

    if (error) throw error;

    return {
      total: data?.length || 0,
      success: data?.length || 0,
      failed: 0,
      pending: 0,
      inProgress: 0,
    };
  } catch (err) {
    logger.error('Failed to get active workers summary', err);
    return { total: 0, success: 0, failed: 0, pending: 0, inProgress: 0 };
  }
}

/**
 * Get recent failures count
 */
async function getRecentFailuresSummary(
  timeRange?: { start: Date; end: Date }
): Promise<CardSummary> {
  try {
    const supabase = await getSupabaseClient();

    // Count failed crawl and publish jobs
    let query = supabase
      .from('publish_jobs')
      .select('status', { count: 'exact', head: true })
      .eq('status', 'failed');

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { count, error } = await query;

    if (error) throw error;

    return {
      total: count || 0,
      failed: count || 0,
      success: 0,
      pending: 0,
      inProgress: 0,
    };
  } catch (err) {
    logger.error('Failed to get recent failures summary', err);
    return { total: 0, failed: 0, success: 0, pending: 0, inProgress: 0 };
  }
}

/**
 * Get dashboard overview cards
 */
export async function getDashboardOverviewCards(
  options?: { timeRange?: { start: Date; end: Date }; useCache?: boolean }
): Promise<DashboardOverviewCards> {
  const { timeRange, useCache = getDashboardCacheConfig().enabled } = options || {};

  const cacheKey = CacheKeys.overview(timeRange?.start?.toISOString());

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<DashboardOverviewCards>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached overview cards');
      return cached.data;
    }
  }

  // Fetch all summaries in parallel
  const [crawlJobs, publishJobs, aiEnrichment, deadLetters, activeWorkers, recentFailures] =
    await Promise.all([
      getCrawlJobSummary(timeRange),
      getPublishJobSummary(timeRange),
      getAiEnrichmentSummary(timeRange),
      getDeadLetterSummary(timeRange),
      getActiveWorkersSummary(),
      getRecentFailuresSummary(timeRange),
    ]);

  const cards: DashboardOverviewCards = {
    crawlJobs,
    publishJobs,
    aiEnrichment,
    deadLetters,
    activeWorkers,
    recentFailures,
  };

  // Cache the result
  if (useCache) {
    setCachedDashboardResult(cacheKey, cards, { ttl: CACHE_TTL_SECONDS.overview });
  }

  return cards;
}

/**
 * Get dashboard health summary
 */
export async function getDashboardHealthSummaryReadModel(
  options?: { useCache?: boolean }
): Promise<DashboardHealthSummary> {
  const { useCache = getDashboardCacheConfig().enabled } = options || {};

  const cacheKey = CacheKeys.health();

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<DashboardHealthSummary>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached health summary');
      return cached.data;
    }
  }

  try {
    // Use existing control plane health check
    const mockContext = {
      correlationId: 'health-check',
      actor: { id: 'system', role: 'super_admin' as const },
      timestamp: new Date().toISOString(),
    };

    const healthResult = await getSystemHealthSummary(mockContext as any);

    const summary: DashboardHealthSummary = {
      overall: (healthResult.data?.overall as 'healthy' | 'degraded' | 'unhealthy') || 'unknown',
      components: (healthResult.data?.checks || []).map((check: any) => ({
        name: check.component,
        status: check.status,
        message: check.message,
        lastChecked: check.timestamp,
      })),
      lastChecked: new Date().toISOString(),
    };

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, summary, { ttl: CACHE_TTL_SECONDS.health });
    }

    return summary;
  } catch (err) {
    logger.error('Failed to get health summary', err);
    return {
      overall: 'unhealthy',
      components: [],
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Get dashboard queue summary
 */
export async function getDashboardQueueSummaryReadModel(
  options?: { useCache?: boolean }
): Promise<DashboardQueueSummary> {
  const { useCache = getDashboardCacheConfig().enabled } = options || {};

  const cacheKey = CacheKeys.queueSummary();

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<DashboardQueueSummary>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached queue summary');
      return cached.data;
    }
  }

  try {
    const supabase = await getSupabaseClient();

    // Get publish job queue status
    const { data: publishJobs } = await supabase
      .from('publish_jobs')
      .select('status');

    const queue: DashboardQueueSummary = {
      crawlQueue: { pending: 0, ready: 0, inProgress: 0, completed: 0, failed: 0, deadLetter: 0 },
      publishQueue: { pending: 0, ready: 0, inProgress: 0, completed: 0, failed: 0, deadLetter: 0 },
      aiQueue: { pending: 0, ready: 0, inProgress: 0, completed: 0, failed: 0, deadLetter: 0 },
    };

    // Count publish jobs by status
    for (const job of publishJobs || []) {
      switch (job.status) {
        case 'pending':
        case 'scheduled':
        case 'retry_scheduled':
          queue.publishQueue.pending++;
          break;
        case 'ready':
          queue.publishQueue.ready++;
          break;
        case 'publishing':
          queue.publishQueue.inProgress++;
          break;
        case 'published':
          queue.publishQueue.completed++;
          break;
        case 'failed':
          queue.publishQueue.failed++;
          break;
      }
    }

    // Get crawl jobs
    const { data: crawlJobs } = await supabase
      .from('crawl_jobs')
      .select('status');

    for (const job of crawlJobs || []) {
      switch (job.status) {
        case 'pending':
          queue.crawlQueue.pending++;
          break;
        case 'running':
          queue.crawlQueue.inProgress++;
          break;
        case 'completed':
          queue.crawlQueue.completed++;
          break;
        case 'failed':
          queue.crawlQueue.failed++;
          break;
      }
    }

    // Get AI contents
    const { data: aiContents } = await supabase
      .from('affiliate_contents')
      .select('status');

    for (const content of aiContents || []) {
      switch (content.status) {
        case 'pending':
          queue.aiQueue.pending++;
          break;
        case 'processing':
          queue.aiQueue.inProgress++;
          break;
        case 'completed':
          queue.aiQueue.completed++;
          break;
        case 'failed':
          queue.aiQueue.failed++;
          break;
      }
    }

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, queue, { ttl: CACHE_TTL_SECONDS.queueSummary });
    }

    return queue;
  } catch (err) {
    logger.error('Failed to get queue summary', err);
    return {
      crawlQueue: { pending: 0, ready: 0, inProgress: 0, completed: 0, failed: 0, deadLetter: 0 },
      publishQueue: { pending: 0, ready: 0, inProgress: 0, completed: 0, failed: 0, deadLetter: 0 },
      aiQueue: { pending: 0, ready: 0, inProgress: 0, completed: 0, failed: 0, deadLetter: 0 },
    };
  }
}

/**
 * Get full dashboard overview read model
 */
export async function getDashboardOverviewReadModel(
  options?: { timeRange?: { start: Date; end: Date }; useCache?: boolean }
): Promise<{
  cards: DashboardOverviewCards;
  health: DashboardHealthSummary;
  queue: DashboardQueueSummary;
}> {
  const [cards, health, queue] = await Promise.all([
    getDashboardOverviewCards(options),
    getDashboardHealthSummaryReadModel(options),
    getDashboardQueueSummaryReadModel(options),
  ]);

  return { cards, health, queue };
}
