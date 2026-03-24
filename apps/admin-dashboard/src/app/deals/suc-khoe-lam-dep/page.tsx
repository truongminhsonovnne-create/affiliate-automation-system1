/**
 * Health & Beauty Deals Page — /deals/suc-khoe-lam-dep
 *
 * Priority: #5 — Growing category, high purchase frequency.
 * Targets "kem chống nắng giảm giá", "son giảm giá", "thực phẩm chức năng khuyến mãi".
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { CategoryDealsClient } from '../CategoryDealsClient';

export const metadata: Metadata = {
  title: 'Voucher Sức Khỏe & Làm Đẹp Giảm Giá',
  description:
    'Mã giảm giá sức khỏe, làm đẹp: kem chống nắng, son, thực phẩm chức năng, vitamin trên Shopee, Lazada. Giảm đến 40%.',
  keywords: [
    'voucher sức khỏe',
    'voucher làm đẹp',
    'kem chống nắng giảm giá',
    'son môi giảm giá',
    'thực phẩm chức năng khuyến mãi',
    'voucher skincare',
    'mỹ phẩm giảm giá Shopee',
  ],
  alternates: { canonical: '/deals/suc-khoe-lam-dep' },
  openGraph: {
    title: 'Voucher Sức Khỏe & Làm Đẹp Giảm Giá',
    description: 'Mã giảm giá kem chống nắng, son, thực phẩm chức năng trên Shopee & Lazada.',
    url: '/deals/suc-khoe-lam-dep',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Voucher Sức Khỏe & Làm Đẹp Giảm Giá' }],
  },
  twitter: {
    card: 'summary',
    title: 'Voucher Sức Khỏe & Làm Đẹp Giảm Giá',
    description: 'Mã giảm giá sức khỏe và làm đẹp trên Shopee & Lazada.',
    images: ['/og-default.png'],
  },
};

export default function SucKhoeDealsPage() {
  return (
    <PublicLayout>
      <Suspense>
        <CategoryDealsClient
          platform="shopee"
          categorySlug="suc-khoe-lam-dep"
          heroLabel="Voucher Sức Khỏe & Làm Đẹp"
          heroSubtitle="Kem chống nắng, son, thực phẩm chức năng, vitamin — giảm đến 40%."
          heroAccent="#16a34a"
          seoSubtitle="Cập nhật theo đợt sale · Miễn phí 100%"
        />
      </Suspense>
    </PublicLayout>
  );
}
