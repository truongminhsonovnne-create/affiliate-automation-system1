'use client';

/**
 * DataTable — Production-grade table for admin dashboards.
 *
 * Features:
 *   - Sticky header (optional)
 *   - Row selection + bulk actions
 *   - Sortable columns with directional arrows
 *   - Pagination controls
 *   - Loading skeleton
 *   - Empty state integration
 *   - Custom cell renderer per column
 *
 * Usage:
 *   <DataTable
 *     columns={columns}
 *     data={items}
 *     keyExtractor={(item) => item.id}
 *     selectable
 *     bulkActions={<Button size="sm" onClick={handleBulkDelete}>Xóa đã chọn</Button>}
 *     pagination={{ page, pageSize, totalItems, totalPages, onPageChange }}
 *     stickyHeader
 *     emptyMessage="Không có dữ liệu"
 *   />
 */

import { useState, useCallback, useId, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Square,
  CheckSquare,
  MinusSquare,
} from 'lucide-react';
import clsx from 'clsx';

// =============================================================================
// Types
// =============================================================================

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  minWidth?: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  /** Enable checkbox column for bulk selection */
  selectable?: boolean;
  /** Called when selection changes: returns array of selected items */
  onSelectionChange?: (selectedItems: T[]) => void;
  /** Bulk action buttons (shown when ≥1 row selected) */
  bulkActions?: React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  /** Make the header sticky during scroll */
  stickyHeader?: boolean;
  /** Accessible label for the table (announced by screen readers) */
  ariaLabel?: string;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

const ALIGN_CLASSES = {
  left:   'text-left',
  center: 'text-center',
  right:  'text-right',
} as const;

function buildRange(page: number, totalPages: number, delta = 2): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (page - delta > 2) pages.push('...');
  for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
    pages.push(i);
  }
  if (page + delta < totalPages - 1) pages.push('...');
  pages.push(totalPages);
  return pages;
}

// =============================================================================
// Sort Icon
// =============================================================================

function SortIcon({
  sortable,
  active,
  direction,
}: {
  sortable?: boolean;
  active?: boolean;
  direction?: 'asc' | 'desc';
}) {
  if (!sortable) return null;
  if (!active || !direction)
    return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />;
  if (direction === 'asc')
    return <ArrowUp className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />;
  return <ArrowDown className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />;
}

// =============================================================================
// Checkbox
// =============================================================================

type CheckState = 'none' | 'some' | 'all';

function SelectionCheckbox({
  state,
  onChange,
  label,
}: {
  state: CheckState;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'all' ? true : state === 'some' ? 'mixed' : false}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        'flex items-center justify-center h-4 w-4 rounded border transition-colors duration-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1',
        state === 'all' && 'bg-brand-500 border-brand-500 text-white',
        state === 'some' && 'bg-brand-500 border-brand-500 text-white',
        state === 'none' && 'bg-white border-gray-300 hover:border-gray-400'
      )}
    >
      {state === 'all' && <CheckSquare className="h-3 w-3" />}
      {state === 'some' && <MinusSquare className="h-3 w-3" />}
      {state === 'none' && <Square className="h-3 w-3 opacity-0" />}
    </button>
  );
}

// =============================================================================
// Pagination
// =============================================================================

function Pagination({
  pagination,
  className,
}: {
  pagination: NonNullable<DataTableProps<unknown>['pagination']>;
  className?: string;
}) {
  const { page, pageSize, totalItems, totalPages, onPageChange } = pagination;
  const pages = buildRange(page, totalPages);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className={clsx('flex items-center justify-between gap-4 px-4 py-3 bg-white border-t border-gray-200', className)}>
      {/* Count */}
      <p className="text-sm text-gray-500" aria-live="polite">
        <span className="font-medium text-gray-700">{start}–{end}</span>
        {' '}của{' '}
        <span className="font-medium text-gray-700">{totalItems.toLocaleString()}</span>
        {' '}kết quả
      </p>

      {/* Page controls */}
      <nav
        role="navigation"
        aria-label="Phân trang"
        className="flex items-center gap-1"
      >
        {/* First + Prev */}
        <PageBtn
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="Đầu tiên"
        >
          <ChevronsLeft className="h-4 w-4" />
        </PageBtn>
        <PageBtn
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </PageBtn>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400 select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={clsx(
                'h-8 min-w-[2rem] rounded-md text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                p === page
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {p}
            </button>
          )
        )}

        {/* Next + Last */}
        <PageBtn
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Trang sau"
        >
          <ChevronRight className="h-4 w-4" />
        </PageBtn>
        <PageBtn
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          aria-label="Cuối cùng"
        >
          <ChevronsRight className="h-4 w-4" />
        </PageBtn>
      </nav>
    </div>
  );
}

function PageBtn({
  onClick,
  disabled,
  children,
  'aria-label': ariaLabel,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={clsx(
        'flex items-center justify-center h-8 w-8 rounded-md transition-colors',
        'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400'
      )}
    >
      {children}
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  selectable = false,
  onSelectionChange,
  bulkActions,
  loading = false,
  emptyMessage = 'Không có dữ liệu',
  onRowClick,
  sortKey,
  sortDirection,
  onSort,
  pagination,
  stickyHeader = false,
  ariaLabel,
  className,
}: DataTableProps<T>) {
  const tableId = useId();
  const tableAriaLabel = ariaLabel ?? emptyMessage;

  // ---- Row selection state ----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedItems = data.filter((item) => selected.has(keyExtractor(item)));

  const handleToggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.size === data.length) {
        next.clear();
      } else {
        data.forEach((item) => next.add(keyExtractor(item)));
      }
      return next;
    });
  }, [data, keyExtractor]);

  const handleToggleRow = useCallback(
    (item: T) => {
      setSelected((prev) => {
        const next = new Set(prev);
        const key = keyExtractor(item);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [keyExtractor]
  );

  // Notify parent of selection change
  useEffect(() => {
    onSelectionChange?.(selectedItems);
  }, [selectedItems, onSelectionChange]);

  const checkState: CheckState =
    selected.size === 0 ? 'none' : selected.size === data.length ? 'all' : 'some';

  const displayColumns = selectable
    ? [
        {
          key: '__select__',
          header: '',
          width: '2.5rem',
          render: (_item: T) => null,
        } as Column<T>,
        ...columns,
      ]
    : columns;

  return (
    <div className={clsx('bg-white rounded-xl border border-gray-200 overflow-hidden shadow-card', className)}>
      {/* Bulk actions bar — shown when rows selected */}
      {selectable && selected.size > 0 && (
        <div
          role="toolbar"
          aria-label="Hành động hàng loạt"
          className="flex items-center gap-3 px-4 py-2.5 bg-brand-50 border-b border-brand-100 animate-in slide-in-from-top-1 fade-in duration-150"
        >
          <span className="text-sm font-medium text-brand-700" aria-live="polite">
            {selected.size} đã chọn
          </span>
          <div className="h-4 w-px bg-brand-200" aria-hidden="true" />
          <div className="flex items-center gap-2">{bulkActions}</div>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-brand-600 hover:text-brand-800 underline underline-offset-2"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" aria-label={tableAriaLabel}>
          {/* Sticky header */}
          <thead
            className={clsx(
              'bg-gray-50/80 border-b border-gray-200',
              stickyHeader && 'sticky top-0 z-10 shadow-sm'
            )}
          >
            <tr>
              {displayColumns.map((col, colIdx) => {
                const isSortable = col.sortable;
                const isActive = isSortable && sortKey === col.key;
                const isFirstCol = colIdx === 0;

                if (col.key === '__select__') {
                  return (
                    <th
                      key={col.key}
                      className="px-3 py-3 w-10"
                      scope="col"
                    >
                      <SelectionCheckbox
                        state={checkState}
                        onChange={handleToggleAll}
                        label={checkState === 'all' ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      />
                    </th>
                  );
                }

                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width, minWidth: col.minWidth }}
                    className={clsx(
                      'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                      'whitespace-nowrap',
                      isFirstCol && 'pl-4',
                      ALIGN_CLASSES[col.align ?? 'left'],
                      isSortable && [
                        'cursor-pointer select-none',
                        'hover:text-gray-700 transition-colors duration-100',
                        'focus-visible:outline-none focus-visible:bg-gray-100',
                      ]
                    )}
                    onClick={isSortable ? () => onSort?.(col.key) : undefined}
                    aria-sort={
                      isActive
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.header}
                      <SortIcon
                        sortable={isSortable}
                        active={isActive}
                        direction={isActive ? sortDirection : undefined}
                      />
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: 8 }).map((_, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-transparent">
                  {displayColumns.map((col, colIdx) => (
                    <td
                      key={col.key}
                      className={clsx(
                        'px-4 py-3',
                        colIdx === 0 && 'pl-4'
                      )}
                    >
                      <div
                        className="h-4 bg-gray-100 rounded animate-pulse"
                        style={{ width: `${60 + Math.random() * 40}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty state — renders as full cell spanning all columns
              <tr>
                <td
                  colSpan={displayColumns.length}
                  className="px-4 py-16 text-center"
                  role="status"
                  aria-label={emptyMessage}
                >
                  <div className="flex flex-col items-center gap-2" aria-live="polite">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-5 w-5 text-gray-300"
                        aria-hidden="true"
                      >
                        <path
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data rows
              data.map((item) => {
                const rowKey = keyExtractor(item);
                const isSelected = selected.has(rowKey);
                const isClickable = Boolean(onRowClick);

                return (
                  <tr
                    key={rowKey}
                    className={clsx(
                      'group transition-colors duration-100',
                      isClickable && 'cursor-pointer',
                      isSelected
                        ? 'bg-brand-50/50 hover:bg-brand-50'
                        : 'hover:bg-gray-50',
                      loading && 'hover:bg-transparent'
                    )}
                    onClick={isClickable ? () => onRowClick?.(item) : undefined}
                  >
                    {displayColumns.map((col, colIdx) => {
                      const isFirstCol = colIdx === 0;

                      if (col.key === '__select__') {
                        return (
                          <td
                            key={col.key}
                            className="pl-3 pr-1 py-3 w-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SelectionCheckbox
                              state={isSelected ? 'all' : 'none'}
                              onChange={() => handleToggleRow(item)}
                              label={`Chọn dòng ${rowKey}`}
                            />
                          </td>
                        );
                      }

                      return (
                        <td
                          key={col.key}
                          className={clsx(
                            'px-4 py-3 text-sm text-gray-700',
                            isFirstCol && 'pl-4',
                            ALIGN_CLASSES[col.align ?? 'left'],
                            col.key === 'id' && 'font-mono text-gray-500'
                          )}
                        >
                          {col.render
                            ? col.render(item)
                            : String((item as Record<string, unknown>)[col.key] ?? '—')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 0 && (
        <Pagination pagination={pagination} />
      )}
    </div>
  );
}

export default DataTable;
