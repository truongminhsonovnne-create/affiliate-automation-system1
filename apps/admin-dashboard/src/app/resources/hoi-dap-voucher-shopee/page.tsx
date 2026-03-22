/**
 * Article: Giải đáp 15 câu hỏi thường gặp về voucher Shopee
 * /resources/hoi-dap-voucher-shopee
 */

import { ArticleLayout, RelatedArticles } from '@/components/public/ArticleLayout';

export const metadata = {
  title: 'Giải đáp 15 câu hỏi thường gặp về voucher Shopee',
  description:
    'Hết hạn khi nào? Dùng được cho đơn nào? Tại sao mã không áp dụng? Điều kiện đơn hàng là gì? Tất tần tật câu hỏi thực tế được trả lời chi tiết.',
  keywords: [
    'câu hỏi voucher Shopee',
    'faq Shopee',
    'voucher Shopee không hoạt động',
    'điều kiện voucher Shopee',
  ],
  alternates: { canonical: '/resources/hoi-dap-voucher-shopee' },
};

export default function ArticlePage() {
  return (
    <ArticleLayout
      slug="hoi-dap-voucher-shopee"
      category="Hỏi & Đáp"
      readTime={6}
      date="Tháng 3, 2026"
      title="Giải đáp 15 câu hỏi thường gặp về voucher Shopee"
      description="Hết hạn khi nào? Dùng được cho đơn nào? Tại sao mã không áp dụng? Tất tần tật câu hỏi thực tế được trả lời chi tiết."
    >
      <p>
        Dưới đây là 15 câu hỏi thực tế nhất mà người dùng Shopee hay hỏi về
        voucher — được chọn lọc từ các diễn đàn và nhóm mua sắm phổ biến.
      </p>

      <h2>Về hiệu lực và hạn sử dụng</h2>

      <h3>1. Voucher Shopee hết hạn khi nào?</h3>
      <p>
        Mỗi voucher có hạn sử dụng khác nhau. Voucher phát trong đợt sale thường
        hết hạn cuối ngày đợt sale. Voucher thường ngày có thể có hạn 7–30 ngày.
        Kiểm tra dòng "Hạn sử dụng" trong chi tiết voucher.
      </p>

      <h3>2. Mã voucher hết số lượng trước khi hết hạn được không?</h3>
      <p>
        <strong>Có.</strong> Nhiều voucher có giới hạn tổng số lượng phát hành —
        hết số lượng trước khi hết hạn. Bạn sẽ thấy mã hiển thị "Đã hết" trong
        danh sách voucher của mình.
      </p>

      <h3>3. Voucher đã dùng có dùng lại được không?</h3>
      <p>
        Không. Hầu hết voucher Shopee chỉ có hiệu lực cho một đơn hàng duy nhất.
        Sau khi áp dụng thành công, mã sẽ bị loại khỏi danh sách khả dụng.
      </p>

      <h2>Về điều kiện và phạm vi áp dụng</h2>

      <h3>4. Tại sao voucher không áp dụng cho đơn hàng của tôi?</h3>
      <p>
        Có 4 lý do phổ biến nhất:
      </p>
      <ul>
        <li>
          <strong>Đơn hàng chưa đạt giá trị tối thiểu</strong> — Xem lại dòng "Áp dụng
          cho đơn từ Xđ".
        </li>
        <li>
          <strong>Sản phẩm không thuộc danh mục áp dụng</strong> — Voucher có thể
          chỉ dùng cho thời trang, không dùng cho điện tử.
        </li>
        <li>
          <strong>Mã đã hết số lượng</strong> — Mã vẫn hiển thị nhưng đã hết quota.
        </li>
        <li>
          <strong>Đã dùng mã này ở đơn khác</strong> — Nhiều mã chỉ dùng 1 lần/tài khoản.
        </li>
      </ul>

      <h3>5. Voucher có dùng được cho đơn hàng đã đặt không?</h3>
      <p>
        Không. Voucher phải được áp dụng <strong>trước khi</strong> bạn xác nhận
        đặt hàng. Không thể thêm mã sau khi đơn đã được thanh toán.
      </p>

      <h3>6. Voucher có thể dùng cho đơn hàng hủy không?</h3>
      <p>
        Thường thì <strong>không</strong>. Nếu đơn hàng bị hủy sau khi áp dụng voucher,
        mã voucher sẽ không được hoàn lại (trừ một số trường hợp đặc biệt do
        Shopee xử lý).
      </p>

      <h3>7. Một đơn hàng có dùng được nhiều mã giảm giá không?</h3>
      <p>
        Có thể kết hợp tối đa <strong>1 mã giảm giá sàn + 1 voucher Free Ship</strong>.
        Voucher shop và voucher thương hiệu có thể dùng cùng lúc nếu điều kiện
        không xung đột.
      </p>

      <h3>8. Voucher giảm % có giới hạn số tiền giảm tối đa không?</h3>
      <p>
        <strong>Có.</strong> Hầu hết các mã giảm theo % đều có "cap" (số tiền giảm
        tối đa). Ví dụ: "Giảm 20% cho đơn từ 500K" nhưng tối đa chỉ giảm 80K —
        nghĩa là bạn chỉ được giảm 80K dù đơn là 1 triệu.
      </p>

      <h2>Về nguồn gốc và tính hợp lệ</h2>

      <h3>9. Mã voucher Shopee lấy ở đâu là an toàn?</h3>
      <p>
        Lấy voucher từ các nguồn chính thức:
      </p>
      <ul>
        <li>Trang "Mã Giảm Giá" trong ứng dụng Shopee</li>
        <li>Trang khuyến mãi của Shopee</li>
        <li>Mã do ngân hàng/ví điện tử phát hành (kiểm tra trang chính thức của ngân hàng)</li>
      </ul>
      <p>
        <strong>Cảnh báo:</strong> Không dùng mã từ các nguồn không rõ nguồn gốc —
        có trường hợp mã giả mạo dẫn đến lỗi thanh toán hoặc mất thông tin.
      </p>

      <h3>10. Voucher từ Shopee Mall có khác gì voucher thường?</h3>
      <p>
        Voucher Shopee Mall thường có giá trị cao hơn và điều kiện dễ hơn voucher
        thường — vì Shopee Mall yêu cầu các shop chính hãng cam kết về chất
        lượng. Voucher này thường chỉ dùng cho sản phẩm của Shopee Mall.
      </p>

      <h2>Về thanh toán và vận chuyển</h2>

      <h3>11. Voucher Free Ship có áp dụng cho mọi địa chỉ không?</h3>
      <p>
        Không nhất thiết. Một số voucher Free Ship chỉ áp dụng cho khu vực nhất
        định (thành phố lớn, hoặc ngược lại — chỉ cho tỉnh). Kiểm tra dòng
        "Khu vực áp dụng" trong chi tiết mã.
      </p>

      <h3>12. Tôi đã dùng voucher, nhưng Shopee tính tiền ship — tại sao?</h3>
      <p>
        Lý do phổ biện nhất: voucher Free Ship chỉ miễn phí phần "phí vận chuyển
        cơ bản" — nếu bạn chọn dịch vụ giao hàng nhanh (Shopee Express hỏa tốc,
        giao trong 2 giờ), phần phụ phí giao nhanh vẫn tính tiền.
      </p>

      <h3>13. Thanh toán bằng COD (nhận hàng rồi trả tiền) có dùng được voucher không?</h3>
      <p>
        <strong>Có</strong>, voucher áp dụng cho cả thanh toán COD. Tuy nhiên,
        một số mã từ ngân hàng chỉ áp dụng cho thanh toán online qua kênh ngân
        hàng — kiểm tra điều kiện trước khi đặt.
      </p>

      <h3>14. Đơn hàng có nhiều sản phẩm, tại sao voucher chỉ giảm một phần?</h3>
      <p>
        Nhiều voucher chỉ áp dụng cho <strong>sản phẩm thỏa điều kiện</strong>.
        Nếu đơn có 3 sản phẩm nhưng chỉ 1 sản phẩm nằm trong danh mục áp dụng,
        mã sẽ chỉ giảm cho sản phẩm đó — không phải toàn bộ đơn.
      </p>

      <h3>15. Shopee có tính phí gì ngoài giá sản phẩm không?</h3>
      <p>
        Ngoài giá sản phẩm, bạn có thể được tính:
      </p>
      <ul>
        <li>
          <strong>Phí vận chuyển</strong> — Thường 18.000đ–25.000đ tùy khoảng cách.
          Có thể miễn phí nếu đạt điều kiện Shopee Free Ship hoặc dùng voucher.
        </li>
        <li>
          <strong>Phí thanh toán</strong> — Không, Shopee không tính phí thanh
          toán cho người mua.
        </li>
        <li>
          <strong>Phí bảo hiểm / dịch vụ</strong> — Một số shop có phụ phí bảo
          hiểm hoặc dịch vụ gói quà — xem kỹ trước khi đặt hàng.
        </li>
      </ul>
      <RelatedArticles currentHref="/resources/hoi-dap-voucher-shopee" />
    </ArticleLayout>
  );
}
