'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, RefreshCw, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { DataTable } from '@/components/admin/display/DataTable';
import { StatusBadge } from '@/components/admin/display/StatusBadge';
import { FilterBar } from '@/components/admin/layout/FilterBar';
import { ErrorState } from '@/components/admin/layout/ErrorState';
import { ConfirmDialog } from '@/components/admin/display/ConfirmDialog';
import { Button } from '@/components/ui';
import { useProducts, useDashboardOverview } from '@/lib/api/dashboardApi';
import { usePaginationState, useSortState, useFilterState } from '@/lib/hooks/useDashboardState';
import { formatRelativeTime } from '@/lib/formatters/date';
import { formatNumber } from '@/lib/formatters/number';
import { formatProductStatus, formatPlatform } from '@/lib/formatters/status';
import type { ProductRecord } from '@/lib/types/api';

const PLATFORM_OPTIONS = [
  { value: '', label: 'Tất cả nền tảng' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'tiktok', label: 'TikTok Shop' },
  { value: 'tiki', label: 'Tiki' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Không hoạt động' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'error', label: 'Lỗi' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'Tất cả nguồn' },
  { value: 'manual', label: 'Thủ công' },
  { value: 'crawl', label: 'Tự động' },
  { value: 'import', label: 'Import' },
];

export default function ProductsPage() {
  const pagination = usePaginationState(1, 20);
  const sort = useSortState<string>('created_at', 'desc');
  const filters = useFilterState({ platform: '', status: '', sourceType: '', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<ProductRecord[]>([]);

  // Bulk delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { fetchProducts, fetchDashboardOverview } = useProducts();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['products', pagination.page, pagination.pageSize, sort.sortKey, sort.sortDir, filters.filters],
    queryFn: () =>
      fetchProducts({
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy: sort.sortKey,
        sortOrder: sort.sortDir,
        platform: filters.filters.platform || undefined,
        status: filters.filters.status || undefined,
        sourceType: filters.filters.sourceType || undefined,
        search: searchInput || undefined,
      }),
  });

  const { data: overviewData } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: fetchDashboardOverview,
  });

  const products = data?.data?.data as ProductRecord[] ?? [];

  const columns = [
    {
      key: 'external_product_id',
      header: 'ID Sản phẩm',
      minWidth: '120px',
      sortable: true,
      render: (item: ProductRecord) => (
        <span className="font-mono text-xs text-gray-500">{item.external_product_id}</span>
      ),
    },
    {
      key: 'name',
      header: 'Tên sản phẩm',
      minWidth: '240px',
      sortable: true,
      render: (item: ProductRecord) => (
        <span className="text-sm text-gray-900 line-clamp-2">{item.name}</span>
      ),
    },
    {
      key: 'platform',
      header: 'Nền tảng',
      width: '110px',
      sortable: true,
      render: (item: ProductRecord) => (
        <StatusBadge
          variant="info"
          label={formatPlatform(item.platform)}
          size="sm"
        />
      ),
    },
    {
      key: 'price',
      header: 'Giá',
      width: '120px',
      sortable: true,
      align: 'right' as const,
      render: (item: ProductRecord) => (
        <span className="text-sm font-semibold text-gray-900">
          {formatNumber(item.price)}đ
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '130px',
      sortable: true,
      render: (item: ProductRecord) => {
        const variant = item.status === 'active' ? 'success'
          : item.status === 'error' ? 'error' : 'neutral';
        return (
          <StatusBadge
            variant={variant}
            label={formatProductStatus(item.status)}
            size="sm"
            dot
          />
        );
      },
    },
    {
      key: 'source_type',
      header: 'Nguồn',
      width: '100px',
      render: (item: ProductRecord) => (
        <span className="text-sm text-gray-500 capitalize">{item.source_type ?? '—'}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Ngày tạo',
      width: '140px',
      sortable: true,
      align: 'right' as const,
      render: (item: ProductRecord) => (
        <span className="text-sm text-gray-400 whitespace-nowrap tabular-nums">
          {formatRelativeTime(item.created_at)}
        </span>
      ),
    },
  ];

  const handleSearch = () => {
    pagination.setPage(1);
    filters.setFilter('search', searchInput);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    filters.clearAllFilters();
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    // TODO: call bulk delete API
    await new Promise((r) => setTimeout(r, 1000));
    setDeleting(false);
    setShowDeleteDialog(false);
    setSelectedProducts([]);
    refetch();
  };

  const overview = overviewData?.data as any;
  const totalProducts = formatNumber(overview?.totalProducts ?? 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sản phẩm"
        description={`${totalProducts} sản phẩm`}
        icon={Package}
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
          searchPlaceholder="Tìm theo tên hoặc ID sản phẩm..."
          onSearchChange={setSearchInput}
          onSearch={handleSearch}
          selectableFilters={[
            { key: 'platform', label: 'Nền tảng', value: filters.filters.platform, options: PLATFORM_OPTIONS, onChange: (v) => { filters.setFilter('platform', v); pagination.setPage(1); } },
            { key: 'status', label: 'Trạng thái', value: filters.filters.status, options: STATUS_OPTIONS, onChange: (v) => { filters.setFilter('status', v); pagination.setPage(1); } },
            { key: 'sourceType', label: 'Nguồn', value: filters.filters.sourceType, options: SOURCE_OPTIONS, onChange: (v) => { filters.setFilter('sourceType', v); pagination.setPage(1); } },
          ]}
          activeFilters={[
            { key: 'platform', label: 'Nền tảng', value: filters.filters.platform, options: PLATFORM_OPTIONS, onChange: (v) => { filters.setFilter('platform', v); pagination.setPage(1); } },
            { key: 'status', label: 'Trạng thái', value: filters.filters.status, options: STATUS_OPTIONS, onChange: (v) => { filters.setFilter('status', v); pagination.setPage(1); } },
            { key: 'sourceType', label: 'Nguồn', value: filters.filters.sourceType, options: SOURCE_OPTIONS, onChange: (v) => { filters.setFilter('sourceType', v); pagination.setPage(1); } },
          ]}
          onClearAll={handleClearFilters}
        />
      </div>

      {/* Table */}
      {error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={products}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          selectable
          onSelectionChange={setSelectedProducts}
          ariaLabel="Danh sách sản phẩm"
          bulkActions={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                <span className="text-red-500">Xóa đã chọn</span>
              </Button>
            </>
          }
          pagination={
            data?.data?.meta
              ? {
                  page: pagination.page,
                  pageSize: pagination.pageSize,
                  totalItems: data.data.meta.total,
                  totalPages: Math.ceil(data.data.meta.total / pagination.pageSize),
                  onPageChange: pagination.setPage,
                }
              : undefined
          }
          sortKey={sort.sortKey ?? undefined}
          sortDirection={sort.sortDir}
          onSort={sort.toggleSort}
          stickyHeader
          emptyMessage="Không có sản phẩm nào"
        />
      )}

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        title={`Xóa ${selectedProducts.length} sản phẩm đã chọn?`}
        description="Hành động này sẽ xóa các sản phẩm đã chọn khỏi hệ thống. Dữ liệu không thể khôi phục."
        confirmLabel="Xóa"
        loading={deleting}
      />
    </div>
  );
}
