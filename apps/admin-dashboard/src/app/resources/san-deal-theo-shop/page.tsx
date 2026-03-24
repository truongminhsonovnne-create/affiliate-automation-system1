/**
 * Article: Cách săn deal theo shop trên Shopee
 * /resources/san-deal-theo-shop
 *
 * SEO rationale: long-tail query "săn deal theo shop", "mã giảm giá theo cửa hàng Shopee"
 * Format: practical guide — short, honest, useful.
 */

import Link from 'next/link';
import { ArticleLayout, RelatedArticles } from '@/components/public/ArticleLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cách săn deal theo shop trên Shopee — Tìm voucher riêng từng cửa hàng',
  description:
    'Mỗi shop trên Shopee có kho voucher riêng. Hướng dẫn cách tìm mã giảm giá dành riêng cho cửa hàng bạn muốn mua — thường rẻ hơn mã sàn chung.',
  keywords: [
    'săn deal theo shop',
    'voucher riêng shop Shopee',
    'mã giảm giá cửa hàng Shopee',
    'shop voucher Shopee',
  ],
  alternates: { canonical: '/resources/san-deal-theo-shop' },
  openGraph: {
    title: 'Cách săn deal theo shop trên Shopee | VoucherFinder',
    description: 'Tìm voucher riêng từng cửa hàng — thường rẻ hơn mã sàn chung.',
    url: '/resources/san-deal-theo-shop',
    type: 'article',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Cách săn deal theo shop trên Shopee' }],
  },
  twitter: {
    card: 'summary',
    title: 'Cách săn deal theo shop trên Shopee | VoucherFinder',
    description: 'Tìm voucher riêng từng cửa hàng — thường rẻ hơn mã sàn chung.',
    images: ['/og-default.png'],
  },
};

export default function ArticlePage() {
  return (
    <ArticleLayout
      slug="san-deal-theo-shop"
      category="Mẹo Hay"
      readTime={5}
      date="Tháng 3, 2026"
      title="Cách săn deal theo shop trên Shopee"
      description="Mỗi shop có kho voucher riêng. Tìm đúng mã của cửa hàng bạn muốn mua — thường rẻ hơn mã sàn chung."
    >
      <p>
        Không phải mã giảm giá nào cũng áp dụng cho mọi shop. Trên thực tế,
        phần lớn voucher có giá trị cao nhất là voucher <em>riêng của từng cửa hàng</em>,
        không phải mã sàn chung của Shopee. Bài viết này giúp bạn tìm đúng mã,
        đúng shop, đúng lúc.
      </p>

      <h2>Tại sao voucher shop thường tốt hơn mã sàn?</h2>
      <p>
        Mã sàn (voucher toàn sàn) phải chia sẻ cho hàng triệu người dùng Shopee.
        Voucher shop chỉ áp dụng cho đơn hàng tại một cửa hàng cụ thể — do đó
        người bán sẵn sàng cho mức giảm cao hơn vì biết khách hàng đã có ý định mua ở shop đó.
      </p>
      <p>
        Một số shop cho mã giảm 30–50% cho đơn từ 0đ — mức mà Shopee không bao giờ
        làm trên toàn sàn.
      </p>

      <h2>Cách tìm voucher riêng của một shop</h2>

      <h3>Bước 1: Vào trang shop muốn mua</h3>
      <p>
        Tìm sản phẩm bạn muốn mua trên Shopee. Nhấn vào tên shop (không phải sản phẩm)
        để vào trang cửa hàng.
      </p>

      <h3>Bước 2: Tìm tab "Voucher Shop"</h3>
      <p>
        Trên trang shop, cuộn xuống hoặc tìm tab có nhãn <strong>"Voucher Shop"</strong> hoặc
        <strong>"Mã giảm giá"</strong>. Đây là nơi shop đăng các mã dành riêng cho khách hàng
        của mình.
      </p>

      <h3>Bước 3: Lưu mã trước khi mua</h3>
      <p>
        Nhấn "Lưu" hoặc "Nhận" trên các voucher bạn muốn dùng. Mã sẽ được thêm vào
        ví voucher của bạn. Sau đó mới thêm sản phẩm vào giỏ và kiểm tra xem mã
        có tự động áp dụng không.
      </p>

      <h2>Cách kết hợp voucher shop + voucher sàn</h2>
      <p>
        Mẹo quan trọng: voucher shop và mã giảm giá toàn sàn của Shopee có thể
        <strong>dùng đồng thời</strong> trong cùng một đơn hàng — miễn là cả hai
        đều thỏa điều kiện.
      </p>
      <ul>
        <li>Voucher shop: giảm trực tiếp trên giá sản phẩm</li>
        <li>Voucher sàn (Shopee): giảm thêm phía ngoài, áp dụng cho toàn đơn</li>
        <li>Mã Free Ship: giảm phí vận chuyển — cũng có thể dùng cùng lúc</li>
      </ul>
      <p>
        Tổng ưu đãi tốt nhất thường đến từ việc dùng đủ 3 loại: voucher shop +
        voucher sàn + mã free ship.
      </p>

      <h2>Những lưu ý thực tế</h2>
      <ul>
        <li>
          <strong>Voucher shop thường có hạn ngắn</strong> — một số chỉ có trong
          vài ngày rồi hết. Nếu thấy mã tốt, nên lưu lại ngay.
        </li>
        <li>
          <strong>Đơn tối thiểu có thể cao hơn mã sàn</strong> — kiểm tra điều
          kiện trước khi đặt hàng.
        </li>
        <li>
          <strong>Không phải shop nào cũng có voucher riêng</strong> — shop nhỏ
          thường không có, hoặc có mã rất nhỏ.
        </li>
        <li>
          <strong>So sánh giá sau giảm</strong> — đôi khi giá gốc của shop có
          voucher cao vẫn đắt hơn giá thường ngày của shop khác.
        </li>
      </ul>

      <h2>Cách tra cứu nhanh voucher cho shop cụ thể</h2>
      <p>
        Thay vì vào từng shop một, bạn có thể{' '}
        <Link href="/home">dán link sản phẩm vào VoucherFinder</Link> để xem
        các mã đang hoạt động cho sản phẩm đó — bao gồm cả mã sàn và mã của
        chính shop đó (nếu có trong hệ thống).
      </p>

      <RelatedArticles currentHref="/resources/san-deal-theo-shop" />
    </ArticleLayout>
  );
}
