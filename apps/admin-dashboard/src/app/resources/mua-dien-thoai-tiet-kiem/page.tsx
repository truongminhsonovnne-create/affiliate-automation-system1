/**
 * Article: Cách mua điện thoại giá tốt nhất trên Shopee
 * /resources/mua-dien-thoai-tiet-kiem
 */

import { ArticleLayout, RelatedArticles } from '@/components/public/ArticleLayout';

export const metadata = {
  title: 'Cách mua điện thoại giá tốt nhất trên Shopee',
  description:
    'So sánh các đợt sale cho điện thoại, cách chọn thời điểm mua, cách chọn cấu hình, và mẹo kết hợp voucher để tiết kiệm tối đa khi mua smartphone.',
  keywords: [
    'mua điện thoại trên Shopee',
    'mua smartphone giá rẻ',
    'iPhone Shopee',
    'Samsung Shopee',
    'voucher điện thoại',
  ],
  alternates: { canonical: '/resources/mua-dien-thoai-tiet-kiem' },
};

export default function ArticlePage() {
  return (
    <ArticleLayout
      slug="mua-dien-thoai-tiet-kiem"
      category="Hướng dẫn"
      readTime={9}
      date="Tháng 3, 2026"
      title="Cách mua điện thoại giá tốt nhất trên Shopee"
      description="So sánh các đợt sale cho điện thoại, cách chọn thời điểm mua, cách chọn cấu hình, và mẹo kết hợp voucher để tiết kiệm tối đa khi mua smartphone."
    >
      <p>
        Điện thoại là một trong những danh mục có biên độ giảm giá lớn nhất trong
        các đợt sale trên Shopee — có thể tiết kiệm từ 300.000đ đến 3.000.000đ
        nếu chọn đúng thời điểm và cách mua. Bài viết này hướng dẫn toàn bộ
        quy trình từ chuẩn bị đến khi nhận hàng.
      </p>

      <h2>Tại sao nên mua điện thoại trên Shopee?</h2>
      <p>
        Shopee là một trong những kênh phân phối chính hãng lớn nhất cho điện
        thoại tại Việt Nam. Các lý do chính:
      </p>
      <ul>
        <li>
          <strong>Shopee Mall có hàng chính hãng</strong> — Các đại lý ủy quyền
          của Apple, Samsung, Xiaomi, OPPO đều có mặt trên Shopee Mall.
        </li>
        <li>
          <strong>Nhiều voucher giá trị</strong> — Điện thoại thường nằm trong
          danh mục áp dụng của các mã sàn lớn, đặc biệt vào đợt sale.
        </li>
        <li>
          <strong>So sánh dễ dàng</strong> — Nhiều shop cùng bán một sản phẩm,
          dễ so sánh giá.
        </li>
        <li>
          <strong>Shopee Guarantee</strong> — Bảo vệ người mua nếu nhận được hàng
          không đúng mô tả.
        </li>
      </ul>

      <h2>Thời điểm nào mua điện thoại là tốt nhất?</h2>

      <h3>Đợt sale lớn (11.11, 12.12)</h3>
      <p>
        Đây là thời điểm có mã giảm giá lớn nhất — thường có mã 200K–500K cho
        đơn điện thoại. Kết hợp với voucher từ ngân hàng (nếu có), bạn có thể
        tiết kiệm đáng kể.
      </p>
      <p>
        <strong>Lưu ý:</strong> Vào 11.11, hàng Flash Sale điện thoại hết rất
        nhanh — thường trong vài phút. Nếu muốn mua iPhone hay Samsung cao cấp
        giảm sốc, cần chuẩn bị sẵn tài khoản và thông tin thanh toán.
      </p>

      <h3>Đầu năm (Tháng 1–2)</h3>
      <p>
        Sau Tết Nguyên đán, nhiều đại lý cần xả hàng tồn — đây là thời điểm
        tốt để mua dòng điện thoại của năm trước (ví dụ: mua iPhone 15 sau khi
        iPhone 16 ra mắt). Giá thường giảm 10–20%.
      </p>

      <h3>Ngày thường</h3>
      <p>
        Không cần chờ sale lớn nếu bạn cần điện thoại gấp. Nhiều shop điện
        thoại chạy voucher riêng quanh năm — kiểm tra trang sản phẩm và so sánh
        giữa các shop thường xuyên.
      </p>

      <h2>Cách chọn shop đáng tin cậy</h2>

      <h3>Ưu tiên Shopee Mall và Official Store</h3>
      <p>
        Shopee Mall (biểu tượng con mèo hồng) là các đại lý được Shopee xác
        minh là chính hãng. Official Store (biểu tượng ngôi sao vàng) là cửa
        hàng chính hãng của thương hiệu.
      </p>
      <p>
        Mua từ các shop này đảm bảo:
      </p>
      <ul>
        <li>Hàng chính hãng 100%</li>
        <li>Bảo hành chính hãng đầy đủ</li>
        <li>Chính sách đổi trả rõ ràng</li>
      </ul>

      <h3>Các tiêu chí đánh giá shop</h3>
      <table>
        <thead>
          <tr>
            <th>Tiêu chí</th>
            <th>Tốt</th>
            <th>Cần cân nhắc</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Đánh giá</td>
            <td>4.7★ trở lên, 1000+ đánh giá</td>
            <td>Dưới 4.5★ hoặc ít đánh giá</td>
          </tr>
          <tr>
            <td>Sản phẩm đã bán</td>
            <td>500+ sản phẩm đã bán</td>
            <td>Mới, ít người mua</td>
          </tr>
          <tr>
            <td>Phản hồi chat</td>
            <td>Trả lời trong 5 phút</td>
            <td>Không trả lời hoặc trả lời rất chậm</td>
          </tr>
          <tr>
            <td>Chế độ bảo hành</td>
            <td>Bảo hành chính hãng 12 tháng</td>
            <td>Bảo hành ngắn hoặc không rõ</td>
          </tr>
        </tbody>
      </table>

      <h2>Cách chọn cấu hình phù hợp</h2>

      <h3>Không chọn bộ nhớ quá lớn nếu không cần</h3>
      <p>
        Một tip quan trọng: chênh lệch giá giữa bản 128GB và 256GB thường là
        1.000.000đ–3.000.000đ. Nếu bạn thường xuyên dùng cloud storage (Google
        Photos, iCloud), 128GB có thể đủ. Mua thẻ nhớ ngoài (cho Android) là
        cách tiết kiệm hơn nhiều so với mua bản bộ nhớ lớn.
      </p>

      <h3>Màu sắc ảnh hưởng đến giá</h3>
      <p>
        Các màu phổ biến (đen, trắng) thường có giá ổn định. Các màu đặc biệt
        (màu mới ra, màu giới hạn) thường đắt hơn và hết hàng nhanh. Nếu tiết
        kiệm là ưu tiên, chọn màu phổ biến.
      </p>

      <h2>Cách kết hợp voucher để tiết kiệm tối đa</h2>
      <ol>
        <li>
          <strong>Kiểm tra mã sàn áp dụng cho điện tử</strong> — Một số mã có
          danh mục áp dụng. Điện thoại thường nằm trong danh mục "Điện thoại &
          Máy tính bảng".
        </li>
        <li>
          <strong>Dùng voucher ngân hàng</strong> — Nhiều ngân hàng (Techcombank,
          VietinBank) có ưu đãi riêng cho đơn điện thoại trên Shopee.
        </li>
        <li>
          <strong>Thanh toán qua ShopeePay</strong> — Thường có thêm 1–3% hoàn
          tiền cho đơn điện thoại.
        </li>
        <li>
          <strong>Tách đơn nếu cần mua phụ kiện kèm</strong> — Mua ốp lưng, sạc,
          tai nghe thành đơn riêng để đơn điện thoại đạt điều kiện mã, và đơn
          phụ kiện cũng có thể dùng mã riêng.
        </li>
      </ol>

      <h2>Kiểm tra điện thoại khi nhận hàng</h2>
      <ul>
        <li>
          <strong>Quay video toàn bộ quá trình mở hộp</strong> — Nếu có vấn đề,
          video là bằng chứng quan trọng để khiếu nại.
        </li>
        <li>
          <strong>Kiểm tra imei</strong> — So sánh imei trên hộp, trong máy
          (*#06#), và trên hóa đơn Shopee.
        </li>
        <li>
          <strong>Bật máy kiểm tra</strong> — Màn hình, loa, camera, cảm biến
          vân tay/khuôn mặt.
        </li>
        <li>
          <strong>Kiểm tra tem bảo hành chính hãng</strong> — Tem phải còn
          nguyên, có mã serial khớp với máy.
        </li>
      </ul>
      <RelatedArticles currentHref="/resources/mua-dien-thoai-tiet-kiem" />
    </ArticleLayout>
  );
}
