'use client';

/**
 * ResultStates — Feedback states for no-match, invalid link, error, and rate limit.
 * Each state has an illustration, headline, subtext, and optional retry action.
 *
 * Premium card design with variant-specific color system.
 * Uses React.CSSProperties for all dynamic styles (no string-parsing).
 */

import { useCallback } from 'react';
import { type LucideIcon } from 'lucide-react';
import {
  SearchX,
  AlertTriangle,
  WifiOff,
  Clock,
  RefreshCw,
  Lightbulb,
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
    title: 'Không tìm thấy voucher phù hợp',
    description:
      'Hiện tại chưa có mã giảm giá nào cho sản phẩm này. Sản phẩm có thể không nằm trong chương trình khuyến mãi.',
    tips: [
      'Thử sản phẩm khác cùng danh mục.',
      'Quay lại sau — các voucher được cập nhật thường xuyên.',
      'Kiểm tra trang khuyến mãi Shopee trực tiếp.',
    ],
    variant: 'neutral',
  },
  invalid_link: {
    icon: AlertTriangle,
    title: 'Link không hợp lệ',
    description:
      'Vui lòng nhập link sản phẩm Shopee đúng định dạng. Link phải bắt đầu bằng https://shopee.vn/',
    tips: [
      'Sao chép trực tiếp từ ứng dụng Shopee.',
      'Đảm bảo link chứa đường dẫn sản phẩm, không phải trang tìm kiếm.',
      'Ví dụ: https://shopee.vn/tai-nghe-bluetooth-i.123456.7890123456',
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
// Main Component
// =============================================================================

export function ResultStates({
  variant,
  error,
  onRetry,
  className,
}: ResultStatesProps) {
  const config = STATE_CONFIG[variant];
  const styles = VARIANT_STYLES[config.variant];
  const Icon = config.icon;

  const displayTitle = error?.message && variant === 'error'
    ? error.message
    : config.title;

  const handleRetry = useCallback(() => {
    onRetry?.();
  }, [onRetry]);

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

      {/* Retry button */}
      {onRetry && (
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
      )}
    </div>
  );
}

export default ResultStates;
