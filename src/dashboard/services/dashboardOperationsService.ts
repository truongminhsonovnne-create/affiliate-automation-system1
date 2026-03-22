/**
 * Dashboard Operations Service
 *
 * High-level service for dashboard operations data:
 * - Activity feed
 * - Failure insights
 * - Trend data
 * - Dead letters
 * - Workers
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import { getDashboardActivityFeed } from '../readModels/activityFeedReadModel.js';
import { getSubsystemFailureSummary } from '../readModels/failureInsightsReadModel.js';
import { getAllTrendSeries } from '../readModels/trendsReadModel.js';
import { getDeadLetterDashboardList, getDeadLetterDashboardDetail, getDeadLetterSummary } from '../readModels/deadLetterReadModel.js';
import { getWorkerDashboardList, getWorkerDashboardDetail, getWorkerHealthSummary } from '../readModels/workersReadModel.js';

const logger = createLogger({ subsystem: 'dashboard_operations_service' });

/**
 * Get dashboard activity
 */
export async function getDashboardActivity(
  options?: {
    limit?: number;
    page?: number;
    pageSize?: number;
    timeRange?: { start: Date; end: Date };
    sources?: string[];
    severities?: string[];
    types?: string[];
  }
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
    const result = await getDashboardActivityFeed(options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard activity fetched', { queryTimeMs, count: result.items.length });

    return {
      items: result.items,
      pagination: result.pagination,
    };
  } catch (err) {
    logger.error('Failed to get dashboard activity', err);
    throw err;
  }
}

/**
 * Get dashboard failure insights
 */
export async function getDashboardFailureInsights(
  options?: {
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }
): Promise<any> {
  const startTime = Date.now();

  try {
    const result = await getSubsystemFailureSummary(options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard failure insights fetched', { queryTimeMs });

    return result;
  } catch (err) {
    logger.error('Failed to get dashboard failure insights', err);
    throw err;
  }
}

/**
 * Get dashboard trend data
 */
export async function getDashboardTrendData(
  options?: {
    timeRange?: string;
    customTimeRange?: { start: Date; end: Date };
    bucketSize?: 'hour' | 'day';
  }
): Promise<{
  crawl: any;
  publish: any;
  aiEnrichment: any;
}> {
  const startTime = Date.now();

  try {
    const result = await getAllTrendSeries(options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard trend data fetched', { queryTimeMs });

    return result;
  } catch (err) {
    logger.error('Failed to get dashboard trend data', err);
    throw err;
  }
}

/**
 * Get dashboard dead letters
 */
export async function getDashboardDeadLetters(
  filters: {
    status?: string | string[];
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
    const result = await getDeadLetterDashboardList(filters, options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard dead letters fetched', {
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
    logger.error('Failed to get dashboard dead letters', err);
    throw err;
  }
}

/**
 * Get dashboard workers
 */
export async function getDashboardWorkers(
  filters: {
    status?: string | string[];
    type?: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
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
    const result = await getWorkerDashboardList(filters, options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard workers fetched', {
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
    logger.error('Failed to get dashboard workers', err);
    throw err;
  }
}

/**
 * Get dashboard worker detail
 */
export async function getDashboardWorkerDetail(
  workerIdentity: string,
  options?: { useCache?: boolean }
): Promise<any | null> {
  const startTime = Date.now();

  try {
    const result = await getWorkerDashboardDetail(workerIdentity, options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard worker detail fetched', { queryTimeMs, workerIdentity, found: !!result });

    return result;
  } catch (err) {
    logger.error('Failed to get dashboard worker detail', err, { workerIdentity });
    throw err;
  }
}
