/**
 * Expiring Deals Page — /deals/expiring
 *
 * Server component — exports metadata only.
 */

import { Suspense } from 'react';
import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { ExpiringDealsContent } from './ExpiringDealsClient';

export const metadata = {
  title: 'Deal Sắp Hết Hạn | VoucherFinder',
  description:
    'Những voucher và deal sắp hết hạn trong 7 ngày tới. Nhanh tay kẻo hết! Cập nhật liên tục.',
  keywords: ['deal sắp hết hạn', 'voucher hết hạn', 'coupon sắp hết', 'flash sale'],
  alternates: { canonical: '/deals/expiring' },
  openGraph: {
    title: 'Deal Sắp Hết Hạn | VoucherFinder',
    description: 'Những voucher và deal sắp hết hạn trong 7 ngày tới. Nhanh tay kẻo hết!',
    url: '/deals/expiring',
    type: 'website',
  },
};

export default function ExpiringDealsPage() {
  return (
    <PublicLayout>
      <Suspense>
        <ExpiringDealsContent />
      </Suspense>
    </PublicLayout>
  );
}
