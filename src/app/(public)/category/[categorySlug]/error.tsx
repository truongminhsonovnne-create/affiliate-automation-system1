/**
 * Category Landing Page Error State
 */

'use client';

import { GrowthEmptyState } from '../../../../components/public/growth/GrowthEmptyState.js';
import type { GrowthSurfaceEmptyState } from '../../../../growthPages/types/index.js';

interface CategoryErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const categoryErrorEmptyState: GrowthSurfaceEmptyState = {
  title: 'Không thể tải trang',
  message: 'Đã xảy ra lỗi khi tải thông tin danh mục. Vui lòng thử lại.',
  action: {
    type: 'paste_link',
    label: 'Dán link tìm mã',
    href: '/paste-link-find-voucher',
    trackingId: 'category_error_retry',
  },
};

export default function CategoryError({ error, reset }: CategoryErrorProps) {
  // In production, you would log the error to an error reporting service
  console.error('Category page error:', error);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <GrowthEmptyState emptyState={categoryErrorEmptyState} />
      </div>
    </div>
  );
}
