/**
 * Laptop Deals Page — /deals/laptop
 *
 * Priority: #6 — High-value category, strong purchase intent.
 * Targets "laptop giảm giá", "macbook giảm giá", "mã giảm giá laptop Shopee".
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { CategoryDealsClient } from '../CategoryDealsClient';

export const metadata: Metadata = {
  title: 'Voucher Laptop Giảm Giá',
  description:
    'Mã giảm giá laptop: MacBook, ASUS, Dell, HP, Lenovo trên Shopee, Lazada. Cập nhật theo đợt sale, giảm đến 30%.',
  keywords: [
    'voucher laptop',
    'laptop giảm giá',
    'macbook giảm giá',
    'ASUS giảm giá',
    'mã giảm giá laptop',
    'khuyến mãi laptop',
    'mua laptop tiết kiệm',
  ],
  alternates: { canonical: '/deals/laptop' },
  openGraph: {
    title: 'Voucher Laptop Giảm Giá',
    description: 'Mã giảm giá laptop MacBook, ASUS, Dell, HP, Lenovo trên Shopee & Lazada.',
    url: '/deals/laptop',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Voucher Laptop Giảm Giá' }],
  },
  twitter: {
    card: 'summary',
    title: 'Voucher Laptop Giảm Giá',
    description: 'Mã giảm giá laptop trên Shopee & Lazada. Giảm đến 30%.',
    images: ['/og-default.png'],
  },
};

export default function LaptopDealsPage() {
  return (
    <PublicLayout>
      <Suspense>
        <CategoryDealsClient
          platform="shopee"
          categorySlug="laptop"
          heroLabel="Voucher Laptop Giảm Giá"
          heroSubtitle="MacBook, ASUS, Dell, HP, Lenovo — giảm đến 30% theo đợt sale."
          heroAccent="#7c3aed"
          seoSubtitle="Cập nhật theo đợt sale Shopee · Miễn phí 100%"
        />
      </Suspense>
    </PublicLayout>
  );
}
