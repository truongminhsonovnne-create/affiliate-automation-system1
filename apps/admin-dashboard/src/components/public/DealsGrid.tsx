'use client';

/**
 * DealsGrid — Loading skeletons + populated grid for all discovery pages.
 */

import { DealCard } from './DealCard';
import type { DealCard as DealCardType } from '@/lib/public/deals-api';

// ── Skeleton ───────────────────────────────────────────────────────────────────

function DealCardSkeleton() {
  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ backgroundColor: '#ffffff', border: '1px solid #f3f4f6' }}
      aria-hidden="true"
    >
      <div className="h-1.5 animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
      <div className="flex flex-col gap-3 p-5">
        {/* badges row */}
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
          <div className="h-5 w-12 rounded-full animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
        </div>
        {/* discount + title */}
        <div className="flex gap-3">
          <div className="h-14 w-14 rounded-xl animate-pulse flex-shrink-0" style={{ backgroundColor: '#f3f4f6' }} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-4 w-3/4 rounded animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
            <div className="h-3 w-1/2 rounded animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
          </div>
        </div>
        {/* description */}
        <div className="h-3 w-full rounded animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
        <div className="h-3 w-2/3 rounded animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
        {/* meta */}
        <div className="flex justify-between mt-auto pt-1">
          <div className="h-3 w-24 rounded animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
          <div className="h-3 w-16 rounded animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
        </div>
      </div>
      {/* footer */}
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderTop: '1px solid #f9fafb' }}>
        <div className="h-8 w-full rounded-xl animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
      </div>
    </div>
  );
}

function CompactSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#ffffff', border: '1px solid #f3f4f6' }} aria-hidden="true">
      <div className="h-8 w-12 rounded-lg animate-pulse flex-shrink-0" style={{ backgroundColor: '#f3f4f6' }} />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3 w-3/4 rounded animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
        <div className="h-2.5 w-1/2 rounded animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
      </div>
      <div className="h-7 w-16 rounded-lg animate-pulse flex-shrink-0" style={{ backgroundColor: '#f3f4f6' }} />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {/* Decorative icon */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: '#fff7ed' }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
      </div>
      <div>
        <p className="text-base font-semibold" style={{ color: '#374151' }}>{title}</p>
        {subtitle && <p className="mt-1 text-sm" style={{ color: '#9ca3af' }}>{subtitle}</p>}
      </div>
      <a
        href="/home"
        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150"
        style={{ backgroundColor: '#f97316', boxShadow: '0 2px 8px rgba(249,115,22,0.25)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ea580c'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f97316'; }}
      >
        Thử dán link sản phẩm →
      </a>
    </div>
  );
}

// ── Pagination controls ───────────────────────────────────────────────────────

interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
}

function Pagination({ total, limit, offset, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (totalPages <= 1) return null;

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      pages.push(-1); // ellipsis
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1 py-8" aria-label="Phân trang">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(0, offset - limit))}
        disabled={offset === 0}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
        style={{ color: '#6b7280', backgroundColor: '#ffffff', border: '1px solid #f3f4f6' }}
      >
        ‹
      </button>
      {pages.map((page, i) =>
        page === -1 ? (
          <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-sm" style={{ color: '#d1d5db' }}>…</span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange((page - 1) * limit)}
            className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg text-sm font-medium transition-colors"
            style={
              page === currentPage
                ? { backgroundColor: '#f97316', color: '#ffffff', boxShadow: '0 2px 6px rgba(249,115,22,0.25)' }
                : { color: '#6b7280', backgroundColor: '#ffffff', border: '1px solid #f3f4f6' }
            }
          >
            {page}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(total - limit, offset + limit))}
        disabled={offset + limit >= total}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
        style={{ color: '#6b7280', backgroundColor: '#ffffff', border: '1px solid #f3f4f6' }}
      >
        ›
      </button>
    </nav>
  );
}

// ── Main DealsGrid ─────────────────────────────────────────────────────────────

interface DealsGridProps {
  deals: DealCardType[];
  total: number;
  limit: number;
  offset: number;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptySubtitle?: string;
  compact?: boolean;
  onPageChange: (offset: number) => void;
}

export function DealsGrid({
  deals,
  total,
  limit,
  offset,
  loading = false,
  error = null,
  emptyTitle = 'Chưa có deal nào',
  emptySubtitle = 'Hãy quay lại sau — chúng tôi cập nhật dữ liệu thường xuyên.',
  compact = false,
  onPageChange,
}: DealsGridProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: '#fef2f2' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className="text-sm font-medium" style={{ color: '#374151' }}>{error}</p>
        <p className="text-xs" style={{ color: '#9ca3af' }}>Vui lòng thử tải lại trang.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <div className={compact ? 'flex flex-col gap-2' : 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}>
          {Array.from({ length: compact ? 8 : 8 }).map((_, i) =>
            compact ? <CompactSkeleton key={i} /> : <DealCardSkeleton key={i} />
          )}
        </div>
      </>
    );
  }

  if (deals.length === 0) {
    return <EmptyState title={emptyTitle} subtitle={emptySubtitle} />;
  }

  return (
    <>
      {total > 0 && (
        <p className="mb-4 text-xs" style={{ color: '#9ca3af' }}>
          Hiển thị {offset + 1}–{Math.min(offset + limit, total)} trong tổng số {total} deal
          {total > limit && (
            <span> · Cập nhật 2 phút trước</span>
          )}
        </p>
      )}
      <div className={compact ? 'flex flex-col gap-2' : 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}>
        {deals.map((deal) => (
          <DealCard key={`${deal.source}::${deal.external_id}`} deal={deal} compact={compact} />
        ))}
      </div>
      <Pagination total={total} limit={limit} offset={offset} onPageChange={onPageChange} />
    </>
  );
}
