/**
 * Article: Tổng quan các chương trình khuyến mãi trên Shopee
 * /resources/chuong-trinh-khuyen-mai-shopee
 */

import { ArticleLayout, RelatedArticles } from '@/components/public/ArticleLayout';

export const metadata = {
  title: 'Tổng quan các chương trình khuyến mãi trên Shopee',
  description:
    'Flash Sale, 9.9, 11.11, 12.12 — mỗi đợt sale có đặc điểm gì khác nhau, nên mua gì vào lúc nào và cách chuẩn bị để săn được giá tốt nhất.',
  keywords: [
    'chương trình khuyến mãi Shopee',
    'Shopee sale',
    'Shopee 11.11',
    'Flash Sale Shopee',
    'đợt sale Shopee',
  ],
  alternates: { canonical: '/resources/chuong-trinh-khuyen-mai-shopee' },
};

export default function ArticlePage() {
  return (
    <ArticleLayout
      slug="chuong-trinh-khuyen-mai-shopee"
      category="Săn Sale"
      readTime={7}
      date="Tháng 3, 2026"
      title="Tổng quan các chương trình khuyến mãi trên Shopee"
      description="Flash Sale, 9.9, 11.11, 12.12 — mỗi đợt sale có đặc điểm gì khác nhau, nên mua gì vào lúc nào và cách chuẩn bị để săn được giá tốt nhất."
    >
      <p>
        Shopee có một hệ thống khuyến mãi đa tầng — không chỉ là "giảm giá" đơn
        thuần. Hiểu rõ cấu trúc khuyến mãi giúp bạn biết nên mua gì, khi nào,
        và cách tối đa hóa ưu đãi.
      </p>

      <h2>Các loại chương trình khuyến mãi trên Shopee</h2>

      <h3>1. Flash Sale</h3>
      <p>
        Flash Sale là chương trình <strong>sản phẩm giới hạn theo số lượng và thời gian</strong>.
        Mỗi slot Flash Sale thường kéo dài 4–6 giờ, với sản phẩm được đẩy giá
        sốc trong slot đó.
      </p>
      <p>
        <strong>Đặc điểm:</strong>
      </p>
      <ul>
        <li>Giá giảm mạnh nhất trong ngày (có thể đến 50–70%)</li>
        <li>Số lượng giới hạn — hết là hết</li>
        <li>Thường xuyên có Flash Sale mỗi ngày (nhiều slot 4h, 8h, 12h, 20h)</li>
        <li>Cần đặt hàng trong khung giờ slot mới được giá Flash Sale</li>
      </ul>
      <p>
        <strong>Khi nào tốt nhất:</strong> Đợt sale lớn (11.11, 12.12) có Flash Sale
        với sản phẩm giá trị cao (điện thoại, laptop). Các ngày thường Flash Sale
        phù hợp cho nhu yếu phẩm và đồ gia dụng.
      </p>

      <h3>2. Siêu sale ngày (9.9, 11.11, 12.12)</h3>
      <p>
        Đây là các đợt sale lớn nhất trong năm, với Shopee huy động ngân sách
        marketing lớn để giảm giá sâu và phát nhiều voucher giá trị.
      </p>
      <table>
        <thead>
          <tr>
            <th>Đợt sale</th>
            <th>Quy mô ưu đãi</th>
            <th>Sản phẩm nổi bật</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Shopee 9.9</td>
            <td>Rất lớn, mã đến 200K</td>
            <td>Thời trang, mỹ phẩm, đồ gia dụng</td>
          </tr>
          <tr>
            <td>Shopee 11.11</td>
            <td>Lớn nhất năm, mã đến 500K</td>
            <td>Tất cả danh mục, điện tử nhiều nhất</td>
          </tr>
          <tr>
            <td>Shopee 12.12</td>
            <td>Lớn, tương đương 11.11</td>
            <td>Điện tử, quà Tết, đồ gia dụng</td>
          </tr>
        </tbody>
      </table>

      <h3>3. Chương trình Free Ship</h3>
      <p>
        Shopee liên tục có chương trình miễn phí vận chuyển — đôi khi áp dụng cho
        toàn sàn, đôi khi theo danh mục hoặc khu vực.
      </p>
      <ul>
        <li>
          <strong>Shopee Free Ship toàn sàn</strong> — Thường cho đơn từ 149.000đ
          (hoặc 99.000đ vào các đợt sale lớn).
        </li>
        <li>
          <strong>Free Ship theo khu vực</strong> — Miễn phí ship cho một số tỉnh/thành
          nhất định, thường do shop tài trợ.
        </li>
        <li>
          <strong>Free Ship với voucher</strong> — Dùng voucher Free Ship để được
          miễn phí ship cho đơn bất kỳ.
        </li>
      </ul>

      <h3>4. Hoàn tiền (Cashback)</h3>
      <p>
        Shopee có chương trình hoàn tiền qua ShopeeCoin — mỗi đơn hàng sẽ nhận
        được một lượng ShopeeCoin tương đương phần trăm giá trị đơn hàng.
      </p>
      <ul>
        <li>
          <strong>ShopeeCoin cơ bản</strong> — Thường 0.5–2% giá trị đơn hàng.
        </li>
        <li>
          <strong>ShopeeCoin đợt sale</strong> — Có thể lên đến 5–10% trong các
          đợt khuyến mãi lớn.
        </li>
        <li>
          <strong>1 ShopeeCoin = 1 đồng</strong> — Có thể dùng để thanh toán đơn
          hàng tiếp theo (tối đa 50% giá trị đơn).
        </li>
      </ul>

      <h3>5. Mã giảm giá từ ngân hàng</h3>
      <p>
        Nhiều ngân hàng liên kết với Shopee để phát ưu đãi riêng — có thể là
        giảm giá trực tiếp hoặc hoàn tiền. Các ngân hàng thường có ưu đãi:
      </p>
      <ul>
        <li>Vietcombank, VietinBank, BIDV</li>
        <li>Techcombank, VPBank, MBBank</li>
        <li>ACB, TPBank, SHB</li>
      </ul>
      <p>
        <strong>Lưu ý:</strong> Ưu đãi ngân hàng thường chỉ áp dụng cho phương thức
        thanh toán nhất định. Kiểm tra trang khuyến mãi của ngân hàng trước khi đặt hàng.
      </p>

      <h2>Cách theo dõi chương trình khuyến mãi</h2>
      <ul>
        <li>
          <strong>App Shopee</strong> — Bật thông báo cho mục "Khuyến mãi" để nhận
          thông báo khi có chương trình mới.
        </li>
        <li>
          <strong>Trang khuyến mãi</strong> — Shopee có trang riêng liệt kê tất cả
          chương trình đang chạy.
        </li>
        <li>
          <strong>Email / SMS</strong> — Đăng ký nhận thông báo từ Shopee để không
          bỏ lỡ các đợt sale.
        </li>
      </ul>

      <h2>Kinh nghiệm thực tế</h2>
      <p>
        Không cần chờ đợt sale lớn mới mua. Nhiều sản phẩm tiêu dùng (sữa, dầu
        gội, bột giặt) thường có voucher riêng vào các ngày thường — và giá không
        chênh nhiều so với đợt sale lớn. Mua ngay khi có mã phù hợp, đừng chờ
        đợt sale chỉ để mua những thứ bạn cần gấp.
      </p>
      <RelatedArticles currentHref="/resources/chuong-trinh-khuyen-mai-shopee" />
    </ArticleLayout>
  );
}
