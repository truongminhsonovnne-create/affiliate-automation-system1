'use client';

/**
 * DealCard — Reusable public deal card for discovery pages.
 *
 * Features:
 *  - Discount badge (%, freeship, fixed amount)
 *  - Source badge (MasOffer / AccessTrade)
 *  - Expiry countdown label
 *  - Synced-at freshness label
 *  - Hotness / quality score indicators
 *  - CTA: Copy code or open link
 *  - Pushsale / exclusive badges
 */

import { useState, useCallback } from 'react';
import { Clock, Check, Copy, ExternalLink, Zap, Star, Flame } from 'lucide-react';
import type { DealCard as DealCardType } from '@/lib/public/deals-api';

interface DealCardProps {
  deal: DealCardType;
  /** Show full description (default: false — truncated) */
  showDescription?: boolean;
  /** Compact variant for lists */
  compact?: boolean;
  onCopy?: (code: string) => void;
}

const SOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  masoffer:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  accesstrade: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
};

const DEAL_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  coupon:     { bg: '#fff7ed', text: '#c2410c' },
  voucher:    { bg: '#f5f3ff', text: '#6d28d9' },
  deal:       { bg: '#ecfdf5', text: '#065f46' },
  promotion:  { bg: '#fefce8', text: '#854d0e' },
  campaign:   { bg: '#f0f9ff', text: '#0369a1' },
  pushesale:  { bg: '#fff1f2', text: '#be123c' },
  flash_sale: { bg: '#fff7ed', text: '#c2410c' },
};

const DEAL_TYPE_LABELS: Record<string, string> = {
  coupon:     'Coupon',
  voucher:    'Voucher',
  deal:       'Deal',
  promotion:  'Khuyến mãi',
  campaign:   'Campaign',
  pushesale:  'Hot Deal',
  flash_sale: 'Flash Sale',
};

// ── Copy Button ────────────────────────────────────────────────────────────────

function CopyButton({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement('textarea');
      el.value = code;
      el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  if (!code) {
    return (
      <a
        href={undefined}
        onClick={undefined}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-default opacity-50"
        style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
        aria-disabled="true"
      >
        <ExternalLink className="h-3 w-3" />
        Mở trang
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150"
      style={{
        backgroundColor: copied ? '#22c55e' : '#f97316',
        color: '#ffffff',
        boxShadow: copied ? undefined : '0 2px 8px rgba(249,115,22,0.25)',
      }}
      onMouseEnter={(e) => {
        if (!copied) (e.currentTarget as HTMLElement).style.backgroundColor = '#ea580c';
      }}
      onMouseLeave={(e) => {
        if (!copied) (e.currentTarget as HTMLElement).style.backgroundColor = '#f97316';
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Đã copy!' : 'Copy mã'}
    </button>
  );
}

// ── Source Badge ───────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const colors = SOURCE_COLORS[source] ?? { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' };
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
    >
      {source === 'masoffer' ? 'MO' : 'AT'}
    </span>
  );
}

// ── Deal Type Badge ───────────────────────────────────────────────────────────

function DealTypeBadge({ sourceType }: { sourceType: string }) {
  const colors = DEAL_TYPE_COLORS[sourceType] ?? { bg: '#f9fafb', text: '#6b7280' };
  const label = DEAL_TYPE_LABELS[sourceType] ?? sourceType;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {sourceType === 'pushsale' && <Flame className="h-2.5 w-2.5" />}
      {sourceType === 'flash_sale' && <Zap className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

// ── Hotness Bar ────────────────────────────────────────────────────────────────

function HotnessBar({ score }: { score: number | null }) {
  if (score == null || score <= 0) return null;
  const pct = Math.min(score * 100, 100);
  const color = pct > 70 ? '#ef4444' : pct > 40 ? '#f97316' : '#eab308';
  return (
    <div className="flex items-center gap-1.5" title={`Hotness: ${(score * 100).toFixed(0)}%`}>
      <Flame className="h-3 w-3 flex-shrink-0" style={{ color }} />
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: '#f3f4f6', minWidth: '4rem' }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-medium" style={{ color: '#9ca3af' }}>
        {(score * 100).toFixed(0)}
      </span>
    </div>
  );
}

// ── Expiry Badge ──────────────────────────────────────────────────────────────

function ExpiryBadge({ label, endAt }: { label: string | null; endAt: string | null }) {
  if (!label) return null;
  const isExpired = label === 'Đã hết hạn';
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium"
      style={{ color: isExpired ? '#ef4444' : '#d97706' }}
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}

// ── Main DealCard ──────────────────────────────────────────────────────────────

export function DealCard({ deal, showDescription = false, compact = false }: DealCardProps) {
  const hasCode = Boolean(deal.coupon_code);
  const openUrl = deal.tracking_url ?? deal.destination_url;
  const discountText = deal.badge_text ?? '';

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-150"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #f3f4f6',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
      >
        {/* Discount badge */}
        {discountText && (
          <div
            className="flex-shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold"
            style={{ backgroundColor: '#fff7ed', color: '#c2410c', minWidth: '3.5rem', textAlign: 'center', justifyContent: 'center' }}
          >
            {discountText}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium" style={{ color: '#111827' }}>{deal.title}</p>
          <p className="text-xs truncate" style={{ color: '#9ca3af' }}>{deal.merchant_name}</p>
        </div>

        {/* Expiry + badges */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <ExpiryBadge label={deal.expiry_label} endAt={deal.end_at} />
          <SourceBadge source={deal.source} />
        </div>

        {/* CTA */}
        {openUrl && (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all duration-150"
            style={{ backgroundColor: '#f97316', boxShadow: '0 2px 8px rgba(249,115,22,0.25)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ea580c'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f97316'; }}
          >
            <ExternalLink className="h-3 w-3" />
            {hasCode ? 'Copy' : 'Mở'}
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #f3f4f6',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* ── Top color band ─────────────────────────────────────────────── */}
      <div
        className="h-1.5"
        style={{
          background: 'linear-gradient(90deg, #f97316, #fb923c)',
        }}
        aria-hidden="true"
      />

      {/* ── Card body ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 p-5 flex-1">

        {/* Row 1: Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {deal.is_pushsale && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase"
              style={{ backgroundColor: '#fff1f2', color: '#be123c' }}
            >
              <Flame className="h-2.5 w-2.5" /> Hot Deal
            </span>
          )}
          {deal.is_exclusive && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase"
              style={{ backgroundColor: '#fefce8', color: '#854d0e' }}
            >
              <Star className="h-2.5 w-2.5" /> Độc quyền
            </span>
          )}
          <DealTypeBadge sourceType={deal.source_type} />
          <SourceBadge source={deal.source} />
        </div>

        {/* Row 2: Discount + Title */}
        <div className="flex items-start gap-3">
          {discountText && (
            <div
              className="flex-shrink-0 rounded-xl px-3 py-2 text-xl font-black leading-none text-center min-w-[4.5rem]"
              style={{
                backgroundColor: '#fff7ed',
                color: '#c2410c',
                border: '1.5px solid #fed7aa',
              }}
            >
              {discountText}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3
              className="text-sm font-semibold leading-snug line-clamp-2"
              style={{ color: '#111827' }}
            >
              {deal.title}
            </h3>
            {deal.merchant_name && (
              <p className="mt-0.5 text-xs" style={{ color: '#9ca3af' }}>
                {deal.merchant_name}
              </p>
            )}
          </div>
        </div>

        {/* Row 3: Description */}
        {(showDescription || deal.description) && deal.description && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#6b7280' }}>
            {deal.description}
          </p>
        )}

        {/* Row 4: Terms / min spend */}
        {(deal.min_order_value || deal.terms) && (
          <div className="text-xs" style={{ color: '#6b7280' }}>
            {deal.min_order_value != null && (
              <span className="font-medium">Đơn tối thiểu {deal.min_order_value.toLocaleString('vi-VN')}đ</span>
            )}
            {deal.min_order_value && deal.terms && <span> · </span>}
            {deal.terms && <span className="line-clamp-1">{deal.terms}</span>}
          </div>
        )}

        {/* Row 5: Hotness bar */}
        {deal.hotness_score != null && deal.hotness_score > 0 && (
          <HotnessBar score={deal.hotness_score} />
        )}

        {/* Row 6: Meta row — expiry + synced + score */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-auto pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <ExpiryBadge label={deal.expiry_label} endAt={deal.end_at} />
            {deal.synced_at_label && (
              <span className="text-[10px]" style={{ color: '#d1d5db' }}>
                {deal.synced_at_label}
              </span>
            )}
          </div>
          {deal.confidence_score != null && (
            <span className="text-[10px] font-medium" style={{ color: '#d1d5db' }}>
              {(deal.confidence_score * 100).toFixed(0)}% tự tin
            </span>
          )}
        </div>
      </div>

      {/* ── Footer CTA ─────────────────────────────────────────────────── */}
      {openUrl && (
        <div
          className="flex items-center gap-2 px-5 py-3"
          style={{ borderTop: '1px solid #f9fafb' }}
        >
          {hasCode ? (
            <>
              <div
                className="flex-1 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-center"
                style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px dashed #fed7aa' }}
              >
                {deal.coupon_code}
              </div>
              <CopyButton code={deal.coupon_code} />
            </>
          ) : (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all duration-150"
              style={{
                backgroundColor: '#f97316',
                boxShadow: '0 2px 8px rgba(249,115,22,0.25)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ea580c'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f97316'; }}
            >
              <ExternalLink className="h-4 w-4" />
              Mở trang deal
            </a>
          )}
        </div>
      )}
    </div>
  );
}
