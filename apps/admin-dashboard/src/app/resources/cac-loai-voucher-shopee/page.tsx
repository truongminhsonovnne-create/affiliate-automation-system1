/**
 * Article: Các loại voucher Shopee — Phân biệt và cách sử dụng
 * /resources/cac-loai-voucher-shopee
 */

import { ArticleLayout, RelatedArticles } from '@/components/public/ArticleLayout';

export const metadata = {
  title: 'Các loại voucher Shopee — Phân biệt và cách sử dụng',
  description:
    'Shopee Free Ship, voucher shop, mã giảm giá toàn sàn — bạn đã biết cách phân biệt và dùng đúng từng loại chưa? Hướng dẫn chi tiết từng loại.',
  keywords: [
    'các loại voucher Shopee',
    'voucher Shopee là gì',
    'mã free ship Shopee',
    'voucher shop',
    'mã giảm giá Shopee',
  ],
  alternates: { canonical: '/resources/cac-loai-voucher-shopee' },
  openGraph: {
    title: 'Các loại voucher Shopee | VoucherFinder',
    description: 'Phân biệt và cách sử dụng Shopee Free Ship, voucher shop, mã giảm giá toàn sàn.',
    url: '/resources/cac-loai-voucher-shopee',
    type: 'article',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Các loại voucher Shopee' }],
  },
  twitter: {
    card: 'summary',
    title: 'Các loại voucher Shopee | VoucherFinder',
    description: 'Hướng dẫn phân biệt và dùng đúng từng loại voucher Shopee.',
    images: ['/og-default.png'],
  },
};

export default function ArticlePage() {
  return (
    <ArticleLayout
      slug="cac-loai-voucher-shopee"
      category="Kiến Thức"
      readTime={5}
      date="Tháng 3, 2026"
      title="Các loại voucher Shopee — Phân biệt và cách sử dụng"
      description="Shopee Free Ship, voucher shop, mã giảm giá toàn sàn — bạn đã biết cách phân biệt và dùng đúng từng loại chưa? Hướng dẫn chi tiết từng loại."
    >
      <p>
        Khi mua sắm trên Shopee, bạn sẽ gặp nhiều loại "voucher" khác nhau. Không phải
        loại nào cũng hoạt động theo cách giống nhau — và không phải mã nào cũng có
        thể kết hợp với nhau. Bài viết này giải thích rõ từng loại để bạn không bỏ
        lỡ ưu đãi vì nhầm lẫn.
      </p>

      <h2>Tổng quan các loại voucher trên Shopee</h2>
      <p>Trên Shopee có 5 loại voucher chính:</p>
      <table>
        <thead>
          <tr>
            <th>Loại</th>
            <th>Phạm vi</th>
            <th>Điều kiện thường gặp</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Mã giảm giá sàn</td>
            <td>Toàn Shopee</td>
            <td>Đơn tối thiểu, giảm theo % hoặc số tiền</td>
          </tr>
          <tr>
            <td>Voucher Free Ship</td>
            <td>Miễn phí vận chuyển</td>
            <td>Đơn tối thiểu, số lần dùng/slot</td>
          </tr>
          <tr>
            <td>Voucher Shop</td>
            <td>Một shop cụ thể</td>
            <td>Chỉ áp dụng cho sản phẩm của shop đó</td>
          </tr>
          <tr>
            <td>Voucher thương hiệu</td>
            <td>Sản phẩm thương hiệu cụ thể</td>
            <td>Chỉ áp dụng cho sản phẩm thuộc thương hiệu</td>
          </tr>
          <tr>
            <td>Voucher ngân hàng / ví</td>
            <td>Thanh toán cụ thể</td>
            <td>Thanh toán qua ngân hàng/ví chỉ định</td>
          </tr>
        </tbody>
      </table>

      <h2>1. Mã giảm giá sàn (Platform voucher)</h2>
      <p>
        Đây là loại voucher phổ biến nhất — được phát hành bởi Shopee và áp dụng
        cho hầu hết sản phẩm trên toàn nền tảng.
      </p>
      <p>Cách nhận diện: Có nhãn "Mã Giảm Giá" màu cam trên trang sản phẩm.</p>
      <h3>Ví dụ phổ biến:</h3>
      <ul>
        <li>Giảm 50.000đ cho đơn từ 200.000đ</li>
        <li>Giảm 15% cho đơn từ 300.000đ (tối đa 100.000đ)</li>
        <li>Giảm 200.000đ cho đơn từ 1.500.000đ (thường vào đợt sale lớn)</li>
      </ul>
      <p>
        <strong>Lưu ý:</strong> Mã sàn thường có giới hạn số lượng và số lần sử dụng
        mỗi tài khoản. Một số mã chỉ áp dụng cho một số danh mục nhất định (điện
        tử, thời trang, v.v.).
      </p>

      <h2>2. Voucher miễn phí vận chuyển (Free Ship)</h2>
      <p>
        Voucher Free Ship giúp bạn không phải trả phí giao hàng — thường là
        18.000đ–25.000đ mỗi đơn tùy shop và khoảng cách.
      </p>
      <p>
        Cách nhận diện: Có nhãn "Miễn Phí Vận Chuyển" hoặc biểu tượng xe tải màu xanh.
      </p>
      <p>
        Voucher Free Ship có thể kết hợp với mã giảm giá sàn — đây là cách tốt nhất
        để tối ưu đơn hàng: giảm tiền hàng + không tốn phí ship.
      </p>
      <div className="note">
        <p className="note-title">Tip</p>
        <p>
          Nếu đơn hàng đã đạt điều kiện Shopee Free Ship (thường đơn từ 149.000đ),
          bạn không cần dùng thêm voucher Free Ship — hãy dùng voucher đó cho đơn
          hàng khác nhỏ hơn.
        </p>
      </div>

      <h2>3. Voucher Shop (Shop voucher)</h2>
      <p>
        Đây là voucher do chính người bán phát hành, chỉ áp dụng khi mua hàng
        tại shop đó.
      </p>
      <p>Cách nhận diện: Có tên shop ở trên nhãn voucher, thường nằm dưới mã sàn.</p>
      <p>
        Voucher shop thường có giá trị cao hơn mã sàn (ví dụ: giảm 30% cho shop
        điện thoại lớn), nhưng chỉ dùng được cho sản phẩm của shop đó.
      </p>

      <h2>4. Voucher thương hiệu (Brand voucher)</h2>
      <p>
        Một số thương hiệu lớn (Samsung, Apple, Nike, v.v.) có chương trình voucher
        riêng trên Shopee — thường do thương hiệu tài trợ một phần hoặc toàn bộ.
      </p>
      <p>
        Cách nhận diện: Thường xuất hiện trên trang sản phẩm của thương hiệu đó
        hoặc trong mục "Ưu đãi thương hiệu" của Shopee.
      </p>

      <h2>5. Voucher ngân hàng và ví điện tử</h2>
      <p>
        Đây thực chất là ưu đãi từ ngân hàng hoặc ví điện tử khi thanh toán qua
        kênh của họ — không phải voucher Shopee theo nghĩa truyền thống.
      </p>
      <p>Ví dụ:</p>
      <ul>
        <li>Giảm 30.000đ khi thanh toán bằng Vietcombank</li>
        <li>Hoàn 15% khi thanh toán qua ZaloPay (tối đa 50.000đ)</li>
        <li>Giảm 20.000đ khi thanh toán qua VNPay</li>
      </ul>
      <p>
        Các voucher này thường <strong>không hiển thị</strong> trong giỏ hàng mặc
        định — bạn cần chọn phương thức thanh toán trước để xem ưu đãi khả dụng.
      </p>

      <h2>Cách kết hợp voucher hiệu quả nhất</h2>
      <p>
        Một đơn hàng có thể kết hợp tối đa <strong>1 mã giảm giá sàn + 1 voucher Free Ship</strong>.
        Voucher shop và voucher thương hiệu có thể dùng cùng lúc nếu điều kiện không xung đột.
      </p>
      <p>Thứ tự ưu tiên khi chọn voucher:</p>
      <ol>
        <li>Voucher thương hiệu (nếu sản phẩm thuộc thương hiệu có ưu đãi)</li>
        <li>Voucher shop (nếu có)</li>
        <li>Mã giảm giá sàn phù hợp đơn hàng</li>
        <li>Voucher Free Ship (nếu đơn chưa đạt điều kiện miễn phí ship)</li>
        <li>Voucher ngân hàng / ví (chọn kênh có ưu đãi cao nhất)</li>
      </ol>
      <RelatedArticles currentHref="/resources/cac-loai-voucher-shopee" />
    </ArticleLayout>
  );
}
