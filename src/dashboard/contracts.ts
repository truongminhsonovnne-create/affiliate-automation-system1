/**
 * Dashboard Contracts
 *
 * Production-grade response contracts for dashboard APIs.
 * Ensures consistent API responses across all dashboard endpoints.
 */

import type {
  DashboardApiResponse,
  DashboardApiError,
  DashboardResponseMeta,
  DashboardPageResult,
} from './types.js';
import { DASHBOARD_API_VERSION, DASHBOARD_CORRELATION_PREFIX } from './constants.js';

/**
 * Generate correlation ID for dashboard requests
 */
export function generateDashboardCorrelationId(): string {
  return `${DASHBOARD_CORRELATION_PREFIX}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Build dashboard success response
 */
export function buildDashboardSuccessResponse<T>(
  data: T,
  meta?: Partial<DashboardResponseMeta>
): DashboardApiResponse<T> {
  const correlationId = generateDashboardCorrelationId();

  return {
    ok: true,
    status: 'success',
    data,
    meta: {
      version: DASHBOARD_API_VERSION,
      ...meta,
    },
    timestamp: new Date().toISOString(),
    correlationId,
  };
}

/**
 * Build dashboard error response
 */
export function buildDashboardErrorResponse(
  error: DashboardApiError,
  meta?: Partial<DashboardResponseMeta>
): DashboardApiResponse<null> {
  const correlationId = generateDashboardCorrelationId();

  return {
    ok: false,
    status: 'error',
    error,
    meta: {
      version: DASHBOARD_API_VERSION,
      ...meta,
    },
    timestamp: new Date().toISOString(),
    correlationId,
  };
}

/**
 * Build dashboard page response
 */
export function buildDashboardPageResponse<T>(
  items: T[],
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  },
  meta?: Partial<DashboardResponseMeta>
): DashboardApiResponse<DashboardPageResult<T>> {
  return buildDashboardSuccessResponse(
    {
      items,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: pagination.totalItems,
        totalPages: pagination.totalPages,
        hasMore: pagination.hasMore,
      },
    },
    meta
  );
}

/**
 * Build validation error response
 */
export function buildDashboardValidationError(
  message: string,
  details?: Record<string, unknown>,
  field?: string
): DashboardApiResponse<null> {
  return buildDashboardErrorResponse({
    code: 'VALIDATION_ERROR',
    message,
    details,
    field,
  });
}

/**
 * Build not found error response
 */
export function buildDashboardNotFoundError(
  resource: string,
  id: string,
  message?: string
): DashboardApiResponse<null> {
  return buildDashboardErrorResponse({
    code: 'NOT_FOUND',
    message: message || `${resource} with id '${id}' not found`,
    details: { resource, id },
  });
}

/**
 * Build internal error response
 */
export function buildDashboardInternalError(
  message: string,
  details?: Record<string, unknown>
): DashboardApiResponse<null> {
  return buildDashboardErrorResponse({
    code: 'INTERNAL_ERROR',
    message,
    details,
  });
}

/**
 * Build invalid query error response
 */
export function buildDashboardInvalidQueryError(
  message: string,
  details?: Record<string, unknown>
): DashboardApiResponse<null> {
  return buildDashboardErrorResponse({
    code: 'INVALID_QUERY',
    message,
    details,
  });
}

/**
 * Create response builder with pre-configured correlation ID
 */
export function createDashboardResponseBuilder(correlationId?: string) {
  const cid = correlationId || generateDashboardCorrelationId();

  return {
    success<T>(data: T, meta?: Partial<DashboardResponseMeta>): DashboardApiResponse<T> {
      return {
        ok: true,
        status: 'success',
        data,
        meta: { version: DASHBOARD_API_VERSION, ...meta },
        timestamp: new Date().toISOString(),
        correlationId: cid,
      };
    },

    page<T>(
      items: T[],
      pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
        hasMore: boolean;
      },
      meta?: Partial<DashboardResponseMeta>
    ): DashboardApiResponse<DashboardPageResult<T>> {
      return this.success(
        {
          items,
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            totalItems: pagination.totalItems,
            totalPages: pagination.totalPages,
            hasMore: pagination.hasMore,
          },
        },
        meta
      );
    },

    error(error: DashboardApiError, meta?: Partial<DashboardResponseMeta>): DashboardApiResponse<null> {
      return {
        ok: false,
        status: 'error',
        error,
        meta: { version: DASHBOARD_API_VERSION, ...meta },
        timestamp: new Date().toISOString(),
        correlationId: cid,
      };
    },

    validationError(message: string, details?: Record<string, unknown>, field?: string) {
      return this.error({ code: 'VALIDATION_ERROR', message, details, field });
    },

    notFoundError(resource: string, id: string, message?: string) {
      return this.error({
        code: 'NOT_FOUND',
        message: message || `${resource} with id '${id}' not found`,
        details: { resource, id },
      });
    },

    internalError(message: string, details?: Record<string, unknown>) {
      return this.error({ code: 'INTERNAL_ERROR', message, details });
    },
  };
}
