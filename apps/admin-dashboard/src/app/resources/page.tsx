/**
 * Resources Hub — /resources
 *
 * Central content hub listing all articles, guides, and tips.
 * Designed to show the site is an active content publisher — not just a tool page.
 */

import Link from 'next/link';
import { PublicLayout } from '@/components/public';
import { ArticleCard } from '@/components/public/ArticleCard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tài nguyên — Mẹo săn sale Shopee & hướng dẫn sử dụng',
  description:
    'Tổng hợp bài viết, hướng dẫn, và mẹo hay về săn sale Shopee, cách dùng voucher hiệu quả, và cách mua sắm thông minh trên Shopee Việt Nam.',
  keywords: [
    'mẹo Shopee',
    'hướng dẫn Shopee',
    'săn sale Shopee',
    'voucher Shopee',
    'tài nguyên',
  ],

  alternates: {
    canonical: '/resources',
  },

  openGraph: {
    title: 'Tài nguyên — Mẹo săn sale Shopee | VoucherFinder',
    description:
      'Bài viết, hướng dẫn, và mẹo hay về săn sale Shopee, cách dùng voucher hiệu quả, và mua sắm thông minh trên Shopee Việt Nam.',
    url: '/resources',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: 'Tài nguyên | VoucherFinder',
    description: 'Mẹo săn sale Shopee, hướng dẫn sử dụng voucher, và cách mua sắm thông minh.',
  },
};

const ARTICLES = [
  {
    href: '/resources/huong-dan-san-sale-shopee-2026',
    title: 'Hướng dẫn săn sale Shopee 2026 — Từ A đến Z',
    description:
      'Tổng hợp tất cả các đợt sale lớn trên Shopee năm 2026, thời gian diễn ra, và cách săn được mã giảm giá tốt nhất cho từng đợt.',
    category: 'Săn Sale',
    readTime: 8,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/cac-loai-voucher-shopee',
    title: 'Các loại voucher Shopee — Phân biệt và cách sử dụng',
    description:
      'Shopee Free Ship, voucher shop, mã giảm giá toàn sàn — bạn đã biết cách phân biệt và dùng đúng từng loại chưa? Hướng dẫn chi tiết từng loại.',
    category: 'Kiến Thức',
    readTime: 5,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/cach-chon-voucher-phu-hop',
    title: 'Cách chọn voucher phù hợp — Tránh lãng phí tiền',
    description:
      'Không phải mã nào cũng tốt. Hướng dẫn cách đọc điều kiện voucher (đơn tối thiểu, danh mục, hạn sử dụng) để chọn đúng mã cho giỏ hàng của bạn.',
    category: 'Mẹo Hay',
    readTime: 6,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/chuong-trinh-khuyen-mai-shopee',
    title: 'Tổng quan các chương trình khuyến mãi trên Shopee',
    description:
      'Flash Sale, 9.9, 11.11, 12.12 — mỗi đợt sale có đặc điểm gì khác nhau, nên mua gì vào lúc nào và cách chuẩn bị để săn được giá tốt nhất.',
    category: 'Săn Sale',
    readTime: 7,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/meo-uu-dai-shopee-2026',
    title: '10 mẹo tối ưu ưu đãi Shopee năm 2026',
    description:
      'Những cách ít người biết để tiết kiệm thêm khi mua sắm trên Shopee — từ cách xếp đơn hàng, kết hợp mã giảm giá, đến thời điểm đặt hàng tốt nhất.',
    category: 'Mẹo Hay',
    readTime: 7,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/hoi-dap-voucher-shopee',
    title: 'Giải đáp 15 câu hỏi thường gặp về voucher Shopee',
    description:
      'Hết hạn khi nào? Dùng được cho đơn nào? Tại sao mã không áp dụng? Điều kiện đơn hàng là gì? Tất tần tật câu hỏi thực tế được trả lời chi tiết.',
    category: 'Hỏi & Đáp',
    readTime: 6,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/ma-giam-gia-va-free-ship',
    title: 'Voucher giảm giá và mã Free Ship — Dùng thế nào cho hiệu quả?',
    description:
      'Hướng dẫn cách kết hợp mã giảm giá với chương trình Free Ship để tối ưu tổng ưu đãi. Cả hai loại mã đều có thể dùng cùng lúc — nếu bạn biết cách.',
    category: 'Kiến Thức',
    readTime: 5,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/mua-dien-thoai-tiet-kiem',
    title: 'Cách mua điện thoại giá tốt nhất trên Shopee',
    description:
      'So sánh các đợt sale cho điện thoại, cách chọn thời điểm mua, cách chọn cấu hình, và mẹo kết hợp voucher để tiết kiệm tối đa khi mua smartphone.',
    category: 'Hướng dẫn',
    readTime: 9,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/san-giay-chinh-hang',
    title: 'Săn giày chính hãng giá tốt — Kinh nghiệm thực tế',
    description:
      'Cách phân biệt giày chính hãng trên Shopee, thời điểm sale tốt nhất, cách kiểm tra giấy tờ, và mẹo dùng voucher để mua giày Nike, Adidas, New Balance với giá hời.',
    category: 'Hướng dẫn',
    readTime: 8,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/uu-dai-thuong-hieu',
    title: 'Ưu đãi thương hiệu trên Shopee — Lưu ý trước khi mua',
    description:
      'Nhiều thương hiệu có chương trình giảm giá riêng trên Shopee. Hướng dẫn cách tìm các ưu đãi này và kết hợp với mã voucher sàn để tiết kiệm thêm.',
    category: 'Mẹo Hay',
    readTime: 6,
    date: 'Tháng 3, 2026',
  },
];

const CATEGORIES = ['Tất cả', 'Săn Sale', 'Mẹo Hay', 'Kiến Thức', 'Hướng dẫn', 'Hỏi & Đáp'];

export default function ResourcesPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        {/* Page header */}
        <div className="mb-10 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Tài nguyên
          </h1>
          <p className="mt-3 text-sm text-gray-500 leading-relaxed sm:text-base">
            Bài viết, hướng dẫn, và mẹo hay về săn sale Shopee — từ cách
            dùng voucher hiệu quả đến kinh nghiệm mua sắm thông minh trên
            Shopee Việt Nam.
          </p>
        </div>

        {/* Category filter — visual only, all articles shown */}
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat, i) => (
            <span
              key={cat}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-default ${
                i === 0
                  ? 'bg-brand-500 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-brand-200 hover:text-brand-600 cursor-pointer'
              }`}
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Articles grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ARTICLES.map((article) => (
            <ArticleCard key={article.href} {...article} />
          ))}
        </div>

        {/* Tool CTA */}
        <div className="not-prose mt-12 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-orange-50 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-900">
                Đã sẵn sàng tìm mã giảm giá Shopee?
              </p>
              <p className="mt-1 text-xs text-brand-700/80">
                Dán link sản phẩm bất kỳ, nhận mã voucher tốt nhất trong vài giây.
                Miễn phí, không quảng cáo.
              </p>
            </div>
            <Link
              href="/home"
              className="flex-shrink-0 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-brand-sm transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 whitespace-nowrap"
            >
              Tìm mã ngay
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
