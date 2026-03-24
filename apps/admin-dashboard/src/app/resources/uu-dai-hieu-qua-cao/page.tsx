/**
 * Article: Ưu đãi hiệu quả cao — Những loại voucher nào thực sự tiết kiệm?
 * /resources/uu-dai-hieu-qua-cao
 *
 * SEO rationale: "voucher nào tiết kiệm nhất", "loại voucher Shopee nào tốt",
 *   "ưu đãi hiệu quả cao Shopee", FAQ-heavy article for long-tail SEO
 * Format: Q&A / guide hybrid — short sections, practical.
 */

import Link from 'next/link';
import { ArticleLayout, RelatedArticles } from '@/components/public/ArticleLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Voucher nào thực sự tiết kiệm? — Những ưu đãi hiệu quả cao trên Shopee',
  description:
    'Phân tích các loại voucher Shopee để biết loại nào thực sự tiết kiệm. So sánh mã phần trăm, mã giảm cố định, voucher Free Ship — loại nào tốt hơn trong từng trường hợp.',
  keywords: [
    'voucher nào tiết kiệm nhất',
    'ưu đãi hiệu quả cao Shopee',
    'mã giảm phần trăm hay giảm cố định',
    'so sánh voucher Shopee',
  ],
  alternates: { canonical: '/resources/uu-dai-hieu-qua-cao' },
  openGraph: {
    title: 'Voucher nào thực sự tiết kiệm? | VoucherFinder',
    description: 'So sánh các loại voucher Shopee để chọn ưu đãi hiệu quả nhất cho từng trường hợp.',
    url: '/resources/uu-dai-hieu-qua-cao',
    type: 'article',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Voucher nào thực sự tiết kiệm?' }],
  },
  twitter: {
    card: 'summary',
    title: 'Voucher nào thực sự tiết kiệm? | VoucherFinder',
    description: 'So sánh các loại voucher Shopee để chọn ưu đãi hiệu quả nhất.',
    images: ['/og-default.png'],
  },
};

export default function ArticlePage() {
  return (
    <ArticleLayout
      slug="uu-dai-hieu-qua-cao"
      category="Kiến Thức"
      readTime={6}
      date="Tháng 3, 2026"
      title="Voucher nào thực sự tiết kiệm?"
      description="So sánh các loại voucher để biết loại nào cho bạn nhiều tiết kiệm thật — phân tích cụ thể từng trường hợp mua hàng."
    >
      <p>
        Không phải voucher nào cũng tiết kiệm như nhau. Một mã "giảm 200.000đ"
        nghe hấp dẫn hơn mã "giảm 15%", nhưng thực tế có thể ngược lại —
        tùy vào giá trị đơn hàng. Bài viết này giúp bạn biết loại voucher nào
        tốt trong từng trường hợp cụ thể.
      </p>

      <h2>So sánh: giảm phần trăm vs. giảm cố định</h2>

      <h3>Mã giảm phần trăm (ví dụ: "Giảm 15%")</h3>
      <p>
        <strong>Ưu điểm:</strong> Đơn hàng càng đắt → số tiền giảm càng lớn.
        Tốt nhất khi mua sản phẩm giá trị cao (điện thoại, laptop, đồ gia dụng).
      </p>
      <p>
        <strong>Hạn chế:</strong> Hầu hết có cap (số tiền giảm tối đa). Mã "Giảm 20%"
        có thể chỉ giảm tối đa 100.000đ — tương đương 10% cho đơn 1.000.000đ.
        <strong>Luôn đọc dòng cap trước khi dùng.</strong>
      </p>

      <h3>Mã giảm cố định (ví dụ: "Giảm 50.000đ")</h3>
      <p>
        <strong>Ưu điểm:</strong> Biết chắc mình được giảm bao nhiêu. Tốt nhất khi
        mua đơn nhỏ — đơn 200.000đ dùng mã giảm 50K là tiết kiệm 25%.
      </p>
      <p>
        <strong>Hạn chế:</strong> Đơn đắt thì tỷ lệ phần trăm tiết kiệm thấp hơn
        mã phần trăm không cap.
      </p>

      <h2>Trường hợp nào nên dùng mã nào?</h2>

      <table>
        <thead>
          <tr>
            <th>Trường hợp</th>
            <th>Loại voucher tốt nhất</th>
            <th>Lý do</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Mua điện thoại / laptop</td>
            <td>Giảm % có cap cao</td>
            <td>Đơn từ 10–20 triệu, cap 200–500K vẫn là ưu đãi tốt</td>
          </tr>
          <tr>
            <td>Mua đơn dưới 300.000đ</td>
            <td>Giảm cố định 20–50K</td>
            <td>Tỷ lệ phần trăm cao hơn, không bị cap yếu</td>
          </tr>
          <tr>
            <td>Đơn trên 1 triệu</td>
            <td>Giảm % không cap</td>
            <td>Số tiền giảm lớn nhất — có thể tiết kiệm 100–500K</td>
          </tr>
          <tr>
            <td>Mua nhiều sản phẩm khác loại</td>
            <td>Voucher sàn %</td>
            <td>Áp dụng toàn đơn, không giới hạn danh mục</td>
          </tr>
          <tr>
            <td>Đơn dưới 99K</td>
            <td>Voucher Free Ship</td>
            <td>Miễn phí ship thường = tiết kiệm 15–25K, tốt hơn mã giảm 10K</td>
          </tr>
        </tbody>
      </table>

      <h2>Voucher Free Ship — Khi nào thực sự có lợi?</h2>
      <p>
        Free Ship nghe hấp dẫn nhưng giá trị thực chỉ khoảng 15.000đ – 25.000đ
        tùy khu vực. Với đơn dưới 99.000đ, miễn phí ship thường tốt hơn mã giảm
        10.000đ vì bạn được cả ưu đãi + miễn phí vận chuyển.
      </p>
      <p>
        Với đơn trên 200.000đ, hãy so sánh: mã giảm 30K thường tốt hơn miễn phí
        ship 20K vì giảm tiền hàng, còn Free Ship chỉ tiết kiệm tiền ship.
      </p>

      <h2>Cách tính nhanh voucher tốt nhất cho đơn hàng</h2>
      <ol>
        <li>
          <strong>Bước 1:</strong> Tính giá trị giảm thực tế của mỗi mã:
          <ul>
            <li>Phần trăm: giá gốc × % giảm, rồi so với cap</li>
            <li>Cố định: bằng số tiền ghi trên mã</li>
          </ul>
        </li>
        <li>
          <strong>Bước 2:</strong> Cộng thêm Free Ship nếu đơn dưới 99K
        </li>
        <li>
          <strong>Bước 3:</strong> Chọn mã cho số tiền tiết kiệm thực tế cao nhất
          (không phải số phần trăm cao nhất)
        </li>
      </ol>

      <h2>Câu hỏi thường gặp</h2>

      <h3>Mã giảm % có cap cao là cap bao nhiêu thì tốt?</h3>
      <p>
        Tốt nhất là cap từ 200.000đ trở lên. Cap dưới 50.000đ thì mã % không
        khác mã cố định là bao nhiêu.
      </p>

      <h3>Có nên mua thêm sản phẩm để đạt đơn tối thiểu không?</h3>
      <p>
        Chỉ nếu bạn thực sự cần sản phẩm đó. Nếu phải mua thêm đồ không cần
        chỉ để đạt mã, bạn đang tốn thêm tiền — hãy tìm mã khác có đơn tối
        thiểu thấp hơn.
      </p>

      <h3>Voucher shop + voucher sàn có dùng cùng lúc được không?</h3>
      <p>
        Có — đây là cách tiết kiệm nhiều nhất. Voucher shop giảm trên sản phẩm,
        voucher sàn giảm thêm phía ngoài đơn. Miễn là cả hai đều thỏa điều kiện
        (đơn tối thiểu, danh mục, số lần dùng).
      </p>

      <p>
        Tra cứu nhanh các voucher đang hoạt động cho sản phẩm bạn muốn mua:{' '}
        <Link href="/home">dán link vào VoucherFinder</Link>.
      </p>

      <RelatedArticles currentHref="/resources/uu-dai-hieu-qua-cao" />
    </ArticleLayout>
  );
}
