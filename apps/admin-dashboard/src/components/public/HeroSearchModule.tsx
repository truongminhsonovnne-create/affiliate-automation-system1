'use client';

/**
 * HeroSearchModule — Premium, conversion-focused hero search for the homepage.
 *
 * Design:
 *  - Elevated search card with gradient top accent line
 *  - Lightning icon color-shifts with input state (idle → focused → pasted → error)
 *  - CTA button: brand on valid input, disabled gray when empty/processing
 *  - Paste feedback badge springs in with badgePop animation
 *  - TrustBar items stagger in with trustFadeIn
 *  - Input has focus ring on the card border + shadow
 */

import { useState } from 'react';
import { Sparkles, Shield, Zap } from 'lucide-react';
import type { ResolutionStatus } from '@/lib/public/api-client';

// ── Types ─────────────────────────────────────────────────────────────────

export interface HeroSearchModuleProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  status: ResolutionStatus;
  disabled: boolean;
}

// ── Trust data ─────────────────────────────────────────────────────────────

const TRUST_POINTS = [
  { icon: Zap, label: 'Nhanh', sub: 'Kết quả trong 2–3 giây' },
  { icon: Shield, label: 'An toàn', sub: 'Không thu thập dữ liệu' },
  { icon: Sparkles, label: 'Miễn phí', sub: 'Không giới hạn tra cứu' },
];

// ── Search Card ────────────────────────────────────────────────────────────

function HeroSearchCard({
  value,
  onChange,
  onSubmit,
  status,
  disabled,
}: HeroSearchModuleProps) {
  const [hasPasted, setHasPasted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const hintId = 'hero-search-hint';

  const isProcessing =
    status === 'queued' || status === 'processing' || status === 'retrying';
  const isDisabled = disabled || isProcessing;
  const hasValue = value.trim().length >= 5;
  const hint = getHint(value, status);

  const handlePaste = () => {
    setHasPasted(true);
    setTimeout(() => setHasPasted(false), 2000);
  };

  // Icon color driven by state
  const iconColor = hasPasted
    ? 'var(--success-600)'
    : hint?.type === 'error'
    ? 'var(--error-500)'
    : isFocused
    ? 'var(--brand-500)'
    : 'var(--text-muted)';

  // Card border driven by state
  const cardBorderColor = hint?.type === 'error'
    ? 'var(--error-500)'
    : hasPasted
    ? 'var(--success-500)'
    : isFocused
    ? 'var(--brand-400)'
    : 'var(--border-default)';

  const cardShadow = isFocused && !isDisabled
    ? '0 0 0 3px rgb(249 115 22 / 0.18), 0 8px 32px -4px rgb(0 0 0 / 0.10), 0 2px 8px -2px rgb(0 0 0 / 0.05)'
    : '0 8px 32px -4px rgb(0 0 0 / 0.08), 0 2px 8px -2px rgb(0 0 0 / 0.04)';

  return (
    <div className="w-full" style={{ maxWidth: '38rem', margin: '0 auto' }}>
      {/* Card */}
      <div
        className="relative overflow-hidden rounded-2xl border"
        style={{
          backgroundColor: 'white',
          borderColor: cardBorderColor,
          boxShadow: cardShadow,
          transition: 'border-color 200ms ease, box-shadow 200ms ease',
        }}
      >
        {/* Top gradient accent line */}
        <div
          className="absolute inset-x-0 top-0 h-0.5"
          style={{
            background: 'linear-gradient(90deg, var(--brand-400), var(--brand-600), var(--brand-400))',
            opacity: isFocused && !isDisabled ? 1 : 0.7,
            transition: 'opacity 200ms ease',
          }}
          aria-hidden="true"
        />

        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          {/* Lightning icon */}
          <div className="flex-shrink-0" aria-hidden="true">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke={iconColor}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'stroke 200ms ease' }}
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>

          {/* Input */}
          <input
            id="hero-search-input"
            type="text"
            role="combobox"
            aria-label="Link sản phẩm Shopee"
            aria-expanded={showHint}
            aria-controls={hintId}
            aria-invalid={hint?.type === 'error'}
            aria-describedby={hint ? hintId : undefined}
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
            onFocus={() => { setShowHint(true); setIsFocused(true); }}
            onBlur={() => { setTimeout(() => setShowHint(false), 200); setIsFocused(false); }}
            disabled={isDisabled}
            className="min-h-[44px] flex-1 border-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />

          {/* Paste feedback badge */}
          {hasPasted && !isProcessing && (
            <span
              className="flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: 'var(--success-50)',
                border: '1px solid var(--success-500)',
                color: 'var(--success-700)',
                animation: 'badgePop 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
              }}
            >
              Đã dán ✓
            </span>
          )}

          {/* CTA Button */}
          <button
            type="button"
            onClick={onSubmit}
            disabled={isDisabled || !hasValue}
            aria-label="Tìm mã giảm giá"
            className="flex-shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 font-semibold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 active:translate-y-px"
            style={
              hasValue && !isDisabled
                ? {
                    backgroundColor: 'var(--brand-500)',
                    color: 'white',
                    boxShadow: '0 2px 8px 0 rgb(249 115 22 / 0.30)',
                    transition: 'background-color 150ms ease, box-shadow 150ms ease, transform 100ms ease',
                  }
                : {
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-disabled)',
                    cursor: 'not-allowed',
                    transition: 'background-color 150ms ease, color 150ms ease',
                  }
            }
            onMouseEnter={(e) => {
              if (!hasValue || isDisabled) return;
              e.currentTarget.style.backgroundColor = 'var(--brand-600)';
              e.currentTarget.style.boxShadow = '0 4px 14px 0 rgb(249 115 22 / 0.35)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              if (!hasValue || isDisabled) return;
              e.currentTarget.style.backgroundColor = 'var(--brand-500)';
              e.currentTarget.style.boxShadow = '0 2px 8px 0 rgb(249 115 22 / 0.30)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isProcessing ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="hidden sm:inline">Đang tìm...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Tìm mã</span>
              </>
            )}
          </button>
        </div>

        {/* Validation hint */}
        {hint && (
          <div
            id={hintId}
            role="alert"
            className="flex items-center gap-1.5 px-5 pb-3 text-xs"
            style={{
              color: hint.type === 'error' ? 'var(--error-600)' : 'var(--text-muted)',
              animation: 'hintFadeIn 200ms ease-out both',
            }}
          >
            {hint.type === 'error' && (
              <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            <span>{hint.message}</span>
          </div>
        )}
      </div>

      {/* Microcopy below card */}
      <p className="mt-2.5 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
        Chỉ cần dán link sản phẩm — không cần đăng nhập Shopee
      </p>
    </div>
  );
}

// ── Validation ─────────────────────────────────────────────────────────────

function getHint(
  value: string,
  status: ResolutionStatus
): { type: 'error' | 'hint'; message: string } | null {
  const t = value.trim();
  if (status === 'invalid_link' && t.length > 0) {
    return { type: 'error', message: 'Link không hợp lệ. Vui lòng nhập link sản phẩm Shopee.' };
  }
  if (t.length > 0 && t.length < 5) {
    return { type: 'hint', message: 'Link quá ngắn — cần đầy đủ URL sản phẩm.' };
  }
  if (t.length > 0 && !t.includes('.') && !t.includes('/')) {
    return { type: 'hint', message: 'Link nên bắt đầu bằng https:// và chứa tên miền.' };
  }
  return null;
}

// ── Trust Bar ──────────────────────────────────────────────────────────────

function TrustItem({
  icon: Icon,
  label,
  sub,
  delay,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  sub: string;
  delay: number;
}) {
  return (
    <div
      className="flex items-center gap-2"
      role="listitem"
      style={{
        animation: `trustFadeIn 400ms ${delay}ms ease-out both`,
      }}
    >
      <div
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--brand-50)' }}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" style={{ color: 'var(--brand-600)' }} />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
          {label}
        </span>
        <span className="mt-0.5 text-[11px] leading-none" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </span>
      </div>
    </div>
  );
}

function TrustBar() {
  return (
    <div
      className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
      role="list"
      aria-label="Ưu điểm"
    >
      {TRUST_POINTS.map(({ icon: Icon, label, sub }, i) => (
        <TrustItem key={label} icon={Icon} label={label} sub={sub} delay={80 * i} />
      ))}
    </div>
  );
}

// ── Main Module ─────────────────────────────────────────────────────────────

export function HeroSearchModule(props: HeroSearchModuleProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full" style={{ animation: 'fadeSlideUp 400ms ease-out both' }}>
        <HeroSearchCard {...props} />
      </div>
      <div style={{ animation: 'fadeSlideUp 400ms 80ms ease-out both' }}>
        <TrustBar />
      </div>
    </div>
  );
}

/** Compact inline trust row — used in the result state above the search */
export function InlineTrustBadge() {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
      role="list"
      aria-label="Ưu điểm"
    >
      {TRUST_POINTS.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-1.5" role="listitem">
          <div
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--brand-50)' }}
            aria-hidden="true"
          >
            <Icon className="h-3 w-3" style={{ color: 'var(--brand-600)' }} />
          </div>
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
