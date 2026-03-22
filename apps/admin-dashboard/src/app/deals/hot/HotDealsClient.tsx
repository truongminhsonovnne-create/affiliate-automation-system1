'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flame, Zap } from 'lucide-react';
import Link from 'next/link';
import { DealsGrid } from '@/components/public/DealsGrid';
import { DealsFilterBar, type DealsFilterState } from '@/components/public/DealsFilterBar';
import { fetchDeals, type DealsApiResponse } from '@/lib/public/deals-api';

const PAGE_SIZE = 20;

function useHotDeals(initialFilters: DealsFilterState) {
  const [filters, setFilters] = useState<DealsFilterState>(initialFilters);
  const [response, setResponse] = useState<DealsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (f: DealsFilterState, offset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchDeals({
          sort: 'hot',
          source: f.source === 'all' ? undefined : f.source,
          deal_type: f.deal_type || undefined,
          category: f.category || undefined,
          limit: PAGE_SIZE,
          offset,
        });
        setResponse(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Tải dữ liệu thất bại.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  return { filters, setFilters, response, loading, error, reload: (offset = 0) => load(filters, offset) };
}

export function HotDealsContent() {
  const { filters, setFilters, response, loading, error, reload } = useHotDeals({
    source: 'all', sort: 'hot', deal_type: '', category: '',
  });

  const total = response?.total ?? 0;

  return (
    <div>
      <div
        className="px-6 py-10 sm:px-10"
        style={{ background: 'linear-gradient(135deg, #fff1f2 0%, #fff 100%)', borderBottom: '1px solid #f3f4f6' }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-5 w-5" style={{ color: '#ef4444' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#ef4444' }}>Khám phá</span>
          </div>
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: '#111827', letterSpacing: '-0.02em' }}>
            Deal <span style={{ color: '#ef4444' }}>Hot</span> Hôm Nay
          </h1>
          <p className="mt-2 text-sm sm:text-base" style={{ color: '#6b7280' }}>
            Những deal được dùng nhiều nhất, có tỷ lệ chuyển đổi cao nhất — xếp hạng theo thời gian thực.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-10">
        <div
          className="mb-6 flex items-center gap-3 rounded-xl px-4 py-3 text-xs"
          style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}
        >
          <Flame className="h-4 w-4 flex-shrink-0" style={{ color: '#ef4444' }} />
          <span>Điểm hotness dựa trên số lượt sử dụng và tỷ lệ chuyển đổi thực tế của từng deal.</span>
        </div>

        <DealsFilterBar filters={filters} onChange={setFilters} showSource showSort={false} showDealType showCategory />

        <div className="mt-6">
          <DealsGrid
            deals={response?.deals ?? []} total={total} limit={PAGE_SIZE} offset={0}
            loading={loading} error={error}
            emptyTitle="Chưa có deal hot nào" emptySubtitle="Hãy quay lại sau — chúng tôi cập nhật thường xuyên."
            onPageChange={(offset) => reload(offset)}
          />
        </div>

        <div
          className="mt-12 flex flex-col items-center gap-4 rounded-2xl p-8 text-center sm:flex-row"
          style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
        >
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#111827' }}>Tìm voucher cho link sản phẩm cụ thể?</p>
            <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>Dán link Shopee — nhận mã tốt nhất tức thì.</p>
          </div>
          <Link
            href="/home"
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white whitespace-nowrap"
            style={{ backgroundColor: '#f97316', boxShadow: '0 2px 8px rgba(249,115,22,0.25)' }}
          >
            <Zap className="h-4 w-4" />
            Tra cứu ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
