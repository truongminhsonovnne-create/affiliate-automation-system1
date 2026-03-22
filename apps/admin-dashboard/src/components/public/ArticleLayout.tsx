'use client';

/**
 * ArticleLayout — Full editorial layout for long-form content / blog / resource pages.
 *
 * Differences from InfoPageLayout:
 *   - Wider max-width (prose-optimized for reading)
 *   - Shows article metadata (category, date, read time, author)
 *   - Has a table of contents / reading progress indicator placeholder
 *   - Includes a "related articles" / CTA section
 *   - Breadcrumb links back to /resources
 *
 * Usage:
 *   <ArticleLayout category="Hướng dẫn" readTime={6} date="Tháng 3, 2026">
 *     <Prose>...</Prose>
 *     <ArticleCTA />   ← CTA section at bottom
 *   </ArticleLayout>
 */

import { useEffect } from 'react';
import { PublicLayout } from './PublicLayout';
import { Clock, Calendar, Tag, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { useAnalytics } from '@/lib/public/analytics-context';

export interface ArticleLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  category: string;
  readTime: number;
  date: string;
  /** Optional author name override */
  author?: string;
  /** Used for related-articles filtering and article_view tracking */
  slug?: string;
}

export function ArticleLayout({
  children,
  title,
  description,
  category,
  readTime,
  date,
  author = 'VoucherFinder',
  slug = '',
}: ArticleLayoutProps) {
  const { trackEvent } = useAnalytics();

  // ── Track: article_view (once per mount) ─────────────────────────────
  useEffect(() => {
    if (!slug) return;
    trackEvent('article_view', { articleSlug: slug, articleTitle: title, readTime });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Đường dẫn" className="mb-6">
          <ol className="flex items-center gap-1.5 text-xs text-gray-400">
            <li>
              <Link href="/home" className="hover:text-brand-600 transition-colors">
                Trang chủ
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3 w-3" />
            </li>
            <li>
              <Link href="/resources" className="hover:text-brand-600 transition-colors">
                Tài nguyên
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3 w-3" />
            </li>
            <li>
              <span className="text-gray-500" aria-current="page">
                {category}
              </span>
            </li>
          </ol>
        </nav>

        {/* Article header */}
        <header className="mb-8">
          {/* Category */}
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
            <Tag className="h-3 w-3" aria-hidden="true" />
            {category}
          </span>

          {/* Title */}
          <h1 className="text-2xl font-bold leading-snug text-gray-900 sm:text-3xl sm:leading-tight">
            {title}
          </h1>

          {/* Description / lede */}
          {description && (
            <p className="mt-3 text-base text-gray-500 leading-relaxed sm:text-lg">
              {description}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {readTime} phút đọc
            </span>
            <span>Viết bởi {author}</span>
          </div>
        </header>

        {/* Article body */}
        <Prose>{children}</Prose>

        {/* Bottom CTA */}
        <ArticleCTA articleSlug={slug} />
      </div>
    </PublicLayout>
  );
}

/**
 * ArticleCTA — Call-to-action block shown at the end of every article.
 * Encourages the reader to try the tool without being pushy.
 */
export function ArticleCTA({ articleSlug = '' }: { articleSlug?: string }) {
  const { trackEvent } = useAnalytics();

  return (
    <div className="not-prose mt-10 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-orange-50 p-6 sm:p-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-900">
            Đã sẵn sàng tìm mã giảm giá Shopee?
          </p>
          <p className="mt-1 text-xs text-brand-700/80">
            Dán link sản phẩm, nhận mã voucher tốt nhất trong vài giây — miễn phí.
          </p>
        </div>
        <Link
          href="/home"
          onClick={() => trackEvent('article_cta_click', { articleSlug, ctaVariant: 'bottom' })}
          className="flex-shrink-0 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-brand-sm transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          Tìm mã ngay
        </Link>
      </div>
    </div>
  );
}

/**
 * RelatedArticles — Horizontal scrollable list of related article cards.
 * In production, this would be populated dynamically from a CMS.
 * Here we hardcode the full list and filter by current slug.
 */
export interface RelatedArticle {
  href: string;
  title: string;
  description: string;
  category: string;
  readTime: number;
  date: string;
}

const ALL_ARTICLES: RelatedArticle[] = [
  {
    href: '/resources/huong-dan-san-sale-shopee-2026',
    title: 'Hướng dẫn săn sale Shopee 2026 — Từ A đến Z',
    description: 'Tổng hợp tất cả các đợt sale lớn trên Shopee năm 2026, thời gian diễn ra, và cách săn được mã giảm giá tốt nhất.',
    category: 'Săn Sale',
    readTime: 8,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/cach-chon-voucher-phu-hop',
    title: 'Cách chọn voucher phù hợp — Tránh lãng phí tiền',
    description: 'Không phải mã nào cũng tốt. Hướng dẫn cách đọc điều kiện voucher để chọn đúng mã cho giỏ hàng của bạn.',
    category: 'Mẹo Hay',
    readTime: 6,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/cac-loai-voucher-shopee',
    title: 'Các loại voucher Shopee — Phân biệt và cách sử dụng',
    description: 'Shopee Free Ship, voucher shop, mã giảm giá toàn sàn — bạn đã biết cách phân biệt và dùng đúng từng loại chưa?',
    category: 'Kiến Thức',
    readTime: 5,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/meo-uu-dai-shopee-2026',
    title: '10 mẹo tối ưu ưu đãi Shopee năm 2026',
    description: 'Những cách ít người biết để tiết kiệm thêm khi mua sắm trên Shopee — từ xếp đơn đến kết hợp mã giảm giá.',
    category: 'Mẹo Hay',
    readTime: 7,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/hoi-dap-voucher-shopee',
    title: 'Giải đáp 15 câu hỏi thường gặp về voucher Shopee',
    description: 'Hết hạn khi nào? Dùng được cho đơn nào? Tại sao mã không áp dụng? Tất tần tật câu hỏi thực tế được trả lời.',
    category: 'Hỏi & Đáp',
    readTime: 6,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/mua-dien-thoai-tiet-kiem',
    title: 'Cách mua điện thoại giá tốt nhất trên Shopee',
    description: 'So sánh các đợt sale, cách chọn thời điểm mua, và mẹo kết hợp voucher để tiết kiệm tối đa khi mua smartphone.',
    category: 'Hướng dẫn',
    readTime: 9,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/ma-giam-gia-va-free-ship',
    title: 'Voucher giảm giá và mã Free Ship — Dùng thế nào cho hiệu quả?',
    description: 'Hướng dẫn cách kết hợp mã giảm giá với chương trình Free Ship để tối ưu tổng ưu đãi khi đặt hàng.',
    category: 'Kiến Thức',
    readTime: 5,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/san-giay-chinh-hang',
    title: 'Săn giày chính hãng giá tốt — Kinh nghiệm thực tế',
    description: 'Cách phân biệt giày chính hãng, thời điểm sale tốt nhất, và cách dùng voucher để mua giày Nike, Adidas, Puma với giá hời.',
    category: 'Hướng dẫn',
    readTime: 8,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/chuong-trinh-khuyen-mai-shopee',
    title: 'Tổng quan các chương trình khuyến mãi trên Shopee',
    description: 'Flash Sale, 9.9, 11.11, 12.12 — mỗi đợt sale có gì khác nhau, nên mua gì vào lúc nào để được giá tốt nhất.',
    category: 'Săn Sale',
    readTime: 7,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/uu-dai-thuong-hieu',
    title: 'Ưu đãi thương hiệu trên Shopee — Lưu ý trước khi mua',
    description: 'Nhiều thương hiệu có chương trình giảm giá riêng trên Shopee. Hướng dẫn cách tìm và kết hợp với mã voucher sàn.',
    category: 'Mẹo Hay',
    readTime: 6,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/san-deal-theo-shop',
    title: 'Cách săn deal theo shop trên Shopee',
    description: 'Mỗi shop có kho voucher riêng. Tìm đúng mã của cửa hàng bạn muốn mua — thường rẻ hơn mã sàn chung.',
    category: 'Mẹo Hay',
    readTime: 5,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/confidence-score-la-gi',
    title: 'Confidence Score là gì?',
    description: 'Điểm chất lượng voucher (confidence) giúp bạn biết mã nào đáng tin — giải thích đơn giản không kỹ thuật.',
    category: 'Kiến Thức',
    readTime: 4,
    date: 'Tháng 3, 2026',
  },
  {
    href: '/resources/uu-dai-hieu-qua-cao',
    title: 'Voucher nào thực sự tiết kiệm?',
    description: 'So sánh mã phần trăm, mã cố định, voucher Free Ship để chọn ưu đãi hiệu quả nhất cho từng trường hợp mua hàng.',
    category: 'Kiến Thức',
    readTime: 6,
    date: 'Tháng 3, 2026',
  },
];

export { ALL_ARTICLES };

interface RelatedArticlesProps {
  currentHref?: string;
  /** Number of articles to show. Default 3. */
  limit?: number;
}

export function RelatedArticles({
  currentHref,
  limit = 3,
}: RelatedArticlesProps) {
  const { trackEvent } = useAnalytics();
  const others = ALL_ARTICLES.filter((a) => a.href !== currentHref).slice(
    0,
    limit,
  );

  return (
    <div className="not-prose mt-10">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">
        Bài viết liên quan
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {others.map((article) => (
          <Link
            key={article.href}
            href={article.href}
            onClick={() => trackEvent('resources_link_click', { resourcePath: article.href })}
            className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-brand-200 hover:shadow-sm"
          >
            <span className="mb-2 inline-flex w-fit rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              {article.category}
            </span>
            <h3 className="text-xs font-semibold text-gray-900 leading-snug group-hover:text-brand-700 transition-colors">
              {article.title}
            </h3>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {article.readTime} phút
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * Prose — Consistent editorial typography for article content.
 * Slightly wider line-height than the legal-page version for comfortable reading.
 */
function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        'space-y-5 text-sm text-gray-700 leading-relaxed sm:text-[15px] sm:leading-[1.75]',
        '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2:first-child]:mt-0',
        '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-7',
        '[&_p]:mt-4 [&_p:first-child]:mt-0',
        '[&_ul]:mt-4 [&_ul]:space-y-2 [&_ul]:pl-5',
        '[&_li]:relative [&_li]:pl-1 [&_li:before]:absolute [&_li:before]:-left-2 [&_li:before]:top-[0.6em] [&_li:before]:h-1.5 [&_li:before]:w-1.5 [&_li:before]:rounded-full [&_li:before]:bg-brand-400',
        '[&_ol]:mt-4 [&_ol]:space-y-2 [&_ol]:pl-5',
        '[&_strong]:font-semibold [&_strong]:text-gray-900',
        '[&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-brand-700',
        '[&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-xl [&_table]:border [&_table]:border-gray-200',
        '[&_th]:bg-gray-50 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-gray-600',
        '[&_td]:px-4 [&_td]:py-2.5 [&_td]:text-sm [&_td]:text-gray-700',
        '[&_tr]:border-b [&_tr]:border-gray-100 [&_tr:last-child]:border-0',
        '[&_blockquote]:border-l-4 [&_blockquote]:border-brand-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:text-sm',
        '[&_.note]:mt-6 [&_.note]:rounded-xl [&_.note]:border [&_.note]:border-amber-100 [&_.note]:bg-amber-50 [&_.note]:px-5 [&_.note]:py-4',
        '[&_.note-title]:text-xs [&_.note-title]:font-semibold [&_.note-title]:text-amber-800 [&_.note-title]:mb-1',
        '[&_.tip]:mt-6 [&_.tip]:rounded-xl [&_.tip]:border [&_.tip]:border-brand-100 [&_.tip]:bg-brand-50 [&_.tip]:px-5 [&_.tip]:py-4',
        '[&_.tip-title]:text-xs [&_.tip-title]:font-semibold [&_.tip-title]:text-brand-800 [&_.tip-title]:mb-1',
        '[&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-gray-800',
      )}
    >
      {children}
    </div>
  );
}
