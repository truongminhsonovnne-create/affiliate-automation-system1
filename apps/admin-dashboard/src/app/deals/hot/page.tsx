/**
 * Hot Deals Page — /deals/hot
 *
 * Server component — exports metadata only.
 */

import { Suspense } from 'react';
import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { HotDealsContent } from './HotDealsClient';

export const metadata = {
  title: 'Deal Hot Hôm Nay | VoucherFinder',
  description:
    'Những deal được nhiều người dùng nhất hôm nay. Coupon, voucher, freeship Shopee, Lazada, Tiki hot nhất.',
  keywords: ['deal hot', 'coupon hot', 'voucher hot', 'shopee hot', 'deals hot today'],
  alternates: { canonical: '/deals/hot' },
  openGraph: {
    title: 'Deal Hot Hôm Nay | VoucherFinder',
    description: 'Những deal được nhiều người dùng nhất hôm nay.',
    url: '/deals/hot',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'VoucherFinder — Deal Hot Hôm Nay',
      },
    ],
  },
};

export default function HotDealsPage() {
  return (
    <PublicLayout>
      <Suspense>
        <HotDealsContent />
      </Suspense>
    </PublicLayout>
  );
}
