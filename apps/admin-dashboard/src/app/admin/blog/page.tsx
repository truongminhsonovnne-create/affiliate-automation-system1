'use client';

/**
 * Admin Blog Management — /admin/blog
 *
 * Full CRUD management for blog posts.
 * Allows creating, editing, archiving, and deleting blog posts.
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  MoreHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import Image from 'next/image';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { DataTable } from '@/components/admin/display/DataTable';
import { StatusBadge } from '@/components/admin/display/StatusBadge';
import { ErrorState } from '@/components/admin/layout/ErrorState';
import { Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/admin/display/ConfirmDialog';
import { BlogPostEditor } from '@/components/admin/blog/BlogPostEditor';
import { listBlogPosts, deleteBlogPost, type ListBlogPostsFilters } from '@/lib/api/blogApi';
import { usePaginationState, useSortState } from '@/lib/hooks/useDashboardState';
import { useAuth } from '@/lib/auth/useAuth';
import { formatRelativeTime } from '@/lib/formatters/date';
import type { BlogPostRecord } from '@/lib/types/api';

// ── Options ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'draft', label: 'Nháp' },
  { value: 'published', label: 'Đã đăng' },
  { value: 'archived', label: 'Đã lưu trữ' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'Tất cả danh mục' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'review', label: 'Review' },
  { value: 'huong-dan', label: 'Hướng dẫn' },
  { value: 'tin-tuc', label: 'Tin tức' },
  { value: 'meo-vat', label: 'Mẹo vặt' },
];

// ── Page Component ──────────────────────────────────────────────────────────

export default function BlogManagementPage() {
  const queryClient = useQueryClient();
  const { hasPermission: checkPerm } = useAuth();

  const canEdit = checkPerm('edit_blog_posts');
  const canDelete = checkPerm('delete_blog_posts');

  const pagination = usePaginationState(1, 20);
  const sort = useSortState<'created_at' | 'published_at' | 'title'>('created_at', 'desc');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // ── Editor modal state ─────────────────────────────────────────────────
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPostRecord | null>(null);

  // ── Delete confirmation ───────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<BlogPostRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch posts ────────────────────────────────────────────────────────
  const filters: ListBlogPostsFilters = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    sortBy: sort.sortKey ?? 'created_at',
    sortDir: sort.sortDir,
    search: searchInput || undefined,
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['blog-posts', filters],
    queryFn: () => listBlogPosts(filters),
    placeholderData: (prev) => prev,
  });

  const posts = data?.items ?? [];
  const meta = data?.pagination;

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleCreateNew = () => {
    setEditingPost(null);
    setEditorOpen(true);
  };

  const handleEdit = (post: BlogPostRecord) => {
    setEditingPost(post);
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingPost(null);
  };

  const handleEditorSaved = () => {
    setEditorOpen(false);
    setEditingPost(null);
    queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
  };

  const handleDeleteRequest = (post: BlogPostRecord) => {
    setDeleteTarget(post);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBlogPost(deleteTarget.id);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
    } catch {
      // error handled by API
    } finally {
      setDeleting(false);
    }
  };

  // ── Status badge variant ───────────────────────────────────────────────
  const statusVariant = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft':      return 'warning';
      case 'archived':   return 'neutral';
      default:            return 'neutral';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Đã đăng';
      case 'draft':      return 'Nháp';
      case 'archived':   return 'Lưu trữ';
      default:            return status;
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'title',
      header: 'Bài viết',
      sortable: true,
      render: (item: BlogPostRecord) => {
        // Prefer post_images cover, fallback to featured_image_url
        const coverImage =
          item.post_images?.find((i) => i.is_cover)?.url ?? item.featured_image_url;
        return (
        <div className="flex items-start gap-3 min-w-0">
          {coverImage ? (
            <div className="relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-gray-100">
              <Image
                src={coverImage}
                alt={item.title}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
          ) : (
            <div className="flex-shrink-0 w-12 h-12 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-gray-300" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
              {item.title}
            </p>
            {item.category && (
              <span className="inline-block mt-1 text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                {item.category}
              </span>
            )}
          </div>
        </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '110px',
      sortable: true,
      render: (item: BlogPostRecord) => (
        <StatusBadge
          variant={statusVariant(item.status) as any}
          label={statusLabel(item.status)}
          size="sm"
        />
      ),
    },
    {
      key: 'author_name',
      header: 'Tác giả',
      width: '130px',
      render: (item: BlogPostRecord) => (
        <span className="text-sm text-gray-500 truncate block">
          {item.author_name ?? '—'}
        </span>
      ),
    },
    {
      key: 'read_time_minutes',
      header: 'Đọc',
      width: '70px',
      align: 'right' as const,
      render: (item: BlogPostRecord) => (
        <span className="text-xs text-gray-400 tabular-nums">
          {item.read_time_minutes ? `${item.read_time_minutes} phút` : '—'}
        </span>
      ),
    },
    {
      key: 'published_at',
      header: 'Đăng lúc',
      width: '130px',
      sortable: true,
      render: (item: BlogPostRecord) => (
        <span className="text-xs text-gray-400 whitespace-nowrap tabular-nums">
          {item.published_at
            ? formatRelativeTime(item.published_at)
            : item.created_at
            ? `Tạo ${formatRelativeTime(item.created_at)}`
            : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '90px',
      align: 'right' as const,
      render: (item: BlogPostRecord) => (
        <div className="flex items-center justify-end gap-1">
          {canEdit && (
            <button
              onClick={() => handleEdit(item)}
              className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
              title="Sửa bài viết"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDeleteRequest(item)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Xóa bài viết"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // ── KPI cards ─────────────────────────────────────────────────────────
  const published = posts.filter((p) => p.status === 'published').length;
  const drafts    = posts.filter((p) => p.status === 'draft').length;
  const archived  = posts.filter((p) => p.status === 'archived').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="Blog"
        description="Quản lý bài viết blog — tạo, sửa, đăng bài lên trang."
        icon={FileText}
        actions={
          <>
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={handleCreateNew}
              >
                Viết bài mới
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />}
              onClick={() => refetch()}
            >
              Làm mới
            </Button>
          </>
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card">
          <p className="text-2xl font-bold text-gray-900">{meta?.total ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-0.5">Tổng bài viết</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card">
          <p className="text-2xl font-bold text-green-600">{published}</p>
          <p className="text-xs text-gray-500 mt-0.5">Đã đăng</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card">
          <p className="text-2xl font-bold text-amber-500">{drafts}</p>
          <p className="text-xs text-gray-500 mt-0.5">Nháp</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px] flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm tiêu đề bài viết..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && pagination.setPage(1)}
                className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-md bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400"
              />
            </div>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); pagination.setPage(1); }}
            className="h-9 px-3 text-sm border border-gray-200 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 cursor-pointer"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); pagination.setPage(1); }}
            className="h-9 px-3 text-sm border border-gray-200 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 cursor-pointer"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={posts}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          ariaLabel="Danh sách bài viết blog"
          pagination={
            meta
              ? {
                  page: pagination.page,
                  pageSize: pagination.pageSize,
                  totalItems: meta.total,
                  totalPages: meta.totalPages,
                  onPageChange: pagination.setPage,
                }
              : undefined
          }
          sortKey={sort.sortKey ?? undefined}
          sortDirection={sort.sortDir}
          onSort={sort.toggleSort as (key: string) => void}
          stickyHeader
          emptyMessage="Chưa có bài viết nào. Nhấn 'Viết bài mới' để tạo."
        />
      )}

      {/* Blog Post Editor Modal */}
      <BlogPostEditor
        open={editorOpen}
        post={editingPost}
        onClose={handleEditorClose}
        onSaved={handleEditorSaved}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Xóa bài viết?"
        description={`Bạn có chắc muốn xóa bài "${deleteTarget?.title}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        loading={deleting}
        destructive
      />
    </div>
  );
}
