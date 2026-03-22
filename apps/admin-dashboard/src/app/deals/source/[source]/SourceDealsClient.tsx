'use client';

/**
 * Deals by Source — Client Component
 * Receives `source` as a prop from the server page wrapper.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Zap, ArrowLeft, TrendingUp, Star } from 'lucide-react';
import { DealsGrid } from '@/components/public/DealsGrid';
import { DealsFilterBar, type DealsFilterState } from '@/components/public/DealsFilterBar';
import { fetchDealsBySource, type DealsApiResponse } from '@/lib/public/deals-api';

const SOURCE_CONFIG: Record<string, {
  label: string;
  name: string;
  description: string;
  color: string;
  accent: string;
}> = {
  masoffer: {
    label: 'MasOffer',
    name: 'MasOffer Publisher Network',
    description: 'Deals từ mạng lưới đối tác MasOffer — bao gồm pushsale, deals, vouchers và coupons.',
    color: '#1d4ed8',
    accent: '#eff6ff',
  },
  accesstrade: {
    label: 'AccessTrade',
    name: 'AccessTrade Publisher Network',
    description: 'Deals từ mạng lưới đối tác AccessTrade Vietnam — campaigns, deals, vouchers và coupons.',
    color: '#15803d',
    accent: '#f0fdf4',
  },
};

const VALID_SOURCES = ['masoffer', 'accesstrade'];
const PAGE_SIZE = 20;

interface SourceDealsClientProps {
  source: string;
}

function useSourceDeals(source: string, initialFilters: DealsFilterState) {
  const [filters, setFilters] = useState<DealsFilterState>(initialFilters);
  const [response, setResponse] = useState<DealsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (f: DealsFilterState, offset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchDealsBySource(
          source as 'masoffer' | 'accesstrade',
          {
            sort: 'hot',
            deal_type: f.deal_type || undefined,
            category: f.category || undefined,
            limit: PAGE_SIZE,
            offset,
          }
        );
        setResponse(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Tải dữ liệu thất bại.');
      } finally {
        setLoading(false);
      }
    },
    [source]
  );

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  return { filters, setFilters, response, loading, error, reload: (offset = 0) => load(filters, offset) };
}

export function SourceDealsContent({ source }: SourceDealsClientProps) {
  const config = SOURCE_CONFIG[source];

  const { filters, setFilters, response, loading, error, reload } = useSourceDeals(source, {
    source: 'all', sort: 'hot', deal_type: '', category: '',
  });

  const total = response?.total ?? 0;

  return (
    <div>
      <div
        className="px-6 py-10 sm:px-10"
        style={{ background: `linear-gradient(135deg, ${config.accent} 0%, #fff 100%)`, borderBottom: '1px solid #f3f4f6' }}
      >
        <div className="mx-auto max-w-5xl">
          <Link
            href="/deals"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: '#6b7280' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#111827'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}
          >
            <ArrowLeft className="h-3 w-3" />
            Tất cả deals
          </Link>

          <div className="mb-3 flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black"
              style={{ backgroundColor: config.color, color: '#ffffff' }}
            >
              {source === 'masoffer' ? 'MO' : 'AT'}
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: config.color }}>
              Mạng lưới đối tác
            </span>
          </div>

          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: '#111827', letterSpacing: '-0.02em' }}>
            Deals từ <span style={{ color: config.color }}>{config.label}</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base" style={{ color: '#6b7280' }}>
            {config.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ backgroundColor: '#ffffff', border: '1px solid #f3f4f6' }}>
              <TrendingUp className="h-4 w-4" style={{ color: config.color }} />
              <span className="text-xs font-semibold" style={{ color: '#374151' }}>{total}+ deals</span>
            </div>
            <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ backgroundColor: '#ffffff', border: '1px solid #f3f4f6' }}>
              <Star className="h-4 w-4" style={{ color: config.color }} />
              <span className="text-xs font-semibold" style={{ color: '#374151' }}>Cập nhật 2x/ngày</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-10">
        <DealsFilterBar
          filters={filters} onChange={setFilters}
          showSource={false} showSort={false} showDealType showCategory
        />
        <div className="mt-6">
          <DealsGrid
            deals={response?.deals ?? []} total={total} limit={PAGE_SIZE} offset={0}
            loading={loading} error={error}
            emptyTitle={`Chưa có deal nào từ ${config.label}`}
            emptySubtitle="Hãy quay lại sau — dữ liệu được cập nhật thường xuyên."
            onPageChange={(offset) => reload(offset)}
          />
        </div>

        <div
          className="mt-12 flex flex-col items-center gap-4 rounded-2xl p-8 text-center sm:flex-row"
          style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
        >
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#111827' }}>Tìm voucher cho sản phẩm cụ thể?</p>
            <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>Dán link Shopee/Lazada/Tiki — tìm mã tốt nhất tức thì.</p>
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

export function SourceDealsClient({ source }: SourceDealsClientProps) {
  if (!VALID_SOURCES.includes(source)) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <p className="text-lg font-semibold" style={{ color: '#374151' }}>Nguồn không hợp lệ.</p>
        <p className="mt-2 text-sm" style={{ color: '#9ca3af' }}>Nguồn hợp lệ: masoffer, accesstrade.</p>
        <Link href="/deals" className="mt-6 inline-block text-sm font-medium" style={{ color: '#f97316' }}>
          ← Quay lại deals
        </Link>
      </div>
    );
  }

  return <SourceDealsContent source={source} />;
}
