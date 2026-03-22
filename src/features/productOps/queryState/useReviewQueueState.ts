/**
 * Review Queue State Hook
 *
 * Manages queue filter/sort/pagination state for review queue
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  ProductOpsQueueFilters,
  ProductOpsQueueSort,
  ProductOpsCaseSeverity,
  ProductOpsCaseStatus,
  ProductOpsCaseType,
} from '../types';
import { QUEUE_CONFIG } from '../constants';

interface UseReviewQueueStateOptions {
  initialFilters?: ProductOpsQueueFilters;
  initialSort?: ProductOpsQueueSort;
  initialPage?: number;
  initialPageSize?: number;
}

interface UseReviewQueueStateReturn {
  // State
  filters: ProductOpsQueueFilters;
  sort: ProductOpsQueueSort;
  page: number;
  pageSize: number;

  // Filter setters
  setSeverityFilter: (severity: ProductOpsCaseSeverity[] | undefined) => void;
  setStatusFilter: (status: ProductOpsCaseStatus[] | undefined) => void;
  setCaseTypeFilter: (caseType: ProductOpsCaseType[] | undefined) => void;
  setAssigneeFilter: (assigneeId: string | undefined) => void;
  setAssignedToMeFilter: (assignedToMe: boolean | undefined) => void;
  setSearchQuery: (query: string | undefined) => void;
  setStaleOnlyFilter: (staleOnly: boolean | undefined) => void;
  setDateRange: (after: Date | undefined, before: Date | undefined) => void;
  setFilters: (filters: ProductOpsQueueFilters) => void;
  resetFilters: () => void;

  // Sort setters
  setSort: (sort: ProductOpsQueueSort) => void;
  setSortField: (field: ProductOpsQueueSort['field']) => void;
  toggleSortDirection: () => void;

  // Pagination setters
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: (totalPages: number) => void;

  // Combined
  reset: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

const DEFAULT_SORT: ProductOpsQueueSort = QUEUE_CONFIG.DEFAULT_SORT;

export function useReviewQueueState(
  options: UseReviewQueueStateOptions = {}
): UseReviewQueueStateReturn {
  const {
    initialFilters = {},
    initialSort = DEFAULT_SORT,
    initialPage = 1,
    initialPageSize = QUEUE_CONFIG.DEFAULT_PAGE_SIZE,
  } = options;

  // Filters state
  const [filters, setFiltersState] = useState<ProductOpsQueueFilters>(initialFilters);
  const [sort, setSortState] = useState<ProductOpsQueueSort>(initialSort);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  // Filter setters
  const setSeverityFilter = useCallback((severity: ProductOpsCaseSeverity[] | undefined) => {
    setFiltersState((prev) => ({ ...prev, severity }));
    setPageState(1);
  }, []);

  const setStatusFilter = useCallback((status: ProductOpsCaseStatus[] | undefined) => {
    setFiltersState((prev) => ({ ...prev, status }));
    setPageState(1);
  }, []);

  const setCaseTypeFilter = useCallback((caseType: ProductOpsCaseType[] | undefined) => {
    setFiltersState((prev) => ({ ...prev, caseType }));
    setPageState(1);
  }, []);

  const setAssigneeFilter = useCallback((assigneeId: string | undefined) => {
    setFiltersState((prev) => ({ ...prev, assigneeId, assignedToMe: undefined }));
    setPageState(1);
  }, []);

  const setAssignedToMeFilter = useCallback((assignedToMe: boolean | undefined) => {
    setFiltersState((prev) => ({ ...prev, assignedToMe, assigneeId: undefined }));
    setPageState(1);
  }, []);

  const setSearchQuery = useCallback((searchQuery: string | undefined) => {
    setFiltersState((prev) => ({ ...prev, searchQuery }));
    setPageState(1);
  }, []);

  const setStaleOnlyFilter = useCallback((staleOnly: boolean | undefined) => {
    setFiltersState((prev) => ({ ...prev, staleOnly }));
    setPageState(1);
  }, []);

  const setDateRange = useCallback((after: Date | undefined, before: Date | undefined) => {
    setFiltersState((prev) => ({
      ...prev,
      createdAfter: after,
      createdBefore: before,
    }));
    setPageState(1);
  }, []);

  const setFilters = useCallback((newFilters: ProductOpsQueueFilters) => {
    setFiltersState(newFilters);
    setPageState(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({});
    setPageState(1);
  }, []);

  // Sort setters
  const setSort = useCallback((newSort: ProductOpsQueueSort) => {
    setSortState(newSort);
  }, []);

  const setSortField = useCallback((field: ProductOpsQueueSort['field']) => {
    setSortState((prev) => ({ ...prev, field }));
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortState((prev) => ({
      ...prev,
      direction: prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Pagination setters
  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    setPageState(1);
  }, []);

  const nextPage = useCallback(() => {
    setPageState((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPageState((prev) => Math.max(1, prev - 1));
  }, []);

  const goToFirstPage = useCallback(() => {
    setPageState(1);
  }, []);

  const goToLastPage = useCallback((totalPages: number) => {
    setPageState(totalPages);
  }, []);

  // Combined reset
  const reset = useCallback(() => {
    setFiltersState({});
    setSortState(DEFAULT_SORT);
    setPageState(1);
    setPageSizeState(QUEUE_CONFIG.DEFAULT_PAGE_SIZE);
  }, []);

  // Computed
  const hasActiveFilters = useMemo(() => {
    return (
      !!filters.severity?.length ||
      !!filters.status?.length ||
      !!filters.caseType?.length ||
      !!filters.assigneeId ||
      !!filters.assignedToMe ||
      !!filters.searchQuery ||
      !!filters.staleOnly ||
      !!filters.createdAfter ||
      !!filters.createdBefore
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.severity?.length) count++;
    if (filters.status?.length) count++;
    if (filters.caseType?.length) count++;
    if (filters.assigneeId) count++;
    if (filters.assignedToMe) count++;
    if (filters.searchQuery) count++;
    if (filters.staleOnly) count++;
    if (filters.createdAfter || filters.createdBefore) count++;
    return count;
  }, [filters]);

  return {
    // State
    filters,
    sort,
    page,
    pageSize,

    // Filter setters
    setSeverityFilter,
    setStatusFilter,
    setCaseTypeFilter,
    setAssigneeFilter,
    setAssignedToMeFilter,
    setSearchQuery,
    setStaleOnlyFilter,
    setDateRange,
    setFilters,
    resetFilters,

    // Sort setters
    setSort,
    setSortField,
    toggleSortDirection,

    // Pagination setters
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,

    // Combined
    reset,
    hasActiveFilters,
    activeFilterCount,
  };
}
