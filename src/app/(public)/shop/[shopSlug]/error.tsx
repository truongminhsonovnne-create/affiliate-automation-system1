/**
 * Shop Landing Page Error State
 */

'use client';

import { GrowthEmptyState } from '../../../../components/public/growth/GrowthEmptyState.js';
import type { GrowthSurfaceEmptyState } from '../../../../growthPages/types/index.js';

interface ShopErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const shopErrorEmptyState: GrowthSurfaceEmptyState = {
  title: 'Không thể tải trang',
  message: 'Đã xảy ra lỗi khi tải thông tin shop. Vui lòng thử lại.',
  action: {
    type: 'paste_link',
    label: 'Dán link tìm mã',
    href: '/paste-link-find-voucher',
    trackingId: 'shop_error_retry',
  },
};

export default function ShopError({ error, reset }: ShopErrorProps) {
  // In production, you would log the error to an error reporting service
  console.error('Shop page error:', error);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <GrowthEmptyState emptyState={shopErrorEmptyState} />
      </div>
    </div>
  );
}
