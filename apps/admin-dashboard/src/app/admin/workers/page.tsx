'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Filter, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { DataTable } from '@/components/admin/display/DataTable';
import { StatusBadge } from '@/components/admin/display/StatusBadge';
import { FilterBar } from '@/components/admin/layout/FilterBar';
import { ErrorState } from '@/components/admin/layout/ErrorState';
import { LoadingSkeleton } from '@/components/admin/layout/LoadingSkeleton';
import { EmptyState } from '@/components/ui';
import { MetricCard } from '@/components/admin/layout/MetricCard';
import { useWorkers, useDashboardOverview } from '@/lib/api/dashboardApi';
import { usePaginationState, useSortState, useFilterState } from '@/lib/hooks/useDashboardState';
import { formatRelativeTime } from '@/lib/formatters/date';
import { formatNumber } from '@/lib/formatters/number';
import type { WorkerRecord } from '@/lib/types/api';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'idle', label: 'Rảnh' },
  { value: 'paused', label: 'Tạm dừng' },
  { value: 'error', label: 'Lỗi' },
];

const WORKER_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại' },
  { value: 'crawler', label: 'Crawler' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'ai_generator', label: 'AI Generator' },
  { value: 'processor', label: 'Processor' },
];

export default function WorkersPage() {
  const pagination = usePaginationState(1, 20);
  const sort = useSortState<'created_at' | 'last_heartbeat'>('last_heartbeat', 'desc');
  const filters = useFilterState({
    status: '',
    worker_type: '',
    search: '',
  });

  const [searchInput, setSearchInput] = useState('');

  const { fetchWorkers, fetchDashboardOverview } = useWorkers();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['workers', pagination.page, pagination.pageSize, sort.sortKey, sort.sortDir, filters.filters],
    queryFn: () =>
      fetchWorkers({
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy: sort.sortKey,
        sortOrder: sort.sortDir,
        status: filters.filters.status || undefined,
        workerType: filters.filters.worker_type || undefined,
      }),
  });

  const { data: overviewData } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: fetchDashboardOverview,
  });

  const overview = overviewData?.data as { totalWorkers?: number; activeWorkers?: number } | undefined;

  const columns = useMemo(
    () => [
      {
        key: 'worker_id',
        header: 'Worker ID',
        width: '120px',
        render: (item: WorkerRecord) => (
          <span className="font-mono text-sm">{item.worker_id}</span>
        ),
      },
      {
        key: 'worker_type',
        header: 'Loại',
        width: '120px',
        render: (item: WorkerRecord) => (
          <StatusBadge
            variant="neutral"
            label={item.worker_type?.toUpperCase() ?? '-'}
            size="sm"
          />
        ),
      },
      {
        key: 'status',
        header: 'Trạng thái',
        width: '120px',
        sortable: true,
        render: (item: WorkerRecord) => {
          const variant =
            item.status === 'active'
              ? 'success'
              : item.status === 'paused'
              ? 'warning'
              : item.status === 'error'
              ? 'error'
              : 'neutral';
          return <StatusBadge variant={variant} label={item.status?.toUpperCase() ?? '-'} size="sm" dot />;
        },
      },
      {
        key: 'current_job_id',
        header: 'Job hiện tại',
        width: '100px',
        render: (item: WorkerRecord) => (
          <span className="font-mono text-sm text-gray-500">
            {item.current_job_id ? `#${item.current_job_id}` : '-'}
          </span>
        ),
      },
      {
        key: 'jobs_completed',
        header: 'Đã hoàn thành',
        width: '120px',
        align: 'right' as const,
        render: (item: WorkerRecord) => (
          <span className="font-medium">{formatNumber(item.jobs_completed ?? 0)}</span>
        ),
      },
      {
        key: 'jobs_failed',
        header: 'Thất bại',
        width: '100px',
        align: 'right' as const,
        render: (item: WorkerRecord) => (
          <span className="text-red-600 font-medium">{formatNumber(item.jobs_failed ?? 0)}</span>
        ),
      },
      {
        key: 'cpu_usage',
        header: 'CPU',
        width: '80px',
        align: 'right' as const,
        render: (item: WorkerRecord) => (
          <span className="text-sm">{item.cpu_usage != null ? `${item.cpu_usage.toFixed(1)}%` : '-'}</span>
        ),
      },
      {
        key: 'memory_usage',
        header: 'RAM',
        width: '80px',
        align: 'right' as const,
        render: (item: WorkerRecord) => (
          <span className="text-sm">{item.memory_usage != null ? `${item.memory_usage.toFixed(1)}%` : '-'}</span>
        ),
      },
      {
        key: 'last_heartbeat',
        header: 'Heartbeat',
        width: '150px',
        sortable: true,
        align: 'right' as const,
        render: (item: WorkerRecord) => (
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {formatRelativeTime(item.last_heartbeat)}
          </span>
        ),
      },
    ],
    []
  );

  const handleClearFilters = () => {
    setSearchInput('');
    filters.clearAllFilters();
  };

  const filterConfigs = [
    {
      key: 'status',
      label: 'Trạng thái',
      value: filters.filters.status,
      options: STATUS_OPTIONS,
      onChange: (v: string) => filters.setFilter('status', v),
    },
    {
      key: 'worker_type',
      label: 'Loại worker',
      value: filters.filters.worker_type,
      options: WORKER_TYPE_OPTIONS,
      onChange: (v: string) => filters.setFilter('worker_type', v),
    },
  ];

  const workers = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Workers"
        description="Quản lý các worker của hệ thống"
        icon={Users}
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Làm mới
          </button>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Tổng Workers"
          value={formatNumber(overview?.totalWorkers ?? 0)}
          variant="neutral"
        />
        <MetricCard
          title="Đang hoạt động"
          value={formatNumber(overview?.activeWorkers ?? 0)}
          variant="success"
        />
        <MetricCard
          title="Rảnh"
          value={formatNumber((overview?.totalWorkers ?? 0) - (overview?.activeWorkers ?? 0))}
          variant="neutral"
        />
        <MetricCard
          title="Lỗi"
          value={formatNumber(0)}
          variant="error"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Tìm theo worker ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <Filter className="w-4 h-4" aria-hidden="true" />
            Tìm kiếm
          </button>
        </form>

        <FilterBar
          filters={filterConfigs}
          onClearAll={handleClearFilters}
        />
      </div>

      {/* Table */}
      {error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <LoadingSkeleton variant="table" rows={10} />
      ) : workers.length === 0 ? (
        <EmptyState
          variant="default"
          title="Không có worker nào"
          description="Chưa có worker nào được đăng ký."
        />
      ) : (
        <DataTable
          columns={columns}
          data={workers}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          ariaLabel="Danh sách worker hệ thống"
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
        />
      )}
    </div>
  );
}
