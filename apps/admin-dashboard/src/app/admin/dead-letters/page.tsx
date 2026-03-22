'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertOctagon, RefreshCw, Eye, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { DataTable } from '@/components/admin/display/DataTable';
import { StatusBadge } from '@/components/admin/display/StatusBadge';
import { FilterBar } from '@/components/admin/layout/FilterBar';
import { ErrorState } from '@/components/admin/layout/ErrorState';
import { ConfirmDialog } from '@/components/admin/display/ConfirmDialog';
import { Button } from '@/components/ui';
import { useDeadLetters } from '@/lib/api/dashboardApi';
import { usePaginationState, useSortState, useFilterState } from '@/lib/hooks/useDashboardState';
import { formatRelativeTime } from '@/lib/formatters/date';
import type { DeadLetterRecord } from '@/lib/types/api';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending',    label: 'Chờ xử lý' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'processed', label: 'Đã xử lý' },
  { value: 'failed',     label: 'Thất bại' },
];

const SOURCE_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả nguồn' },
  { value: 'crawl',     label: 'Crawl' },
  { value: 'publish',   label: 'Publish' },
  { value: 'ai_content', label: 'AI Content' },
  { value: 'worker',    label: 'Worker' },
];

export default function DeadLettersPage() {
  const pagination = usePaginationState(1, 20);
  const sort = useSortState<'created_at' | 'error_message' | 'retry_count' | 'status'>('created_at', 'desc');
  const filters = useFilterState({ status: '', sourceType: '', search: '' });
  const [searchInput, setSearchInput] = useState('');

  // Retry confirmation dialog
  const [retryTarget, setRetryTarget] = useState<DeadLetterRecord | null>(null);
  const [retrying, setRetrying] = useState(false);
  const queryClient = useQueryClient();

  const { fetchDeadLetters } = useDeadLetters();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dead-letters', pagination.page, pagination.pageSize, sort.sortKey, sort.sortDir, filters.filters],
    queryFn: () =>
      fetchDeadLetters({
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy: sort.sortKey,
        sortOrder: sort.sortDir,
        status: filters.filters.status || undefined,
        sourceType: filters.filters.sourceType || undefined,
      }),
  });

  const items = (data?.data?.data ?? []) as DeadLetterRecord[];
  const meta = data?.data?.meta;

  const handleRetryConfirm = async () => {
    if (!retryTarget) return;
    setRetrying(true);
    try {
      await fetch(`/api/dead-letters/${retryTarget.id}/retry`, { method: 'POST' });
    } catch {
      // error — user can retry again
    } finally {
      setRetrying(false);
      setRetryTarget(null);
      queryClient.invalidateQueries({ queryKey: ['dead-letters'] });
    }
  };

  const columns = [
    {
      key: 'id',
      header: 'ID',
      width: '80px',
      render: (item: DeadLetterRecord) => (
        <span className="font-mono text-xs text-gray-500">#{item.id}</span>
      ),
    },
    {
      key: 'source_type',
      header: 'Nguồn',
      width: '120px',
      render: (item: DeadLetterRecord) => (
        <StatusBadge
          variant="info"
          label={item.source_type?.toUpperCase() ?? '—'}
          size="sm"
        />
      ),
    },
    {
      key: 'entity_id',
      header: 'Entity ID',
      width: '100px',
      render: (item: DeadLetterRecord) => (
        <span className="font-mono text-sm text-gray-500">
          {item.entity_id ? `#${item.entity_id}` : '—'}
        </span>
      ),
    },
    {
      key: 'error_message',
      header: 'Lỗi',
      sortable: true,
      minWidth: '200px',
      render: (item: DeadLetterRecord) => (
        <span className="text-sm text-red-600 line-clamp-2">
          {item.error_message ?? '—'}
        </span>
      ),
    },
    {
      key: 'retry_count',
      header: 'Số lần thử',
      width: '100px',
      align: 'center' as const,
      render: (item: DeadLetterRecord) => (
        <span className="text-sm font-medium text-gray-700">{item.retry_count ?? 0}</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '120px',
      sortable: true,
      render: (item: DeadLetterRecord) => {
        const variant = item.status === 'processed' ? 'success'
          : item.status === 'failed' ? 'error'
          : item.status === 'processing' ? 'info'
          : 'neutral';
        return (
          <StatusBadge
            variant={variant}
            label={(item.status ?? '').toUpperCase()}
            size="sm"
            dot
          />
        );
      },
    },
    {
      key: 'created_at',
      header: 'Ngày tạo',
      width: '150px',
      sortable: true,
      align: 'right' as const,
      render: (item: DeadLetterRecord) => (
        <span className="text-sm text-gray-500 whitespace-nowrap tabular-nums">
          {formatRelativeTime(item.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      align: 'right' as const,
      render: (item: DeadLetterRecord) => (
        <div className="flex items-center justify-end gap-1">
          <button
            className="flex items-center justify-center h-7 w-7 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            aria-label="Xem chi tiết message"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </button>
          {item.status !== 'processed' && (
            <button
              onClick={() => setRetryTarget(item)}
              className="flex items-center justify-center h-7 w-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              aria-label={`Thử lại message #${item.id}`}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dead Letters"
        description="Quản lý các message thất bại"
        icon={AlertOctagon}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => refetch()}
          >
            Làm mới
          </Button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card">
        <FilterBar
          searchValue={searchInput}
          searchPlaceholder="Tìm theo error message..."
          onSearchChange={setSearchInput}
          onSearch={() => { pagination.setPage(1); }}
          selectableFilters={[
            { key: 'status', label: 'Trạng thái', value: filters.filters.status, options: STATUS_OPTIONS, onChange: (v) => { filters.setFilter('status', v); pagination.setPage(1); } },
            { key: 'sourceType', label: 'Nguồn', value: filters.filters.sourceType, options: SOURCE_TYPE_OPTIONS, onChange: (v) => { filters.setFilter('sourceType', v); pagination.setPage(1); } },
          ]}
          activeFilters={[
            { key: 'status', label: 'Trạng thái', value: filters.filters.status, options: STATUS_OPTIONS, onChange: (v) => { filters.setFilter('status', v); pagination.setPage(1); } },
            { key: 'sourceType', label: 'Nguồn', value: filters.filters.sourceType, options: SOURCE_TYPE_OPTIONS, onChange: (v) => { filters.setFilter('sourceType', v); pagination.setPage(1); } },
          ]}
          onClearAll={() => { setSearchInput(''); filters.clearAllFilters(); }}
        />
      </div>

      {/* Table */}
      {error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          ariaLabel="Danh sách message thất bại"
          pagination={
            meta
              ? {
                  page: pagination.page,
                  pageSize: pagination.pageSize,
                  totalItems: meta.total,
                  totalPages: Math.ceil(meta.total / pagination.pageSize),
                  onPageChange: pagination.setPage,
                }
              : undefined
          }
          sortKey={sort.sortKey ?? undefined}
          sortDirection={sort.sortDir}
          onSort={sort.toggleSort as (key: string) => void}
          stickyHeader
          emptyMessage="Không có message thất bại nào"
        />
      )}

      {/* Retry confirmation */}
      <ConfirmDialog
        open={retryTarget !== null}
        onClose={() => setRetryTarget(null)}
        onConfirm={handleRetryConfirm}
        title={`Thử lại message #${retryTarget?.id ?? ''}`}
        description={`Message sẽ được đưa trở lại hàng đợi để xử lý lại. Đã thử ${retryTarget?.retry_count ?? 0} lần trước đó.`}
        confirmLabel="Thử lại"
        cancelLabel="Hủy"
        loading={retrying}
        size="sm"
      />
    </div>
  );
}
