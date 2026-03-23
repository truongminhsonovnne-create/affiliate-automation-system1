'use client';

/**
 * PublicLayout — Header + shell for all public pages.
 *
 * Design:
 *  - Compact, premium header with scroll-aware solid/frosted-glass background
 *  - Nav links: smooth hover transition + active dot-underline
 *  - Mobile: hamburger drawer with slide-in animation + body scroll lock
 *  - Logo: icon shadow lifts on hover
 *  - Footer: legal links, brand summary
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Sparkles, Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAnalytics } from '@/lib/public/analytics-context';

// ── Config ──────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '/home', label: 'Trang chủ' },
  { href: '/resources', label: 'Tài nguyên' },
  { href: '/info/about', label: 'Giới thiệu' },
  { href: '/info/contact', label: 'Liên hệ' },
];

const LEGAL_LINKS = [
  { href: '/info/privacy', label: 'Chính sách bảo mật' },
  { href: '/info/cookies', label: 'Chính sách Cookie' },
  { href: '/info/terms', label: 'Điều khoản sử dụng' },
  { href: '/info/affiliate-disclosure', label: 'Công khai liên kết' },
];

// ── Logo ────────────────────────────────────────────────────────────────────

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/home"
      aria-label="VoucherFinder — về trang chủ"
      onClick={onClick}
      className="group flex items-center gap-2.5"
    >
      {/* Icon mark */}
      <div
        className="flex items-center justify-center rounded-lg transition-all duration-200 group-hover:shadow-brand-sm"
        style={{
          width: '1.875rem',
          height: '1.875rem',
          background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
          boxShadow: '0 1px 3px 0 rgb(249 115 22 / 0.25)',
        }}
        aria-hidden="true"
      >
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>
      {/* Brand name */}
      <span
        className="text-sm font-bold tracking-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        VoucherFinder
      </span>
    </Link>
  );
}

// ── Desktop nav link ────────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'relative px-3 py-1.5 rounded-md text-sm font-medium',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1',
        isActive
          ? 'text-brand-700'
          : 'text-gray-500 hover:text-gray-800',
      ].join(' ')}
    >
      {label}
      {/* Active dot underline */}
      {isActive && (
        <span
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full"
          style={{ backgroundColor: 'var(--brand-500)' }}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

// ── Mobile menu drawer ──────────────────────────────────────────────────────

function MobileMenu({
  isOpen,
  onClose,
  pathname,
}: {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}) {
  const { trackEvent } = useAnalytics();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          backgroundColor: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Điều hướng"
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          backgroundColor: 'var(--bg-raised)',
          boxShadow: '-4px 0 24px 0 rgb(0 0 0 / 0.10)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5"
          style={{ height: '3.5rem', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-4" aria-label="Điều hướng chính">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              pathname === href || (href !== '/home' && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  trackEvent('nav_click', { destination: href, navLocation: 'mobile_drawer' });
                  onClose();
                }}
                className={[
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
                ].join(' ')}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={
                    isActive
                      ? { backgroundColor: 'var(--brand-500)' }
                      : { backgroundColor: 'var(--border-strong)' }
                  }
                  aria-hidden="true"
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0 1rem' }} />

        {/* CTA */}
        <div className="p-4">
          <Link
            href="/home"
            onClick={() => {
              trackEvent('header_cta_click', { location: 'mobile_drawer' });
              onClose();
            }}
            className="btn-primary w-full justify-center"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Tìm mã ngay
          </Link>
        </div>
      </div>
    </>
  );
}

// ── Main Layout ─────────────────────────────────────────────────────────────

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { trackEvent } = useAnalytics();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const THRESHOLD = 16;
    const handler = () => setIsScrolled(window.scrollY > THRESHOLD);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 transition-all duration-200"
        style={
          isScrolled
            ? {
                backgroundColor: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderBottom: '1px solid var(--border-subtle)',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)',
              }
            : {
                backgroundColor: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                borderBottom: '1px solid transparent',
              }
        }
      >
        <div
          className="mx-auto flex items-center justify-between"
          style={{ height: '3.25rem', maxWidth: '72rem', paddingLeft: '1rem', paddingRight: '1rem' }}
        >
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Điều hướng chính">
            {NAV_LINKS.map(({ href, label }) => (
              <NavLink
                key={href}
                href={href}
                label={label}
                isActive={pathname === href || (href !== '/home' && (pathname ?? '').startsWith(href))}
                onClick={() => trackEvent('nav_click', { destination: href, navLocation: 'header' })}
              />
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:block">
            <Link
              href="/home"
              onClick={() => trackEvent('header_cta_click', {})}
              className="btn-primary"
              style={{ padding: '0.5rem 1.125rem' }}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Tìm mã
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── Mobile menu ──────────────────────────────────────────────────── */}
      <div id="mobile-menu">
        <MobileMenu
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          pathname={pathname ?? ''}
        />
      </div>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="flex-1" id="main-content" tabIndex={-1}>
        {children}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-raised)',
        }}
      >
        <div
          className="mx-auto"
          style={{ maxWidth: '72rem', padding: '2rem 1rem' }}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Brand */}
            <div className="flex items-start gap-3" style={{ maxWidth: '20rem' }}>
              <div
                className="flex items-center justify-center rounded-lg flex-shrink-0"
                style={{
                  width: '1.75rem',
                  height: '1.75rem',
                  background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
                }}
                aria-hidden="true"
              >
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                VoucherFinder giúp bạn tìm mã giảm giá Shopee nhanh và miễn phí.
              </p>
            </div>

            {/* Legal links */}
            <nav aria-label="Điều hướng pháp lý">
              <div
                className="grid grid-cols-2 gap-x-6 gap-y-2"
                style={{ gridTemplateColumns: 'repeat(2, auto)' }}
              >
                {LEGAL_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => {
                      if (href === '/contact') {
                        trackEvent('contact_click', {});
                      } else {
                        trackEvent('nav_click', { destination: href, navLocation: 'footer' });
                      }
                    }}
                    className="text-xs transition-colors hover:underline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>

          {/* Copyright */}
          <p className="mt-6" style={{ color: 'var(--text-disabled)', fontSize: '0.75rem' }}>
            &copy; {new Date().getFullYear()} VoucherFinder. Mọi quyền được bảo lưu.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
