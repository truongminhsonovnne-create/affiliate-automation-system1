'use client';

/**
 * Design System — EmptyState
 *
 * Consistent empty state for lists, tables, search results.
 *
 * Usage:
 *   <EmptyState
 *     icon={Inbox}
 *     title="Không có dữ liệu"
 *     description="Thử thay đổi bộ lọc hoặc thêm sản phẩm mới."
 *     action={<Button onClick={handleClear}>Xóa bộ lọc</Button>}
 *   />
 *
 *   // Pre-built variant — just pass the variant + action
 *   <EmptyState variant="search" title="Không tìm thấy kết quả" />
 */

import type { LucideIcon } from 'lucide-react';
import { Inbox, Search, FileX, WifiOff, Package } from 'lucide-react';
import clsx from 'clsx';

export type EmptyStateVariant = 'default' | 'search' | 'error' | 'network' | 'product';

// Pre-configured variants with icon, title, description, and action already set.
// Pass `action` to override or add to the default action.
const VARIANT_CONFIG: Record<
  EmptyStateVariant,
  {
    icon: LucideIcon;
    title: string;
    description: string;
  }
> = {
  default: {
    icon: Inbox,
    title: 'Không có dữ liệu',
    description: 'Nội dung bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.',
  },
  search: {
    icon: Search,
    title: 'Không tìm thấy kết quả',
    description: 'Thử từ khóa khác hoặc điều chỉnh bộ lọc để thu hẹp kết quả.',
  },
  error: {
    icon: FileX,
    title: 'Không thể tải dữ liệu',
    description: 'Đã xảy ra sự cố khi lấy dữ liệu. Vui lòng thử lại.',
  },
  network: {
    icon: WifiOff,
    title: 'Mất kết nối mạng',
    description: 'Không thể kết nối đến máy chủ. Kiểm tra lại kết nối Internet của bạn.',
  },
  product: {
    icon: Package,
    title: 'Chưa có sản phẩm nào',
    description: 'Bắt đầu bằng cách thêm sản phẩm đầu tiên hoặc thay đổi bộ lọc.',
  },
};

export interface EmptyStateProps {
  /** Pre-built variant with default icon, title, and description */
  variant?: EmptyStateVariant;
  /** Override the default icon */
  icon?: LucideIcon;
  /** Title (overrides variant default) */
  title?: string;
  /** Description (overrides variant default) */
  description?: string;
  /** Optional CTA button or link */
  action?: React.ReactNode;
  /** Useful context when a search/filter produced zero results */
  context?: string;
  className?: string;
}

export function EmptyState({
  variant = 'default',
  icon: IconProp,
  title,
  description,
  action,
  context,
  className,
}: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = IconProp ?? config.icon;
  const displayTitle = title ?? config.title;
  const displayDescription = description ?? config.description;

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {/* Icon orbit */}
      <div className="relative mb-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
          <Icon className="h-8 w-8 text-gray-400" aria-hidden="true" />
        </div>
        {/* Decorative ring */}
        <div
          className="absolute -inset-3 rounded-full border-2 border-dashed border-gray-200 -z-10"
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 mb-1">{displayTitle}</h3>

      {/* Context line — shown when filter/search context exists */}
      {context && (
        <p className="text-xs text-gray-400 mb-1">{context}</p>
      )}

      {/* Description */}
      {displayDescription && (
        <p className="text-sm text-gray-500 max-w-sm mb-5 leading-relaxed">
          {displayDescription}
        </p>
      )}

      {/* Action */}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export default EmptyState;
