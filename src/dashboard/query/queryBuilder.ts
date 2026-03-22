/**
 * Dashboard Query Builder
 *
 * Normalizes and standardizes query building for dashboard read layer.
 * Prevents duplicate query logic across multiple read models.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DashboardPaginationInput,
  DashboardPaginationMeta,
  DashboardSortInput,
  DashboardSortDirection,
  DashboardTimeRange,
  DashboardCustomTimeRange,
} from '../types.js';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_TIME_RANGE_START_DAYS,
  TIME_RANGE_MS,
} from '../constants.js';

/**
 * Normalize pagination input
 */
export function buildPagination(
  input: DashboardPaginationInput | undefined,
  options?: {
    defaultPage?: number;
    defaultPageSize?: number;
    maxPageSize?: number;
    minPageSize?: number;
  }
): { page: number; pageSize: number; offset: number } {
  const defaults = {
    defaultPage: DEFAULT_PAGE,
    defaultPageSize: DEFAULT_PAGE_SIZE,
    maxPageSize: MAX_PAGE_SIZE,
    minPageSize: MIN_PAGE_SIZE,
    ...options,
  };

  const page = Math.max(1, input?.page ?? defaults.defaultPage);
  const rawPageSize = input?.pageSize ?? defaults.defaultPageSize;
  const pageSize = Math.min(
    Math.max(defaults.minPageSize, rawPageSize),
    defaults.maxPageSize
  );
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

/**
 * Build pagination metadata
 */
export function buildPaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number
): DashboardPaginationMeta {
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Normalize sort input
 */
export function buildSorting<T extends string>(
  input: DashboardSortInput | undefined,
  allowedFields: readonly T[],
  options?: {
    defaultField?: T;
    defaultDirection?: DashboardSortDirection;
  }
): { field: T; direction: DashboardSortDirection } {
  const defaults = {
    defaultField: allowedFields[0] as T,
    defaultDirection: DEFAULT_SORT_DIRECTION,
    ...options,
  };

  const field = (input?.field && allowedFields.includes(input.field))
    ? input.field
    : defaults.defaultField;

  const direction = input?.direction ?? defaults.defaultDirection;

  return { field, direction };
}

/**
 * Build Supabase order clause from sort input
 */
export function buildSupabaseOrder(
  sort: { field: string; direction: DashboardSortDirection }
): Record<string, 'asc' | 'desc'> {
  return { [sort.field]: sort.direction };
}

/**
 * Normalize date range from time range
 */
export function buildDateRangeFilter(
  timeRange: DashboardTimeRange | undefined,
  customTimeRange: DashboardCustomTimeRange | undefined
): { start: Date; end: Date } | null {
  const now = new Date();

  // Custom time range takes precedence
  if (customTimeRange) {
    return {
      start: new Date(customTimeRange.start),
      end: new Date(customTimeRange.end),
    };
  }

  // Parse time range
  const range = timeRange ?? DEFAULT_TIME_RANGE;

  if (range === 'custom') {
    // Default to 7 days for custom
    const start = new Date(now.getTime() - DEFAULT_TIME_RANGE_START_DAYS * 24 * 60 * 60 * 1000);
    return { start, end: now };
  }

  const ms = TIME_RANGE_MS[range];
  const start = new Date(now.getTime() - ms);

  return { start, end: now };
}

/**
 * Build date range filter for Supabase query
 */
export function buildSupabaseDateFilter(
  tableAlias: string,
  dateRange: { start: Date; end: Date } | null,
  dateField: string = 'created_at'
): ((query: any) => any) | null {
  if (!dateRange) return null;

  return (query: any) =>
    query
      .gte(`${tableAlias}.${dateField}`, dateRange.start.toISOString())
      .lte(`${tableAlias}.${dateField}`, dateRange.end.toISOString());
}

/**
 * Build search filter for Supabase
 */
export function buildSearchFilter(
  search: string | undefined,
  fields: string[],
  tableAlias?: string
): ((query: any) => any) | null {
  if (!search || search.trim().length === 0) return null;

  const sanitized = search.trim().replace(/[%"_]/g, '\\$&');
  const alias = tableAlias ? `${tableAlias}.` : '';

  return (query: any) =>
    query.or(
      fields.map((f) => `${alias}${f}.ilike.%${sanitized}%`).join(',')
    );
}

/**
 * Build status filter for Supabase
 */
export function buildStatusFilter(
  status: string | string[] | undefined,
  tableAlias?: string
): ((query: any) => any) | null {
  if (!status) return null;

  const alias = tableAlias ? `${tableAlias}.` : '';
  const statuses = Array.isArray(status) ? status : [status];

  return (query: any) => query.in(`${alias}status`, statuses);
}

/**
 * Build channel filter for Supabase
 */
export function buildChannelFilter(
  channel: string | string[] | undefined,
  tableAlias?: string
): ((query: any) => any) | null {
  if (!channel) return null;

  const alias = tableAlias ? `${tableAlias}.` : '';
  const channels = Array.isArray(channel) ? channel : [channel];

  return (query: any) => query.in(`${alias}channel`, channels);
}

/**
 * Build priority filter for Supabase
 */
export function buildPriorityFilter(
  priority: number | number[] | undefined,
  tableAlias?: string
): ((query: any) => any) | null {
  if (priority === undefined) return null;

  const alias = tableAlias ? `${tableAlias}.` : '';
  const priorities = Array.isArray(priority) ? priority : [priority];

  return (query: any) => query.in(`${alias}priority`, priorities);
}

/**
 * Build generic equality filter
 */
export function buildEqualityFilter(
  field: string,
  value: unknown,
  tableAlias?: string
): ((query: any) => any) | null {
  if (value === undefined || value === null) return null;

  const alias = tableAlias ? `${tableAlias}.` : '';

  return (query: any) => query.eq(`${alias}${field}`, value);
}

/**
 * Normalize dashboard query with all options
 */
export interface NormalizedDashboardQuery {
  pagination: {
    page: number;
    pageSize: number;
    offset: number;
  };
  sorting: {
    field: string;
    direction: DashboardSortDirection;
  };
  dateRange: {
    start: Date;
    end: Date;
  } | null;
  filters: {
    status?: string | string[];
    channel?: string | string[];
    search?: string;
    [key: string]: unknown;
  };
}

/**
 * Normalize full dashboard query
 */
export function normalizeDashboardQuery(
  input: {
    page?: number;
    pageSize?: number;
    sort?: DashboardSortInput;
    timeRange?: DashboardTimeRange;
    customTimeRange?: DashboardCustomTimeRange;
    [key: string]: unknown;
  },
  options?: {
    allowedSortFields?: readonly string[];
    defaultSortField?: string;
    defaultSortDirection?: DashboardSortDirection;
  }
): NormalizedDashboardQuery {
  const {
    allowedSortFields = ['created_at'],
    defaultSortField = 'created_at',
    defaultSortDirection = DEFAULT_SORT_DIRECTION,
  } = options ?? {};

  // Build pagination
  const pagination = buildPagination(input);

  // Build sorting
  const sorting = buildSorting(input.sort, allowedSortFields, {
    defaultField: defaultSortField,
    defaultDirection: defaultSortDirection,
  });

  // Build date range
  const dateRange = buildDateRangeFilter(input.timeRange, input.customTimeRange);

  // Extract filters (exclude pagination, sorting, time range)
  const filters = { ...input };
  delete filters.page;
  delete filters.pageSize;
  delete filters.sort;
  delete filters.timeRange;
  delete filters.customTimeRange;

  return {
    pagination,
    sorting,
    dateRange,
    filters,
  };
}

/**
 * Apply normalized query to Supabase
 */
export function applyDashboardQuery<T>(
  queryBuilder: any,
  normalized: NormalizedDashboardQuery,
  options?: {
    tableAlias?: string;
    dateField?: string;
  }
): any {
  const { tableAlias = '', dateField = 'created_at' } = options ?? {};

  // Apply sorting
  const sortField = tableAlias ? `${tableAlias}.${normalized.sorting.field}` : normalized.sorting.field;
  queryBuilder = queryBuilder.order(sortField, {
    ascending: normalized.sorting.direction === 'asc',
  });

  // Apply date range
  if (normalized.dateRange) {
    const startField = tableAlias ? `${tableAlias}.${dateField}` : dateField;
    queryBuilder = queryBuilder
      .gte(startField, normalized.dateRange.start.toISOString())
      .lte(startField, normalized.dateRange.end.toISOString());
  }

  // Apply pagination
  queryBuilder = queryBuilder.range(
    normalized.pagination.offset,
    normalized.pagination.offset + normalized.pagination.pageSize - 1
  );

  return queryBuilder;
}

/**
 * Validate sort field against whitelist
 */
export function validateSortField(
  field: string | undefined,
  allowedFields: readonly string[]
): { valid: boolean; field: string } {
  if (!field) {
    return { valid: true, field: allowedFields[0] };
  }

  if (!allowedFields.includes(field)) {
    return { valid: false, field };
  }

  return { valid: true, field };
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string | undefined): string | undefined {
  if (!query) return undefined;

  // Remove potential SQL injection patterns
  return query
    .replace(/[;'"\\]/g, '')
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/gi, '')
    .trim()
    .substring(0, 200);
}
