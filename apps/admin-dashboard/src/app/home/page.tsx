/**
 * Public Home Page — /home
 *
 * The primary end-user landing page.
 * User flow: paste link → get best voucher → copy code → go to Shopee.
 *
 * No auth required. Optimized for speed and minimal cognitive load.
 */

import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { VoucherResolverPageNew } from '@/components/public/VoucherResolverPageNew';
import { HistoryProvider } from '@/lib/public/useHistory';

export const metadata = {
  title: 'Tìm Mã Giảm Giá Shopee Miễn Phí',
  description:
    'Dán link sản phẩm Shopee để tìm mã giảm giá tốt nhất. Nhanh, miễn phí, không quảng cáo. Không cần đăng nhập.',
  keywords: [
    'tìm mã giảm giá Shopee',
    'voucher Shopee miễn phí',
    'mã free ship Shopee',
    'coupon Shopee',
    'khuyến mãi Shopee',
  ],

  // Canonical — this is the primary public entry point
  alternates: {
    canonical: '/home',
  },

  openGraph: {
    title: 'Tìm Mã Giảm Giá Shopee Miễn Phí | VoucherFinder',
    description: 'Dán link sản phẩm Shopee để tìm mã giảm giá tốt nhất. Nhanh, miễn phí, không quảng cáo.',
    url: '/home',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'VoucherFinder — Tìm mã giảm giá Shopee miễn phí',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Tìm Mã Giảm Giá Shopee Miễn Phí | VoucherFinder',
    description: 'Dán link sản phẩm Shopee để tìm mã giảm giá tốt nhất.',
    images: ['/og-default.png'],
  },
};

export default function HomePage() {
  return (
    <PublicLayout>
      <HistoryProvider>
        <VoucherResolverPageNew />
      </HistoryProvider>
    </PublicLayout>
  );
}
