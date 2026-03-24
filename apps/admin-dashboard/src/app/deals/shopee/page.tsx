/**
 * Shopee Deals Page — /deals/shopee
 *
 * Priority: #1 — Shopee is 90%+ of traffic.
 * Targets keyword "voucher Shopee", "deal Shopee hôm nay".
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { CategoryDealsClient } from '../CategoryDealsClient';

export const metadata: Metadata = {
  title: 'Voucher & Deal Shopee Hôm Nay',
  description:
    'Tổng hợp mã giảm giá, voucher Shopee và deal hot nhất hôm nay. Cập nhật liên tục 2 lần/ngày. Miễn phí, không cần đăng nhập.',
  keywords: [
    'voucher Shopee',
    'deal Shopee',
    'mã giảm giá Shopee',
    'coupon Shopee',
    'khuyến mãi Shopee hôm nay',
    'Shopee sale',
    'free ship Shopee',
  ],
  alternates: { canonical: '/deals/shopee' },
  openGraph: {
    title: 'Voucher & Deal Shopee Hôm Nay',
    description: 'Tổng hợp mã giảm giá và deal Shopee hot nhất. Cập nhật liên tục.',
    url: '/deals/shopee',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Voucher & Deal Shopee Hôm Nay' }],
  },
  twitter: {
    card: 'summary',
    title: 'Voucher & Deal Shopee Hôm Nay',
    description: 'Mã giảm giá và deal Shopee hot nhất hôm nay.',
    images: ['/og-default.png'],
  },
};

export default function ShopeeDealsPage() {
  return (
    <PublicLayout>
      <Suspense>
        <CategoryDealsClient
          platform="shopee"
          categorySlug="all"
          heroLabel="Deals & Voucher Shopee"
          heroSubtitle="Tổng hợp mã giảm giá, voucher và deal hot từ Shopee."
          heroAccent="#ee4d2d"
          seoSubtitle="Cập nhật liên tục · Miễn phí 100% · Không cần đăng nhập"
        />
      </Suspense>
    </PublicLayout>
  );
}
