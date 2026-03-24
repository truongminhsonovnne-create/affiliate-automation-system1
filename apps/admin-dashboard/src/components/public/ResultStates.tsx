'use client';

/**
 * ResultStates — Feedback states for no-match, invalid link, error, and rate limit.
 *
 * Upgrades vs. v1:
 *  - no_match: checkedAt timestamp, sources-checked badge, 3-reason explanation,
 *              "update schedule" note, richer secondary CTAs
 *  - All states: cleaner visual hierarchy
 */

import { useCallback } from 'react';
import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import {
  SearchX,
  AlertTriangle,
  WifiOff,
  Clock,
  RefreshCw,
  Lightbulb,
  Flame,
  Grid3X3,
  Search,
  DatabaseZap,
  CalendarClock,
  HelpCircle,
} from 'lucide-react';
import clsx from 'clsx';
import type { ErrorCard } from '@/lib/public/api-client';

// =============================================================================
// Types
// =============================================================================

export type ResultStateVariant =
  | 'no_match'
  | 'invalid_link'
  | 'error'
  | 'rate_limited'
  | 'expired'
  | 'failed';

export interface ResultStatesProps {
  variant: ResultStateVariant;
  error?: ErrorCard | null;
  onRetry?: () => void;
  /** Thời điểm hệ thống đã kiểm tra (dùng cho no_match) */
  checkedAt?: Date;
  className?: string;
}

// =============================================================================
// State config
// =============================================================================

const STATE_CONFIG: Record<
  ResultStateVariant,
  {
    icon: LucideIcon;
    title: string;
    description: string;
    tips: string[];
    variant: 'neutral' | 'warning' | 'error' | 'info';
  }
> = {
  no_match: {
    icon: SearchX,
    title: 'Chưa tìm thấy voucher cho sản phẩm này',
    description:
      'Hệ thống đã quét toàn bộ nguồn khuyến mãi nhưng hiện không có mã nào phù hợp. Điều này xảy ra khá thường xuyên — không phải lỗi!',
    tips: [],
    variant: 'neutral',
  },
  invalid_link: {
    icon: AlertTriangle,
    title: 'Link không hợp lệ',
    description:
      'Vui lòng nhập link sản phẩm Shopee đúng định dạng. Hệ thống hỗ trợ shopee.vn và shope.ee.',
    tips: [
      'Sao chép trực tiếp từ ứng dụng hoặc trình duyệt Shopee.',
      'Đảm bảo link chứa đường dẫn sản phẩm cụ thể, không phải trang tìm kiếm.',
      'Ví dụ: https://shope.ee/6V0pXyZ6aX hoặc https://shopee.vn/tai-nghe-i.123456.7890123456',
    ],
    variant: 'warning',
  },
  error: {
    icon: WifiOff,
    title: 'Đã xảy ra lỗi',
    description:
      'Hệ thống gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
    tips: [
      'Thử lại trong giây lát.',
      'Nếu vấn đề tiếp diễn, hệ thống có thể đang bảo trì.',
    ],
    variant: 'error',
  },
  rate_limited: {
    icon: Clock,
    title: 'Thao tác quá nhanh',
    description:
      'Bạn đã thực hiện quá nhiều yêu cầu trong thời gian ngắn. Vui lòng chờ một chút.',
    tips: [
      'Đợi khoảng 1 phút trước khi thử lại.',
      'Hạn chế tìm kiếm cùng một sản phẩm nhiều lần.',
    ],
    variant: 'info',
  },
  expired: {
    icon: Clock,
    title: 'Yêu cầu đã hết hạn',
    description:
      'Yêu cầu của bạn mất quá nhiều thời gian để xử lý nên đã bị hủy. Vui lòng thử lại.',
    tips: [
      'Thử lại ngay bây giờ — hệ thống có thể đã phục hồi.',
      'Nếu vấn đề vẫn tiếp diễn, hãy thử lại sau vài phút.',
    ],
    variant: 'warning',
  },
  failed: {
    icon: AlertTriangle,
    title: 'Xử lý thất bại',
    description:
      'Đã xảy ra lỗi trong quá trình tìm voucher. Vui lòng thử lại.',
    tips: [
      'Thử lại ngay — đây thường là lỗi tạm thời.',
      'Nếu vấn đề vẫn tiếp diễn, hãy thử một sản phẩm khác.',
    ],
    variant: 'error',
  },
};

// =============================================================================
// Variant style maps
// =============================================================================

const VARIANT_STYLES = {
  neutral: {
    wrapper: { borderColor: 'var(--border-default)' } as React.CSSProperties,
    icon: { color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)' } as React.CSSProperties,
    title: { color: 'var(--gray-700)' } as React.CSSProperties,
    description: { color: 'var(--text-secondary)' } as React.CSSProperties,
    tipWrapper: { backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' } as React.CSSProperties,
    tipIcon: { color: 'var(--text-muted)' } as React.CSSProperties,
    tipText: { color: 'var(--gray-600)' } as React.CSSProperties,
    button: { borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--gray-600)' } as React.CSSProperties,
  },
  warning: {
    wrapper: { borderColor: 'var(--warning-500)' } as React.CSSProperties,
    icon: { color: 'var(--warning-600)', backgroundColor: 'var(--warning-50)' } as React.CSSProperties,
    title: { color: 'var(--warning-700)' } as React.CSSProperties,
    description: { color: 'var(--warning-600)' } as React.CSSProperties,
    tipWrapper: { backgroundColor: 'var(--warning-50)', border: '1px solid var(--warning-100)' } as React.CSSProperties,
    tipIcon: { color: 'var(--warning-500)' } as React.CSSProperties,
    tipText: { color: 'var(--warning-700)' } as React.CSSProperties,
    button: { borderColor: 'var(--warning-500)', backgroundColor: 'var(--warning-50)', color: 'var(--warning-700)' } as React.CSSProperties,
  },
  error: {
    wrapper: { borderColor: 'var(--error-500)' } as React.CSSProperties,
    icon: { color: 'var(--error-500)', backgroundColor: 'var(--error-50)' } as React.CSSProperties,
    title: { color: 'var(--error-700)' } as React.CSSProperties,
    description: { color: 'var(--error-500)' } as React.CSSProperties,
    tipWrapper: { backgroundColor: 'var(--error-50)', border: '1px solid var(--error-100)' } as React.CSSProperties,
    tipIcon: { color: 'var(--error-400)' } as React.CSSProperties,
    tipText: { color: 'var(--error-600)' } as React.CSSProperties,
    button: { borderColor: 'var(--error-500)', backgroundColor: 'var(--error-50)', color: 'var(--error-600)' } as React.CSSProperties,
  },
  info: {
    wrapper: { borderColor: 'var(--info-500)' } as React.CSSProperties,
    icon: { color: 'var(--info-500)', backgroundColor: 'var(--info-50)' } as React.CSSProperties,
    title: { color: 'var(--info-700)' } as React.CSSProperties,
    description: { color: 'var(--info-500)' } as React.CSSProperties,
    tipWrapper: { backgroundColor: 'var(--info-50)', border: '1px solid var(--info-100)' } as React.CSSProperties,
    tipIcon: { color: 'var(--info-400)' } as React.CSSProperties,
    tipText: { color: 'var(--info-700)' } as React.CSSProperties,
    button: { borderColor: 'var(--info-500)', backgroundColor: 'var(--info-50)', color: 'var(--info-600)' } as React.CSSProperties,
  },
};

// =============================================================================
// No-match enriched panel
// =============================================================================

/**
 * NoMatchRichPanel — Full-featured "no voucher" state.
 * Replaces the generic icon+title layout for no_match variant.
 */
function NoMatchRichPanel({
  onRetry,
  checkedAt,
}: {
  onRetry?: () => void;
  checkedAt?: Date;
}) {
  const timeLabel = checkedAt
    ? checkedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;

  const REASONS = [
    {
      icon: '📦',
      title: 'Sản phẩm chưa trong chương trình',
      desc: 'Không phải mọi sản phẩm đều có voucher — shop/người bán quyết định có tham gia khuyến mãi hay không.',
    },
    {
      icon: '⏱️',
      title: 'Voucher vừa hết hoặc chưa bắt đầu',
      desc: 'Các chiến dịch khuyến mãi có thời hạn ngắn. Hệ thống cập nhật 2 lần/ngày (6:00 và 18:00 UTC).',
    },
    {
      icon: '🔗',
      title: 'Link có thể cần làm sạch',
      desc: 'Link từ quảng cáo/chia sẻ đôi khi chứa tham số thừa. Thử copy link trực tiếp từ trang sản phẩm.',
    },
  ];

  return (
    <div
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-3xl border bg-white"
      style={{ borderColor: 'var(--border-default)' }}
    >
      {/* Header */}
      <div
        className="px-6 pt-6 pb-5"
        style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 60%)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Icon + title row */}
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: '#f3f4f6' }}
            aria-hidden="true"
          >
            <SearchX className="h-7 w-7" style={{ color: '#6b7280' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold" style={{ color: '#111827' }}>
              Chưa tìm thấy voucher cho sản phẩm này
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: '#6b7280' }}>
              Hệ thống đã quét toàn bộ nguồn khuyến mãi nhưng chưa có mã phù hợp.
            </p>
          </div>
        </div>

        {/* Meta pills: checked time + sources */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Sources scanned */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: '#eef2ff', color: '#4338ca' }}
          >
            <DatabaseZap className="h-3 w-3" aria-hidden="true" />
            Đã quét MasOffer + AccessTrade
          </span>

          {/* Timestamp */}
          {timeLabel && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
            >
              <CalendarClock className="h-3 w-3" aria-hidden="true" />
              Kiểm tra lúc {timeLabel}
            </span>
          )}

          {/* Update schedule */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: '#f0fdf4', color: '#166534' }}
          >
            <Clock className="h-3 w-3" aria-hidden="true" />
            Cập nhật 2 lần/ngày
          </span>
        </div>
      </div>

      {/* Reasons section */}
      <div className="px-6 py-5 space-y-4">
        {/* Why explanation */}
        <div>
          <p
            className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#9ca3af' }}
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Tại sao không tìm thấy?
          </p>
          <div className="space-y-2.5">
            {REASONS.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}
              >
                <span className="text-base flex-shrink-0 mt-0.5" aria-hidden="true">
                  {r.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#374151' }}>
                    {r.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed" style={{ color: '#6b7280' }}>
                    {r.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" style={{ color: '#d97706' }} aria-hidden="true" />
            <span className="text-xs font-semibold" style={{ color: '#92400e' }}>
              Mẹo nhanh
            </span>
          </div>
          <ul className="space-y-1.5" role="list">
            {[
              'Thử sản phẩm cùng danh mục từ shop khác — voucher thường áp dụng theo nhóm ngành.',
              'Quay lại buổi chiều/tối — nhiều deal mới được thêm vào sau 18:00.',
              'Kiểm tra tab Khuyến Mãi trực tiếp trên trang sản phẩm Shopee.',
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

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          {/* Primary: new search */}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f97316',
                boxShadow: '0 2px 12px rgba(249,115,22,0.3)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ea580c'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f97316'; }}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Thử sản phẩm khác
            </button>
          )}

          {/* Secondary CTAs */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/deals/hot"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                padding: '0.625rem 1rem',
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                color: '#c2410c',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ffedd5'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fff7ed'; }}
            >
              <Flame className="h-4 w-4" aria-hidden="true" />
              Deal hot hôm nay
            </Link>
            <Link
              href="/deals"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                padding: '0.625rem 1rem',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                color: '#374151',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'; }}
            >
              <Grid3X3 className="h-4 w-4" aria-hidden="true" />
              Khám phá tất cả deals
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ResultStates({
  variant,
  error,
  onRetry,
  checkedAt,
  className,
}: ResultStatesProps) {
  const handleRetry = useCallback(() => {
    onRetry?.();
  }, [onRetry]);

  // no_match gets its own rich panel
  if (variant === 'no_match') {
    return (
      <div className={clsx(className)}>
        <NoMatchRichPanel onRetry={onRetry} checkedAt={checkedAt} />
      </div>
    );
  }

  const config = STATE_CONFIG[variant];
  const styles = VARIANT_STYLES[config.variant];
  const Icon = config.icon;

  const displayTitle = error?.message && variant === 'error'
    ? error.message
    : config.title;

  return (
    <div
      role="status"
      aria-live="assertive"
      className={clsx('rounded-3xl border bg-white p-6 text-center', className)}
      style={styles.wrapper}
    >
      {/* Icon */}
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
        style={styles.icon}
        aria-hidden="true"
      >
        <Icon className="h-8 w-8" />
      </div>

      {/* Title */}
      <h2 className="mt-4 text-lg font-bold" style={styles.title}>
        {displayTitle}
      </h2>

      {/* Description */}
      <p className="mt-2 text-sm leading-relaxed" style={styles.description}>
        {config.description}
      </p>

      {/* Error code (if available) */}
      {error?.code && (
        <p className="mt-2 font-mono text-xs" style={{ color: 'var(--text-disabled)' }}>
          {error.code}
        </p>
      )}

      {/* Tips */}
      {config.tips.length > 0 && (
        <div
          className="mt-5 rounded-xl border p-4 text-left"
          style={styles.tipWrapper}
        >
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" style={styles.tipIcon} aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider" style={styles.tipText}>
              Mẹo
            </span>
          </div>
          <ul className="space-y-2" role="list">
            {config.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={styles.tipIcon}
                  aria-hidden="true"
                />
                <span style={styles.tipText}>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {onRetry ? (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all active:scale-95"
            style={styles.button}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Thử lại</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ResultStates;
