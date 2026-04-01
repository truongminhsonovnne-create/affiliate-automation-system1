'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, RefreshCw, CheckCircle, XCircle, Clock, Loader, Plus } from 'lucide-react';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { DataTable } from '@/components/admin/display/DataTable';
import { StatusBadge } from '@/components/admin/display/StatusBadge';
import { FilterBar } from '@/components/admin/layout/FilterBar';
import { ErrorState } from '@/components/admin/layout/ErrorState';
import { MetricCard } from '@/components/admin/layout/MetricCard';
import { Button } from '@/components/ui';
import { CreatePublishJobModal } from '@/components/admin/publish/CreatePublishJobModal';
import { usePublishJobs, useDashboardOverview } from '@/lib/api/dashboardApi';
import { usePaginationState, useSortState, useFilterState } from '@/lib/hooks/useDashboardState';
import { formatRelativeTime } from '@/lib/formatters/date';
import { formatNumber } from '@/lib/formatters/number';
import { formatPublishJobStatus, formatPlatform } from '@/lib/formatters/status';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth/useAuth';
import type { PublishJobRecord } from '@/lib/types/api';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'running', label: 'Đang chạy' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const PLATFORM_OPTIONS = [
  { value: '', label: 'Tất cả nền tảng' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'tiktok', label: 'TikTok Shop' },
  { value: 'tiki', label: 'Tiki' },
];

export default function PublishJobsPage() {
  const pagination = usePaginationState(1, 20);
  const sort = useSortState<'created_at' | 'started_at' | 'completed_at'>('created_at', 'desc');
  const filters = useFilterState({ status: '', platform: '', content_type: '', search: '' });
  const [searchInput, setSearchInput] = useState('');

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { hasPermission: checkPerm } = useAuth();
  const canCreate = checkPerm('run_publish_jobs');

  // ── Create job modal ──────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const handleJobCreated = useCallback(
    (_result: { jobId: string }) => {
      toast.success('Publish Job đã được tạo thành công!');
      // Refresh jobs list and overview
      queryClient.invalidateQueries({ queryKey: ['publish-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] });
    },
    [queryClient, toast]
  );

  const { fetchPublishJobs, fetchDashboardOverview } = usePublishJobs();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['publish-jobs', pagination.page, pagination.pageSize, sort.sortKey, sort.sortDir, filters.filters],
    queryFn: () =>
      fetchPublishJobs({
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy: sort.sortKey,
        sortOrder: sort.sortDir,
        status: filters.filters.status || undefined,
        platform: filters.filters.platform || undefined,
        contentType: filters.filters.content_type || undefined,
        search: searchInput || undefined,
      }),
  });

  const { data: overviewData } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: fetchDashboardOverview,
  });

  const jobs = (data?.data?.data ?? []) as PublishJobRecord[];
  const meta = data?.data?.meta;
  const overview = overviewData?.data as any;

  const columns = [
    {
      key: 'id',
      header: 'Job ID',
      width: '100px',
      render: (item: PublishJobRecord) => (
        <span className="font-mono text-xs text-gray-500">#{item.id}</span>
      ),
    },
    {
      key: 'platform',
      header: 'Nền tảng',
      width: '110px',
      render: (item: PublishJobRecord) => (
        <StatusBadge variant="info" label={formatPlatform(item.platform)} size="sm" />
      ),
    },
    {
      key: 'content_type',
      header: 'Loại nội dung',
      width: '130px',
      render: (item: PublishJobRecord) => (
        <span className="text-sm text-gray-500 capitalize">{item.content_type ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '130px',
      sortable: true,
      render: (item: PublishJobRecord) => {
        const variant = item.status === 'completed' ? 'success'
          : item.status === 'failed' ? 'error'
          : item.status === 'running' ? 'info'
          : 'neutral';
        return (
          <StatusBadge variant={variant} label={formatPublishJobStatus(item.status)} size="sm" dot />
        );
      },
    },
    {
      key: 'items',
      header: 'Items',
      width: '200px',
      render: (item: PublishJobRecord) => {
        const total = item.total_items ?? 0;
        const ok = item.successful_items ?? 0;
        const fail = item.failed_items ?? 0;
        const pct = total > 0 ? Math.round((ok / total) * 100) : 0;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-900">{formatNumber(total)}</span>
              {ok > 0 && <span className="text-green-600 font-medium">+{formatNumber(ok)}</span>}
              {fail > 0 && <span className="text-red-600 font-medium">-{formatNumber(fail)}</span>}
            </div>
            {total > 0 && (
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'error_message',
      header: 'Lỗi',
      minWidth: '180px',
      render: (item: PublishJobRecord) =>
        item.error_message ? (
          <span className="text-sm text-red-500 line-clamp-2">{item.error_message}</span>
        ) : (
          <span className="text-sm text-gray-300">—</span>
        ),
    },
    {
      key: 'created_at',
      header: 'Bắt đầu',
      width: '140px',
      sortable: true,
      align: 'right' as const,
      render: (item: PublishJobRecord) => (
        <span className="text-sm text-gray-400 whitespace-nowrap tabular-nums">
          {formatRelativeTime(item.created_at)}
        </span>
      ),
    },
  ];

  const pendingJobs  = overview?.pendingJobs  ?? 0;
  const runningJobs = overview?.runningJobs ?? 0;
  const completedJobs = overview?.completedJobs ?? 0;
  const failedJobs   = overview?.failedJobs ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Publish Jobs"
        description="Quản lý các job đăng bài lên các nền tảng"
        icon={Send}
        actions={
          <>
            {canCreate && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setShowCreateModal(true)}
              >
                Tạo Job
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => refetch()}
            >
              Làm mới
            </Button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Đang chờ"   value={formatNumber(pendingJobs)}  variant="neutral" icon={Clock} />
        <MetricCard title="Đang chạy"  value={formatNumber(runningJobs)} variant="warning"  icon={Loader} />
        <MetricCard title="Hoàn thành" value={formatNumber(completedJobs)} variant="success"  icon={CheckCircle} />
        <MetricCard title="Thất bại"   value={formatNumber(failedJobs)}   variant="error"    icon={XCircle} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card">
        <FilterBar
          searchValue={searchInput}
          searchPlaceholder="Tìm kiếm job..."
          onSearchChange={setSearchInput}
          onSearch={() => { pagination.setPage(1); }}
          selectableFilters={[
            { key: 'status', label: 'Trạng thái', value: filters.filters.status, options: STATUS_OPTIONS, onChange: (v) => { filters.setFilter('status', v); pagination.setPage(1); } },
            { key: 'platform', label: 'Nền tảng', value: filters.filters.platform, options: PLATFORM_OPTIONS, onChange: (v) => { filters.setFilter('platform', v); pagination.setPage(1); } },
          ]}
          activeFilters={[
            { key: 'status', label: 'Trạng thái', value: filters.filters.status, options: STATUS_OPTIONS, onChange: (v) => { filters.setFilter('status', v); pagination.setPage(1); } },
            { key: 'platform', label: 'Nền tảng', value: filters.filters.platform, options: PLATFORM_OPTIONS, onChange: (v) => { filters.setFilter('platform', v); pagination.setPage(1); } },
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
          data={jobs}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          ariaLabel="Danh sách job đăng bài"
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
          emptyMessage="Không có job publish nào"
        />
      )}

      {/* Create job modal */}
      <CreatePublishJobModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleJobCreated}
      />
    </div>
  );
}
