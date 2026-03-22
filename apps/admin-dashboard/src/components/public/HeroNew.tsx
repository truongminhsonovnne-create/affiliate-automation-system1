'use client';

/**
 * HeroNew — Premium 2026-style hero section + search card.
 *
 * Exports:
 *  - HeroNew: Full hero with headline + search card + trust strip
 *  - HeroSearchCard: Standalone elevated search card (for compact states)
 */

import { useState } from 'react';
import { Zap, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import type { ResolutionStatus } from '@/lib/public/api-client';

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

  const isProcessing = status === 'queued' || status === 'processing' || status === 'retrying';
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
          placeholder="Dán link sản phẩm Shopee vào đây..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hasValue && !isDisabled) onSubmit();
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
          onClick={onSubmit}
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
    { icon: Clock, label: '2–3 giây' },
    { icon: ShieldCheck, label: 'Không thu thập dữ liệu' },
    { icon: Zap, label: 'Miễn phí vĩnh viễn' },
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
      {/* Ambient background glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          style={{
            position: 'absolute',
            top: '-8rem',
            right: '-4rem',
            width: '36rem',
            height: '36rem',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-6rem',
            left: '-2rem',
            width: '28rem',
            height: '28rem',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(251,146,60,0.06) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Content */}
      <div
        className="relative mx-auto"
        style={{ maxWidth: '54rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
      >
        {/* Eyebrow */}
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
          style={{
            backgroundColor: '#fff7ed',
            border: '1px solid #fed7aa',
            color: '#c2410c',
            animation: 'fadeSlideUp 400ms ease-out both',
          }}
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: '#f97316', animation: 'pulse 2s ease-in-out infinite' }}
            />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: '#f97316' }} />
          </span>
          Miễn phí · Không cần đăng nhập Shopee
        </div>

        {/* Headline */}
        <div style={{ animation: 'fadeSlideUp 400ms 60ms ease-out both' }}>
          <h1
            className="font-black tracking-tight"
            style={{
              color: '#111827',
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
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
              Shopee trong 3 giây
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-base sm:text-lg"
            style={{
              color: '#4b5563',
              lineHeight: 1.65,
              maxWidth: '32rem',
              marginBottom: '2.5rem',
              fontWeight: '400',
            }}
          >
            Dán link sản phẩm Shopee — hệ thống tự kiểm tra hàng trăm mã
            và trả về voucher tốt nhất cho bạn. Không quảng cáo, không phí dịch vụ.
          </p>
        </div>

        {/* Search — visual centerpiece */}
        <div style={{ animation: 'fadeSlideUp 400ms 120ms ease-out both' }}>
          <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
            <HeroSearchCard {...props} />
          </div>
          <p className="mt-3 text-center text-[11px]" style={{ color: '#9ca3af' }}>
            Không cần đăng nhập Shopee · Không lưu lịch sử tìm kiếm
          </p>
        </div>

        {/* Trust strip */}
        <div className="mt-8" style={{ animation: 'fadeSlideUp 400ms 180ms ease-out both' }}>
          <TrustStrip />
        </div>
      </div>
    </section>
  );
}

export default HeroNew;
