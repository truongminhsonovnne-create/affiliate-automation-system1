'use client';

/**
 * CategoryDealsClient — Shared client component for platform/category deal pages.
 *
 * Usage:
 *   <CategoryDealsClient
 *     platform="shopee"
 *     categorySlug="dien-thoai"
 *     heroLabel="Điện thoại"
 *     heroSubtitle="..."
 *     heroAccent="#f97316"
 *   />
 *
 * Calls fetchDeals({ category: categorySlug, limit: 20 }) from deals-api.
 * Falls back to skeleton loading → "Chưa có deal" state gracefully.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, Star, ArrowRight, Package, Smartphone, Shirt, HeartPulse, Laptop } from 'lucide-react';
import { DealCard } from '@/components/public/DealCard';
import { DealsGrid } from '@/components/public/DealsGrid';
import { fetchDeals, type DealsApiResponse } from '@/lib/public/deals-api';

// ── Category icon map ────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'dien-thoai': Smartphone,
  'thoi-trang': Shirt,
  'suc-khoe-lam-dep': HeartPulse,
  'laptop': Laptop,
};

const CATEGORY_COLORS: Record<string, string> = {
  shopee: '#ee4d2d',
  lazada: '#0f1472',
  'dien-thoai': '#2563eb',
  'thoi-trang': '#db2777',
  'suc-khoe-lam-dep': '#16a34a',
  laptop: '#7c3aed',
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CategoryDealsClientProps {
  platform?: string;       // 'shopee' | 'lazada' | 'all'
  categorySlug: string;    // used in API call + canonical
  heroLabel: string;       // display name in hero (e.g. "Điện thoại")
  heroSubtitle: string;    // description line
  heroAccent?: string;     // accent color hex
  dealType?: string;       // optional deal_type filter
  /** Optional SEO subtitle appended below main title */
  seoSubtitle?: string;
}

// ── Empty / loading states ────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-16 text-center">
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}
      >
        <Package className="h-6 w-6" style={{ color: '#9ca3af' }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: '#374151' }}>
        Chưa có deal trong danh mục này
      </p>
      <p className="mt-1 text-xs" style={{ color: '#9ca3af' }}>
        Chúng tôi đang cập nhật deals {label} — quay lại sau!
      </p>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/deals/hot"
          className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: '#f97316' }}
        >
          <Star className="h-4 w-4" />
          Xem deal hot
        </Link>
        <Link
          href="/home"
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold"
          style={{ color: '#374151' }}
        >
          Tra cứu voucher
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// ── Related categories ─────────────────────────────────────────────────────────

const RELATED_LINKS = [
  { href: '/deals/dien-thoai', label: 'Điện thoại' },
  { href: '/deals/thoi-trang', label: 'Thời trang' },
  { href: '/deals/laptop', label: 'Laptop' },
  { href: '/deals/suc-khoe-lam-dep', label: 'Sức khỏe' },
  { href: '/deals/shopee', label: 'Shopee deals' },
  { href: '/deals/lazada', label: 'Lazada deals' },
];

// ── Main component ─────────────────────────────────────────────────────────────

export function CategoryDealsClient({
  platform = 'shopee',
  categorySlug,
  heroLabel,
  heroSubtitle,
  heroAccent = '#f97316',
  dealType,
  seoSubtitle,
}: CategoryDealsClientProps) {
  const [response, setResponse] = useState<DealsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchDeals({
      source: platform === 'all' ? undefined : platform,
      category: categorySlug,
      deal_type: dealType,
      sort: 'hot',
      limit: 20,
    })
      .then((res) => {
        setResponse(res);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Tải dữ liệu thất bại.');
      })
      .finally(() => setLoading(false));
  }, [platform, categorySlug, dealType]);

  const deals = response?.deals ?? [];
  const total = response?.total ?? 0;
  const Icon = CATEGORY_ICONS[categorySlug] ?? Package;
  const accent = CATEGORY_COLORS[platform] ?? heroAccent;

  return (
    <div>
      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden px-6 py-10 sm:px-10"
        style={{
          background: `linear-gradient(135deg, ${accent}08 0%, #ffffff 100%)`,
          borderBottom: '1px solid #f3f4f6',
          minHeight: '16rem',
        }}
      >
        <div className="pointer-events-none absolute -right-8 top-0 opacity-5" aria-hidden="true">
          <div
            className="h-48 w-48 rounded-full"
            style={{ backgroundColor: accent }}
          />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-3 flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}30` }}
            >
              <Icon className="h-5 w-5" style={{ color: accent }} aria-hidden="true" />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: accent, letterSpacing: '0.08em' }}
            >
              Deals &amp; Voucher
            </span>
          </div>
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: '#111827', letterSpacing: '-0.02em' }}>
            {heroLabel}
          </h1>
          {seoSubtitle && (
            <p className="mt-1 text-sm sm:text-base" style={{ color: '#6b7280' }}>
              {seoSubtitle}
            </p>
          )}
          <p className="mt-2 text-sm" style={{ color: '#9ca3af' }}>
            {heroSubtitle}
          </p>
          {total > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: `${accent}12`, color: accent, border: `1px solid ${accent}30` }}
              >
                <Star className="h-3 w-3" />
                {total}+ deals đang hoạt động
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-10">

        {/* Deals grid */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-bold" style={{ color: '#111827' }}>
              Deals {heroLabel}
            </h2>
            <span className="text-xs" style={{ color: '#9ca3af' }}>
              {loading ? 'Đang tải...' : `${total} deals`}
            </span>
          </div>

          <DealsGrid
            deals={deals}
            total={total}
            limit={20}
            offset={0}
            loading={loading}
            error={error}
            emptyTitle="Chưa có deal trong danh mục này"
            emptySubtitle="Chúng tôi đang cập nhật — quay lại sau hoặc thử trang khác."
            onPageChange={() => {}}
          />
        </section>

        {/* Related categories */}
        {!loading && (
          <section className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" style={{ color: '#9ca3af' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#6b7280' }}>
                Danh mục khác
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {RELATED_LINKS.filter((l) => l.href !== `/${categorySlug}`).slice(0, 6).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium transition-all hover:border-brand-300 hover:text-brand-600"
                  style={{ color: '#6b7280', backgroundColor: '#ffffff' }}
                >
                  {link.label}
                  <ArrowRight className="h-3 w-3" style={{ color: '#9ca3af' }} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div
          className="mt-10 flex flex-col items-center gap-4 rounded-2xl p-8 text-center sm:flex-row"
          style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
        >
          <div className="flex-1 text-left">
            <p className="text-base font-semibold" style={{ color: '#111827' }}>
              Tìm voucher cho sản phẩm cụ thể?
            </p>
            <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
              Dán link sản phẩm Shopee — chúng tôi tìm mã tốt nhất trong vài giây.
            </p>
          </div>
          <Link
            href="/home"
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white whitespace-nowrap"
            style={{ backgroundColor: '#f97316', boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}
          >
            <Zap className="h-4 w-4" />
            Tra cứu voucher
          </Link>
        </div>
      </div>
    </div>
  );
}
