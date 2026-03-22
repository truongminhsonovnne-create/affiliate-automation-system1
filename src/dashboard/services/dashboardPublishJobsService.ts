/**
 * Dashboard Publish Jobs Service
 *
 * High-level service for dashboard publish jobs data.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import { getPublishJobDashboardList, getPublishJobDashboardDetail, getPublishQueueSummary, getPublishFailureSummary } from '../readModels/publishJobsReadModel.js';

const logger = createLogger({ subsystem: 'dashboard_publish_jobs_service' });

/**
 * Get dashboard publish jobs
 */
export async function getDashboardPublishJobs(
  filters: {
    status?: string | string[];
    channel?: string | string[];
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
    const result = await getPublishJobDashboardList(filters, options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard publish jobs fetched', {
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
    logger.error('Failed to get dashboard publish jobs', err);
    throw err;
  }
}

/**
 * Get dashboard publish job detail
 */
export async function getDashboardPublishJobDetail(
  jobId: string,
  options?: { useCache?: boolean }
): Promise<any | null> {
  const startTime = Date.now();

  try {
    const result = await getPublishJobDashboardDetail(jobId, options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard publish job detail fetched', {
      queryTimeMs,
      jobId,
      found: !!result
    });

    return result;
  } catch (err) {
    logger.error('Failed to get dashboard publish job detail', err, { jobId });
    throw err;
  }
}
