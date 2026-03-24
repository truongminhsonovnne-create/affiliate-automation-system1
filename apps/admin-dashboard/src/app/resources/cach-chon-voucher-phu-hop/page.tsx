/**
 * Article: Cách chọn voucher phù hợp — Tránh lãng phí tiền
 * /resources/cach-chon-voucher-phu-hop
 */

import { ArticleLayout, RelatedArticles } from '@/components/public/ArticleLayout';

export const metadata = {
  title: 'Cách chọn voucher phù hợp — Tránh lãng phí tiền',
  description:
    'Không phải mã nào cũng tốt. Hướng dẫn cách đọc điều kiện voucher (đơn tối thiểu, danh mục, hạn) để chọn đúng mã cho giỏ hàng của bạn.',
  keywords: [
    'cách chọn voucher Shopee',
    'điều kiện voucher',
    'đơn tối thiểu voucher',
    'tiết kiệm Shopee',
  ],
  alternates: { canonical: '/resources/cach-chon-voucher-phu-hop' },
  openGraph: {
    title: 'Cách chọn voucher phù hợp | VoucherFinder',
    description: 'Cách đọc điều kiện voucher để chọn đúng mã cho giỏ hàng của bạn.',
    url: '/resources/cach-chon-voucher-phu-hop',
    type: 'article',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Cách chọn voucher phù hợp' }],
  },
  twitter: {
    card: 'summary',
    title: 'Cách chọn voucher phù hợp | VoucherFinder',
    description: 'Hướng dẫn đọc điều kiện voucher để chọn đúng mã cho giỏ hàng.',
    images: ['/og-default.png'],
  },
};

export default function ArticlePage() {
  return (
    <ArticleLayout
      slug="cach-chon-voucher-phu-hop"
      category="Mẹo Hay"
      readTime={6}
      date="Tháng 3, 2026"
      title="Cách chọn voucher phù hợp — Tránh lãng phí tiền"
      description="Không phải mã nào cũng tốt. Hướng dẫn cách đọc điều kiện voucher để chọn đúng mã cho giỏ hàng của bạn."
    >
      <p>
        Nhiều người cứ thấy mã "giảm 200K" là nhảy vào dùng, để rồi phát hiện
        mã không áp dụng cho sản phẩm trong giỏ, hoặc số tiền giảm thực tế ít hơn
        nhiều so với kỳ vọng. Bài viết này giúp bạn đọc đúng điều kiện voucher
        trước khi đặt hàng.
      </p>

      <h2>5 yếu tố cần kiểm tra trước khi dùng mã</h2>

      <h3>1. Đơn hàng tối thiểu (Minimum order value)</h3>
      <p>
        Đây là lỗi phổ biến nhất. Một mã "Giảm 100.000đ" có thể yêu cầu đơn từ
        500.000đ. Nếu giỏ hàng của bạn chỉ có 300.000đ, bạn không được giảm gì cả.
      </p>
      <p>
        <strong>Cách kiểm tra:</strong> Nhìn dòng "Áp dụng cho đơn từ Xđ" bên dưới
        tên mã. Nếu giỏ hàng chưa đạt, hãy cân nhắc thêm sản phẩm nhỏ để đạt điều
        kiện — miễn là sản phẩm đó bạn thực sự cần.
      </p>

      <h3>2. Danh mục sản phẩm áp dụng</h3>
      <p>
        Không phải mã nào cũng dùng cho tất cả sản phẩm. Một số mã chỉ áp dụng
        cho:
      </p>
      <ul>
        <li>Một danh mục cụ thể (điện tử, thời trang, thực phẩm)</li>
        <li>Sản phẩm của một số shop nhất định</li>
        <li>Sản phẩm có nhãn "Voucher áp dụng" trên trang</li>
      </ul>
      <p>
        Trước khi áp dụng mã, hãy đọc dòng "Áp dụng cho" trong chi tiết voucher.
        Nếu giỏ hàng có sản phẩm không thuộc danh mục, mã sẽ chỉ được áp dụng cho
        các sản phẩm hợp lệ — phần còn lại tính giá đầy đủ.
      </p>

      <h3>3. Giới hạn giảm tối đa (Cap)</h3>
      <p>
        Mã "Giảm 20%" nghe hấp dẫn, nhưng nhiều khi chỉ giảm tối đa 50.000đ.
        Nếu bạn mua đơn 500.000đ, bạn chỉ được giảm 50.000đ (10%), không phải
        100.000đ (20%).
      </p>
      <p>
        <strong>Quy tắc đơn giản:</strong> Tính số tiền giảm thực tế = min(giá trị
        mã, cap tối đa). So sánh con số này với các mã khác để chọn mã tốt nhất.
      </p>

      <h3>4. Số lần sử dụng và số lượng voucher</h3>
      <p>
        Mỗi voucher có thể bị giới hạn:
      </p>
      <ul>
        <li>
          <strong>Mỗi tài khoản 1 lần</strong> — Bạn chỉ dùng được một lần. Nếu đã
          dùng rồi, mã sẽ không hiển thị trong danh sách khả dụng.
        </li>
        <li>
          <strong>Giới hạn tổng (toàn sàn)</strong> — Mã chỉ còn hiệu lực khi
          Shopee chưa phát hết số lượng. Vào cuối đợt sale, nhiều mã lớn đã hết.
        </li>
        <li>
          <strong>Slot thời gian</strong> — Một số mã chỉ áp dụng cho khung giờ nhất
          định (ví dụ: 0h00–6h00).
        </li>
      </ul>

      <h3>5. Hạn sử dụng</h3>
      <p>
        Voucher Shopee thường có hạn ngắn — một số chỉ có hiệu lực trong ngày đợt
        sale. Kiểm tra hạn trong chi tiết mã. Nếu hết hạn, mã sẽ tự động bị loại
        khỏi giỏ hàng nhưng bạn vẫn nên theo dõi để không lên đơn nhầm.
      </p>

      <h2>Khi nào nên bỏ qua mã "hấp dẫn"?</h2>
      <p>
        Đôi khi mã có trị giá cao nhưng điều kiện không phù hợp, khiến bạn phải
        mua thêm sản phẩm không cần thiết chỉ để đạt đơn tối thiểu. Trong trường
        hợp đó:
      </p>
      <ul>
        <li>
          So sánh với mã nhỏ hơn nhưng điều kiện dễ hơn — đôi khi mã 30K cho
          đơn từ 100K tốt hơn mã 100K cho đơn từ 800K.
        </li>
        <li>
          Tính toán số tiền thực nhận được sau khi trừ đi giá trị sản phẩm bạn
          phải mua thêm.
        </li>
      </ul>

      <h2>Cách tra cứu mã phù hợp cho sản phẩm cụ thể</h2>
      <p>
        Thay vì lọc qua toàn bộ danh sách voucher trên Shopee (có thể hàng chục
        mã), bạn có thể dùng VoucherFinder để tra cứu mã đang hoạt động cho sản
        phẩm cụ thể. Chỉ cần dán link sản phẩm, hệ thống trả về các mã có thể
        áp dụng — tiết kiệm thời gian và đảm bảo bạn không bỏ lỡ ưu đãi nào.
      </p>
      <RelatedArticles currentHref="/resources/cach-chon-voucher-phu-hop" />
    </ArticleLayout>
  );
}
