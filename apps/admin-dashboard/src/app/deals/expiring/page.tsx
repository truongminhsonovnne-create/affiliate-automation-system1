'use client';

/**
 * Expiring Deals Page — /deals/expiring
 *
 * Deals expiring within the next 7 days, sorted by end_at ASC.
 * Urgency-focused design with countdown emphasis.
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Clock, Zap } from 'lucide-react';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { DealsGrid } from '@/components/public/DealsGrid';
import { DealsFilterBar, type DealsFilterState } from '@/components/public/DealsFilterBar';
import { fetchExpiringDeals, type DealsApiResponse } from '@/lib/public/deals-api';

export const metadata = {
  title: 'Deal Sắp Hết Hạn | VoucherFinder',
  description:
    'Những voucher và deal sắp hết hạn trong 7 ngày tới. Nhanh tay kẻo hết! Cập nhật liên tục.',
  keywords: ['deal sắp hết hạn', 'voucher hết hạn', 'coupon sắp hết', 'flash sale'],
  alternates: { canonical: '/deals/expiring' },
  openGraph: {
    title: 'Deal Sắp Hết Hạn | VoucherFinder',
    description: 'Những voucher và deal sắp hết hạn trong 7 ngày tới. Nhanh tay kẻo hết!',
    url: '/deals/expiring',
    type: 'website',
  },
};

const PAGE_SIZE = 20;
const EXPIRES_IN_DAYS = 7;

function useExpiringDeals(initialFilters: DealsFilterState) {
  const [filters, setFilters] = useState<DealsFilterState>(initialFilters);
  const [response, setResponse] = useState<DealsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (f: DealsFilterState, offset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchExpiringDeals(EXPIRES_IN_DAYS, PAGE_SIZE, offset);
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

function ExpiringDealsContent() {
  const { filters, setFilters, response, loading, error, reload } = useExpiringDeals({
    source: 'all',
    sort: 'expiring',
    deal_type: '',
    category: '',
  });

  const total = response?.total ?? 0;

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className="px-6 py-10 sm:px-10"
        style={{
          background: 'linear-gradient(135deg, #fefce8 0%, #fff 100%)',
          borderBottom: '1px solid #f3f4f6',
        }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5" style={{ color: '#d97706' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#d97706' }}>
              Khám phá
            </span>
          </div>
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: '#111827', letterSpacing: '-0.02em' }}>
            Deal <span style={{ color: '#d97706' }}>Sắp Hết Hạn</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base" style={{ color: '#6b7280' }}>
            Những voucher và deal hết hạn trong {EXPIRES_IN_DAYS} ngày tới.
            Nhanh tay — không phải lúc nào cũng còn!
          </p>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-10">

        {/* Urgency banner */}
        <div
          className="mb-6 flex items-center gap-3 rounded-xl px-4 py-3 text-xs"
          style={{ backgroundColor: '#fefce8', border: '1px solid #fde68a', color: '#92400e' }}
        >
          <Clock className="h-4 w-4 flex-shrink-0" style={{ color: '#d97706' }} />
          <span>
            Chỉ hiển thị deal còn hiệu lực trong {EXPIRES_IN_DAYS} ngày tới — được sắp xếp theo thời gian hết hạn gần nhất.
          </span>
        </div>

        <DealsFilterBar
          filters={filters}
          onChange={setFilters}
          showSource
          showSort={false}
          showDealType
          showCategory
        />

        <div className="mt-6">
          <DealsGrid
            deals={response?.deals ?? []}
            total={total}
            limit={PAGE_SIZE}
            offset={0}
            loading={loading}
            error={error}
            emptyTitle="Không có deal nào sắp hết hạn"
            emptySubtitle="Tất cả deals hiện tại còn hiệu lực tốt. Quay lại sau!"
            onPageChange={(offset) => reload(offset)}
          />
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl p-8 text-center sm:flex-row" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#111827' }}>
              Tìm voucher cho sản phẩm cụ thể?
            </p>
            <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>Dán link sản phẩm Shopee — chúng tôi tìm mã còn hiệu lực.</p>
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

export default function ExpiringDealsPage() {
  return (
    <PublicLayout>
      <Suspense>
        <ExpiringDealsContent />
      </Suspense>
    </PublicLayout>
  );
}
