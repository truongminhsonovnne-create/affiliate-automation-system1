/**
 * Control Plane Contracts
 *
 * Production-grade API response contracts for consistent responses
 * across all internal admin APIs.
 */

import type {
  AdminApiResponse,
  AdminApiStatus,
  AdminApiError,
  AdminResponseMeta,
  PaginationMeta,
  TimingMeta,
} from './types.js';
import { RESPONSE_VERSION, API_VERSION } from './constants.js';

/** Generate unique request ID */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Build a successful API response
 */
export function buildSuccessResponse<T>(
  data: T,
  meta?: Partial<AdminResponseMeta>
): AdminApiResponse<T> {
  return {
    ok: true,
    status: 'success',
    data,
    meta: {
      version: RESPONSE_VERSION,
      ...meta,
    },
    correlationId: meta?.correlationId || '',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build an error API response
 */
export function buildErrorResponse<T = unknown>(
  error: AdminApiError,
  meta?: Partial<AdminResponseMeta>
): AdminApiResponse<T> {
  return {
    ok: false,
    status: 'error',
    error,
    meta: {
      version: RESPONSE_VERSION,
      ...meta,
    },
    correlationId: meta?.correlationId || '',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build a warning API response
 */
export function buildWarningResponse<T>(
  data: T,
  warnings: string[],
  meta?: Partial<AdminResponseMeta>
): AdminApiResponse<T> {
  return {
    ok: true,
    status: 'warning',
    data,
    warnings,
    meta: {
      version: RESPONSE_VERSION,
      ...meta,
    },
    correlationId: meta?.correlationId || '',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build a paginated response
 */
export function buildPaginatedResponse<T>(
  items: T[],
  pagination: PaginationMeta,
  meta?: Partial<AdminResponseMeta>
): AdminApiResponse<T[]> {
  return buildSuccessResponse(items, {
    ...meta,
    pagination,
  });
}

/**
 * Build validation error response
 */
export function buildValidationError(
  message: string,
  field?: string,
  details?: Record<string, unknown>,
  meta?: Partial<AdminResponseMeta>
): AdminApiResponse<never> {
  return buildErrorResponse(
    {
      code: 'VALIDATION_ERROR',
      message,
      field,
      details,
    },
    meta
  );
}

/**
 * Build authorization error response
 */
export function buildAuthorizationError(
  message: string = 'Insufficient permissions',
  meta?: Partial<AdminResponseMeta>
): AdminApiResponse<never> {
  return buildErrorResponse(
    {
      code: 'FORBIDDEN',
      message,
    },
    meta
  );
}

/**
 * Build not found error response
 */
export function buildNotFoundError(
  resource: string,
  id?: string,
  meta?: Partial<AdminResponseMeta>
): AdminApiResponse<never> {
  return buildErrorResponse(
    {
      code: 'NOT_FOUND',
      message: id
        ? `${resource} with id '${id}' not found`
        : `${resource} not found`,
      details: { resource, id },
    },
    meta
  );
}

/**
 * Build conflict error response
 */
export function buildConflictError(
  message: string,
  code: string = 'CONFLICT',
  meta?: Partial<AdminResponseMeta>
): AdminApiResponse<never> {
  return buildErrorResponse(
    {
      code,
      message,
    },
    meta
  );
}

/**
 * Build internal error response
 */
export function buildInternalError(
  message: string = 'Internal server error',
  meta?: Partial<AdminResponseMeta>
): AdminApiResponse<never> {
  return buildErrorResponse(
    {
      code: 'INTERNAL_ERROR',
      message,
    },
    meta
  );
}

/**
 * Build timeout error response
 */
export function buildTimeoutError(
  message: string = 'Operation timed out',
  meta?: Partial<AdminResponseMeta>
): AdminApiResponse<never> {
  return buildErrorResponse(
    {
      code: 'TIMEOUT',
      message,
    },
    meta
  );
}

/**
 * Build guard rejection response
 */
export function buildGuardRejection(
  message: string,
  reason: string,
  meta?: Partial<AdminResponseMeta>
): AdminApiResponse<never> {
  return buildErrorResponse(
    {
      code: 'GUARD_REJECTED',
      message,
      details: { reason },
    },
    meta
  );
}

/**
 * Build timing meta from request start
 */
export function buildTimingMeta(requestStartTime: number, dbQueryMs?: number): TimingMeta {
  return {
    requestStartTime: new Date(requestStartTime).toISOString(),
    requestDurationMs: Date.now() - requestStartTime,
    dbQueryMs,
  };
}

/**
 * Build pagination meta
 */
export function buildPaginationMeta(
  page: number,
  pageSize: number,
  totalItems?: number
): PaginationMeta {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: totalItems ? Math.ceil(totalItems / pageSize) : undefined,
    hasMore: totalItems ? page * pageSize < totalItems : false,
  };
}

/**
 * Create a response builder with context
 */
export function createResponseBuilder(correlationId: string, requestId?: string) {
  return {
    success<T>(data: T, meta?: Partial<AdminResponseMeta>) {
      return buildSuccessResponse(data, {
        correlationId,
        requestId,
        ...meta,
      });
    },

    error<T = unknown>(error: AdminApiError, meta?: Partial<AdminResponseMeta>) {
      return buildErrorResponse<T>(error, {
        correlationId,
        requestId,
        ...meta,
      });
    },

    warning<T>(data: T, warnings: string[], meta?: Partial<AdminResponseMeta>) {
      return buildWarningResponse(data, warnings, {
        correlationId,
        requestId,
        ...meta,
      });
    },

    paginated<T>(
      items: T[],
      pagination: PaginationMeta,
      meta?: Partial<AdminResponseMeta>
    ) {
      return buildPaginatedResponse(items, pagination, {
        correlationId,
        requestId,
        ...meta,
      });
    },

    timing(startTime: number, dbQueryMs?: number) {
      return buildTimingMeta(startTime, dbQueryMs);
    },

    pagination(page: number, pageSize: number, totalItems?: number) {
      return buildPaginationMeta(page, pageSize, totalItems);
    },

    validation(message: string, field?: string, details?: Record<string, unknown>) {
      return buildValidationError(message, field, details, { correlationId, requestId });
    },

    notFound(resource: string, id?: string) {
      return buildNotFoundError(resource, id, { correlationId, requestId });
    },

    conflict(message: string, code?: string) {
      return buildConflictError(message, code, { correlationId, requestId });
    },

    unauthorized(message?: string) {
      return buildAuthorizationError(message, { correlationId, requestId });
    },

    forbidden(message?: string) {
      return buildAuthorizationError(message || 'Access denied', { correlationId, requestId });
    },

    internal(message?: string) {
      return buildInternalError(message, { correlationId, requestId });
    },

    timeout(message?: string) {
      return buildTimeoutError(message, { correlationId, requestId });
    },

    guardRejection(message: string, reason: string) {
      return buildGuardRejection(message, reason, { correlationId, requestId });
    },
  };
}

export type { AdminApiResponse, AdminApiStatus, AdminApiError, AdminResponseMeta };
