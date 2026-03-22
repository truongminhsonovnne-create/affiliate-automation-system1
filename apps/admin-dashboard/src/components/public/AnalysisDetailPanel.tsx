'use client';

/**
 * AnalysisDetailPanel — Full analysis result view for a single voucher resolution.
 *
 * Displays:
 *   - Source URL + platform + processing status
 *   - Best voucher recommendation with conditions, expiry, scope
 *   - Explanation of why this voucher was chosen
 *   - Warning banners (expiry, stale, success not guaranteed)
 *   - Alternative candidates
 *   - CTAs: copy code, open destination, re-analyze
 *
 * Gracefully degrades: fields only render when data is available.
 */

import { useState, useCallback, useId } from 'react';
import {
  CheckCircle,
  Copy,
  ExternalLink,
  AlertTriangle,
  Info,
  Clock,
  Tag,
  RefreshCw,
  Shield,
  Zap,
  ChevronDown,
  ChevronUp,
  Globe,
  TrendingUp,
  Star,
  Sparkles,
  ShoppingCart,
} from 'lucide-react';
import clsx from 'clsx';
import type {
  AnalysisResult,
  BestMatchDetail,
  CandidateCard,
  ExplanationCard,
} from '@/lib/public/api-client';
import { formatExpiry, formatDate } from '@/lib/public/api-client';
import { useAnalytics } from '@/lib/public/analytics-context';

// =============================================================================
// Types
// =============================================================================

export interface AnalysisDetailPanelProps {
  /** Full analysis result to display */
  result: AnalysisResult;
  /** Trigger a re-analysis with the same URL */
  onReanalyze: () => void;
  /** Trigger a new search */
  onNewSearch: () => void;
  className?: string;
}

// =============================================================================
// Platform config
// =============================================================================

const PLATFORM_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; textColor: string }
> = {
  shopee: {
    label: 'Shopee',
    color: 'text-brand-500',
    bgColor: 'bg-brand-50',
    textColor: 'text-brand-700',
  },
  lazada: {
    label: 'Lazada',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  tiki: {
    label: 'Tiki',
    color: 'text-teal-500',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
  },
  tiktok: {
    label: 'TikTok Shop',
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
  },
  unknown: {
    label: 'Website',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
  },
};

// =============================================================================
// Shared copy button
// =============================================================================

function CopyButton({
  code,
  size = 'md',
  label,
  discountValue,
  onCopied,
}: {
  code: string;
  size?: 'sm' | 'md';
  label?: string;
  discountValue?: string;
  /** Called when copy succeeds — parent handles analytics */
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { trackEvent } = useAnalytics();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // ── Track: voucher_copy ───────────────────────────────────────────
      trackEvent('voucher_copy', {
        voucherCode: code,
        discountValue: discountValue ?? '',
      });
      onCopied?.();
    } catch {
      /* silent */
    }
  }, [code, discountValue, onCopied, trackEvent]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label ?? `Sao chép mã ${code}`}
      className={clsx(
        'flex items-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-95',
        size === 'sm'
          ? 'px-3 py-1.5 text-xs'
          : 'px-5 py-2.5 text-sm',
        copied
          ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-lg'
          : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-900/20'
      )}
    >
      {copied ? (
        <>
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          <span>Đã sao chép!</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" aria-hidden="true" />
          <span>Sao chép mã</span>
        </>
      )}
    </button>
  );
}

// =============================================================================
// Warning banners
// =============================================================================

function WarningBanner({
  variant,
  title,
  description,
}: {
  variant: 'expiry' | 'stale' | 'success';
  title: string;
  description: string;
}) {
  const config = {
    expiry: {
      icon: Clock,
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      titleColor: 'text-amber-800',
      descColor: 'text-amber-700',
    },
    stale: {
      icon: RefreshCw,
      border: 'border-brand-200',
      bg: 'bg-brand-50',
      iconColor: 'text-brand-500',
      titleColor: 'text-brand-800',
      descColor: 'text-brand-700',
    },
    success: {
      icon: Shield,
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-800',
      descColor: 'text-blue-700',
    },
  }[variant];

  const Icon = config.icon;

  return (
    <div
      className={clsx(
        'flex items-start gap-3 rounded-xl border p-4',
        config.border,
        config.bg
      )}
    >
      <Icon className={clsx('h-5 w-5 flex-shrink-0 mt-0.5', config.iconColor)} aria-hidden="true" />
      <div>
        <p className={clsx('text-sm font-semibold', config.titleColor)}>{title}</p>
        <p className={clsx('mt-0.5 text-xs leading-relaxed', config.descColor)}>{description}</p>
      </div>
    </div>
  );
}

function WarningBanners({ result }: { result: AnalysisResult }) {
  const banners: { variant: 'expiry' | 'stale' | 'success'; title: string; description: string }[] = [];

  // Expiry warning
  if (result.bestMatch) {
    const expiry = result.bestMatch.validUntil;
    if (expiry) {
      const expiryDate = new Date(expiry);
      const now = Date.now();
      const diffHours = (expiryDate.getTime() - now) / (1000 * 60 * 60);

      if (diffHours < 0) {
        banners.push({
          variant: 'expiry',
          title: 'Voucher có thể đã hết hạn',
          description:
            'Ngày hết hạn đã qua. Voucher có thể không còn khả dụng. Hãy kiểm tra lại trước khi sử dụng.',
        });
      } else if (diffHours < 12) {
        banners.push({
          variant: 'expiry',
          title: 'Voucher sắp hết hạn',
          description: `Chỉ còn khoảng ${Math.ceil(diffHours)} giờ nữa. Bạn nên sử dụng ngay.`,
        });
      }
    }

    // Warnings from engine
    const voucherWarnings = result.bestMatch.warnings;
    if (voucherWarnings.length > 0) {
      banners.push({
        variant: 'stale',
        title: 'Điều kiện có thể thay đổi',
        description:
          'Thông tin voucher có thể không còn chính xác 100%. Shop có quyền thay đổi hoặc kết thúc chương trình bất kỳ lúc nào.',
      });
    }
  }

  // Success guarantee disclaimer
  if (result.bestMatch) {
    banners.push({
      variant: 'success',
      title: 'Không đảm bảo áp dụng 100%',
      description:
        'Mã giảm giá phụ thuộc vào điều kiện thực tế của đơn hàng và chính sách Shopee tại thời điểm thanh toán.',
    });
  }

  if (banners.length === 0) return null;

  return (
    <div className="space-y-2.5" role="region" aria-label="Cảnh báo">
      {banners.map((banner, i) => (
        <WarningBanner
          key={i}
          variant={banner.variant}
          title={banner.title}
          description={banner.description}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Source info bar
// =============================================================================

function SourceInfoBar({ result }: { result: AnalysisResult }) {
  const platform = PLATFORM_CONFIG[result.platform] ?? PLATFORM_CONFIG.unknown;
  const Icon = Globe;

  // Latency display
  const serverMs = result.meta.serverDurationMs ?? result.meta.clientLatencyMs;
  const latencyLabel =
    serverMs < 1000
      ? `${serverMs}ms`
      : `${(serverMs / 1000).toFixed(1)}s`;

  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-2 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-xs sm:text-sm">
      {/* Platform */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={clsx('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md', platform.bgColor)}>
          <Icon className={clsx('h-3.5 w-3.5', platform.textColor)} aria-hidden="true" />
        </span>
        <span className="font-medium text-gray-700">{platform.label}</span>
      </div>

      {/* URL — full width on mobile */}
      <div className="w-full min-w-0 order-last sm:order-none">
        <p
          className="truncate text-gray-500"
          title={result.originalUrl}
        >
          {result.displayLabel}
        </p>
      </div>

      {/* Latency */}
      <div className="flex items-center gap-1 text-gray-400 flex-shrink-0">
        <TrendingUp className="h-3 w-3" aria-hidden="true" />
        <span className="tabular-nums">{latencyLabel}</span>
      </div>

      {/* Cache badge */}
      {result.meta.servedFromCache && (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 flex-shrink-0">
          <CheckCircle className="h-3 w-3" aria-hidden="true" />
          Cache
        </span>
      )}

      {/* Candidate count */}
      {result.bestMatch && (
        <div className="flex items-center gap-1 text-gray-400 flex-shrink-0">
          <Star className="h-3 w-3" aria-hidden="true" />
          <span>{result.bestMatch.totalCandidates} mã</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Best voucher card
// =============================================================================

function DiscountBadge({
  value,
  type,
}: {
  value: string;
  type: string;
}) {
  const isFreeShipping = type === 'free_shipping';
  const isPercentage = type === 'percentage';

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center rounded-2xl px-5 py-3 text-center',
        isFreeShipping
          ? 'bg-blue-50 border border-blue-200'
          : isPercentage
          ? 'bg-gradient-to-br from-brand-500 to-rose-500'
          : 'bg-gradient-to-br from-brand-500 to-rose-500'
      )}
    >
      {isFreeShipping ? (
        <>
          <ShoppingCart className="h-7 w-7 text-blue-600 mb-1" aria-hidden="true" />
          <span className="text-sm font-bold text-blue-700">Miễn phí</span>
          <span className="text-xs text-blue-600 font-medium">vận chuyển</span>
        </>
      ) : (
        <>
          <span className="text-3xl font-black tracking-tight text-white leading-none">
            {value}
          </span>
          {type === 'percentage' && (
            <span className="text-sm font-semibold text-brand-100 mt-0.5">GIẢM</span>
          )}
        </>
      )}
    </div>
  );
}

function ConditionsList({ conditions }: { conditions: string[] }) {
  if (conditions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Điều kiện áp dụng
      </p>
      <ul className="space-y-1" role="list">
        {conditions.map((cond, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-300" aria-hidden="true" />
            {cond}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExpiryInfo({ isoDate }: { isoDate: string }) {
  const expiry = formatExpiry(isoDate);
  const dateStr = formatDate(isoDate);
  const now = Date.now();
  const diffMs = new Date(isoDate).getTime() - now;
  const isExpired = diffMs <= 0;
  const isUrgent = diffMs > 0 && diffMs < 12 * 60 * 60 * 1000;

  return (
    <div
      className={clsx(
        'flex items-center gap-2 rounded-xl border px-3 py-2',
        isExpired && 'border-red-200 bg-red-50',
        isUrgent && !isExpired && 'border-amber-200 bg-amber-50',
        !isExpired && !isUrgent && 'border-gray-100 bg-gray-50'
      )}
    >
      <Clock
        className={clsx(
          'h-4 w-4 flex-shrink-0',
          isExpired && 'text-red-400',
          isUrgent && !isExpired && 'text-amber-500',
          !isExpired && !isUrgent && 'text-gray-400'
        )}
        aria-hidden="true"
      />
      <div>
        <p
          className={clsx(
            'text-sm font-medium',
            isExpired && 'text-red-600',
            isUrgent && !isExpired && 'text-amber-700',
            !isExpired && !isUrgent && 'text-gray-600'
          )}
        >
          {isExpired ? 'Đã hết hạn' : expiry}
        </p>
        {!isExpired && (
          <p className="text-xs text-gray-400">
            Hết hạn {dateStr}
          </p>
        )}
      </div>
    </div>
  );
}

function ExplanationBox({ explanation }: { explanation: ExplanationCard | null }) {
  if (!explanation) return null;

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-500" aria-hidden="true" />
        <span className="text-sm font-semibold text-blue-800">
          Tại sao voucher này?
        </span>
      </div>
      <p className="text-sm text-blue-700 leading-relaxed">{explanation.summary}</p>
      {explanation.tips.length > 0 && (
        <ul className="mt-3 space-y-1.5" role="list">
          {explanation.tips.slice(0, 4).map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-blue-700">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
              {tip}
            </li>
          ))}
        </ul>
      )}
      {explanation.context && (
        <p className="mt-3 border-t border-blue-100 pt-2 text-xs text-blue-600 italic">
          {explanation.context}
        </p>
      )}
    </div>
  );
}

function BestVoucherCard({
  voucher,
  originalUrl,
  explanation,
}: {
  voucher: BestMatchDetail;
  originalUrl: string;
  explanation: ExplanationCard | null;
}) {
  const { trackEvent } = useAnalytics();
  const expiry = voucher.validUntil;

  const handleOutboundClick = useCallback(() => {
    // Deduplicate: only track first click per session
    const key = 'vf_oc_best';
    try {
      if (sessionStorage.getItem(key)) {
        window.open(originalUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      sessionStorage.setItem(key, '1');
    } catch { /* ignore */ }
    // ── Track: outbound_shopee_click ───────────────────────────────────
    trackEvent('outbound_shopee_click', { productUrl: originalUrl });
    // Open after tracking (non-blocking)
    window.open(originalUrl, '_blank', 'noopener,noreferrer');
  }, [originalUrl, trackEvent]);

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-lg shadow-brand-100/40">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-brand-50 via-amber-50 to-brand-50 px-4 pt-4 pb-4 sm:px-5 sm:pt-5 sm:pb-4">
        {/* Badge row */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
            <Star className="h-3 w-3" aria-hidden="true" />
            Mã tốt nhất
          </span>
          {voucher.isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
              <Shield className="h-3 w-3" aria-hidden="true" />
              Đã xác minh
            </span>
          )}
          {voucher.servedFromCache && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              Từ cache
            </span>
          )}
        </div>

        {/* Headline + discount — stacked on mobile */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-snug sm:text-lg">
              {voucher.headline}
            </h2>

            {/* Code + copy — stacked on mobile */}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="inline-block w-fit rounded-lg bg-white/90 border border-brand-200 px-4 py-2 font-mono text-base font-bold text-brand-600 tracking-widest shadow-sm sm:text-lg">
                {voucher.code}
              </code>
              <CopyButton code={voucher.code} size="md" discountValue={voucher.discountValue} />
            </div>
          </div>

          {/* Discount value */}
          <div className="flex-shrink-0">
            <DiscountBadge value={voucher.discountValue} type={voucher.discountType} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-4 sm:px-5">
        {/* Conditions */}
        <ConditionsList conditions={voucher.conditions} />

        {/* Expiry */}
        {expiry && <ExpiryInfo isoDate={expiry} />}

        {/* Scope */}
        {voucher.scope.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {voucher.scope.map((s) => (
              <span
                key={s}
                className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-600"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Explanation */}
        <ExplanationBox explanation={explanation} />

        {/* Primary CTA — full-width on mobile */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleOutboundClick}
            className={clsx(
              'flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl w-full',
              'bg-brand-500 text-white font-bold text-sm sm:text-base',
              'hover:bg-brand-600 active:bg-brand-700 active:scale-[0.99]',
              'transition-all duration-200 shadow-lg shadow-brand-500/30',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300'
            )}
          >
            <ShoppingCart className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span>Mua ngay trên Shopee</span>
            <ExternalLink className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          </button>
          <p className="text-center text-xs text-gray-400">
            Áp dụng mã khi thanh toán
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Alternatives section
// =============================================================================

function AlternativesSection({
  candidates,
  originalUrl,
}: {
  candidates: CandidateCard[];
  originalUrl: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { trackEvent } = useAnalytics();

  const handleCopy = useCallback(async (c: CandidateCard) => {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopiedId(c.voucherId);
      setTimeout(() => setCopiedId(null), 2000);
      // ── Track: voucher_copy (alternative) ────────────────────────────
      trackEvent('voucher_copy', {
        voucherCode: c.code,
        discountValue: c.discountText,
      });
    } catch { /* silent */ }
  }, [trackEvent]);

  const handleOutboundClick = useCallback((voucherId: string) => {
    // Deduplicate: only track first click per session per voucher
    const key = `vf_oc_${voucherId}`;
    try {
      if (sessionStorage.getItem(key)) {
        window.open(originalUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      sessionStorage.setItem(key, '1');
    } catch { /* ignore */ }
    // ── Track: outbound_shopee_click ───────────────────────────────────
    trackEvent('outbound_shopee_click', { productUrl: originalUrl });
    window.open(originalUrl, '_blank', 'noopener,noreferrer');
  }, [originalUrl, trackEvent]);

  if (candidates.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Tag className="h-4 w-4 text-gray-400" aria-hidden="true" />
          Các lựa chọn khác
        </h3>
        <span className="text-xs text-gray-400">
          {candidates.length} mã khả dụng
        </span>
      </div>

      <div className="space-y-2">
        {candidates.map((c) => (
          <div
            key={c.voucherId}
            className="overflow-hidden rounded-xl border border-gray-100 bg-white transition-all hover:border-gray-200 hover:shadow-sm"
          >
            {/* Row — stacked on mobile */}
            <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
              {/* Left: rank + info */}
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={clsx(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5',
                    c.rank === 2 ? 'bg-amber-100 text-amber-700' :
                    c.rank === 3 ? 'bg-slate-100 text-slate-600' :
                    'bg-brand-50 text-brand-600'
                  )}
                  aria-label={`Hạng ${c.rank}`}
                >
                  {c.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.discountText}</p>
                  {c.reason && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{c.reason}</p>
                  )}
                </div>
              </div>

              {/* Right: actions — always visible on mobile */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(c)}
                  aria-label={`Sao chép mã ${c.code}`}
                  className={clsx(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex-shrink-0',
                    copiedId === c.voucherId
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                  )}
                >
                  {copiedId === c.voucherId ? (
                    <><CheckCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /><span className="hidden sm:inline">Đã sao chép</span><span className="sm:hidden">✓</span></>
                  ) : (
                    <><Copy className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /><code className="font-mono font-bold truncate max-w-[80px] sm:max-w-none">{c.code}</code></>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedId((prev) => prev === c.voucherId ? null : c.voucherId)}
                  aria-expanded={expandedId === c.voucherId}
                  aria-label={expandedId === c.voucherId ? 'Thu gọn' : 'Xem chi tiết'}
                  className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:scale-95 flex-shrink-0"
                >
                  {expandedId === c.voucherId
                    ? <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Expanded details */}
            {expandedId === c.voucherId && (
              <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-3 sm:px-4 animate-in slide-in-from-top-1 duration-150">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm">
                  <div>
                    <dt className="text-gray-400">Mã</dt>
                    <dd className="font-mono font-semibold text-gray-700 break-all">{c.code}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Ưu đãi</dt>
                    <dd className="font-semibold text-gray-700">{c.discountText}</dd>
                  </div>
                  {c.reason && (
                    <div className="col-span-2">
                      <dt className="text-gray-400">Lý do đề xuất</dt>
                      <dd className="text-gray-600">{c.reason}</dd>
                    </div>
                  )}
                </dl>
                <button
                  type="button"
                  onClick={() => handleOutboundClick(c.voucherId)}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Mở trên Shopee
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Action bar
// =============================================================================

function ActionBar({
  onReanalyze,
  onNewSearch,
  loading,
}: {
  onReanalyze: () => void;
  onNewSearch: () => void;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={onReanalyze}
        disabled={loading}
        className={clsx(
          'flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-3',
          'text-sm font-semibold text-gray-600 w-full',
          'hover:border-gray-300 hover:bg-gray-50',
          'active:scale-[0.99] transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'sm:w-auto sm:flex-1' // auto width on sm+
        )}
      >
        <RefreshCw
          className={clsx('h-4 w-4 flex-shrink-0', loading && 'animate-spin')}
          aria-hidden="true"
        />
        Phân tích lại
      </button>
      <button
        type="button"
        onClick={onNewSearch}
        disabled={loading}
        className={clsx(
          'flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3',
          'text-sm font-semibold text-white w-full',
          'hover:bg-brand-600 active:bg-brand-700',
          'active:scale-[0.99] transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'sm:w-auto sm:flex-1' // auto width on sm+
        )}
      >
        <Zap className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        Tìm sản phẩm khác
      </button>
    </div>
  );
}

// =============================================================================
// No voucher state
// =============================================================================

function NoVoucherPanel({
  result,
  onReanalyze,
  onNewSearch,
}: {
  result: AnalysisResult;
  onReanalyze: () => void;
  onNewSearch: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="bg-gray-50 px-5 py-5 border-b border-gray-100">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
            Không tìm thấy
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Hiện tại chưa có voucher nào phù hợp cho sản phẩm này.
        </p>
      </div>

      <div className="p-5 space-y-4">
        <SourceInfoBar result={result} />

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium">Tại sao không có kết quả?</p>
              <p className="mt-1 text-xs leading-relaxed">
                Sản phẩm này có thể không nằm trong chương trình khuyến mãi hiện tại,
                hoặc voucher chưa được cập nhật trong hệ thống của chúng tôi.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <p className="mb-2 text-sm font-semibold text-blue-800">Bạn có thể thử:</p>
          <ul className="space-y-1.5 text-xs text-blue-700" role="list">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
              Tìm sản phẩm cùng danh mục hoặc shop khác
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
              Quay lại sau — voucher được cập nhật thường xuyên
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
              Kiểm tra trang khuyến mãi Shopee trực tiếp
            </li>
          </ul>
        </div>

        <ActionBar onReanalyze={onReanalyze} onNewSearch={onNewSearch} />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AnalysisDetailPanel({
  result,
  onReanalyze,
  onNewSearch,
  className,
}: AnalysisDetailPanelProps) {
  const hasBestMatch = result.bestMatch !== null;

  if (!hasBestMatch) {
    return (
      <div className={className}>
        <NoVoucherPanel
          result={result}
          onReanalyze={onReanalyze}
          onNewSearch={onNewSearch}
        />
      </div>
    );
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Source info */}
      <SourceInfoBar result={result} />

      {/* Warning banners */}
      <WarningBanners result={result} />

      {/* Best voucher */}
      <BestVoucherCard
        voucher={result.bestMatch!}
        originalUrl={result.originalUrl}
        explanation={result.explanation}
      />

      {/* Alternatives */}
      {result.candidates.length > 0 && (
        <AlternativesSection
          candidates={result.candidates}
          originalUrl={result.originalUrl}
        />
      )}

      {/* Action bar */}
      <ActionBar
        onReanalyze={onReanalyze}
        onNewSearch={onNewSearch}
      />
    </div>
  );
}

export default AnalysisDetailPanel;
