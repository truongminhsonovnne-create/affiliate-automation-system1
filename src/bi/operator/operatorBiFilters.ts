/**
 * Operator BI Filters
 */

import type { OperatorBiViewFilters } from '../types.js';

export function normalizeOperatorBiFilters(filters: Record<string, unknown>): OperatorBiViewFilters {
  const result: OperatorBiViewFilters = {};

  if (filters.dateRange) {
    const dr = filters.dateRange as { start?: string; end?: string };
    if (dr.start && dr.end) {
      result.dateRange = { start: new Date(dr.start), end: new Date(dr.end) };
    }
  }

  if (filters.surfaceTypes) {
    result.surfaceTypes = filters.surfaceTypes as any[];
  }

  if (filters.experimentIds) {
    result.experimentIds = filters.experimentIds as string[];
  }

  if (filters.voucherIds) {
    result.voucherIds = filters.voucherIds as string[];
  }

  if (filters.status) {
    result.status = filters.status as string[];
  }

  if (filters.limit) {
    result.limit = filters.limit as number;
  }

  if (filters.offset) {
    result.offset = filters.offset as number;
  }

  return result;
}

export function buildOperatorBiDateRange(days: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end };
}
