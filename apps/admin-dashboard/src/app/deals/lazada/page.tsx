/**
 * Lazada Deals Page — /deals/lazada
 *
 * Priority: #2 — Expands platform coverage.
 * Targets keyword "voucher Lazada", "deal Lazada".
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { CategoryDealsClient } from '../CategoryDealsClient';

export const metadata: Metadata = {
  title: 'Voucher & Deal Lazada Hôm Nay | VoucherFinder',
  description:
    'Tổng hợp mã giảm giá, voucher Lazada và deal hot nhất hôm nay. Cập nhật liên tục. Miễn phí, không cần đăng nhập.',
  keywords: [
    'voucher Lazada',
    'deal Lazada',
    'mã giảm giá Lazada',
    'coupon Lazada',
    'khuyến mãi Lazada',
    'Lazada sale',
    'free ship Lazada',
  ],
  alternates: { canonical: '/deals/lazada' },
  openGraph: {
    title: 'Voucher & Deal Lazada Hôm Nay | VoucherFinder',
    description: 'Tổng hợp mã giảm giá và deal Lazada hot nhất. Cập nhật liên tục.',
    url: '/deals/lazada',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Voucher & Deal Lazada Hôm Nay' }],
  },
  twitter: {
    card: 'summary',
    title: 'Voucher & Deal Lazada Hôm Nay | VoucherFinder',
    description: 'Mã giảm giá và deal Lazada hot nhất hôm nay.',
    images: ['/og-default.png'],
  },
};

export default function LazadaDealsPage() {
  return (
    <PublicLayout>
      <Suspense>
        <CategoryDealsClient
          platform="lazada"
          categorySlug="all"
          heroLabel="Deals & Voucher Lazada"
          heroSubtitle="Tổng hợp mã giảm giá, voucher và deal hot từ Lazada."
          heroAccent="#0f1472"
          seoSubtitle="Cập nhật liên tục · Miễn phí 100% · Không cần đăng nhập"
        />
      </Suspense>
    </PublicLayout>
  );
}
