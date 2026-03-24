'use client';

/**
 * Deals Hub — Client Component
 *
 * All interactive UI logic: filter state, data fetching, pagination.
 * Imported by page.tsx (server component) which provides metadata.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Zap, Clock, TrendingUp, Flame, ChevronRight, Star, ArrowRight, Smartphone, Shirt, HeartPulse, Laptop } from 'lucide-react';
import { DealCard } from '@/components/public/DealCard';
import { DealsGrid } from '@/components/public/DealsGrid';
import { DealsFilterBar, type DealsFilterState } from '@/components/public/DealsFilterBar';
import { fetchDeals, type DealsApiResponse } from '@/lib/public/deals-api';

const PAGE_SIZE = 8;

function useDeals(initialFilters: DealsFilterState) {
  const [filters, setFilters] = useState<DealsFilterState>(initialFilters);
  const [offset, setOffset] = useState(0);
  const [response, setResponse] = useState<DealsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to latest filters so async load() always reads fresh values
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(
    async (f: DealsFilterState, pageOffset: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchDeals({
          source: f.source === 'all' ? undefined : f.source,
          sort: f.sort as 'hot' | 'new' | 'expiring' | 'quality' | 'random',
          deal_type: f.deal_type || undefined,
          category: f.category || undefined,
          limit: PAGE_SIZE,
          offset: pageOffset,
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

  // Reload when filters change — always start from page 1
  useEffect(() => {
    setOffset(0);
    load(filters, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Manual page change — use latest filters (via ref) + new offset
  const changePage = useCallback((newOffset: number) => {
    setOffset(newOffset);
    load(filtersRef.current, newOffset);
  }, [load]);

  return { filters, setFilters, offset, response, loading, error, changePage };
}

function StatPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
      <Icon className="h-4 w-4 flex-shrink-0" style={{ color: '#f97316' }} />
      <span className="text-xs font-semibold" style={{ color: '#c2410c' }}>{value}</span>
      <span className="text-xs" style={{ color: '#9ca3af' }}>{label}</span>
    </div>
  );
}

function QuickNavCard({
  href, icon: Icon, title, subtitle, accent = '#f97316',
}: { href: string; icon: React.ElementType; title: string; subtitle: string; accent?: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl p-5 transition-all duration-200"
      style={{ backgroundColor: '#ffffff', border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
      }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}>
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: '#111827' }}>{title}</p>
        <p className="mt-0.5 text-xs" style={{ color: '#9ca3af' }}>{subtitle}</p>
      </div>
      <div className="flex items-center gap-1 text-xs font-medium" style={{ color: accent }}>
        Xem tất cả <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function FeaturedRow({ source }: { source: 'masoffer' | 'accesstrade' }) {
  const [deals, setDeals] = useState<DealsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeals({ source, sort: 'hot', limit: 4 })
      .then(setDeals).catch(() => {}).finally(() => setLoading(false));
  }, [source]);

  const label = source === 'masoffer' ? 'MasOffer' : 'AccessTrade';
  const accent = source === 'masoffer' ? '#1d4ed8' : '#15803d';

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#6b7280' }}>
          Deals từ {label}
        </h2>
        <Link
          href={`/deals/source/${source}`}
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: accent }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#111827'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = accent; }}
        >
          Xem thêm <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
          ))}
        </div>
      ) : deals && deals.deals.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {deals.deals.map((deal) => (
            <DealCard key={`${deal.source}::${deal.external_id}`} deal={deal} />
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm" style={{ color: '#9ca3af' }}>Chưa có deal từ {label}.</p>
      )}
    </section>
  );
}

export function DealsPageContent() {
  const { filters, setFilters, offset, response, loading, error, changePage } = useDeals({
    source: 'all', sort: 'hot', deal_type: '', category: '',
  });

  const total = response?.total ?? 0;

  return (
    <div>
      <div
        className="relative overflow-hidden px-6 py-10 sm:px-10"
        style={{
          background: 'linear-gradient(135deg, #fff7ed 0%, #fff 100%)',
          borderBottom: '1px solid #f3f4f6',
          minHeight: '18rem',
        }}
      >
        <div className="pointer-events-none absolute right-0 top-0 opacity-10" aria-hidden="true">
          <svg width="300" height="300" viewBox="0 0 300 300" fill="none">
            <circle cx="150" cy="150" r="150" fill="#f97316" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: '#f97316' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#f97316' }}>Khám phá</span>
          </div>
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: '#111827', letterSpacing: '-0.02em' }}>
            Deals &amp; Voucher <span style={{ color: '#f97316' }}>Hot Nhất</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base" style={{ color: '#6b7280' }}>
            Tổng hợp deal, coupon, voucher từ Shopee, Lazada, Tiki, Tiktok. Cập nhật liên tục.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <StatPill icon={Flame} label="deal đang hoạt động" value={`${total}+`} />
            <StatPill icon={Star} label="đối tác" value="2 nguồn" />
            <StatPill icon={TrendingUp} label="cập nhật" value="2x/ngày" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-10">
        <section className="mb-8">
          <h2 className="sr-only">Điều hướng nhanh</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <QuickNavCard href="/deals/hot" icon={Flame} title="Deal Hot Hôm Nay" subtitle="Deals được nhiều người dùng nhất" accent="#ef4444" />
            <QuickNavCard href="/deals/expiring" icon={Clock} title="Sắp Hết Hạn" subtitle="Nhanh tay kẻo hết!" accent="#d97706" />
            <QuickNavCard href="/deals/shopee" icon={Flame} title="Deals Shopee" subtitle="Mã giảm giá Shopee" accent="#ee4d2d" />
            <QuickNavCard href="/deals/dien-thoai" icon={Smartphone} title="Điện thoại" subtitle="iPhone, Samsung, Xiaomi" accent="#2563eb" />
            <QuickNavCard href="/deals/thoi-trang" icon={Shirt} title="Thời trang" subtitle="Áo, quần, giày, túi" accent="#db2777" />
            <QuickNavCard href="/deals/laptop" icon={Laptop} title="Laptop" subtitle="MacBook, ASUS, Dell" accent="#7c3aed" />
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-bold" style={{ color: '#111827' }}>Tất cả deals</h2>
          </div>
          <DealsFilterBar filters={filters} onChange={setFilters} showSource showSort showDealType showCategory />
          <div className="mt-6">
            <DealsGrid
              deals={response?.deals ?? []} total={total} limit={PAGE_SIZE} offset={offset}
              loading={loading} error={error}
              emptyTitle="Chưa có deal nào phù hợp" emptySubtitle="Thử thay đổi bộ lọc hoặc quay lại sau."
              onPageChange={changePage}
            />
          </div>
        </section>

        {!loading && total > 0 && (
          <div className="mt-12 flex flex-col gap-10">
            <FeaturedRow source="masoffer" />
            <FeaturedRow source="accesstrade" />
          </div>
        )}

        <section className="mt-10" aria-labelledby="resources-heading">
          <div className="mb-5 flex items-center gap-2">
            <h2 id="resources-heading" className="text-sm font-bold" style={{ color: '#6b7280' }}>Đọc thêm</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { href: '/resources/uu-dai-hieu-qua-cao', title: 'Voucher nào thực sự tiết kiệm?', desc: 'So sánh mã % và mã cố định để chọn ưu đãi hiệu quả nhất.', cat: 'Kiến thức' },
              { href: '/resources/san-deal-theo-shop', title: 'Cách săn deal theo shop', desc: 'Tìm voucher riêng của cửa hàng — thường rẻ hơn mã sàn chung.', cat: 'Mẹo hay' },
              { href: '/resources/confidence-score-la-gi', title: 'Confidence Score là gì?', desc: 'Điểm chất lượng voucher giúp bạn chọn mã đáng tin nhất.', cat: 'Kiến thức' },
            ].map((item) => (
              <Link
                key={item.href} href={item.href}
                className="group flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-brand-200 hover:shadow-sm"
              >
                <span className="inline-flex w-fit rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">{item.cat}</span>
                <p className="text-sm font-semibold leading-snug" style={{ color: '#111827' }}>{item.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>{item.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <div
          className="mt-12 flex flex-col items-center gap-4 rounded-2xl p-8 text-center sm:flex-row"
          style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
        >
          <div className="flex-1">
            <p className="text-base font-semibold" style={{ color: '#111827' }}>Tìm voucher cho sản phẩm cụ thể?</p>
            <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>Dán link sản phẩm Shopee/Lazada/Tiki — chúng tôi tìm mã tốt nhất cho bạn.</p>
          </div>
          <Link
            href="/home"
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all duration-150 whitespace-nowrap"
            style={{ backgroundColor: '#f97316', boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ea580c'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f97316'; }}
          >
            <Zap className="h-4 w-4" />
            Tra cứu voucher ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
