'use client';

/**
 * LandingFooter — Unified, trust-first footer.
 *
 * Mobile: BrandColumn slim (logo + tagline only, no 3 fact rows)
 * Desktop: Full 4-column grid with trust facts
 *
 * Legal links live HERE only — NOT in FaqSection.
 */

import Link from 'next/link';
import { Sparkles, MessageCircle } from 'lucide-react';
import { useAnalytics } from '@/lib/public/analytics-context';
import { SITE_CONFIG } from '@/lib/public/site-config';

const NAV_LINKS = [
  { href: '/home', label: 'Trang chủ' },
  { href: '/resources', label: 'Tài nguyên' },
  { href: '/info/about', label: 'Giới thiệu' },
  { href: '/info/faq', label: 'FAQ' },
];

const LEGAL_LINKS = [
  { href: '/info/privacy', label: 'Chính sách bảo mật' },
  { href: '/info/cookies', label: 'Chính sách Cookie' },
  { href: '/info/terms', label: 'Điều khoản sử dụng' },
  { href: '/info/affiliate-disclosure', label: 'Công khai liên kết' },
];

const TRUST_FACTS = [
  'Miễn phí — không giới hạn tra cứu',
  'Không quảng cáo, không phí dịch vụ',
  'Không thu thập dữ liệu cá nhân',
];

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

// ── Brand column — slim on mobile, full on desktop ────────────────────────────

function BrandColumn() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Logo + name */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
            boxShadow: 'var(--shadow-brand-sm)',
          }}
        >
          <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {SITE_CONFIG.name}
        </span>
      </div>

      {/* Tagline — always shown */}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        Tìm mã giảm giá Shopee nhanh, miễn phí — không cần đăng nhập.
      </p>

      {/* Trust facts — desktop only */}
      <ul
        className="hidden sm:flex flex-col gap-1.5"
        role="list"
        aria-label="Cam kết"
      >
        {TRUST_FACTS.map((fact) => (
          <li key={fact} className="flex items-start gap-2">
            <div
              className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--brand-50)' }}
              aria-hidden="true"
            >
              <svg
                className="h-2.5 w-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--brand-600)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <span className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
              {fact}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Nav column ─────────────────────────────────────────────────────────────────

function NavColumn() {
  const { trackEvent } = useAnalytics();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-label">Điều hướng</p>
      <ul className="flex flex-col gap-2" role="list">
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
              className="group flex items-center gap-1.5 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span
                className="transition-colors group-hover:text-brand-500"
                style={{ transition: 'color 150ms' }}
              >
                {link.label}
              </span>
              <ArrowIcon className="h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Legal column ───────────────────────────────────────────────────────────────

function LegalColumn() {
  const { trackEvent } = useAnalytics();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-label">Pháp lý</p>
      <ul className="flex flex-col gap-2" role="list">
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
              className="group flex items-center gap-1.5 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span
                className="transition-colors group-hover:text-brand-500"
                style={{ transition: 'color 150ms' }}
              >
                {link.label}
              </span>
              <ArrowIcon className="h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Contact column ─────────────────────────────────────────────────────────────

function ContactColumn() {
  const { trackEvent } = useAnalytics();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-label">Liên hệ</p>
      <Link
        href="/info/contact"
        onClick={() => trackEvent('contact_click', {})}
        className="group inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
        style={{
          backgroundColor: 'var(--brand-50)',
          color: 'var(--brand-700)',
          border: '1px solid var(--border-brand)',
          width: 'fit-content',
        }}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Phản hồi / Báo lỗi
        <ArrowIcon className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
      </Link>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        Góp ý giúp chúng tôi cải thiện dịch vụ.
      </p>
    </div>
  );
}

// ── Footer root ────────────────────────────────────────────────────────────────

export function LandingFooter() {
  const year = SITE_CONFIG.year;

  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-raised)',
      }}
    >
      {/* Top gradient accent line */}
      <div
        aria-hidden="true"
        style={{
          height: '2px',
          background:
            'linear-gradient(90deg, var(--brand-400), var(--brand-600), var(--brand-400))',
        }}
      />

      {/* Main grid */}
      <div
        className="mx-auto"
        style={{ maxWidth: '44rem', padding: '2rem 1rem 0' }}
      >
        {/* 2-col mobile, 4-col desktop */}
        <div
          className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4"
          role="navigation"
          aria-label="Footer navigation"
        >
          <BrandColumn />
          <NavColumn />
          <LegalColumn />
          <ContactColumn />
        </div>

        {/* Bottom bar */}
        <div
          className="mt-8 flex flex-col items-center gap-2 pt-5 sm:mt-10 sm:flex-row sm:justify-between sm:pt-5"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
          role="contentinfo"
        >
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            &copy; {year} {SITE_CONFIG.name}. Mọi quyền được bảo lưu.
          </p>

          <p
            className="flex items-start gap-1.5 text-center text-xs sm:items-center sm:text-right"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 sm:mt-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            Không phải sàn thương mại điện tử. Không liên kết chính thức với Shopee.
          </p>
        </div>
      </div>

      {/* Breathing space */}
      <div style={{ height: '1.5rem' }} aria-hidden="true" />
    </footer>
  );
}

export default LandingFooter;
