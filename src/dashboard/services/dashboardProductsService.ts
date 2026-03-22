/**
 * Dashboard Products Service
 *
 * High-level service for dashboard products data.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import { getProductDashboardList, getProductDashboardDetail, searchProductDashboardRecords } from '../readModels/productsReadModel.js';

const logger = createLogger({ subsystem: 'dashboard_products_service' });

/**
 * Get dashboard products
 */
export async function getDashboardProducts(
  filters: {
    status?: string | string[];
    source?: string | string[];
    categoryId?: string;
    hasAiContent?: boolean;
    hasPublished?: boolean;
    search?: string;
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
    const result = await getProductDashboardList(filters, options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard products fetched', {
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
    logger.error('Failed to get dashboard products', err);
    throw err;
  }
}

/**
 * Get dashboard product detail
 */
export async function getDashboardProductDetail(
  productId: string,
  options?: { useCache?: boolean }
): Promise<any | null> {
  const startTime = Date.now();

  try {
    const result = await getProductDashboardDetail(productId, options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard product detail fetched', {
      queryTimeMs,
      productId,
      found: !!result
    });

    return result;
  } catch (err) {
    logger.error('Failed to get dashboard product detail', err, { productId });
    throw err;
  }
}
