/**
 * Public Homepage - Server Component
 *
 * Contains SEO metadata and structured data (JSON-LD)
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { HomePageClient } from './HomePageClient';

export const metadata: Metadata = {
  title: 'Tìm Mã Giảm Giá Shopee - Dán Link Tự Động',
  description: 'Công cụ tìm mã giảm giá Shopee nhanh nhất. Dán link sản phẩm để tự động tìm và áp dụng mã giảm giá tốt nhất. Miễn phí, không cần đăng nhập.',
  openGraph: {
    title: 'Tìm Mã Giảm Giá Shopee - Dán Link Tự Động',
    description: 'Công cụ tìm mã giảm giá Shopee nhanh nhất. Dán link sản phẩm để tự động tìm mã giảm giá.',
    type: 'website',
  },
};

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://voucherfinder.app';

// JSON-LD Structured Data for SEO
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Shopee Voucher Finder',
  alternateName: 'Tìm Mã Giảm Giá Shopee',
  description: 'Công cụ tìm mã giảm giá Shopee nhanh nhất. Dán link sản phẩm để tự động tìm và áp dụng mã giảm giá tốt nhất.',
  url: baseUrl,
  applicationCategory: 'ShoppingApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'VND',
  },
  author: {
    '@type': 'Organization',
    name: 'Shopee Voucher Finder',
    url: baseUrl,
  },
};

export default function PublicHomePage() {
  return (
    <>
      {/* Structured Data (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* SEO Content - rendered server-side for crawlers */}
      <div className="hidden">
        <h1>Tìm mã giảm giá Shopee miễn phí</h1>
        <p>Công cụ tự động tìm và áp dụng mã giảm giá Shopee tốt nhất. Không cần đăng nhập, không phí.</p>

        <h2>Cách sử dụng</h2>
        <ol>
          <li>Dán link sản phẩm Shopee vào ô tìm kiếm</li>
          <li>Hệ thống tự động tìm mã giảm giá tốt nhất</li>
          <li>Sao chép mã và áp dụng khi thanh toán</li>
        </ol>

        <nav>
          <Link href="/paste-link-find-voucher">Hướng dẫn sử dụng chi tiết</Link>
          <Link href="/how-it-works">Cách tìm mã giảm giá</Link>
          <Link href="/voucher-checker">Kiểm tra mã giảm giá</Link>
        </nav>
      </div>

      {/* Interactive Client Component */}
      <HomePageClient />
    </>
  );
}
