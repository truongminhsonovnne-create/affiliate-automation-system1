/*
 * Dashboard API -- Browser-Safe
 *
 * Uses native fetch to call the internal proxy route.
 * Safe to import in 'use client' components.
 *
 * IMPORTANT: All routes go through /api/admin/proxy to avoid
 * exposing internal API URLs to the browser.
 */

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

const PROXY_BASE = '/api/admin/proxy';

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

/**
 * Fetch via proxy route (browser-safe).
 */
async function proxyFetch<T>(path: string): Promise<ApiResponse<T>> {
  const url = `${PROXY_BASE}?path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) {
    return {
      ok: false,
      status: 'error',
      error: { code: `HTTP_${res.status}`, message: `Request failed: ${res.status}` },
      timestamp: new Date().toISOString(),
      correlationId: '',
    };
  }
  return res.json() as Promise<ApiResponse<T>>;
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
  return proxyFetch<DashboardOverview>(`/internal/dashboard/overview${queryString}`);
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
  return proxyFetch<any>(`/internal/dashboard/activity${queryString}`);
}

/**
 * Get failure insights
 */
export async function fetchFailureInsights(
  filters?: { timeRange?: string; customTimeRange?: { start: string; end: string }; limit?: number }
): Promise<ApiResponse<DashboardFailureSummary>> {
  const queryString = buildQueryString(filters);
  return proxyFetch<DashboardFailureSummary>(`/internal/dashboard/failure-insights${queryString}`);
}

/**
 * Get failure trends
 */
export async function fetchFailureTrends(
  filters?: { timeRange?: string }
): Promise<ApiResponse<DashboardTrends>> {
  const queryString = buildQueryString(filters);
  return proxyFetch<DashboardTrends>(`/internal/dashboard/trends${queryString}`);
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
  const response = await proxyFetch<any>(`/internal/dashboard/products${queryString}`);
  return {
    ok: response.ok,
    status: response.status,
    data: {
      data: (response as any).data?.items ?? (response as any).data?.data ?? [],
      meta: (response as any).data?.pagination ?? {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 20,
        total: (response as any).data?.data?.length ?? 0,
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
  return proxyFetch<ProductRecord>(`/internal/dashboard/products/${productId}`);
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
  const response = await proxyFetch<any>(`/internal/dashboard/crawl-jobs${queryString}`);
  return {
    ok: response.ok,
    status: response.status,
    data: {
      data: (response as any).data?.items ?? (response as any).data?.data ?? [],
      meta: (response as any).data?.pagination ?? {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 20,
        total: (response as any).data?.data?.length ?? 0,
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
  return proxyFetch<CrawlJobRecord>(`/internal/dashboard/crawl-jobs/${jobId}`);
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
  const response = await proxyFetch<any>(`/internal/dashboard/publish-jobs${queryString}`);
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
  return proxyFetch<PublishJobRecord>(`/internal/dashboard/publish-jobs/${jobId}`);
}

/**
 * Create a new publish job
 *
 * NOTE: This does NOT go through the proxy — it calls the publish-jobs
 * route directly (which has its own auth + RBAC checks).
 *
 * @param payload  - job creation fields
 * @returns         - { id: string } on success
 */
export async function createPublishJob(
  payload: {
    platform: string;
    contentType?: string;
    sourceType?: string;
    productIds?: string;
    scheduledAt?: string | null;
    channel?: string;
    priority?: number;
    title?: string;
    description?: string;
  }
): Promise<{ ok: boolean; data?: { id?: string }; error?: string }> {
  const res = await fetch('/api/admin/publish-jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json() as { data?: { id?: string; jobId?: string; job_id?: string }; error?: string; message?: string };

  if (!res.ok) {
    return { ok: false, error: json.error ?? json.message ?? 'Unknown error' };
  }

  return {
    ok: true,
    data: {
      id: json.data?.id ?? json.data?.jobId ?? json.data?.job_id,
    },
  };
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
  const response = await proxyFetch<any>(`/internal/dashboard/ai-contents${queryString}`);
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
  return proxyFetch<AiContentRecord>(`/internal/dashboard/ai-contents/${contentId}`);
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
  const response = await proxyFetch<any>(`/internal/dashboard/dead-letters${queryString}`);
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
  return proxyFetch<DeadLetterRecord>(`/internal/dashboard/dead-letters/${id}`);
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
  const response = await proxyFetch<any>(`/internal/dashboard/workers${queryString}`);
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
  return proxyFetch<WorkerRecord>(`/internal/dashboard/workers/${workerIdentity}`);
}

// =============================================================================
// Re-export hooks for convenience
// =============================================================================

export { useDashboardOverview, useProducts, useCrawlJobs, usePublishJobs, useAiContents, useDeadLetters, useWorkers, useActivityFeed, useFailureInsights } from './hooks';
