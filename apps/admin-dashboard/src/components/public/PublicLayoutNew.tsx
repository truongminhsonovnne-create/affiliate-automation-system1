'use client';

/**
 * PublicLayout — Premium 2026-style sticky header for all public pages.
 *
 * Design:
 *  - Ultra-clean sticky header: logo left, nav center (hidden on mobile), CTA right
 *  - Transparent on mount → frosted glass on scroll
 *  - Mobile: full-screen overlay nav with staggered link animations
 *  - No footer here — each page controls its own footer
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Zap, Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAnalytics } from '@/lib/public/analytics-context';

const NAV_LINKS = [
  { href: '/home', label: 'Tra cứu' },
  { href: '/resources', label: 'Tài nguyên' },
  { href: '/info/about', label: 'Giới thiệu' },
  { href: '/contact', label: 'Liên hệ' },
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
      <div
        className="flex items-center justify-center rounded-lg transition-shadow duration-200 group-hover:shadow-brand-sm"
        style={{
          width: '2rem',
          height: '2rem',
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          boxShadow: '0 1px 3px rgba(249,115,22,0.3)',
        }}
        aria-hidden="true"
      >
        <Zap className="h-4 w-4 text-white" />
      </div>
      <span
        className="text-[0.9375rem] font-bold tracking-tight"
        style={{ color: '#111827', letterSpacing: '-0.01em' }}
      >
        VoucherFinder
      </span>
    </Link>
  );
}

// ── Desktop Nav Link ─────────────────────────────────────────────────────────

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
      className="relative px-3 py-1.5 text-sm font-medium transition-colors duration-150 rounded-md"
      style={{
        color: isActive ? '#c2410c' : '#6b7280',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#111827'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = isActive ? '#c2410c' : '#6b7280'; }}
    >
      {label}
    </Link>
  );
}

// ── Mobile Full-Screen Overlay ────────────────────────────────────────────────

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

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* Panel */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Điều hướng"
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm transition-transform duration-300 ease-out"
        style={{
          backgroundColor: '#ffffff',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6"
          style={{ height: '4rem', borderBottom: '1px solid #f3f4f6' }}
        >
          <Logo onClick={onClose} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
            style={{ color: '#6b7280', backgroundColor: '#f9fafb' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'; }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-4" aria-label="Điều hướng chính">
          {NAV_LINKS.map(({ href, label }, i) => {
            const isActive = pathname === href || (href !== '/home' && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  trackEvent('nav_click', { destination: href, navLocation: 'mobile_drawer' });
                  onClose();
                }}
                className="flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-all duration-150"
                style={{
                  color: isActive ? '#c2410c' : '#374151',
                  backgroundColor: isActive ? '#fff7ed' : 'transparent',
                  animationDelay: isOpen ? `${i * 60}ms` : '0ms',
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: isActive ? '#f97316' : '#d1d5db',
                  }}
                  aria-hidden="true"
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* CTA */}
        <div className="p-6" style={{ borderTop: '1px solid #f3f4f6' }}>
          <Link
            href="/home"
            onClick={() => {
              trackEvent('header_cta_click', { location: 'mobile_drawer' });
              onClose();
            }}
            className="flex items-center justify-center gap-2 rounded-xl text-base font-semibold text-white transition-all duration-150"
            style={{
              padding: '0.875rem 1.5rem',
              backgroundColor: '#f97316',
              boxShadow: '0 4px 14px rgba(249,115,22,0.3)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ea580c'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f97316'; }}
          >
            <Zap className="h-4 w-4" aria-hidden="true" />
            Tra cứu voucher ngay
          </Link>
        </div>
      </div>
    </>
  );
}

// ── Main Layout ──────────────────────────────────────────────────────────────

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { trackEvent } = useAnalytics();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 20);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#f9fafb', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 transition-all duration-200"
        style={
          isScrolled
            ? {
                backgroundColor: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(243,244,246,0.8)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }
            : {
                backgroundColor: 'rgba(255,255,255,0.0)',
                backdropFilter: 'blur(0px)',
                borderBottom: '1px solid transparent',
              }
        }
      >
        <div
          className="mx-auto flex items-center justify-between"
          style={{ height: '3.75rem', maxWidth: '72rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
        >
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Điều hướng chính">
            {NAV_LINKS.map(({ href, label }) => (
              <NavLink
                key={href}
                href={href}
                label={label}
                isActive={pathname === href || (href !== '/home' && pathname?.startsWith(href))}
                onClick={() => trackEvent('nav_click', { destination: href, navLocation: 'header' })}
              />
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/home"
              onClick={() => trackEvent('header_cta_click', {})}
              className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white transition-all duration-150"
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#f97316',
                boxShadow: '0 2px 8px rgba(249,115,22,0.25)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.backgroundColor = '#ea580c';
                el.style.boxShadow = '0 4px 14px rgba(249,115,22,0.35)';
                el.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.backgroundColor = '#f97316';
                el.style.boxShadow = '0 2px 8px rgba(249,115,22,0.25)';
                el.style.transform = 'translateY(0)';
              }}
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Tra cứu voucher
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            className="flex md:hidden h-10 w-10 items-center justify-center rounded-lg transition-colors"
            style={{ color: '#374151', backgroundColor: '#f9fafb' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'; }}
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
    </div>
  );
}

export default PublicLayout;
