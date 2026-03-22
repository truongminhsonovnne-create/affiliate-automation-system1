'use client';

import { useState, useCallback, useMemo } from 'react';

/**
 * Pagination state hook
 */
export function usePaginationState(initialPage = 1, initialPageSize = 10) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const pagination = useMemo(
    () => ({
      page,
      pageSize,
      offset: (page - 1) * pageSize,
    }),
    [page, pageSize]
  );

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const nextPage = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const setPageAndReset = useCallback((newPage: number, resetPageSize?: number) => {
    setPage(1);
    if (resetPageSize) {
      setPageSize(resetPageSize);
    }
  }, []);

  const reset = useCallback(() => {
    setPage(1);
    setPageSize(initialPageSize);
  }, [initialPageSize]);

  return {
    pagination,
    page,
    pageSize,
    setPage: goToPage,
    nextPage,
    prevPage,
    setPageSize,
    setPageAndReset,
    reset,
  };
}

/**
 * Sort state hook
 */
export function useSortState<T extends string = string>(initialKey?: T, initialDir: 'asc' | 'desc' = 'asc') {
  const [sortKey, setSortKey] = useState<T | undefined>(initialKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialDir);

  const handleSort = useCallback(
    (key: T) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey]
  );

  const reset = useCallback(() => {
    setSortKey(initialKey);
    setSortDir(initialDir);
  }, [initialKey, initialDir]);

  return {
    sort: sortKey ? { key: sortKey, direction: sortDir } : undefined,
    sortKey,
    sortDir,
    setSort: setSortKey,
    toggleSort: handleSort,
    reset,
  };
}

/**
 * Filter state hook
 */
export function useFilterState<T extends Record<string, string>>(
  initialFilters: T,
  debounceMs = 300
) {
  const [filters, setFilters] = useState<T>(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState<T>(initialFilters);

  const setFilter = useCallback((key: keyof T, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFiltersAll = useCallback((newFilters: Partial<T>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilter = useCallback((key: keyof T) => {
    setFilters((prev) => ({ ...prev, [key]: '' }));
  }, []);

  const clearAllFilters = useCallback(() => {
    const cleared = Object.keys(filters).reduce(
      (acc, key) => ({ ...acc, [key]: '' }),
      {} as T
    );
    setFilters(cleared);
  }, [filters]);

  // Debounce effect would be implemented in component using this hook
  // For now, return both raw and debounced
  const updateDebounced = useCallback(() => {
    setDebouncedFilters(filters);
  }, [filters]);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((v) => v !== ''),
    [filters]
  );

  return {
    filters,
    debouncedFilters,
    setFilter,
    setFiltersAll,
    clearFilter,
    clearAllFilters,
    updateDebounced,
    hasActiveFilters,
  };
}

/**
 * Combined list query state hook
 */
export function useDashboardListQueryState<T extends string = string>(
  initialPage = 1,
  initialPageSize = 10,
  initialSortKey?: T,
  initialSortDir: 'asc' | 'desc' = 'asc',
  initialFilters?: Record<string, string>
) {
  const pagination = usePaginationState(initialPage, initialPageSize);
  const sort = useSortState(initialSortKey, initialSortDir);
  const filters = useFilterState(initialFilters ?? {});

  const resetAll = useCallback(() => {
    pagination.reset();
    sort.reset();
    filters.clearAllFilters();
  }, [pagination, sort, filters]);

  return {
    pagination,
    sort,
    filters,
    resetAll,
  };
}

export default useDashboardListQueryState;
