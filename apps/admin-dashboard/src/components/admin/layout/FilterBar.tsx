'use client';

/**
 * FilterBar — Always-visible filter controls for list pages.
 *
 * Shows a row of dropdown selects + a search input.
 * Active filters are shown as dismissible chips below.
 *
 * Usage:
 *   <FilterBar
 *     filters={filterConfigs}
 *     onClearAll={handleClearFilters}
 *     searchPlaceholder="Tìm theo tên..."
 *     onSearch={handleSearch}
 *     searchValue={searchInput}
 *     onSearchChange={setSearchInput}
 *     selectableFilters={[
 *       { key: 'status', label: 'Trạng thái', options: STATUS_OPTIONS },
 *     ]}
 *   />
 */

import { Search, X, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';

// =============================================================================
// Types
// =============================================================================

export interface FilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FilterConfig {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  /** Filter select configs — always visible as dropdowns */
  selectableFilters?: FilterConfig[];
  /** Active filters for chip display */
  activeFilters?: FilterConfig[];
  /** Legacy alias for selectableFilters (backward compat) */
  filters?: FilterConfig[];
  /** Clear all active filters */
  onClearAll?: () => void;
  /** Search input */
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  className?: string;
}

// =============================================================================
// Single select chip (shows when filter is active)
// =============================================================================

function ActiveChip({ filter }: { filter: FilterConfig }) {
  const label = filter.options.find((o) => o.value === filter.value)?.label ?? filter.value;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-gray-200 text-sm shadow-subtle">
      <span className="text-gray-400 text-xs font-medium">{filter.label}:</span>
      <span className="text-gray-700 font-medium">{label}</span>
      <button
        type="button"
        onClick={() => filter.onChange('')}
        aria-label={`Xóa bộ lọc ${filter.label}`}
        className="ml-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// =============================================================================
// Select dropdown
// =============================================================================

function FilterSelect({ filter }: { filter: FilterConfig }) {
  return (
    <select
      value={filter.value}
      onChange={(e) => filter.onChange(e.target.value)}
      aria-label={filter.label}
      className={clsx(
        'h-8 pl-3 pr-8 rounded-lg border border-gray-200',
        'text-xs font-medium text-gray-700',
        'bg-white cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400',
        'transition-colors duration-150',
        'appearance-none',
        'hover:border-gray-300'
      )}
    >
      {filter.options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function FilterBar({
  selectableFilters: selectableFiltersProp = [],
  activeFilters: activeFiltersProp = [],
  filters: filtersProp = [],
  onClearAll,
  searchValue = '',
  searchPlaceholder = 'Tìm kiếm...',
  onSearchChange,
  onSearch,
  className,
}: FilterBarProps) {
  // Merge legacy `filters` prop into selectableFilters and activeFilters
  const selectableFilters = selectableFiltersProp.length > 0 ? selectableFiltersProp : filtersProp;
  const activeFilters = activeFiltersProp.length > 0 ? activeFiltersProp : filtersProp;

  const hasActiveFilters =
    activeFilters.some((f) => f.value !== '') ||
    searchValue.trim().length > 0;

  const activeChips = activeFilters.filter((f) => f.value !== '');

  return (
    <div className={clsx('space-y-3', className)}>
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search input */}
        {(onSearch || onSearchChange) && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch?.(searchValue)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className={clsx(
                'w-full h-8 pl-8 pr-3 rounded-lg',
                'border border-gray-200 bg-white',
                'text-xs text-gray-900 placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400',
                'transition-colors duration-150'
              )}
            />
            {searchValue && onSearchChange && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Filter dropdowns */}
        {selectableFilters.length > 0 && (
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
            {selectableFilters.map((filter) => (
              <FilterSelect key={filter.key} filter={filter} />
            ))}
          </div>
        )}
      </div>

      {/* Active filter chips + clear all */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="text-xs text-gray-400 font-medium">Đang lọc:</span>
          {activeChips.map((filter) => (
            <ActiveChip key={filter.key} filter={filter} />
          ))}
          {searchValue.trim().length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-gray-200 text-sm shadow-subtle">
              <span className="text-gray-400 text-xs font-medium">Tìm kiếm:</span>
              <span className="text-gray-700 font-medium">&quot;{searchValue}&quot;</span>
              <button
                type="button"
                onClick={() => onSearchChange?.('')}
                aria-label="Xóa tìm kiếm"
                className="ml-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {onClearAll && activeChips.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-brand-600 hover:text-brand-800 underline underline-offset-2 font-medium"
            >
              Xóa tất cả
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default FilterBar;
