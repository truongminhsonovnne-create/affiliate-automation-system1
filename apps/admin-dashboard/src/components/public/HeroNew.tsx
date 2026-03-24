'use client';

/**
 * HeroNew — Premium 2026-style hero section + search card.
 *
 * 3-second value communication:
 *   Giây 1: Web làm gì  → headline + eyebrow
 *   Giây 2: User làm gì → search card + platform badges
 *   Giây 3: Kết quả gì → trust strip + sample result preview
 *
 * Mobile optimizations:
 *   - Compact hero (reduced padding)
 *   - Horizontal shortcut chips strip visible above the fold
 *   - Full-width search card (single-column layout)
 *   - Button on separate row for easy one-hand tapping
 *   - Above-fold CTAs visible without scrolling
 *
 * Exports:
 *  - HeroNew: Full hero with headline + search card + trust strip
 *  - HeroSearchCard: Standalone elevated search card (for compact states)
 */

import { useState, useCallback } from 'react';
import { Zap, ShieldCheck, CheckCircle2, Flame, ChevronRight, Search, RefreshCw, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import type { ResolutionStatus } from '@/lib/public/api-client';
import { useAnalytics } from '@/lib/public/analytics-context';

// ── Types ─────────────────────────────────────────────────────────────────

export interface HeroSearchCardProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  status: ResolutionStatus;
  disabled: boolean;
}

// ── Search Card (standalone) ────────────────────────────────────────────────
// Mobile-first: single column, full-width button, no overflow

export function HeroSearchCard({ value, onChange, onSubmit, status, disabled }: HeroSearchCardProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPasteBadge, setShowPasteBadge] = useState(false);
  const { track } = useAnalytics();

  const isProcessing = status === 'queued' || status === 'processing' || status === 'retrying';

  const handleSubmit = useCallback(() => {
    track.heroCtaClick();
    onSubmit();
  }, [track, onSubmit]);
  const isDisabled = disabled || isProcessing;
  const hasValue = value.trim().length >= 5;

  const borderColor = isFocused
    ? '#fb923c'
    : showPasteBadge
    ? '#22c55e'
    : 'rgba(229,231,235,0.8)';

  const handlePaste = () => {
    setShowPasteBadge(true);
    setTimeout(() => setShowPasteBadge(false), 2000);
  };

  return (
    <div
      className="relative w-full rounded-2xl transition-all duration-200"
      style={{
        backgroundColor: '#ffffff',
        border: `1.5px solid ${borderColor}`,
        boxShadow: isFocused
          ? '0 0 0 4px rgba(249,115,22,0.12), 0 8px 24px -4px rgba(0,0,0,0.12)'
          : '0 2px 12px -2px rgba(0,0,0,0.08)',
        transition: 'border-color 200ms ease, box-shadow 200ms ease',
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          height: '3px',
          borderTopLeftRadius: '0.75rem',
          borderTopRightRadius: '0.75rem',
          background: isFocused
            ? 'linear-gradient(90deg, #f97316, #fb923c, #f97316)'
            : 'linear-gradient(90deg, rgba(249,115,22,0.3), rgba(249,115,22,0.5), rgba(249,115,22,0.3))',
          transition: 'background 300ms ease',
        }}
        aria-hidden="true"
      />

      {/* Input row: icon + input + paste badge */}
      <div className="flex items-center gap-2 px-3 py-3 sm:px-5 sm:py-4">
        {/* Icon */}
        <div
          className="flex flex-shrink-0 items-center justify-center rounded-xl transition-colors duration-200"
          style={{
            width: '2.5rem',
            height: '2.5rem',
            minWidth: '2.5rem',
            backgroundColor: hasValue && !isDisabled ? '#fff7ed' : '#f9fafb',
            color: hasValue && !isDisabled ? '#f97316' : '#9ca3af',
            transition: 'background-color 200ms ease, color 200ms ease',
          }}
          aria-hidden="true"
        >
          {isProcessing ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <Zap className="h-4 w-4" style={{ fill: hasValue && !isDisabled ? '#f97316' : 'none' }} />
          )}
        </div>

        {/* Input */}
        <input
          id="hero-search-input"
          type="text"
          aria-label="Link sản phẩm Shopee"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="url"
          enterKeyHint="go"
          placeholder="Dán link sản phẩm Shopee..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hasValue && !isDisabled) handleSubmit();
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isDisabled}
          className="min-h-[2.5rem] flex-1 bg-transparent outline-none disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            color: '#111827',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            minWidth: 0, // prevent flex overflow
          }}
        />

        {/* Paste badge */}
        {showPasteBadge && !isProcessing && (
          <span
            className="flex-shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #22c55e',
              color: '#15803d',
              animation: 'badgePop 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
              whiteSpace: 'nowrap',
            }}
          >
            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
            Đã dán
          </span>
        )}
      </div>

      {/* CTA Button — full width on mobile, inline on sm+ */}
      <div className="px-3 pb-3 sm:px-5 sm:pb-0">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled || !hasValue}
          aria-label="Tìm mã giảm giá"
          className="flex w-full items-center justify-center gap-2 rounded-xl font-semibold text-sm text-white transition-all duration-150 sm:w-auto"
          style={
            hasValue && !isDisabled
              ? {
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f97316',
                  boxShadow: '0 2px 12px rgba(249,115,22,0.3)',
                }
              : {
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f3f4f6',
                  color: '#9ca3af',
                  cursor: 'not-allowed',
                }
          }
          onMouseEnter={(e) => {
            if (!hasValue || isDisabled) return;
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = '#ea580c';
            el.style.boxShadow = '0 4px 18px rgba(249,115,22,0.4)';
            el.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            if (!hasValue || isDisabled) return;
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = '#f97316';
            el.style.boxShadow = '0 2px 12px rgba(249,115,22,0.3)';
            el.style.transform = 'translateY(0)';
          }}
        >
          {isProcessing ? (
            <>
              <svg className="h-4 w-4 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Đang tìm mã...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>Tìm mã giảm giá</span>
            </>
          )}
        </button>
      </div>

      {/* Hint */}
      {hasValue && value.trim().length < 5 && (
        <div
          className="flex items-center gap-1.5 px-5 pb-3 text-xs"
          style={{ color: '#9ca3af', animation: 'hintFadeIn 200ms ease-out both' }}
        >
          <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Link phải có ít nhất 5 ký tự</span>
        </div>
      )}
    </div>
  );
}

// ── Trust strip ──────────────────────────────────────────────────────────────

function TrustStrip() {
  const items = [
    { icon: Zap, label: '4.700+ voucher' },
    { icon: Clock, label: 'Kết quả trong 2–3 giây' },
    { icon: ShieldCheck, label: '0đ phí dịch vụ' },
  ];

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2"
      role="list"
      aria-label="Cam kết"
    >
      {items.map(({ icon: Icon, label }, i) => (
        <div
          key={label}
          className="flex items-center gap-2"
          role="listitem"
          style={{ animation: `trustFadeIn 400ms ${i * 80}ms ease-out both` }}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(249,115,22,0.08)' }}
            aria-hidden="true"
          >
            <Icon className="h-3.5 w-3.5" style={{ color: '#ea580c' }} />
          </div>
          <span className="text-xs font-medium" style={{ color: '#6b7280' }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Discovery CTA — large, prominent, above search on mobile ──────────────────
// Replaces the small "Khám phá:" strip with big clickable cards

const DISCOVERY_ITEMS = [
  {
    href: '/deals/hot',
    label: 'Deal Hot',
    sub: 'Hôm nay',
    icon: Flame,
    bg: '#fff1f2',
    color: '#be123c',
    border: '#fecdd3',
    hoverBg: '#ffe4e6',
  },
  {
    href: '/deals/expiring',
    label: 'Sắp hết hạn',
    sub: 'Nhanh tay',
    icon: Clock,
    bg: '#fefce8',
    color: '#92400e',
    border: '#fde68a',
    hoverBg: '#fef9c3',
  },
  {
    href: '/deals',
    label: 'Tất cả deals',
    sub: 'Xem ngay',
    icon: ChevronRight,
    bg: '#f9fafb',
    color: '#374151',
    border: '#e5e7eb',
    hoverBg: '#f3f4f6',
  },
];

function DiscoveryCTA() {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      role="navigation"
      aria-label="Khám phá deals"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <style>{`
        .discovery-card::-webkit-scrollbar { display: none; }
        @media (min-width: 640px) {
          .discovery-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; overflow: visible !important; }
          .discovery-card { min-width: unset !important; }
        }
      `}</style>
      <div className="discovery-grid flex gap-2" style={{ display: 'flex' }}>
        {DISCOVERY_ITEMS.map(({ href, label, sub, icon: Icon, bg, color, border, hoverBg }) => (
          <Link
            key={href}
            href={href}
            className="discovery-card flex flex-shrink-0 items-center gap-2.5 rounded-xl px-4 py-3.5 transition-all duration-150"
            style={{
              backgroundColor: bg,
              border: `1px solid ${border}`,
              minWidth: '8rem',
              flex: '0 0 auto',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.backgroundColor = hoverBg;
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = `0 4px 12px ${border}80`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.backgroundColor = bg;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'none';
            }}
          >
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${bg}`, border: `1px solid ${border}` }}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div>
              <div className="text-xs font-bold" style={{ color }}>{label}</div>
              <div className="text-[10px] font-medium" style={{ color: `${color}99` }}>{sub}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Full Hero (uses HeroSearchCard) ──────────────────────────────────────────

export interface HeroNewProps extends HeroSearchCardProps {}

export function HeroNew(props: HeroNewProps) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: '#ffffff' }}
      aria-label="Hero"
    >
      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          style={{
            position: 'absolute', top: '-8rem', right: '-4rem',
            width: '36rem', height: '36rem', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: '-6rem', left: '-2rem',
            width: '28rem', height: '28rem', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(251,146,60,0.05) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* ── Main content ── */}
      {/* CSS for responsive overrides */}
      <style>{`
        @media (min-width: 640px) {
          .hero-main-content {
            padding: 5rem 1.5rem 4rem !important;
            max-width: 58rem !important;
          }
          .hero-search-wrapper {
            max-width: 46rem !important;
          }
          .hero-chip-row {
            overflow-x: unset !important;
          }
        }
        .hero-chip-row::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        className="hero-main-content relative mx-auto"
        style={{
          maxWidth: '100%',
          padding: '1.5rem 1rem 1.5rem',
        }}
      >
        {/* ── TIER 1: What this is (giây 1) ── */}
        <div style={{ animation: 'fadeSlideUp 400ms ease-out both' }}>
          {/* Eyebrow badge */}
          <div
            className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              color: '#c2410c',
            }}
          >
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0" aria-hidden="true">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: '#f97316', animation: 'pulse 2s ease-in-out infinite' }}
              />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#f97316' }} />
            </span>
            Miễn phí · Không cần đăng nhập
          </div>

          {/* Headline — compact on mobile */}
          <h1
            className="font-black tracking-tight"
            style={{
              color: '#111827',
              fontSize: 'clamp(1.75rem, 5vw, 3.5rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              marginBottom: '0.75rem',
            }}
          >
            Tìm mã giảm giá{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Shopee
            </span>{' '}
            tốt nhất
          </h1>

          {/* ── DISCOVERY CTA — large cards, above search, mobile first ── */}
          {/* Visible on all widths; grid on desktop, horizontal scroll on mobile */}
          <div className="mb-4" style={{ animation: 'fadeSlideUp 300ms ease-out both' }}>
            <DiscoveryCTA />
          </div>

          {/* Subheadline — hidden on very small mobile, shown on sm+ */}
          <p
            className="hidden sm:block text-sm"
            style={{
              color: '#6b7280',
              lineHeight: 1.6,
              maxWidth: '34rem',
              marginBottom: '0',
            }}
          >
            Dán link sản phẩm Shopee vào ô bên dưới. Hệ thống tự động kiểm tra
            hàng trăm voucher đang hoạt động — trả về mã tốt nhất, hoàn toàn miễn phí.
          </p>
        </div>

        {/* ── TIER 2: Search Card (single column on mobile) ── */}
        <div
          className="hero-search-wrapper"
          style={{ animation: 'fadeSlideUp 400ms 80ms ease-out both' }}
        >
          {/* Search card — full width on mobile */}
          <div className="w-full">
            <HeroSearchCard {...props} />
          </div>

          {/* Platform hint — only visible on sm+ */}
          <div className="mt-2 hidden sm:flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px]" style={{ color: '#9ca3af' }}>
              Hỗ trợ{' '}
              <span style={{ fontWeight: 600, color: '#6b7280' }}>shopee.vn</span>
              {' '}và{' '}
              <span style={{ fontWeight: 600, color: '#6b7280' }}>shope.ee</span>
              {' '}· Không lưu lịch sử tìm kiếm
            </p>
            <Link
              href="/deals"
              className="flex items-center gap-1 text-[11px] font-medium transition-colors"
              style={{ color: '#f97316' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ea580c'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#f97316'; }}
            >
              Xem deal trước
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* ── TIER 3: Trust strip (compact on mobile) ── */}
        <div
          className="mt-4"
          style={{ animation: 'fadeSlideUp 400ms 160ms ease-out both' }}
        >
          {/* Compact sample result — only on sm+ */}
          <div
            className="hidden sm:flex flex-col gap-3"
            style={{
              backgroundColor: '#fafaf9',
              border: '1px solid #e5e7eb',
              borderRadius: '1rem',
              padding: '0.875rem 1.25rem',
              maxWidth: '46rem',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
                  aria-hidden="true"
                >
                  <Zap className="h-4 w-4" style={{ color: '#f97316', fill: '#f97316' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
                    >
                      DRSAMUYT
                    </span>
                    <span className="text-[11px]" style={{ color: '#6b7280' }}>
                      Giảm đến 15K · 1 click để copy
                    </span>
                  </div>
                </div>
              </div>
              <div
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                style={{ backgroundColor: '#f97316' }}
              >
                <RefreshCw className="h-3 w-3" />
                Copy mã
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-4">
            <TrustStrip />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroNew;
