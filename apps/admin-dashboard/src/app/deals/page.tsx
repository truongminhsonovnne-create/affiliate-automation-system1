/**
 * Deals Hub Page — /deals
 *
 * Server component — exports metadata only.
 * All UI logic lives in DealsHubClient.tsx.
 */

import { Suspense } from 'react';
import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { DealsPageContent } from './DealsHubClient';

export const metadata = {
  title: 'Khám Phá Deals & Voucher Tốt Nhất | VoucherFinder',
  description:
    'Tổng hợp mã giảm giá, voucher và deal hot từ Shopee, Lazada, Tiki, Tiktok. Cập nhật liên tục, miễn phí 100%.',
  keywords: [
    'deal Shopee',
    'voucher Shopee',
    'mã giảm giá',
    'coupon Shopee',
    'khuyến mãi Shopee',
    'deals hot',
    'voucher Lazada',
    'voucher Tiki',
  ],
  alternates: { canonical: '/deals' },
  openGraph: {
    title: 'Khám Phá Deals & Voucher Tốt Nhất | VoucherFinder',
    description: 'Tổng hợp mã giảm giá, voucher và deal hot từ Shopee, Lazada, Tiki, Tiktok.',
    url: '/deals',
    type: 'website',
  },
};

export default function DealsPage() {
  return (
    <PublicLayout>
      <Suspense>
        <DealsPageContent />
      </Suspense>
    </PublicLayout>
  );
}
