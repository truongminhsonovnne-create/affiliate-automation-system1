/**
 * Blog Listing Page — /blog
 *
 * Hiển thị danh sách bài viết SEO từ Supabase.
 * Auto-generated mỗi ngày bởi AI.
 */

import { Suspense } from 'react';
import { BlogPageContent } from './BlogClient';

export const metadata = {
  title: 'Blog SEO - Tin Tức & Hướng Dẫn Mã Giảm Giá',
  description:
    'Blog cập nhật tin tức, hướng dẫn săn deal và mã giảm giá Shopee, Lazada, Tiki. Bài viết được viết và cập nhật tự động mỗi ngày.',
  keywords: [
    'blog mã giảm giá',
    'tin tức Shopee',
    'hướng dẫn săn deal',
    'mẹo mua sắm tiết kiệm',
    'voucher hot',
    'SEO voucher',
  ],
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog SEO - Tin Tức & Hướng Dẫn Mã Giảm Giá',
    description: 'Blog cập nhật tin tức, hướng dẫn săn deal và mã giảm giá Shopee, Lazada, Tiki.',
    url: '/blog',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Blog SEO - Tin Tức & Hướng Dẫn Mã Giảm Giá',
      },
    ],
  },
};

export default function BlogPage() {
  return (
    <Suspense fallback={<BlogLoadingSkeleton />}>
      <BlogPageContent />
    </Suspense>
  );
}

function BlogLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-8" />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-200 h-48" />
              <div className="p-6 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
