/**
 * Article: Săn giày chính hãng giá tốt — Kinh nghiệm thực tế
 * /resources/san-giay-chinh-hang
 */

import { ArticleLayout, RelatedArticles } from '@/components/public/ArticleLayout';

export const metadata = {
  title: 'Săn giày chính hãng giá tốt — Kinh nghiệm thực tế',
  description:
    'Cách phân biệt giày chính hãng trên Shopee, thời điểm sale tốt nhất, cách kiểm tra giấy tờ, và mẹo dùng voucher để mua giày Nike, Adidas, New Balance với giá hời.',
  keywords: [
    'mua giày chính hãng trên Shopee',
    'giày Nike Shopee',
    'giày Adidas Shopee',
    'giày New Balance Shopee',
    'voucher giày',
  ],
  alternates: { canonical: '/resources/san-giay-chinh-hang' },
  openGraph: {
    title: 'Săn giày chính hãng giá tốt | VoucherFinder',
    description: 'Cách phân biệt giày chính hãng trên Shopee, thời điểm sale tốt nhất, và mẹo dùng voucher để mua giày Nike, Adidas, New Balance với giá hời.',
    url: '/resources/san-giay-chinh-hang',
    type: 'article',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Săn giày chính hãng giá tốt trên Shopee' }],
  },
  twitter: {
    card: 'summary',
    title: 'Săn giày chính hãng giá tốt | VoucherFinder',
    description: 'Cách mua giày Nike, Adidas, New Balance với giá tốt trên Shopee.',
    images: ['/og-default.png'],
  },
};

export default function ArticlePage() {
  return (
    <ArticleLayout
      slug="san-giay-chinh-hang"
      category="Hướng dẫn"
      readTime={8}
      date="Tháng 3, 2026"
      title="Săn giày chính hãng giá tốt — Kinh nghiệm thực tế"
      description="Cách phân biệt giày chính hãng trên Shopee, thời điểm sale tốt nhất, cách kiểm tra giấy tờ, và mẹo dùng voucher để mua giày Nike, Adidas, New Balance với giá hời."
    >
      <p>
        Giày là một trong những danh mục phổ biến nhất trên Shopee — và cũng
        là danh mục có nhiều hàng giả, hàng kém chất lượng nhất. Bài viết này
        giúp bạn mua giày chính hãng với giá tốt nhất mà không bị lừa.
      </p>

      <h2>Tại sao mua giày trên Shopee?</h2>
      <p>
        So với việc mua tại cửa hàng vật lý, mua giày trên Shopee có nhiều
        ưu điểm:
      </p>
      <ul>
        <li>
          <strong>So sánh giá dễ dàng</strong> — Nhiều shop cùng bán, dễ tìm
          được giá tốt nhất.
        </li>
        <li>
          <strong>Nhiều voucher cho giày</strong> — Thời trang (bao gồm giày) thường
          nằm trong danh mục áp dụng của nhiều mã giảm giá sàn.
        </li>
        <li>
          <strong>Chính hãng từ Shopee Mall</strong> — Các đại lý giày chính hãng
          đều có mặt trên Shopee Mall.
        </li>
        <li>
          <strong>Đổi trả dễ dàng</strong> — Chính sách đổi trả của Shopee áp dụng
          cho giày nếu không vừa hoặc có lỗi.
        </li>
      </ul>

      <h2>Cách phân biệt giày chính hãng và giày fake</h2>

      <h3>1. Chọn đúng loại shop</h3>
      <p>
        Ưu tiên theo thứ tự:
      </p>
      <ol>
        <li>
          <strong>Official Store</strong> (ngôi sao vàng) — Cửa hàng chính hãng của
          thương hiệu. Nike Official Store, Adidas Official Store trên Shopee.
        </li>
        <li>
          <strong>Shopee Mall</strong> (con mèo hồng) — Đại lý ủy quyền của thương
          hiệu. Có cam kết hàng chính hãng từ Shopee.
        </li>
        <li>
          <strong>Shop có đánh giá cao</strong> — 4.8★+, hàng đã bán nhiều,
          có thời gian hoạt động lâu năm.
        </li>
      </ol>

      <h3>2. Kiểm tra mô tả sản phẩm</h3>
      <p>
        Giày chính hãng thường có mô tả chi tiết:
      </p>
      <ul>
        <li>Thông tin chất liệu (da thật, da tổng hợp, vải mesh)</li>
        <li>Kích thước theo bảng chuẩn (EU, US, cm)</li>
        <li>Mã sản phẩm (SKU) — nên tra mã này trên Google để xác minh</li>
        <li>Hình ảnh chụp thực tế từ nhiều góc</li>
      </ul>

      <h3>3. Kiểm tra giá</h3>
      <p>
        Giày chính hãng có giá sàn — nếu thấy giày Nike Air Force 1 chính hãng
        giá dưới 1.000.000đ trong khi giá thị trường là 2.500.000đ, đó rất có
        thể là hàng giả. Các thương hiệu như Nike, Adidas, New Balance có giá
        tham chiếu tương đối ổn định trên các kênh chính thức.
      </p>

      <h3>4. Kiểm tra khi nhận hàng</h3>
      <ul>
        <li>
          <strong>Tem chống hàng giả</strong> — Nhiều thương hiệu (Adidas, Nike)
          có tem QR code hoặc hologram trên hộp hoặc bên trong giày.
        </li>
        <li>
          <strong>Chất lượng đường chỉ</strong> — Giày chính hãng có đường chỉ
          đều, không tuột chỉ, không có keo thừa.
        </li>
        <li>
          <strong>Mùi giày</strong> — Giày fake thường có mùi hóa chất nồng khó
          chịu. Giày chính hãng có mùi da/cao su tự nhiên.
        </li>
        <li>
          <strong>Kích thước chuẩn</strong> — Giày fake thường có kích thước không
          chuẩn, nhỏ hơn hoặc lớn hơn bảng size.
        </li>
      </ul>

      <h2>Thời điểm nào mua giày là tốt nhất?</h2>

      <h3>Đợt sale lớn (11.11, 12.12)</h3>
      <p>
        Giày chính hãng thường giảm 20–40% vào các đợt sale lớn. Nike và Adidas
        thường có Flash Sale với giày giảm đến 50% — nhưng hết hàng rất nhanh.
        Chuẩn bị sẵn tài khoản và thông tin thanh toán.
      </p>

      <h3>Cuối mùa (tháng 4–5 và tháng 10–11)</h3>
      <p>
        Đây là thời điểm các shop xả hàng tồn của mùa trước — giày mùa đông
        được giảm giá mạnh vào tháng 4–5, giày mùa hè vào tháng 10–11.
      </p>

      <h3>Mua giày tên tuổi vào lúc ra mắt</h3>
      <p>
        Một số dòng giày sneaker "hype" (Nike Air Jordan, Adidas Yeezy, New Balance
        550/2002R) có giá cao nhất vào ngày đầu ra mắt, sau đó giảm dần khi
        nguồn cung ổn định. Nếu không cần giày gấp, chờ 1–2 tháng sau ngày ra
        mắt là cách tốt để có giá tốt hơn.
      </p>

      <h2>Cách kết hợp voucher để tiết kiệm thêm</h2>
      <ol>
        <li>
          <strong>Kiểm tra voucher shop trước</strong> — Các shop giày chính hãng
          thường có voucher riêng (giảm 10–20% cho khách hàng mới hoặc đơn hàng
          lớn).
        </li>
        <li>
          <strong>Dùng mã sàn cho giày</strong> — Giày thường nằm trong danh mục
          "Thời trang" — kiểm tra xem mã sàn có áp dụng cho giày không.
        </li>
        <li>
          <strong>Kết hợp với voucher ngân hàng</strong> — Techcombank, VPBank
          thường có ưu đãi cho đơn thời trang trên Shopee.
        </li>
        <li>
          <strong>Mua nhiều đôi cùng lúc</strong> — Nếu cần mua giày cho cả gia
          đình, mua cùng đơn để đạt điều kiện mã lớn hơn.
        </li>
      </ol>

      <h2>Bảng size giày — Cách đo chân chuẩn</h2>
      <p>
        Một lý do phổ biến khiến giày online không vừa là đo size không đúng.
        Hướng dẫn đo chân tại nhà:
      </p>
      <ul>
        <li>Đo vào cuối ngày (chân thường to hơn buổi sáng)</li>
        <li>Đo cả hai chân — chân không đều nhau là bình thường, chọn size theo chân lớn hơn</li>
        <li>Cộng thêm 0.5–1cm so với chiều dài chân để có đủ không gian</li>
        <li>Tham khảo bảng size trên trang sản phẩm — mỗi thương hiệu có bảng size khác nhau</li>
      </ul>
      <RelatedArticles currentHref="/resources/san-giay-chinh-hang" />
    </ArticleLayout>
  );
}
