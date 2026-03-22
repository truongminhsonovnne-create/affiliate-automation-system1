/**
 * Remediation Queue State Hook
 *
 * Manages remediation queue filter/sort/pagination state
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  ProductOpsQueueSort,
  ProductOpsRemediationRisk,
  ProductOpsRemediationStatus,
} from '../types';
import { QUEUE_CONFIG } from '../constants';

interface UseRemediationQueueStateOptions {
  initialStatus?: ProductOpsRemediationStatus[];
  initialRisk?: ProductOpsRemediationRisk[];
  initialSort?: ProductOpsQueueSort;
  initialPage?: number;
  initialPageSize?: number;
}

interface UseRemediationQueueStateReturn {
  // State
  status: ProductOpsRemediationStatus[];
  risk: ProductOpsRemediationRisk[];
  sort: ProductOpsQueueSort;
  page: number;
  pageSize: number;

  // Filter setters
  setStatusFilter: (status: ProductOpsRemediationStatus[] | undefined) => void;
  setRiskFilter: (risk: ProductOpsRemediationRisk[] | undefined) => void;
  setFilters: (status: ProductOpsRemediationStatus[], risk: ProductOpsRemediationRisk[]) => void;
  resetFilters: () => void;

  // Sort setters
  setSort: (sort: ProductOpsQueueSort) => void;

  // Pagination setters
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Combined
  reset: () => void;
  hasActiveFilters: boolean;
}

const DEFAULT_SORT: ProductOpsQueueSort = {
  field: 'createdAt',
  direction: 'desc',
};

export function useRemediationQueueState(
  options: UseRemediationQueueStateOptions = {}
): UseRemediationQueueStateReturn {
  const {
    initialStatus = [],
    initialRisk = [],
    initialSort = DEFAULT_SORT,
    initialPage = 1,
    initialPageSize = QUEUE_CONFIG.DEFAULT_PAGE_SIZE,
  } = options;

  // State
  const [status, setStatus] = useState<ProductOpsRemediationStatus[]>(initialStatus);
  const [risk, setRisk] = useState<ProductOpsRemediationRisk[]>(initialRisk);
  const [sort, setSort] = useState<ProductOpsQueueSort>(initialSort);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Filter setters
  const setStatusFilter = useCallback((newStatus: ProductOpsRemediationStatus[] | undefined) => {
    setStatus(newStatus || []);
    setPage(1);
  }, []);

  const setRiskFilter = useCallback((newRisk: ProductOpsRemediationRisk[] | undefined) => {
    setRisk(newRisk || []);
    setPage(1);
  }, []);

  const setFilters = useCallback((
    newStatus: ProductOpsRemediationStatus[],
    newRisk: ProductOpsRemediationRisk[]
  ) => {
    setStatus(newStatus);
    setRisk(newRisk);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setStatus([]);
    setRisk([]);
    setPage(1);
  }, []);

  // Sort setters
  const setSortFn = useCallback((newSort: ProductOpsQueueSort) => {
    setSort(newSort);
  }, []);

  // Pagination setters
  const setPageFn = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  const setPageSizeFn = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  const nextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  // Combined reset
  const reset = useCallback(() => {
    setStatus([]);
    setRisk([]);
    setSort(DEFAULT_SORT);
    setPage(1);
    setPageSize(QUEUE_CONFIG.DEFAULT_PAGE_SIZE);
  }, []);

  // Computed
  const hasActiveFilters = useMemo(() => {
    return status.length > 0 || risk.length > 0;
  }, [status, risk]);

  return {
    // State
    status,
    risk,
    sort,
    page,
    pageSize,

    // Filter setters
    setStatusFilter,
    setRiskFilter,
    setFilters,
    resetFilters,

    // Sort setters
    setSort: setSortFn,

    // Pagination setters
    setPage: setPageFn,
    setPageSize: setPageSizeFn,
    nextPage,
    prevPage,

    // Combined
    reset,
    hasActiveFilters,
  };
}
