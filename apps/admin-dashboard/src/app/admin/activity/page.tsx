'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, RefreshCw, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { DataTable } from '@/components/admin/display/DataTable';
import { StatusBadge } from '@/components/admin/display/StatusBadge';
import { FilterBar } from '@/components/admin/layout/FilterBar';
import { ErrorState } from '@/components/admin/layout/ErrorState';
import { MetricCard } from '@/components/admin/layout/MetricCard';
import { Button } from '@/components/ui';
import { useActivityFeed, useDashboardOverview } from '@/lib/api/dashboardApi';
import { usePaginationState, useFilterState } from '@/lib/hooks/useDashboardState';
import { formatRelativeTime } from '@/lib/formatters/date';
import { formatNumber } from '@/lib/formatters/number';
import { formatActivityType } from '@/lib/formatters/status';
import type { BadgeVariant } from '@/components/admin/display/StatusBadge';
import type { ActivityRecord } from '@/lib/types/api';

const ACTIVITY_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại' },
  { value: 'CRAWL_STARTED', label: 'Bắt đầu crawl' },
  { value: 'CRAWL_COMPLETED', label: 'Hoàn thành crawl' },
  { value: 'CRAWL_FAILED', label: 'Crawl thất bại' },
  { value: 'PUBLISH_STARTED', label: 'Bắt đầu publish' },
  { value: 'PUBLISH_COMPLETED', label: 'Hoàn thành publish' },
  { value: 'PUBLISH_FAILED', label: 'Publish thất bại' },
  { value: 'AI_CONTENT_CREATED', label: 'Tạo AI content' },
  { value: 'WORKER_REGISTERED', label: 'Worker đăng ký' },
  { value: 'WORKER_HEARTBEAT', label: 'Worker heartbeat' },
];

export default function ActivityPage() {
  const pagination = usePaginationState(1, 20);
  const filters = useFilterState({ types: '', entityType: '', search: '' });
  const [searchInput, setSearchInput] = useState('');

  const { fetchActivityFeed, fetchDashboardOverview } = useActivityFeed();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['activity', pagination.page, pagination.pageSize, filters.filters],
    queryFn: () =>
      fetchActivityFeed({
        page: pagination.page,
        pageSize: pagination.pageSize,
        types: filters.filters.types ? [filters.filters.types] : undefined,
      }),
  });

  const { data: overviewData } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: fetchDashboardOverview,
  });

  const activities = (data?.data?.data ?? []) as ActivityRecord[];
  const meta = data?.data?.meta;
  const overview = overviewData?.data as any;

  const getVariant = (type: string): BadgeVariant => {
    const upper = type.toUpperCase();
    if (upper.includes('COMPLETED')) return 'success';
    if (upper.includes('FAILED') || upper.includes('ERROR')) return 'error';
    if (upper.includes('STARTED')) return 'info';
    return 'neutral';
  };

  const columns = [
    {
      key: 'type',
      header: 'Loại hoạt động',
      width: '160px',
      render: (item: ActivityRecord) => (
        <StatusBadge
          variant={getVariant(item.type ?? '')}
          label={formatActivityType(item.type ?? '')}
          size="sm"
          dot
        />
      ),
    },
    {
      key: 'message',
      header: 'Mô tả',
      render: (item: ActivityRecord) => (
        <span className="text-sm text-gray-700 line-clamp-2">{item.message ?? '—'}</span>
      ),
    },
    {
      key: 'entity_type',
      header: 'Đối tượng',
      width: '120px',
      render: (item: ActivityRecord) => (
        <span className="text-sm text-gray-500">{item.entity_type ?? '—'}</span>
      ),
    },
    {
      key: 'entity_id',
      header: 'ID',
      width: '80px',
      render: (item: ActivityRecord) => (
        <span className="font-mono text-sm text-gray-500">
          {item.entity_id ? `#${item.entity_id}` : '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Thời gian',
      width: '150px',
      align: 'right' as const,
      render: (item: ActivityRecord) => (
        <span className="text-sm text-gray-500 whitespace-nowrap tabular-nums">
          {formatRelativeTime(item.created_at)}
        </span>
      ),
    },
  ];

  const totalActivities = overview?.totalActivities ?? 0;
  const completedActivities = overview?.completedActivities ?? 0;
  const failedActivities = overview?.failedActivities ?? 0;
  const todayActivities = overview?.todayActivities ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nhật ký hoạt động"
        description={`${formatNumber(totalActivities)} hoạt động`}
        icon={Activity}
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

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Tổng hoạt động" value={formatNumber(totalActivities)} variant="neutral" icon={Activity} />
        <MetricCard title="Hôm nay" value={formatNumber(todayActivities)} variant="neutral" icon={Clock} />
        <MetricCard title="Thành công" value={formatNumber(completedActivities)} variant="success" icon={CheckCircle} />
        <MetricCard title="Thất bại" value={formatNumber(failedActivities)} variant="error" icon={XCircle} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card">
        <FilterBar
          searchValue={searchInput}
          searchPlaceholder="Tìm theo mô tả..."
          onSearchChange={setSearchInput}
          onSearch={() => { pagination.setPage(1); }}
          selectableFilters={[
            { key: 'types', label: 'Loại hoạt động', value: filters.filters.types, options: ACTIVITY_TYPE_OPTIONS, onChange: (v) => { filters.setFilter('types', v); pagination.setPage(1); } },
          ]}
          activeFilters={[
            { key: 'types', label: 'Loại hoạt động', value: filters.filters.types, options: ACTIVITY_TYPE_OPTIONS, onChange: (v) => { filters.setFilter('types', v); pagination.setPage(1); } },
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
          data={activities}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          ariaLabel="Nhật ký hoạt động hệ thống"
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
          stickyHeader
          emptyMessage="Không có hoạt động nào gần đây"
        />
      )}
    </div>
  );
}
