/**
 * Fashion Deals Page — /deals/thoi-trang
 *
 * Priority: #4 — Large category with strong purchase intent.
 * Targets "áo giảm giá", "quần giảm giá", " giày giảm giá Shopee".
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { CategoryDealsClient } from '../CategoryDealsClient';

export const metadata: Metadata = {
  title: 'Voucher Thời Trang Giảm Giá | VoucherFinder',
  description:
    'Mã giảm giá thời trang: áo, quần, giày, túi xách trên Shopee, Lazada. Giảm đến 50%. Cập nhật liên tục theo đợt sale.',
  keywords: [
    'voucher thời trang',
    'áo giảm giá',
    'quần giảm giá',
    'giày giảm giá Shopee',
    'túi xách giảm giá',
    'mã giảm giá thời trang',
    'khuyến mãi thời trang',
  ],
  alternates: { canonical: '/deals/thoi-trang' },
  openGraph: {
    title: 'Voucher Thời Trang Giảm Giá | VoucherFinder',
    description: 'Mã giảm giá thời trang: áo, quần, giày, túi xách trên Shopee & Lazada.',
    url: '/deals/thoi-trang',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Voucher Thời Trang Giảm Giá' }],
  },
  twitter: {
    card: 'summary',
    title: 'Voucher Thời Trang Giảm Giá | VoucherFinder',
    description: 'Mã giảm giá thời trang trên Shopee & Lazada. Giảm đến 50%.',
    images: ['/og-default.png'],
  },
};

export default function ThoiTrangDealsPage() {
  return (
    <PublicLayout>
      <Suspense>
        <CategoryDealsClient
          platform="shopee"
          categorySlug="thoi-trang"
          heroLabel="Voucher Thời Trang Giảm Giá"
          heroSubtitle="Áo, quần, giày, túi xách và phụ kiện — giảm đến 50%."
          heroAccent="#db2777"
          seoSubtitle="Theo dõi deals theo đợt sale · Miễn phí 100%"
        />
      </Suspense>
    </PublicLayout>
  );
}
