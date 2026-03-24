'use client';

/**
 * AnalysisDetailPanel — Production-ready voucher resolution result UI.
 *
 * Redesigned to consume the full resolve API contract:
 *   - confidenceScore, dataFreshness, matchedSource
 *   - best_result / alternatives / explanation / warnings
 *
 * Flow:
 *   SourceInfoBar → MatchQualityBadge → BestResultCard → TrustPanel
 *                 → AlternativesSection → ActionBar
 *
 * States:
 *   success        — best_result + alternatives
 *   no_match       — no voucher found
 *   (loading states handled by ResolutionProgress)
 */

import { useState, useCallback, useMemo } from 'react';
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
  Award,
  Activity,
  DatabaseZap,
  CalendarClock,
  HelpCircle,
} from 'lucide-react';
import clsx from 'clsx';
import type {
  AnalysisResult,
  BestMatchDetail,
  CandidateCard,
  ExplanationCard,
  DataFreshnessLevel,
} from '@/lib/public/api-client';
import { formatExpiry, formatDate } from '@/lib/public/api-client';
import { useAnalytics } from '@/lib/public/analytics-context';

// =============================================================================
// Types
// =============================================================================

export interface AnalysisDetailPanelProps {
  result: AnalysisResult;
  onReanalyze: () => void;
  onNewSearch: () => void;
  className?: string;
}

// =============================================================================
// Platform config
// =============================================================================

const PLATFORM_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  shopee: { label: 'Shopee', bgColor: 'bg-brand-50', textColor: 'text-brand-600' },
  lazada: { label: 'Lazada', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
  tiki: { label: 'Tiki', bgColor: 'bg-teal-50', textColor: 'text-teal-600' },
  tiktok: { label: 'TikTok Shop', bgColor: 'bg-pink-50', textColor: 'text-pink-600' },
  unknown: { label: 'Website', bgColor: 'bg-gray-50', textColor: 'text-gray-500' },
};

// =============================================================================
// Helpers
// =============================================================================

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const label =
    pct >= 80 ? 'Chính xác cao' : pct >= 50 ? 'Chính xác trung bình' : 'Chính xác thấp';

  return (
    <div className="space-y-1.5" aria-label={`Độ tin cậy: ${pct}%`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Độ tin cậy</span>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color }}
        >
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function FreshnessBadge({ freshness }: { freshness: DataFreshnessLevel }) {
  const config: Record<DataFreshnessLevel, { label: string; icon: React.ElementType; bg: string; text: string; dot: string }> = {
    live: { label: 'Dữ liệu mới', icon: Activity, bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    recent: { label: 'Cập nhật gần đây', icon: Clock, bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    stale: { label: 'Dữ liệu cũ', icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    unknown: { label: 'Chưa rõ', icon: Info, bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' },
  };
  const c = config[freshness] ?? config.unknown;
  const Icon = c.icon;
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', c.bg, c.text)}
      title={`Dữ liệu được cập nhật: ${c.label}`}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', c.dot)} />
      <Icon className="h-3 w-3" aria-hidden="true" />
      {c.label}
    </span>
  );
}

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const isBroad = source.includes('broad');
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        isBroad ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'
      )}
      title={isBroad ? 'Khuyến mãi chung — áp dụng nhiều sản phẩm' : 'Nguồn đối tác chính thức'}
    >
      <DatabaseZap className="h-3 w-3" aria-hidden="true" />
      {source === 'AccessTrade' ? 'AccessTrade' :
        source === 'MasOffer' ? 'MasOffer' :
          source === 'MasOffer_broad' ? 'Broad Promo' :
            source}
    </span>
  );
}

function MatchQualityBadge({ quality }: { quality: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { label: 'Khớp chính xác', icon: Award, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    medium: { label: 'Khớp trung bình', icon: Star, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    low: { label: 'Khớp thấp', icon: Info, bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
  };
  const c = config[quality];
  const Icon = c.icon;
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border', c.bg, c.border, c.text)}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {c.label}
    </span>
  );
}

// =============================================================================
// Trust & meta bar
// =============================================================================

function TrustBar({ result }: { result: AnalysisResult }) {
  const platform = PLATFORM_CONFIG[result.platform] ?? PLATFORM_CONFIG.unknown;
  const serverMs = result.meta.serverDurationMs ?? result.meta.clientLatencyMs;

  // Format latency as "X.Xs" or "Xms"
  const latencyLabel = useMemo(() => {
    if (serverMs == null) return null;
    if (serverMs < 1000) return `${serverMs}ms`;
    return `${(serverMs / 1000).toFixed(1)}s`;
  }, [serverMs]);

  // Timestamp "lúc HH:mm"
  const timeLabel = useMemo(() => {
    return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }, []);

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-2.5 text-xs"
      role="region"
      aria-label="Thông tin kết quả"
    >
      {/* Platform */}
      <span className={clsx('flex items-center gap-1.5 font-medium', platform.textColor)}>
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        {platform.label}
      </span>

      <span className="hidden h-4 w-px bg-gray-200 sm:block" aria-hidden="true" />

      {/* Checked timestamp */}
      <span className="flex items-center gap-1 text-gray-400">
        <CalendarClock className="h-3 w-3" aria-hidden="true" />
        Phân tích lúc {timeLabel}
      </span>

      {/* Latency */}
      {latencyLabel && (
        <span className="flex items-center gap-1 text-gray-400">
          <TrendingUp className="h-3 w-3" aria-hidden="true" />
          Xong trong {latencyLabel}
        </span>
      )}

      {/* Sources */}
      <span className="flex items-center gap-1.5 font-medium" style={{ color: '#6d28d9' }}>
        <DatabaseZap className="h-3 w-3" aria-hidden="true" />
        2 nguồn đối tác
      </span>

      {/* Cache */}
      {result.meta.servedFromCache && (
        <>
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" aria-hidden="true" />
            Từ cache
          </span>
        </>
      )}

      {/* Candidate count */}
      {result.bestMatch && (
        <span className="flex items-center gap-1 text-gray-400">
          <Star className="h-3 w-3" aria-hidden="true" />
          {result.bestMatch.totalCandidates} mã
        </span>
      )}

      {/* Freshness */}
      {result.dataFreshness && (
        <>
          <span className="flex items-center gap-1.5">
            <FreshnessBadge freshness={result.dataFreshness} />
          </span>
        </>
      )}

      {/* Source */}
      {result.matchedSource && (
        <span className="flex items-center gap-1.5">
          <SourceBadge source={result.matchedSource} />
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Confidence + match quality panel
// =============================================================================

function MatchMetaRow({ result }: { result: AnalysisResult }) {
  if (!result.bestMatch) return null;
  const { matchQuality } = result.bestMatch;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MatchQualityBadge quality={matchQuality} />
      {result.confidenceScore != null && (
        <div className="w-36">
          <ConfidenceBar score={result.confidenceScore} />
        </div>
      )}
      {result.bestMatch.selectionReason && (
        <span className="text-xs text-gray-400 hidden sm:inline">
          — {result.bestMatch.selectionReason}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Copy button
// =============================================================================

function CopyButton({
  code,
  size = 'md',
  label,
  discountValue,
  onCopied,
  source = 'best_result',
}: {
  code: string;
  size?: 'sm' | 'md';
  label?: string;
  discountValue?: string;
  onCopied?: () => void;
  source?: 'best_result' | 'alternative' | 'history';
}) {
  const [copied, setCopied] = useState(false);
  const { track } = useAnalytics();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track.couponCopy(source, code, discountValue ?? '');
      onCopied?.();
    } catch { /* silent */ }
  }, [code, discountValue, onCopied, track, source]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label ?? `Sao chép mã ${code}`}
      className={clsx(
        'flex items-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-95',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm',
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
// Discount display
// =============================================================================

function DiscountPill({ value, type }: { value: string; type: string }) {
  const isFreeShipping = type === 'free_shipping';
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center rounded-2xl px-5 py-3 text-center',
        isFreeShipping ? 'bg-blue-50 border border-blue-200' : 'bg-gradient-to-br from-brand-500 to-rose-500'
      )}
    >
      {isFreeShipping ? (
        <>
          <ShoppingCart className="h-6 w-6 text-blue-600 mb-1" aria-hidden="true" />
          <span className="text-sm font-bold text-blue-700">Miễn phí</span>
          <span className="text-xs text-blue-600 font-medium">vận chuyển</span>
        </>
      ) : (
        <>
          <span className="text-3xl font-black tracking-tight text-white leading-none">{value}</span>
          {type === 'percentage' && (
            <span className="text-xs font-semibold text-brand-100 mt-0.5">GIẢM</span>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Best result card — redesigned with strong visual hierarchy
// =============================================================================

function BestResultCard({
  voucher,
  originalUrl,
  explanation,
}: {
  voucher: BestMatchDetail;
  originalUrl: string;
  explanation: ExplanationCard | null;
}) {
  const { track } = useAnalytics();
  const expiry = voucher.validUntil;

  const handleOutbound = useCallback(() => {
    // Track click intent first, then navigate
    track.bestResultClick('best', voucher.code, voucher.discountValue);
    track.outboundClick(originalUrl);
    window.open(originalUrl, '_blank', 'noopener,noreferrer');
  }, [originalUrl, voucher.code, voucher.discountValue, track]);

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-brand-200 bg-white shadow-lg shadow-brand-100/50">
      {/* ── Header: gradient bar with "Mã tốt nhất" label ── */}
      <div
        className="relative px-4 pt-4 pb-4 sm:px-5 sm:pt-5"
        style={{
          background: 'linear-gradient(135deg, var(--brand-50) 0%, #fff 50%, var(--brand-50) 100%)',
          borderBottom: '1px solid var(--brand-100)',
        }}
      >
        {/* Label */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
            <Star className="h-3 w-3" aria-hidden="true" />
            Mã tốt nhất
          </span>
          {voucher.isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
              <Shield className="h-3 w-3" aria-hidden="true" />
              Đã xác minh
            </span>
          )}
        </div>

        {/* Content: headline + code + CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          {/* Left: headline + code */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-snug sm:text-lg">
              {voucher.headline}
            </h2>

            {/* Selection reason */}
            {voucher.selectionReason && (
              <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                <Info className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                {voucher.selectionReason}
              </p>
            )}

            {/* Code + copy */}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="inline-block w-fit rounded-xl bg-white/90 border-2 border-brand-200 px-5 py-2.5 font-mono text-base font-bold text-brand-600 tracking-widest shadow-sm sm:text-lg">
                {voucher.code}
              </code>
              <CopyButton
                code={voucher.code}
                size="md"
                discountValue={voucher.discountValue}
              />
            </div>
          </div>

          {/* Right: discount */}
          <div className="flex-shrink-0">
            <DiscountPill value={voucher.discountValue} type={voucher.discountType} />
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 py-4 space-y-4 sm:px-5">
        {/* Conditions */}
        {voucher.conditions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Điều kiện áp dụng
            </p>
            <ul className="space-y-1" role="list">
              {voucher.conditions.map((cond, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-300" aria-hidden="true" />
                  {cond}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expiry */}
        {expiry && <ExpiryRow isoDate={expiry} />}

        {/* Explanation */}
        {explanation && (
          <ExplanationPanel explanation={explanation} />
        )}

        {/* CTA */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleOutbound}
            className={clsx(
              'flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl',
              'bg-brand-500 text-white font-bold text-sm sm:text-base',
              'hover:bg-brand-600 active:bg-brand-700 active:scale-[0.99]',
              'transition-all duration-200 shadow-lg shadow-brand-500/30',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300'
            )}
          >
            <ShoppingCart className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span>Mua ngay trên Shopee</span>
            <ExternalLink className="h-4 w-4 flex-shrink-0 opacity-70" aria-hidden="true" />
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
// Expiry row
// =============================================================================

function ExpiryRow({ isoDate }: { isoDate: string }) {
  const expiry = formatExpiry(isoDate);
  const dateStr = formatDate(isoDate);
  const diffMs = new Date(isoDate).getTime() - Date.now();
  const isExpired = diffMs <= 0;
  const isUrgent = diffMs > 0 && diffMs < 12 * 60 * 60 * 1000;

  return (
    <div
      className={clsx(
        'flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5',
        isExpired ? 'border-red-200 bg-red-50' :
          isUrgent ? 'border-amber-200 bg-amber-50' :
            'border-gray-100 bg-gray-50'
      )}
    >
      <Clock
        className={clsx(
          'h-4 w-4 flex-shrink-0',
          isExpired ? 'text-red-400' :
            isUrgent ? 'text-amber-500' :
              'text-gray-400'
        )}
        aria-hidden="true"
      />
      <div>
        <p
          className={clsx(
            'text-sm font-medium',
            isExpired ? 'text-red-600' :
              isUrgent ? 'text-amber-700' :
                'text-gray-600'
          )}
        >
          {isExpired ? 'Đã hết hạn' : expiry}
        </p>
        {!isExpired && (
          <p className="text-xs text-gray-400">Hết hạn {dateStr}</p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Explanation panel
// =============================================================================

function ExplanationPanel({ explanation }: { explanation: ExplanationCard | null }) {
  if (!explanation) return null;
  return (
    <div
      className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"
      role="region"
      aria-label="Giải thích kết quả"
    >
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-500" aria-hidden="true" />
        <span className="text-sm font-semibold text-blue-800">
          Vì sao hệ thống chọn mã này?
        </span>
      </div>
      <p className="text-sm text-blue-700 leading-relaxed">{explanation.summary}</p>
      {explanation.tips.length > 0 && (
        <ul className="mt-3 space-y-1.5" role="list">
          {explanation.tips.slice(0, 3).map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-blue-700">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// =============================================================================
// Warnings panel
// =============================================================================

function WarningsPanel({ warnings }: { warnings: Array<{ code: string; message: string; severity: string }> }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="space-y-2" role="region" aria-label="Cảnh báo">
      {warnings.map((w, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
          <div>
            {w.code && (
              <p className="font-semibold text-amber-800">{w.code}</p>
            )}
            <p className="text-amber-700">{w.message}</p>
          </div>
        </div>
      ))}
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
  const { track } = useAnalytics();

  const handleCopy = useCallback(async (c: CandidateCard) => {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopiedId(c.voucherId);
      setTimeout(() => setCopiedId(null), 2000);
      track.couponCopy('alternative', c.code, c.discountText);
    } catch { /* silent */ }
  }, [track]);

  const handleCardClick = useCallback((c: CandidateCard) => {
    track.alternativeClick(c.code, c.discountText);
    track.outboundClick(originalUrl);
    window.open(originalUrl, '_blank', 'noopener,noreferrer');
  }, [originalUrl, track]);

  const handleExpandClick = useCallback((voucherId: string) => {
    setExpandedId((p) => p === voucherId ? null : voucherId);
  }, []);

  if (candidates.length === 0) return null;

  const rankColor = (rank: number) =>
    rank === 2 ? 'bg-amber-100 text-amber-700' :
      rank === 3 ? 'bg-slate-100 text-slate-600' :
        'bg-brand-50 text-brand-600';

  return (
    <div className="space-y-3" role="region" aria-label="Các lựa chọn khác">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Tag className="h-4 w-4 text-gray-400" aria-hidden="true" />
          Các lựa chọn khác
        </h3>
        <span className="text-xs text-gray-400">{candidates.length} mã</span>
      </div>

      <div className="space-y-2">
        {candidates.map((c) => (
          <div
            key={c.voucherId}
            className="overflow-hidden rounded-xl border border-gray-100 bg-white transition-all hover:border-gray-200 hover:shadow-sm"
          >
            <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
              {/* Rank */}
              <span
                className={clsx(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5',
                  rankColor(c.rank)
                )}
                aria-label={`Hạng ${c.rank}`}
              >
                {c.rank}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{c.discountText}</p>
                {c.reason && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{c.reason}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(c)}
                  aria-label={`Sao chép mã ${c.code}`}
                  className={clsx(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    copiedId === c.voucherId
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                  )}
                >
                  {copiedId === c.voucherId ? (
                    <><CheckCircle className="h-3.5 w-3.5" aria-hidden="true" /><span className="hidden sm:inline">Đã sao chép</span><span className="sm:hidden">✓</span></>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" aria-hidden="true" /><code className="font-mono font-bold truncate max-w-[80px] sm:max-w-none">{c.code}</code></>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleExpandClick(c.voucherId)}
                  aria-expanded={expandedId === c.voucherId}
                  aria-label="Chi tiết"
                  className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:scale-95"
                >
                  {expandedId === c.voucherId
                    ? <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Expanded */}
            {expandedId === c.voucherId && (
              <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-3 sm:px-4 animate-in slide-in-from-top-1 duration-150">
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
                  onClick={() => handleCardClick(c)}
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
// Discovery cross-sell strip
// =============================================================================

function DiscoveryLinks() {
  return (
    <div
      className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4"
      role="complementary"
      aria-label="Khám phá thêm"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Khám phá thêm deals
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href="/deals/hot"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          style={{ backgroundColor: '#fff1f2', color: '#be123c' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ffe4e6'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fff1f2'; }}
        >
          🔥 Deal hot hôm nay
        </a>
        <a
          href="/deals/expiring"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          style={{ backgroundColor: '#fefce8', color: '#92400e' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fef9c3'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fefce8'; }}
        >
          ⏰ Sắp hết hạn
        </a>
        <a
          href="/deals"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          style={{ backgroundColor: '#f9fafb', color: '#374151', border: '1px solid #f3f4f6' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'; }}
        >
          Tất cả deals →
        </a>
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
          'hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99] transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'sm:w-auto sm:flex-1'
        )}
      >
        <RefreshCw className={clsx('h-4 w-4 flex-shrink-0', loading && 'animate-spin')} aria-hidden="true" />
        Phân tích lại
      </button>
      <button
        type="button"
        onClick={onNewSearch}
        disabled={loading}
        className={clsx(
          'flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3',
          'text-sm font-semibold text-white w-full',
          'hover:bg-brand-600 active:bg-brand-700 active:scale-[0.99] transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'sm:w-auto sm:flex-1'
        )}
      >
        <Zap className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        Tìm sản phẩm khác
      </button>
    </div>
  );
}

// =============================================================================
// No voucher panel
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
  const platform = PLATFORM_CONFIG[result.platform] ?? PLATFORM_CONFIG.unknown;
  const timeLabel = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white">
      {/* Header */}
      <div
        className="px-5 py-5"
        style={{ background: 'linear-gradient(135deg, var(--gray-50) 0%, white 100%)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className={clsx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl', platform.bgColor)}>
            <Globe className={clsx('h-4 w-4', platform.textColor)} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-gray-800">Không tìm thấy voucher phù hợp</p>
            <p className="text-xs text-gray-400 truncate">{result.displayLabel}</p>
          </div>
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: '#eef2ff', color: '#4338ca' }}
          >
            <DatabaseZap className="h-3 w-3" aria-hidden="true" />
            MasOffer + AccessTrade
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
          >
            <CalendarClock className="h-3 w-3" aria-hidden="true" />
            Kiểm tra lúc {timeLabel}
          </span>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          Hiện tại chưa có mã giảm giá nào cho sản phẩm này trong hệ thống.
          Sản phẩm có thể không nằm trong chương trình khuyến mãi hiện tại,
          hoặc chương trình vừa kết thúc.
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Reasons */}
        <div
          className="rounded-xl border p-4 text-left"
          style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}
        >
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold" style={{ color: '#92400e' }}>
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Tại sao không có voucher?
          </p>
          <ul className="space-y-1.5" role="list">
            {[
              'Shop chưa tham gia chương trình khuyến mãi theo sản phẩm cụ thể này.',
              'Voucher có thể vừa hết — hệ thống cập nhật 2 lần/ngày (6h và 18h).',
              'Thử dán link sạch từ trang sản phẩm, tránh link từ quảng cáo có thêm tham số.',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#92400e' }}>
                <span
                  className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: '#d97706' }}
                  aria-hidden="true"
                />
                {tip}
              </li>
            ))}
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

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Trust bar */}
      <TrustBar result={result} />

      {/* Match quality + confidence */}
      <MatchMetaRow result={result} />

      {/* Warnings */}
      <WarningsPanel warnings={result.bestMatch?.warnings ?? []} />

      {/* Main content */}
      {hasBestMatch ? (
        <BestResultCard
          voucher={result.bestMatch!}
          originalUrl={result.originalUrl}
          explanation={result.explanation}
        />
      ) : (
        <NoVoucherPanel
          result={result}
          onReanalyze={onReanalyze}
          onNewSearch={onNewSearch}
        />
      )}

      {/* Alternatives */}
      {hasBestMatch && result.candidates.length > 0 && (
        <AlternativesSection
          candidates={result.candidates}
          originalUrl={result.originalUrl}
        />
      )}

      {/* Action bar */}
      {hasBestMatch && (
        <ActionBar
          onReanalyze={onReanalyze}
          onNewSearch={onNewSearch}
        />
      )}

      {/* Discovery links — cross-sell to deal discovery pages */}
      <DiscoveryLinks />
    </div>
  );
}

export default AnalysisDetailPanel;
