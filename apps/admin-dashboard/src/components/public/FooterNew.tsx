'use client';

/**
 * FooterNew — Premium unified footer.
 *
 * Architecture:
 *  - Dark neutral background
 *  - 3-column layout: brand | nav | legal
 *  - Stats bar (social proof)
 *  - Disclaimer in bottom bar
 */

import Link from 'next/link';
import { Zap } from 'lucide-react';
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

const LEGAL_LINKS = [
  { href: '/info/privacy', label: 'Chính sách bảo mật' },
  { href: '/info/cookies', label: 'Chính sách Cookie' },
  { href: '/info/terms', label: 'Điều khoản sử dụng' },
  { href: '/info/affiliate-disclosure', label: 'Công khai liên kết' },
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

        {/* Main grid */}
        <div
          className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3"
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
              {['Miễn phí', 'Không đăng nhập', 'Không affiliate'].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(249,115,22,0.08)',
                    border: '1px solid rgba(249,115,22,0.15)',
                    color: '#9ca3af',
                  }}
                >
                  {tag}
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
                className="text-sm transition-colors duration-150"
                style={{ color: '#f97316' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ea580c'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#f97316'; }}
              >
                Gửi phản hồi / Báo lỗi →
              </Link>
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
          className="mt-12 pt-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          role="contentinfo"
        >
          <p className="text-xs" style={{ color: '#4b5563' }}>
            &copy; {year} VoucherFinder. Mọi quyền được bảo lưu.
          </p>

          <p
            className="flex items-start gap-2 text-xs sm:items-center sm:text-right"
            style={{ color: '#4b5563', maxWidth: '28rem' }}
          >
            <svg
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 sm:mt-0"
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
            Không phải sàn thương mại điện tử. Không liên kết chính thức với Shopee. Không nhận hoa hồng từ giao dịch của bạn.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default FooterNew;
