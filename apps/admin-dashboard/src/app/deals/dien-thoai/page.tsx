/**
 * Smartphone Deals Page — /deals/dien-thoai
 *
 * Priority: #3 — High CPC category, strong keyword "điện thoại giảm giá".
 * Targets "mã giảm giá điện thoại", "voucher smartphone", "iPhone giảm giá Shopee".
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { CategoryDealsClient } from '../CategoryDealsClient';

export const metadata: Metadata = {
  title: 'Voucher Điện Thoại Giảm Giá',
  description:
    'Tổng hợp mã giảm giá cho điện thoại: iPhone, Samsung, Xiaomi, OPPO trên Shopee, Lazada. Cập nhật liên tục. Miễn phí, không cần đăng nhập.',
  keywords: [
    'voucher điện thoại',
    'điện thoại giảm giá',
    'iPhone giảm giá',
    'Samsung giảm giá',
    'mã giảm giá điện thoại',
    'voucher smartphone',
    'mua điện thoại tiết kiệm',
    'khuyến mãi điện thoại',
  ],
  alternates: { canonical: '/deals/dien-thoai' },
  openGraph: {
    title: 'Voucher Điện Thoại Giảm Giá',
    description: 'Mã giảm giá iPhone, Samsung, Xiaomi, OPPO trên Shopee & Lazada.',
    url: '/deals/dien-thoai',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Voucher Điện Thoại Giảm Giá' }],
  },
  twitter: {
    card: 'summary',
    title: 'Voucher Điện Thoại Giảm Giá',
    description: 'Mã giảm giá điện thoại iPhone, Samsung, Xiaomi trên Shopee & Lazada.',
    images: ['/og-default.png'],
  },
};

export default function DienThoaiDealsPage() {
  return (
    <PublicLayout>
      <Suspense>
        <CategoryDealsClient
          platform="shopee"
          categorySlug="dien-thoai"
          heroLabel="Voucher Điện Thoại Giảm Giá"
          heroSubtitle="Mã giảm giá iPhone, Samsung, Xiaomi, OPPO và các thương hiệu phổ biến."
          heroAccent="#2563eb"
          seoSubtitle="Cập nhật liên tục theo đợt sale · Miễn phí 100%"
        />
      </Suspense>
    </PublicLayout>
  );
}
