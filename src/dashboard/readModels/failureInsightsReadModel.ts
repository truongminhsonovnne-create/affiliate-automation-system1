/**
 * Dashboard Failure Insights Read Model
 *
 * Builds aggregate failure hotspots and top failure reasons.
 * Matches the actual database schema.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import type {
  DashboardFailureHotspot,
  DashboardFailureSummary,
  FailureReason,
} from '../types.js';
import { buildDateRangeFilter } from '../query/queryBuilder.js';
import { DEFAULT_TIME_RANGE, MAX_FAILURE_REASONS, MAX_HOTSPOT_ERRORS } from '../constants.js';
import { getCachedDashboardResult, setCachedDashboardResult, CacheKeys } from '../query/cache.js';
import { CACHE_TTL_SECONDS } from '../constants.js';

const logger = createLogger({ subsystem: 'dashboard_failure_insights_read_model' });

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
 * Get failure hotspots
 */
export async function getFailureHotspots(
  options?: {
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }
): Promise<DashboardFailureHotspot[]> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.trends('failure', options?.timeRange?.start?.toISOString() || 'default', 'hotspots');

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<DashboardFailureHotspot[]>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached failure hotspots');
      return cached.data;
    }
  }

  try {
    const supabase = await getSupabaseClient();
    const timeRange = options?.timeRange || buildDateRangeFilter(DEFAULT_TIME_RANGE, undefined);
    const limit = options?.limit || MAX_FAILURE_REASONS;

    // Get failed jobs from publish_jobs (uses error_message column)
    const { data: publishFailures } = await supabase
      .from('publish_jobs')
      .select('id, channel, error_message, updated_at, status')
      .eq('status', 'failed')
      .gte('updated_at', timeRange?.start.toISOString());

    // Get failed crawl jobs (uses error_message column)
    const { data: crawlFailures } = await supabase
      .from('crawl_jobs')
      .select('id, platform, error_message, finished_at, status')
      .eq('status', 'failed')
      .gte('finished_at', timeRange?.start.toISOString());

    // Note: affiliate_contents doesn't have explicit status field in current schema
    // We'll skip AI failures for now as they're not tracked with explicit status

    // Aggregate by subsystem/channel/type
    const hotspotsMap = new Map<string, DashboardFailureHotspot>();

    // Process publish failures
    for (const failure of publishFailures || []) {
      const key = `publish:${failure.channel}`;
      const existing = hotspotsMap.get(key) || {
        category: 'publish',
        subsystem: failure.channel,
        count: 0,
        lastOccurred: failure.updated_at,
        recentErrors: [],
        affectedJobs: 0,
      };

      existing.count++;
      existing.affectedJobs++;
      existing.lastOccurred = failure.updated_at;
      if (failure.error_message && !existing.recentErrors.includes(failure.error_message)) {
        existing.recentErrors.push(failure.error_message);
        if (existing.recentErrors.length > MAX_HOTSPOT_ERRORS) {
          existing.recentErrors.pop();
        }
      }

      hotspotsMap.set(key, existing);
    }

    // Process crawl failures
    for (const failure of crawlFailures || []) {
      const key = `crawl:${failure.platform}`;
      const existing = hotspotsMap.get(key) || {
        category: 'crawl',
        subsystem: failure.platform,
        count: 0,
        lastOccurred: failure.finished_at,
        recentErrors: [],
        affectedJobs: 0,
      };

      existing.count++;
      existing.affectedJobs++;
      existing.lastOccurred = failure.finished_at;
      if (failure.error_message && !existing.recentErrors.includes(failure.error_message)) {
        existing.recentErrors.push(failure.error_message);
        if (existing.recentErrors.length > MAX_HOTSPOT_ERRORS) {
          existing.recentErrors.pop();
        }
      }

      hotspotsMap.set(key, existing);
    }

    // Convert to array and sort by count
    const hotspots = Array.from(hotspotsMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, hotspots, { ttl: CACHE_TTL_SECONDS.list });
    }

    return hotspots;
  } catch (err) {
    logger.error('Failed to get failure hotspots', err);
    return [];
  }
}

/**
 * Get top failure reasons
 */
export async function getTopFailureReasons(
  options?: {
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }
): Promise<FailureReason[]> {
  try {
    const supabase = await getSupabaseClient();
    const timeRange = options?.timeRange || buildDateRangeFilter(DEFAULT_TIME_RANGE, undefined);
    const limit = options?.limit || MAX_FAILURE_REASONS;

    // Get failed jobs
    const { data: publishFailures } = await supabase
      .from('publish_jobs')
      .select('error_message, updated_at')
      .eq('status', 'failed')
      .gte('updated_at', timeRange?.start.toISOString());

    const { data: crawlFailures } = await supabase
      .from('crawl_jobs')
      .select('error_message, finished_at')
      .eq('status', 'failed')
      .gte('finished_at', timeRange?.start.toISOString());

    // Aggregate reasons
    const reasonsMap = new Map<string, { count: number; firstOccurred: string; lastOccurred: string }>();

    for (const failure of publishFailures || []) {
      const reason = truncateReason(failure.error_message);
      const existing = reasonsMap.get(reason) || { count: 0, firstOccurred: failure.updated_at, lastOccurred: failure.updated_at };
      existing.count++;
      if (failure.updated_at < existing.firstOccurred) existing.firstOccurred = failure.updated_at;
      if (failure.updated_at > existing.lastOccurred) existing.lastOccurred = failure.updated_at;
      reasonsMap.set(reason, existing);
    }

    for (const failure of crawlFailures || []) {
      const reason = truncateReason(failure.error_message);
      const existing = reasonsMap.get(reason) || { count: 0, firstOccurred: failure.finished_at, lastOccurred: failure.finished_at };
      existing.count++;
      if (failure.finished_at < existing.firstOccurred) existing.firstOccurred = failure.finished_at;
      if (failure.finished_at > existing.lastOccurred) existing.lastOccurred = failure.finished_at;
      reasonsMap.set(reason, existing);
    }

    // Calculate total for percentages
    let total = 0;
    for (const reason of reasonsMap.values()) {
      total += reason.count;
    }

    // Convert to array and calculate percentages
    const reasons: FailureReason[] = Array.from(reasonsMap.entries())
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        percentage: total > 0 ? (data.count / total) * 100 : 0,
        firstOccurred: data.firstOccurred,
        lastOccurred: data.lastOccurred,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return reasons;
  } catch (err) {
    logger.error('Failed to get top failure reasons', err);
    return [];
  }
}

/**
 * Get subsystem failure summary
 */
export async function getSubsystemFailureSummary(
  options?: {
    timeRange?: { start: Date; end: Date };
  }
): Promise<DashboardFailureSummary> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.trends('failure', options?.timeRange?.start?.toISOString() || 'default', 'summary');

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<DashboardFailureSummary>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached subsystem failure summary');
      return cached.data;
    }
  }

  try {
    const timeRange = options?.timeRange || buildDateRangeFilter(DEFAULT_TIME_RANGE, undefined);

    const [hotspots, topReasons] = await Promise.all([
      getFailureHotspots({ timeRange }),
      getTopFailureReasons({ timeRange }),
    ]);

    // Calculate totals
    let totalFailures = 0;
    for (const hotspot of hotspots) {
      totalFailures += hotspot.count;
    }

    // Calculate overall failure rate (failures / total jobs)
    const supabase = await getSupabaseClient();

    const { count: totalPublishJobs } = await supabase
      .from('publish_jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', timeRange?.start.toISOString());

    const { count: totalCrawlJobs } = await supabase
      .from('crawl_jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', timeRange?.start.toISOString());

    const totalJobs = (totalPublishJobs || 0) + (totalCrawlJobs || 0);
    const failureRate = totalJobs > 0 ? (totalFailures / totalJobs) * 100 : 0;

    const summary: DashboardFailureSummary = {
      hotspots,
      topReasons,
      totalFailures,
      failureRate,
    };

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, summary, { ttl: CACHE_TTL_SECONDS.list });
    }

    return summary;
  } catch (err) {
    logger.error('Failed to get subsystem failure summary', err);
    return {
      hotspots: [],
      topReasons: [],
      totalFailures: 0,
      failureRate: 0,
    };
  }
}

/**
 * Truncate reason string
 */
function truncateReason(reason?: string | null, maxLength: number = 100): string {
  if (!reason) return 'Unknown error';
  return reason.length > maxLength ? reason.substring(0, maxLength) + '...' : reason;
}
