/**
 * Use Queue Filters Hook
 *
 * Hook for managing queue filter/sort/pagination state
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  ProductOpsQueueFilters,
  ProductOpsQueueSort,
  ProductOpsQueuePagination,
  ProductOpsCaseSeverity,
  ProductOpsCaseStatus,
} from '../../features/productOps/types';
import { QUEUE_CONFIG } from '../../features/productOps/constants';

interface UseQueueFiltersOptions {
  initialFilters?: Partial<ProductOpsQueueFilters>;
  initialSort?: ProductOpsQueueSort;
  initialPagination?: Partial<ProductOpsQueuePagination>;
}

interface UseQueueFiltersReturn {
  // State
  filters: ProductOpsQueueFilters;
  sort: ProductOpsQueueSort;
  pagination: ProductOpsQueuePagination;

  // Filter actions
  setSeverityFilter: (severities: ProductOpsCaseSeverity[]) => void;
  setStatusFilter: (statuses: ProductOpsCaseStatus[]) => void;
  setSearchQuery: (query: string) => void;
  setAssignedToMe: (value: boolean) => void;
  setStaleOnly: (value: boolean) => void;
  clearFilters: () => void;

  // Sort actions
  setSort: (sort: ProductOpsQueueSort) => void;

  // Pagination actions
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Computed
  hasActiveFilters: boolean;
  filterCount: number;
}

const DEFAULT_FILTERS: ProductOpsQueueFilters = {
  severity: [],
  status: [],
  caseType: [],
  assignedToMe: false,
  staleOnly: false,
  searchQuery: '',
};

const DEFAULT_SORT: ProductOpsQueueSort = {
  field: 'createdAt',
  direction: 'desc',
};

const DEFAULT_PAGINATION: ProductOpsQueuePagination = {
  page: 1,
  pageSize: QUEUE_CONFIG.DEFAULT_PAGE_SIZE,
};

export function useQueueFilters(options: UseQueueFiltersOptions = {}): UseQueueFiltersReturn {
  const {
    initialFilters,
    initialSort,
    initialPagination,
  } = options;

  // State
  const [filters, setFilters] = useState<ProductOpsQueueFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const [sort, setSortState] = useState<ProductOpsQueueSort>({
    ...DEFAULT_SORT,
    ...initialSort,
  });

  const [pagination, setPagination] = useState<ProductOpsQueuePagination>({
    ...DEFAULT_PAGINATION,
    ...initialPagination,
  });

  // Filter actions
  const setSeverityFilter = useCallback((severities: ProductOpsCaseSeverity[]) => {
    setFilters(prev => ({ ...prev, severity: severities }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  }, []);

  const setStatusFilter = useCallback((statuses: ProductOpsCaseStatus[]) => {
    setFilters(prev => ({ ...prev, status: statuses }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  }, []);

  const setAssignedToMe = useCallback((value: boolean) => {
    setFilters(prev => ({ ...prev, assignedToMe: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  }, []);

  const setStaleOnly = useCallback((value: boolean) => {
    setFilters(prev => ({ ...prev, staleOnly: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Sort actions
  const setSort = useCallback((newSort: ProductOpsQueueSort) => {
    setSortState(newSort);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  }, []);

  // Pagination actions
  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const nextPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: prev.page + 1 }));
  }, []);

  const prevPage = useCallback(() => {
    setPagination(prev => ({
      ...prev,
      page: Math.max(1, prev.page - 1),
    }));
  }, []);

  // Computed values
  const hasActiveFilters = useMemo(() => {
    return (
      (filters.severity && filters.severity.length > 0) ||
      (filters.status && filters.status.length > 0) ||
      (filters.caseType && filters.caseType.length > 0) ||
      filters.assignedToMe === true ||
      filters.staleOnly === true ||
      (filters.searchQuery && filters.searchQuery.length >= QUEUE_CONFIG.SEARCH_MIN_LENGTH)
    );
  }, [filters]);

  const filterCount = useMemo(() => {
    let count = 0;
    if (filters.severity && filters.severity.length > 0) count++;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.caseType && filters.caseType.length > 0) count++;
    if (filters.assignedToMe) count++;
    if (filters.staleOnly) count++;
    if (filters.searchQuery && filters.searchQuery.length >= QUEUE_CONFIG.SEARCH_MIN_LENGTH) count++;
    return count;
  }, [filters]);

  return {
    // State
    filters,
    sort,
    pagination,

    // Filter actions
    setSeverityFilter,
    setStatusFilter,
    setSearchQuery,
    setAssignedToMe,
    setStaleOnly,
    clearFilters,

    // Sort actions
    setSort,

    // Pagination actions
    setPage,
    setPageSize,
    nextPage,
    prevPage,

    // Computed
    hasActiveFilters,
    filterCount,
  };
}

export default useQueueFilters;
