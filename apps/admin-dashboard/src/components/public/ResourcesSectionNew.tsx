'use client';

/**
 * ResourcesSectionNew — Curated guides section.
 *
 * Architecture:
 *  - Warm-tinted section to add visual variety
 *  - Editorial card layout: horizontal cards on desktop
 *  - Each card has badge, title, short desc, arrow
 */

import Link from 'next/link';
import { useAnalytics } from '@/lib/public/analytics-context';

const RESOURCES = [
  {
    href: '/resources/huong-dan-san-sale-shopee-2026',
    label: 'Hướng dẫn săn sale Shopee 2026',
    desc: 'Tổng hợp các đợt sale lớn trong năm, thời điểm và mẹo săn deal tốt nhất.',
    badge: 'Phổ biến',
    badgeColor: '#fff7ed',
    badgeBorder: '#fed7aa',
    badgeText: '#c2410c',
  },
  {
    href: '/resources/cac-loai-voucher-shopee',
    label: 'Các loại voucher Shopee',
    desc: 'Hiểu sự khác nhau giữa voucher cửa hàng, voucher Shopee và mã freeship.',
    badge: 'Cơ bản',
    badgeColor: '#f9fafb',
    badgeBorder: '#e5e7eb',
    badgeText: '#374151',
  },
  {
    href: '/resources/meo-uu-dai-shopee-2026',
    label: '10 mẹo tối ưu ưu đãi Shopee',
    desc: 'Cách kết hợp nhiều loại khuyến mãi để tiết kiệm tối đa khi mua sắm.',
    badge: 'Mẹo',
    badgeColor: '#f9fafb',
    badgeBorder: '#e5e7eb',
    badgeText: '#374151',
  },
];

export function ResourcesSectionNew() {
  const { trackEvent } = useAnalytics();

  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: '#ffffff' }}
      aria-labelledby="resources-heading"
    >
      {/* Top border */}
      <div
        aria-hidden="true"
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.15), transparent)',
        }}
      />

      <div
        className="relative mx-auto"
        style={{ maxWidth: '72rem', padding: '5rem 1.5rem' }}
      >
        {/* Header */}
        <div className="mb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#f97316', letterSpacing: '0.12em' }}
            >
              Tài nguyên
            </p>
            <h2
              id="resources-heading"
              className="font-black tracking-tight"
              style={{
                color: '#111827',
                fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
              }}
            >
              Đọc thêm trước khi mua
            </h2>
          </div>
          <Link
            href="/resources"
            className="flex items-center gap-1.5 text-sm font-medium transition-colors whitespace-nowrap"
            style={{ color: '#ea580c' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#c2410c'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#ea580c'; }}
          >
            Xem tất cả
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Resource cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {RESOURCES.map((resource) => (
            <Link
              key={resource.href}
              href={resource.href}
              onClick={() =>
                trackEvent('resources_link_click', { resourcePath: resource.href })
              }
              className="group relative flex flex-col gap-4 rounded-2xl p-6 transition-all duration-200"
              style={{
                backgroundColor: '#fafaf9',
                border: '1px solid #f3f4f6',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.backgroundColor = '#fff7ed';
                el.style.borderColor = 'rgba(249,115,22,0.2)';
                el.style.boxShadow = '0 4px 20px rgba(249,115,22,0.06)';
                el.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.backgroundColor = '#fafaf9';
                el.style.borderColor = '#f3f4f6';
                el.style.boxShadow = 'none';
                el.style.transform = 'translateY(0)';
              }}
            >
              {/* Badge */}
              <span
                className="self-start rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: resource.badgeColor,
                  border: `1px solid ${resource.badgeBorder}`,
                  color: resource.badgeText,
                }}
              >
                {resource.badge}
              </span>

              {/* Title */}
              <h3
                className="text-base font-semibold leading-snug"
                style={{
                  color: '#111827',
                  letterSpacing: '-0.01em',
                }}
              >
                {resource.label}
              </h3>

              {/* Desc */}
              <p className="text-sm leading-relaxed" style={{ color: '#6b7280', lineHeight: 1.6 }}>
                {resource.desc}
              </p>

              {/* Arrow CTA */}
              <div
                className="mt-auto flex items-center gap-1.5 text-xs font-medium pt-2"
                style={{ color: '#ea580c' }}
              >
                <span>Đọc ngay</span>
                <svg
                  className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ResourcesSectionNew;
