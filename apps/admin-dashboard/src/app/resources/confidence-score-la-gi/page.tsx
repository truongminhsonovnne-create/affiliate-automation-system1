/**
 * Article: Confidence Score là gì — Giải thích điểm chất lượng voucher
 * /resources/confidence-score-la-gi
 *
 * SEO rationale: "confidence score là gì", "điểm chất lượng voucher", "freshness score voucher"
 * Format: explainer article — honest, non-technical, short.
 */

import Link from 'next/link';
import { ArticleLayout, RelatedArticles } from '@/components/public/ArticleLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Confidence Score là gì? — Điểm chất lượng mã voucher trên VoucherFinder',
  description:
    'Mỗi voucher trên VoucherFinder có điểm confidence (0–100%) — thể hiện độ tin cậy của mã. Giải thích đơn giản cách đọc và dùng điểm này để chọn voucher tốt.',
  keywords: [
    'confidence score là gì',
    'điểm chất lượng voucher',
    'freshness voucher',
    'voucher đáng tin cậy',
  ],
  alternates: { canonical: '/resources/confidence-score-la-gi' },
  openGraph: {
    title: 'Confidence Score là gì? | VoucherFinder',
    description: 'Cách đọc điểm chất lượng voucher để chọn mã tốt nhất.',
    url: '/resources/confidence-score-la-gi',
    type: 'article',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Confidence Score là gì?' }],
  },
  twitter: {
    card: 'summary',
    title: 'Confidence Score là gì? | VoucherFinder',
    description: 'Cách đọc điểm chất lượng voucher để chọn mã tốt nhất.',
    images: ['/og-default.png'],
  },
};

export default function ArticlePage() {
  return (
    <ArticleLayout
      slug="confidence-score-la-gi"
      category="Kiến Thức"
      readTime={4}
      date="Tháng 3, 2026"
      title="Confidence Score là gì?"
      description="Điểm chất lượng voucher (confidence) giúp bạn biết mã nào đáng tin — giải thích đơn giản không kỹ thuật."
    >
      <p>
        Khi tra cứu voucher, bạn có thể thấy mỗi mã có một chỉ số phần trăm —
        ví dụ <strong>92%</strong> hoặc <strong>64%</strong>. Đó là Confidence Score,
        thể hiện mức độ đáng tin cậy của voucher đó.
      </p>

      <h2>Confidence Score nghĩa là gì?</h2>
      <p>
        Confidence Score (điểm tin cậy) là con số từ <strong>0% đến 100%</strong>,
        cho biết hệ thống đánh giá voucher đó có khả năng còn hoạt động hay không.
        Càng cao = voucher càng có khả năng còn áp dụng được khi bạn đặt hàng.
      </p>

      <h3>Ngưỡng đánh giá đơn giản</h3>
      <table>
        <thead>
          <tr>
            <th>Điểm</th>
            <th>Ý nghĩa</th>
            <th>Nên dùng?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>80–100%</td>
            <td>Rất đáng tin — mã gần đây, có đầy đủ thông tin</td>
            <td>Ưu tiên dùng</td>
          </tr>
          <tr>
            <td>60–79%</td>
            <td>Khá đáng tin — mã hợp lệ nhưng thông tin có thể chưa đầy đủ</td>
            <td>Dùng được, kiểm tra điều kiện</td>
          </tr>
          <tr>
            <td>40–59%</td>
            <td>Trung bình — có rủi ro mã đã hết hoặc điều kiện khác</td>
            <td>Thử nếu không có mã cao hơn</td>
          </tr>
          <tr>
            <td>Dưới 40%</td>
            <td>Thấp — mã có thể đã hết hạn hoặc không còn áp dụng</td>
            <td>Ưu tiên mã khác trước</td>
          </tr>
        </tbody>
      </table>

      <h2>Yếu tố nào ảnh hưởng đến Confidence Score?</h2>
      <p>Hệ thống đánh giá dựa trên một số tín hiệu:</p>
      <ul>
        <li>
          <strong>Tần suất cập nhật</strong> — mã được cập nhật gần đây có điểm cao hơn.
          Nếu mã đã vài tuần không có ai xác nhận, điểm sẽ giảm dần.
        </li>
        <li>
          <strong>Đầy đủ thông tin</strong> — mã có đầy đủ thông tin (điều kiện,
          đơn tối thiểu, hạn sử dụng, hình ảnh) được đánh giá cao hơn mã chỉ có
          tiêu đề.
        </li>
        <li>
          <strong>Loại mã</strong> — mã có coupon code (chuỗi ký tự) thường đáng
          tin hơn mã không có code vì shop phải chủ động tạo.
        </li>
        <li>
          <strong>Nguồn gốc</strong> — mã từ các chương trình chính thức của Shopee
          có điểm cao hơn mã từ các nguồn không chính thức.
        </li>
      </ul>

      <h2>Freshness — Voucher còn mới không?</h2>
      <p>
        Bên cạnh Confidence Score, mỗi voucher còn hiển thị thời điểm được cập
        nhật gần nhất — gọi là <strong>Freshness</strong>. Voucher "Vừa cập nhật"
        trong vòng vài giờ thường đáng tin hơn voucher "Cập nhật 3 ngày trước".
      </p>
      <p>
        Trong các đợt sale lớn (11.11, 12.12), nhiều mã thay đổi liên tục —
        Freshness càng trở nên quan trọng hơn.
      </p>

      <h2>Tóm lại</h2>
      <ul>
        <li>
          Confidence Score <strong>80%+</strong>: ưu tiên dùng trước.
        </li>
        <li>
          Kết hợp với <strong>Freshness</strong> — voucher mới + điểm cao = voucher tốt nhất.
        </li>
        <li>
          Không có mã nào đảm bảo 100% — luôn kiểm tra điều kiện trước khi đặt hàng.
        </li>
        <li>
          Nếu nhiều mã cùng điểm, ưu tiên mã được cập nhật gần nhất.
        </li>
      </ul>

      <p>
        Tra cứu nhanh:{' '}
        <Link href="/deals/hot">xem các voucher hot nhất</Link>{' '}
        đang có confidence cao và được cập nhật gần đây.
      </p>

      <RelatedArticles currentHref="/resources/confidence-score-la-gi" />
    </ArticleLayout>
  );
}
