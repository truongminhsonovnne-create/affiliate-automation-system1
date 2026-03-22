/**
 * Dashboard Crawl Jobs Service
 *
 * High-level service for dashboard crawl jobs data.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import { getCrawlJobDashboardList, getCrawlJobDashboardDetail, getCrawlJobTrendSummary } from '../readModels/crawlJobsReadModel.js';

const logger = createLogger({ subsystem: 'dashboard_crawl_jobs_service' });

/**
 * Get dashboard crawl jobs
 */
export async function getDashboardCrawlJobs(
  filters: {
    status?: string | string[];
    type?: string | string[];
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
  items: any[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  };
}> {
  const startTime = Date.now();

  try {
    const result = await getCrawlJobDashboardList(filters, options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard crawl jobs fetched', {
      queryTimeMs,
      count: result.items.length,
      total: result.total
    });

    return {
      items: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
        hasMore: result.page * result.pageSize < result.total,
      },
    };
  } catch (err) {
    logger.error('Failed to get dashboard crawl jobs', err);
    throw err;
  }
}

/**
 * Get dashboard crawl job detail
 */
export async function getDashboardCrawlJobDetail(
  jobId: string,
  options?: { useCache?: boolean }
): Promise<any | null> {
  const startTime = Date.now();

  try {
    const result = await getCrawlJobDashboardDetail(jobId, options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard crawl job detail fetched', {
      queryTimeMs,
      jobId,
      found: !!result
    });

    return result;
  } catch (err) {
    logger.error('Failed to get dashboard crawl job detail', err, { jobId });
    throw err;
  }
}
