'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Filter, RefreshCw, Eye } from 'lucide-react';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { DataTable } from '@/components/admin/display/DataTable';
import { StatusBadge } from '@/components/admin/display/StatusBadge';
import { FilterBar } from '@/components/admin/layout/FilterBar';
import { ErrorState } from '@/components/admin/layout/ErrorState';
import { LoadingSkeleton } from '@/components/admin/layout/LoadingSkeleton';
import { EmptyState } from '@/components/ui';
import { useAiContents } from '@/lib/api/dashboardApi';
import { usePaginationState, useSortState, useFilterState } from '@/lib/hooks/useDashboardState';
import { formatRelativeTime } from '@/lib/formatters/date';
import { formatNumber } from '@/lib/formatters/number';
import { formatAiContentStatus } from '@/lib/formatters/status';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'failed', label: 'Thất bại' },
];

const AI_MODEL_OPTIONS = [
  { value: '', label: 'Tất cả model' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3', label: 'Claude-3' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
];

/**
 * AI Contents list page
 */
export default function AiContentsPage() {
  const pagination = usePaginationState(1, 20);
  const sort = useSortState<string>('created_at', 'desc');
  const filters = useFilterState({
    status: '',
    aiModel: '',
    search: '',
  });

  const [searchInput, setSearchInput] = useState('');

  const { fetchAiContents } = useAiContents();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-contents', pagination.page, pagination.pageSize, sort.sortKey, sort.sortDir, filters.filters],
    queryFn: () =>
      fetchAiContents({
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy: sort.sortKey,
        sortOrder: sort.sortDir,
        status: filters.filters.status || undefined,
        aiModel: filters.filters.aiModel || undefined,
      }),
  });

  const contents = (data as any)?.data?.data ?? [];
  const meta = (data as any)?.data?.meta;

  const columns = useMemo(
    () => [
      {
        key: 'id',
        header: 'ID',
        width: '80px',
        render: (item: any) => (
          <span className="font-mono text-sm">#{item.id}</span>
        ),
      },
      {
        key: 'product_name',
        header: 'Sản phẩm',
        sortable: true,
        render: (item: any) => (
          <span className="text-sm line-clamp-2">{item.product_name || '-'}</span>
        ),
      },
      {
        key: 'content_type',
        header: 'Loại nội dung',
        width: '120px',
        render: (item: any) => (
          <span className="text-sm text-gray-500 capitalize">{item.content_type || '-'}</span>
        ),
      },
      {
        key: 'ai_model',
        header: 'AI Model',
        width: '120px',
        render: (item: any) => (
          <span className="text-sm font-mono">{item.ai_model || '-'}</span>
        ),
      },
      {
        key: 'status',
        header: 'Trạng thái',
        width: '120px',
        sortable: true,
        render: (item: any) => {
          const variant = item.status === 'completed' ? 'success'
            : item.status === 'failed' ? 'error'
            : item.status === 'processing' ? 'info'
            : 'neutral';
          return <StatusBadge variant={variant} label={formatAiContentStatus(item.status)} size="sm" dot />;
        },
      },
      {
        key: 'confidence_score',
        header: 'Confidence',
        width: '100px',
        align: 'right' as const,
        render: (item: any) => (
          <span className="font-medium">
            {item.confidence_score != null ? `${(item.confidence_score * 100).toFixed(0)}%` : '-'}
          </span>
        ),
      },
      {
        key: 'created_at',
        header: 'Tạo lúc',
        width: '150px',
        sortable: true,
        align: 'right' as const,
        render: (item: any) => (
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {formatRelativeTime(item.created_at)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '60px',
        render: (item: any) => (
          <button
            aria-label={`Xem chi tiết nội dung #${item.id}`}
            className="p-1 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded"
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
          </button>
        ),
      },
    ],
    []
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

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
      key: 'aiModel',
      label: 'AI Model',
      value: filters.filters.aiModel,
      options: AI_MODEL_OPTIONS,
      onChange: (v: string) => filters.setFilter('aiModel', v),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="AI Contents"
        description="Quản lý nội dung được tạo bởi AI"
        icon={Sparkles}
        actions={
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Tìm theo tên sản phẩm..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Filter className="w-4 h-4" />
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
      ) : contents.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Không có nội dung AI nào"
          description="Chưa có nội dung AI nào được tạo."
        />
      ) : (
        <DataTable
          columns={columns}
          data={contents}
          keyExtractor={(item: any) => item.id}
          loading={isLoading}
          ariaLabel="Danh sách nội dung AI"
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
          onSort={sort.toggleSort}
        />
      )}
    </div>
  );
}
