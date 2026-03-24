'use client';

/**
 * HeroNew — Premium 2026-style hero section + search card.
 *
 * 3-second value communication:
 *   Giây 1: Web làm gì  → headline + eyebrow
 *   Giây 2: User làm gì → search card + platform badges
 *   Giây 3: Kết quả gì → trust strip + sample result preview
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
        minHeight: '5.5rem',
        backgroundColor: '#ffffff',
        border: `1.5px solid ${borderColor}`,
        boxShadow: isFocused
          ? '0 0 0 4px rgba(249,115,22,0.12), 0 20px 60px -12px rgba(0,0,0,0.18), 0 8px 24px -4px rgba(0,0,0,0.08)'
          : '0 4px 24px -4px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
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

      <div className="flex items-center gap-3 px-5 py-4 sm:px-6 sm:py-5">
        {/* Icon */}
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-xl transition-colors duration-200"
          style={{
            width: '2.75rem',
            height: '2.75rem',
            backgroundColor: hasValue && !isDisabled ? '#fff7ed' : '#f9fafb',
            color: hasValue && !isDisabled ? '#f97316' : '#9ca3af',
            transition: 'background-color 200ms ease, color 200ms ease',
          }}
          aria-hidden="true"
        >
          {isProcessing ? (
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <Zap className="h-5 w-5" style={{ fill: hasValue && !isDisabled ? '#f97316' : 'none' }} />
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
          placeholder="Dán link sản phẩm Shopee (shope.ee cũng được)..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hasValue && !isDisabled) handleSubmit();
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isDisabled}
          className="min-h-[2.75rem] flex-1 text-sm rounded-lg bg-transparent outline-none disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            color: '#111827',
            fontSize: '0.9375rem',
            lineHeight: 1.5,
          }}
        />

        {/* Paste badge */}
        {showPasteBadge && !isProcessing && (
          <span
            className="flex-shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #22c55e',
              color: '#15803d',
              animation: 'badgePop 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
            }}
          >
            <CheckCircle2 className="h-3 w-3" />
            Đã dán
          </span>
        )}

        {/* CTA Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled || !hasValue}
          aria-label="Tìm mã giảm giá"
          className="flex-shrink-0 flex items-center gap-2 rounded-xl font-semibold text-sm text-white transition-all duration-150"
          style={
            hasValue && !isDisabled
              ? {
                  padding: '0.625rem 1.375rem',
                  backgroundColor: '#f97316',
                  boxShadow: '0 2px 12px rgba(249,115,22,0.3)',
                }
              : {
                  padding: '0.625rem 1.375rem',
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
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="hidden sm:inline">Đang tìm...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" aria-hidden="true" />
              <span>Tìm mã</span>
            </>
          )}
        </button>
      </div>

      {/* Hint */}
      {hasValue && value.trim().length < 5 && (
        <div
          className="flex items-center gap-1.5 px-6 pb-4 text-xs"
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
      <div
        className="relative mx-auto"
        style={{ maxWidth: '58rem', padding: '5rem 1.5rem 4rem' }}
      >

        {/* ── TIER 1: What this is (giây 1) ── */}
        <div style={{ animation: 'fadeSlideUp 400ms ease-out both' }}>
          {/* Eyebrow badge */}
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              color: '#c2410c',
            }}
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: '#f97316', animation: 'pulse 2s ease-in-out infinite' }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: '#f97316' }} />
            </span>
            Miễn phí · Không cần đăng nhập · Không giới hạn
          </div>

          {/* Headline */}
          <h1
            className="font-black tracking-tight"
            style={{
              color: '#111827',
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              marginBottom: '1rem',
            }}
          >
            Tìm mã giảm giá
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Shopee tốt nhất
            </span>
            <br />
            <span style={{ color: '#6b7280', fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', fontWeight: 700 }}>
              Chỉ trong 2–3 giây
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-base sm:text-lg"
            style={{
              color: '#4b5563',
              lineHeight: 1.7,
              maxWidth: '34rem',
              marginBottom: '0',
            }}
          >
            Dán link sản phẩm Shopee vào ô bên dưới. Hệ thống tự động kiểm tra
            hàng trăm voucher đang hoạt động — trả về mã tốt nhất, hoàn toàn miễn phí.
          </p>
        </div>

        {/* ── TIER 2: What you do (giây 2) — Search Card ── */}
        <div
          className="mt-8"
          style={{ animation: 'fadeSlideUp 400ms 80ms ease-out both', maxWidth: '46rem' }}
        >
          <HeroSearchCard {...props} />

          {/* Platform + format hint */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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

        {/* ── TIER 3: What you get — sample result preview ── */}
        <div
          className="mt-10"
          style={{ animation: 'fadeSlideUp 400ms 160ms ease-out both' }}
        >
          <p
            className="mb-3 text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: '#d1d5db', letterSpacing: '0.1em' }}
          >
            Kết quả bạn nhận được
          </p>

          {/* Sample result card */}
          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            style={{
              backgroundColor: '#fafaf9',
              border: '1px solid #e5e7eb',
              borderRadius: '1rem',
              padding: '1rem 1.25rem',
              maxWidth: '46rem',
            }}
          >
            <div className="flex items-start gap-3">
              {/* Coupon icon */}
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
                aria-hidden="true"
              >
                <Zap className="h-5 w-5" style={{ color: '#f97316', fill: '#f97316' }} />
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
                    Giảm đến 15K
                  </span>
                </div>
                <p className="mt-1 text-xs" style={{ color: '#9ca3af' }}>
                  Mã được kiểm tra · Áp dụng cho đơn từ 99K
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
              <span className="text-[11px]" style={{ color: '#6b7280' }}>
                <span style={{ fontWeight: 700, color: '#15803d' }}>1 click</span> để copy
              </span>
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
          <div className="mt-6">
            <TrustStrip />
          </div>
        </div>

        {/* Discovery strip */}
        <div
          className="mt-8 flex flex-wrap items-center gap-2"
          style={{ animation: 'fadeSlideUp 400ms 200ms ease-out both' }}
        >
          <span className="text-[11px]" style={{ color: '#9ca3af' }}>Hoặc khám phá:</span>
          <Link
            href="/deals/hot"
            className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors"
            style={{ backgroundColor: '#fff1f2', color: '#be123c' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ffe4e6'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fff1f2'; }}
          >
            <Flame className="h-3 w-3" />
            Deal hot hôm nay
          </Link>
          <Link
            href="/deals/expiring"
            className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors"
            style={{ backgroundColor: '#fefce8', color: '#92400e' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fef9c3'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fefce8'; }}
          >
            ⏰ Sắp hết hạn
          </Link>
          <Link
            href="/deals"
            className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors"
            style={{ backgroundColor: '#f9fafb', color: '#374151' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'; }}
          >
            Tất cả deals
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HeroNew;
