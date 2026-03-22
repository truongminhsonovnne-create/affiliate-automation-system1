/*
 * Dashboard API -- SERVER-SIDE ONLY
 *
 * This module imports internalApiClient which MUST NOT be used in browser code.
 * Only import this in:
 *   - Next.js Server Components
 *   - Next.js Route Handlers (route handlers)
 *   - Backend scripts
 *
 * For browser-to-internal-API communication, use the /api/admin/proxy route handler.
 *
 * The internalApiClient has a runtime guard that throws if imported client-side.
 */

import { InternalApiClient } from './internalApiClient';
import type {
  ApiResponse,
  DashboardOverview,
  DashboardActivityFeed,
  DashboardFailureSummary,
  DashboardTrends,
  ProductRecord,
  CrawlJobRecord,
  PublishJobRecord,
  AiContentRecord,
  DeadLetterRecord,
  WorkerRecord,
  ListQueryFilters,
  PaginationMeta,
} from '../types/api';

// Create singleton instance
const apiClient = new InternalApiClient();

/**
 * Build query string from filters
 */
function buildQueryString(filters?: Record<string, unknown>): string {
  if (!filters || Object.keys(filters).length === 0) {
    return '';
  }

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        params.set(key, value.join(','));
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects like customTimeRange
        Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
          if (nestedValue !== undefined && nestedValue !== null) {
            params.set(`${key}.${nestedKey}`, String(nestedValue));
          }
        });
      } else {
        params.set(key, String(value));
      }
    }
  });

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// =============================================================================
// Dashboard Overview
// =============================================================================

/**
 * Get dashboard overview
 */
export async function fetchDashboardOverview(
  filters?: { timeRange?: string; customTimeRange?: { start: string; end: string } }
): Promise<ApiResponse<DashboardOverview>> {
  const queryString = buildQueryString(filters);
  return apiClient.get<DashboardOverview>(`/internal/dashboard/overview${queryString}`);
}

// =============================================================================
// Activity Feed
// =============================================================================

/**
 * Get activity feed
 */
export async function fetchActivityFeed(
  filters?: ListQueryFilters & { sources?: string[]; severities?: string[]; types?: string[] }
): Promise<ApiResponse<{ data: any[]; meta: PaginationMeta }>> {
  const queryString = buildQueryString(filters);
  const response = await apiClient.get<any>(`/internal/dashboard/activity${queryString}`);
  return response;
}

/**
 * Get failure insights
 */
export async function fetchFailureInsights(
  filters?: { timeRange?: string; customTimeRange?: { start: string; end: string }; limit?: number }
): Promise<ApiResponse<DashboardFailureSummary>> {
  const queryString = buildQueryString(filters);
  return apiClient.get<DashboardFailureSummary>(`/internal/dashboard/failure-insights${queryString}`);
}

/**
 * Get failure trends
 */
export async function fetchFailureTrends(
  filters?: { timeRange?: string }
): Promise<ApiResponse<DashboardTrends>> {
  const queryString = buildQueryString(filters);
  return apiClient.get<DashboardTrends>(`/internal/dashboard/trends${queryString}`);
}

// =============================================================================
// Products
// =============================================================================

/**
 * Get products list
 */
export async function fetchProducts(
  filters?: ListQueryFilters
): Promise<ApiResponse<{ data: ProductRecord[]; meta: PaginationMeta }>> {
  const queryString = buildQueryString(filters);
  const response = await apiClient.get<any>(`/internal/dashboard/products${queryString}`);
  return {
    ok: response.ok,
    status: response.status,
    data: {
      data: response.data?.items ?? response.data?.data ?? [],
      meta: response.data?.pagination ?? {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 20,
        total: response.data?.data?.length ?? 0,
        totalPages: 1,
      },
    },
    timestamp: response.timestamp,
    correlationId: response.correlationId,
  };
}

/**
 * Get product detail
 */
export async function fetchProductDetail(
  productId: string
): Promise<ApiResponse<ProductRecord>> {
  return apiClient.get<ProductRecord>(`/internal/dashboard/products/${productId}`);
}

// =============================================================================
// Crawl Jobs
// =============================================================================

/**
 * Get crawl jobs list
 */
export async function fetchCrawlJobs(
  filters?: ListQueryFilters
): Promise<ApiResponse<{ data: CrawlJobRecord[]; meta: PaginationMeta }>> {
  const queryString = buildQueryString(filters);
  const response = await apiClient.get<any>(`/internal/dashboard/crawl-jobs${queryString}`);
  return {
    ok: response.ok,
    status: response.status,
    data: {
      data: response.data?.items ?? response.data?.data ?? [],
      meta: response.data?.pagination ?? {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 20,
        total: response.data?.data?.length ?? 0,
        totalPages: 1,
      },
    },
    timestamp: response.timestamp,
    correlationId: response.correlationId,
  };
}

/**
 * Get crawl job detail
 */
export async function fetchCrawlJobDetail(
  jobId: string
): Promise<ApiResponse<CrawlJobRecord>> {
  return apiClient.get<CrawlJobRecord>(`/internal/dashboard/crawl-jobs/${jobId}`);
}

// =============================================================================
// Publish Jobs
// =============================================================================

/**
 * Get publish jobs list
 */
export async function fetchPublishJobs(
  filters?: ListQueryFilters
): Promise<ApiResponse<{ data: PublishJobRecord[]; meta: PaginationMeta }>> {
  const queryString = buildQueryString(filters);
  const response = await apiClient.get<any>(`/internal/dashboard/publish-jobs${queryString}`);
  return {
    ok: response.ok,
    status: response.status,
    data: {
      data: response.data?.items ?? response.data?.data ?? [],
      meta: response.data?.pagination ?? {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 20,
        total: response.data?.data?.length ?? 0,
        totalPages: 1,
      },
    },
    timestamp: response.timestamp,
    correlationId: response.correlationId,
  };
}

/**
 * Get publish job detail
 */
export async function fetchPublishJobDetail(
  jobId: string
): Promise<ApiResponse<PublishJobRecord>> {
  return apiClient.get<PublishJobRecord>(`/internal/dashboard/publish-jobs/${jobId}`);
}

// =============================================================================
// AI Contents
// =============================================================================

/**
 * Get AI contents list
 */
export async function fetchAiContents(
  filters?: ListQueryFilters
): Promise<ApiResponse<{ data: AiContentRecord[]; meta: PaginationMeta }>> {
  const queryString = buildQueryString(filters);
  const response = await apiClient.get<any>(`/internal/dashboard/ai-contents${queryString}`);
  return {
    ok: response.ok,
    status: response.status,
    data: {
      data: response.data?.items ?? response.data?.data ?? [],
      meta: response.data?.pagination ?? {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 20,
        total: response.data?.data?.length ?? 0,
        totalPages: 1,
      },
    },
    timestamp: response.timestamp,
    correlationId: response.correlationId,
  };
}

/**
 * Get AI content detail
 */
export async function fetchAiContentDetail(
  contentId: string
): Promise<ApiResponse<AiContentRecord>> {
  return apiClient.get<AiContentRecord>(`/internal/dashboard/ai-contents/${contentId}`);
}

// =============================================================================
// Dead Letters
// =============================================================================

/**
 * Get dead letters list
 */
export async function fetchDeadLetters(
  filters?: ListQueryFilters
): Promise<ApiResponse<{ data: DeadLetterRecord[]; meta: PaginationMeta }>> {
  const queryString = buildQueryString(filters);
  const response = await apiClient.get<any>(`/internal/dashboard/dead-letters${queryString}`);
  return {
    ok: response.ok,
    status: response.status,
    data: {
      data: response.data?.items ?? response.data?.data ?? [],
      meta: response.data?.pagination ?? {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 20,
        total: response.data?.data?.length ?? 0,
        totalPages: 1,
      },
    },
    timestamp: response.timestamp,
    correlationId: response.correlationId,
  };
}

/**
 * Get dead letter detail
 */
export async function fetchDeadLetterDetail(
  id: string
): Promise<ApiResponse<DeadLetterRecord>> {
  return apiClient.get<DeadLetterRecord>(`/internal/dashboard/dead-letters/${id}`);
}

// =============================================================================
// Workers
// =============================================================================

/**
 * Get workers list
 */
export async function fetchWorkers(
  filters?: ListQueryFilters
): Promise<ApiResponse<{ data: WorkerRecord[]; meta: PaginationMeta }>> {
  const queryString = buildQueryString(filters);
  const response = await apiClient.get<any>(`/internal/dashboard/workers${queryString}`);
  return {
    ok: response.ok,
    status: response.status,
    data: {
      data: response.data?.items ?? response.data?.data ?? [],
      meta: response.data?.pagination ?? {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 20,
        total: response.data?.data?.length ?? 0,
        totalPages: 1,
      },
    },
    timestamp: response.timestamp,
    correlationId: response.correlationId,
  };
}

/**
 * Get worker detail
 */
export async function fetchWorkerDetail(
  workerIdentity: string
): Promise<ApiResponse<WorkerRecord>> {
  return apiClient.get<WorkerRecord>(`/internal/dashboard/workers/${workerIdentity}`);
}

// =============================================================================
// Re-export hooks for convenience
// =============================================================================

export { useDashboardOverview, useProducts, useCrawlJobs, usePublishJobs, useAiContents, useDeadLetters, useWorkers, useActivityFeed, useFailureInsights } from './hooks';
