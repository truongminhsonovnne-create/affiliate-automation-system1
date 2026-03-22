/**
 * Public Layout
 *
 * Server-side layout with SEO metadata for all public pages
 * Note: Individual pages handle their own shell (PublicShell) for flexibility
 */

import { Metadata } from 'next';
import { JsonLd, createWebSiteSchema, createOrganizationSchema } from '../../components/public/seo/JsonLd.js';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://voucherfinder.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Tìm Mã Giảm Giá Shopee - Dán Link Tự Động',
    template: '%s | Shopee Voucher Finder',
  },
  description: 'Công cụ tìm mã giảm giá Shopee nhanh nhất. Dán link sản phẩm để tự động tìm và áp dụng mã giảm giá tốt nhất. Miễn phí, không cần đăng nhập.',
  keywords: ['mã giảm giá Shopee', 'voucher Shopee', 'giảm giá Shopee', 'khuyến mãi Shopee', 'deal Shopee'],
  authors: [{ name: 'Shopee Voucher Finder' }],
  creator: 'Shopee Voucher Finder',
  publisher: 'Shopee Voucher Finder',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: '/',
    siteName: 'Shopee Voucher Finder',
    title: 'Tìm Mã Giảm Giá Shopee - Dán Link Tự Động',
    description: 'Công cụ tìm mã giảm giá Shopee nhanh nhất. Dán link sản phẩm để tự động tìm và áp dụng mã giảm giá tốt nhất.',
    images: [
      {
        url: '/og-default.svg',
        width: 1200,
        height: 630,
        alt: 'Shopee Voucher Finder - Tìm mã giảm giá Shopee miễn phí',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tìm Mã Giảm Giá Shopee - Dán Link Tự Động',
    description: 'Công cụ tìm mã giảm giá Shopee nhanh nhất. Dán link sản phẩm để tự động tìm mã giảm giá.',
    images: ['/og-default.svg'],
    creator: '@shopee_voucher',
  },
  alternates: {
    canonical: '/',
    languages: {
      'vi': '/',
    },
  },
  category: 'shopping',
  classification: 'Tools',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Global structured data for all pages
  const webSiteSchema = createWebSiteSchema(baseUrl);
  const organizationSchema = createOrganizationSchema(baseUrl);

  return (
    <>
      {/* Global Structured Data */}
      <JsonLd data={webSiteSchema} />
      <JsonLd data={organizationSchema} />
      {children}
    </>
  );
}
