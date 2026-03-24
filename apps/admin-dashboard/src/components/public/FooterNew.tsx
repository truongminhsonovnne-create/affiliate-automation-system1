'use client';

/**
 * FooterNew — Premium unified footer with strong trust signals.
 *
 * Architecture:
 *  - Dark neutral background
 *  - 3-column layout: brand | nav | legal + contact
 *  - Trust bar: source diversity + update frequency + privacy badges
 *  - Stats bar (social proof)
 *  - Full disclaimer + copyright
 */

import Link from 'next/link';
import { Zap, ShieldCheck, RefreshCw, Database, Lock, ExternalLink } from 'lucide-react';
import { useAnalytics } from '@/lib/public/analytics-context';
import { SITE_CONFIG } from '@/lib/public/site-config';

const NAV_LINKS = [
  { href: '/home', label: 'Tra cứu voucher' },
  { href: '/deals', label: 'Khám phá deal' },
  { href: '/resources', label: 'Tài nguyên' },
  { href: '/info/about', label: 'Giới thiệu' },
  { href: '/info/faq', label: 'FAQ' },
  { href: '/info/contact', label: 'Liên hệ' },
];

const DEALS_LINKS = [
  { href: '/deals/shopee', label: 'Deals Shopee' },
  { href: '/deals/lazada', label: 'Deals Lazada' },
  { href: '/deals/dien-thoai', label: 'Điện thoại' },
  { href: '/deals/thoi-trang', label: 'Thời trang' },
  { href: '/deals/laptop', label: 'Laptop' },
  { href: '/deals/suc-khoe-lam-dep', label: 'Sức khỏe & Làm đẹp' },
];

const LEGAL_LINKS = [
  { href: '/info/privacy', label: 'Chính sách bảo mật' },
  { href: '/info/cookies', label: 'Chính sách Cookie' },
  { href: '/info/terms', label: 'Điều khoản sử dụng' },
  { href: '/info/affiliate-disclosure', label: 'Công khai liên kết' },
];

const TRUST_BADGES = [
  {
    icon: Database,
    label: 'Tổng hợp từ',
    detail: '2 nguồn đối tác',
    sub: 'MasOffer + AccessTrade',
  },
  {
    icon: RefreshCw,
    label: 'Cập nhật',
    detail: '2 lần mỗi ngày',
    sub: '6:00 & 18:00 UTC',
  },
  {
    icon: ShieldCheck,
    label: 'Không theo dõi',
    detail: 'Không lưu dữ liệu cá nhân',
    sub: 'Không có tracking',
  },
  {
    icon: Lock,
    label: 'Bảo mật',
    detail: 'Không cookie theo dõi',
    sub: 'Chỉ session cần thiết',
  },
];

const PARTNER_BADGES = [
  { name: 'MasOffer', tag: 'Nguồn dữ liệu' },
  { name: 'AccessTrade', tag: 'Nguồn dữ liệu' },
];

export function FooterNew() {
  const { trackEvent } = useAnalytics();
  const year = SITE_CONFIG.year;

  return (
    <footer
      style={{ backgroundColor: '#111827', borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth: '72rem', padding: '4rem 1.5rem 3rem' }}
      >
        {/* Top gradient line */}
        <div
          aria-hidden="true"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.3), transparent)',
            marginBottom: '3rem',
          }}
        />

        {/* ── Trust bar (above the grid) ── */}
        <div
          className="mb-8 rounded-2xl p-5"
          style={{ backgroundColor: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.12)' }}
          role="region"
          aria-label="Trust signals"
        >
          <p
            className="mb-4 text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: '#4b5563', letterSpacing: '0.1em' }}
          >
            Cam kết của chúng tôi
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {TRUST_BADGES.map(({ icon: Icon, label, detail, sub }) => (
              <div key={label} className="flex items-start gap-3">
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.12)' }}
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" style={{ color: '#f97316' }} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold" style={{ color: '#d1d5db' }}>{label}</p>
                  <p className="text-xs font-medium" style={{ color: '#9ca3af' }}>{detail}</p>
                  <p className="text-[11px]" style={{ color: '#6b7280' }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Partner badges ── */}
        <div
          className="mb-8 flex flex-wrap items-center gap-3"
          role="region"
          aria-label="Nguồn dữ liệu"
        >
          <span className="text-[11px] font-medium" style={{ color: '#4b5563' }}>
            Dữ liệu từ:
          </span>
          {PARTNER_BADGES.map(({ name, tag }) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#9ca3af',
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: '#22c55e' }}
                aria-hidden="true"
              />
              {name}
              <span style={{ color: '#6b7280', fontWeight: 400 }}>· {tag}</span>
            </span>
          ))}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#6b7280',
            }}
          >
            Cập nhật lần cuối: {SITE_CONFIG.lastUpdated}
          </span>
        </div>

        {/* Main grid */}
        <div
          className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-4"
          role="navigation"
          aria-label="Footer navigation"
        >
          {/* Brand + description column */}
          <div>
            <Link href="/home" className="group flex items-center gap-2.5 mb-4">
              <div
                style={{
                  width: '2rem', height: '2rem', borderRadius: '0.5rem',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(249,115,22,0.3)',
                }}
                aria-hidden="true"
              >
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span
                className="text-[0.9375rem] font-bold"
                style={{ color: '#ffffff', letterSpacing: '-0.01em' }}
              >
                VoucherFinder
              </span>
            </Link>

            <p className="text-sm leading-relaxed mb-5" style={{ color: '#6b7280', maxWidth: '20rem' }}>
              Công cụ tra cứu mã giảm giá Shopee miễn phí. Không quảng cáo,
              không phí dịch vụ, không thu thập dữ liệu cá nhân.
            </p>

            {/* Trust pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Miễn phí hoàn toàn', color: '#22c55e' },
                { label: 'Không cần đăng nhập', color: '#22c55e' },
                { label: 'Không affiliate', color: '#22c55e' },
              ].map(({ label, color }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                  style={{
                    backgroundColor: 'rgba(34,197,94,0.06)',
                    border: '1px solid rgba(34,197,94,0.15)',
                    color: '#6b7280',
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Giới thiệu column */}
          <div>
            <p
              className="mb-4 text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#4b5563', letterSpacing: '0.1em' }}
            >
              Giới thiệu
            </p>
            <ul className="flex flex-col gap-2.5" role="list">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() =>
                      trackEvent('nav_click', {
                        destination: link.href,
                        navLocation: 'footer',
                      })
                    }
                    className="text-sm transition-colors duration-150"
                    style={{ color: '#6b7280' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Deals by platform / category column */}
          <div>
            <p
              className="mb-4 text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#4b5563', letterSpacing: '0.1em' }}
            >
              Theo sàn &amp; Danh mục
            </p>
            <ul className="flex flex-col gap-2.5" role="list">
              {DEALS_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() =>
                      trackEvent('nav_click', {
                        destination: link.href,
                        navLocation: 'footer',
                      })
                    }
                    className="text-sm transition-colors duration-150"
                    style={{ color: '#6b7280' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Pháp lý & Riêng tư column */}
          <div>
            <p
              className="mb-4 text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#4b5563', letterSpacing: '0.1em' }}
            >
              Pháp lý &amp; Riêng tư
            </p>
            <ul className="flex flex-col gap-2.5" role="list">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() =>
                      trackEvent('nav_click', {
                        destination: link.href,
                        navLocation: 'footer',
                      })
                    }
                    className="text-sm transition-colors duration-150"
                    style={{ color: '#6b7280' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Contact */}
            <div className="mt-6">
              <p
                className="mb-2 text-xs font-semibold uppercase tracking-widest"
                style={{ color: '#4b5563', letterSpacing: '0.1em' }}
              >
                Liên hệ
              </p>
              <Link
                href="/info/contact"
                className="flex items-center gap-1 text-sm transition-colors duration-150"
                style={{ color: '#f97316' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ea580c'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#f97316'; }}
              >
                Gửi phản hồi / Báo lỗi
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </Link>
              <p className="mt-1 text-[11px]" style={{ color: '#6b7280' }}>
                Phản hồi trong 2–5 ngày làm việc
              </p>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4"
          role="list"
          aria-label="Thống kê dịch vụ"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '2rem' }}
        >
          {[
            { value: '4.700+', label: 'Voucher đang hoạt động' },
            { value: '0đ', label: 'Phí dịch vụ' },
            { value: '2–3s', label: 'Thời gian tra cứu' },
            { value: '2026', label: 'Ra mắt' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center" role="listitem">
              <p
                className="text-2xl font-black"
                style={{
                  color: '#f97316',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  marginBottom: '0.25rem',
                }}
              >
                {value}
              </p>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          role="contentinfo"
        >
          <div className="space-y-1.5">
            <p className="text-xs" style={{ color: '#4b5563' }}>
              &copy; {year} VoucherFinder. Mọi quyền được bảo lưu.
            </p>
            <p className="text-xs" style={{ color: '#4b5563' }}>
              Không phải sàn thương mại điện tử · Không liên kết chính thức với Shopee
            </p>
          </div>

          <div
            className="flex items-start gap-2 text-xs sm:items-start sm:text-left"
            style={{ color: '#4b5563', maxWidth: '30rem' }}
          >
            <svg
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8h.01M12 12v4" />
            </svg>
            <p>
              VoucherFinder là công cụ trung gian — không can thiệp vào giao dịch,
              không lưu thông tin thanh toán, không nhận hoa hồng từ giao dịch của bạn.
              Thông tin chỉ mang tính tham khảo.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default FooterNew;
