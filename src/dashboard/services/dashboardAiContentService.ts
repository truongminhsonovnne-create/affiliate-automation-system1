/**
 * Dashboard AI Content Service
 *
 * High-level service for dashboard AI content data.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import { getAiContentDashboardList, getAiContentDashboardDetail, getAiEnrichmentSummary } from '../readModels/aiContentReadModel.js';

const logger = createLogger({ subsystem: 'dashboard_ai_content_service' });

/**
 * Get dashboard AI contents
 */
export async function getDashboardAiContents(
  filters: {
    status?: string | string[];
    model?: string;
    promptVersion?: string;
    hasProduct?: boolean;
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
    const result = await getAiContentDashboardList(filters, options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard AI contents fetched', {
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
    logger.error('Failed to get dashboard AI contents', err);
    throw err;
  }
}

/**
 * Get dashboard AI content detail
 */
export async function getDashboardAiContentDetail(
  contentId: string,
  options?: { useCache?: boolean }
): Promise<any | null> {
  const startTime = Date.now();

  try {
    const result = await getAiContentDashboardDetail(contentId, options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard AI content detail fetched', {
      queryTimeMs,
      contentId,
      found: !!result
    });

    return result;
  } catch (err) {
    logger.error('Failed to get dashboard AI content detail', err, { contentId });
    throw err;
  }
}
