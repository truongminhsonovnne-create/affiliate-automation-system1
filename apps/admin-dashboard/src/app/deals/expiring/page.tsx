/**
 * Expiring Deals Page — /deals/expiring
 *
 * Server component — exports metadata only.
 */

import { Suspense } from 'react';
import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { ExpiringDealsContent } from './ExpiringDealsClient';

export const metadata = {
  title: 'Deal Sắp Hết Hạn',
  description:
    'Những voucher và deal sắp hết hạn trong 7 ngày tới. Nhanh tay kẻo hết! Cập nhật liên tục.',
  keywords: ['deal sắp hết hạn', 'voucher hết hạn', 'coupon sắp hết', 'flash sale'],
  alternates: { canonical: '/deals/expiring' },
  openGraph: {
    title: 'Deal Sắp Hết Hạn',
    description: 'Những voucher và deal sắp hết hạn trong 7 ngày tới. Nhanh tay kẻo hết!',
    url: '/deals/expiring',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'VoucherFinder — Deal Sắp Hết Hạn',
      },
    ],
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
