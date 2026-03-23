/**
 * Cookie Policy — /cookies
 *
 * Explains exactly what cookies and similar technologies VoucherFinder uses,
 * why they exist, and how users can control or disable them.
 *
 * Written to match the architecture described in the Privacy Policy:
 *   - admin_session_v2 cookie  (functional, required for admin auth)
 *   - localStorage (vf_history_v1)  (client-side only, user-controlled)
 *   - No third-party analytics or advertising cookies
 *
 * This is NOT a cookie consent banner page — the service does not use
 * non-essential tracking cookies that require consent under GDPR/ePrivacy.
 * This page exists for transparency and completeness.
 */

import { InfoPageLayout } from '@/components/public';
import { SITE_CONFIG, SITE_METADATA_DESCRIPTION_TEMPLATE } from '@/lib/public/site-config';

export const metadata = {
  title: 'Chính sách Cookie',
  description:
    'Chính sách cookie của VoucherFinder — cookie nào được sử dụng, mục đích, thời hạn, và cách bạn kiểm soát chúng.',
  keywords: ['cookie', 'chính sách cookie', 'localStorage', 'tracking', 'privacy'],

  alternates: {
    canonical: '/cookies',
  },

  openGraph: {
    title: 'Chính sách Cookie | VoucherFinder',
    description:
      'Cookie nào VoucherFinder sử dụng, mục đích, thời hạn, và cách bạn kiểm soát chúng.',
    url: '/cookies',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: 'Chính sách Cookie | VoucherFinder',
  },
};

export default function CookiesPage() {
  return (
    <InfoPageLayout
      title="Chính sách Cookie"
      description={SITE_METADATA_DESCRIPTION_TEMPLATE}
      lastUpdated="Tháng 3, 2026"
      breadcrumb={{ label: 'Chính sách Cookie', href: '/cookies' }}
    >
      {/* What this page is */}
      <section>
        <h2>Giải thích ngắn</h2>
        <p>
          Trang này giải thích chi tiết cookie và các công nghệ lưu trữ tương tự
          mà VoucherFinder sử dụng, mục đích của từng loại, và cách bạn có thể
          kiểm soát chúng.
        </p>
        <div className="note">
          <p className="note-title">Không sử dụng cookie theo dõi mặc định</p>
          <p>
            VoucherFinder không sử dụng cookie phân tích hành vi hay cookie quảng cáo
            của bên thứ ba. Công cụ phân tích (nếu được bật) sử dụng session ID ngẫu
            nhiên — không phải cookie, không lưu trên máy chủ, và không chứa thông tin
            cá nhân. Không có banner yêu cầu đồng ý cookie.
          </p>
        </div>
      </section>

      {/* What are cookies */}
      <section>
        <h2>Cookie là gì?</h2>
        <p>
          Cookie là các tệp nhỏ được lưu trữ trên thiết bị của bạn (máy tính,
          điện thoại) khi bạn truy cập một trang web. Chúng được trình duyệt gửi
          trở lại máy chủ mỗi khi bạn truy cập trang đó, cho phép trang web ghi nhớ
          thông tin về phiên làm việc của bạn.
        </p>
        <p>
          Ngoài cookie, trình duyệt còn hỗ trợ các cơ chế lưu trữ cục bộ khác như
          localStorage và sessionStorage — dữ liệu được lưu hoàn toàn trên thiết bị
          của bạn mà không bao giờ gửi đến máy chủ.
        </p>
      </section>

      {/* Cookie table */}
      <section>
        <h2>Cookie và công nghệ lưu trữ chúng tôi sử dụng</h2>
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Loại</th>
              <th>Mục đích</th>
              <th>Thời hạn</th>
              <th>Dữ liệu được gửi đến máy chủ?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>admin_session_v2</code></td>
              <td>Cookie (HTTP)</td>
              <td>
                Xác thực đăng nhập cho tài khoản quản trị VoucherFinder.
                Chứa mã phiên được ký HMAC-SHA256.
              </td>
              <td>7 ngày hoặc khi đăng xuất</td>
              <td>Có — gửi tự động với mỗi yêu cầu đến trang quản trị</td>
            </tr>
            <tr>
              <td><code>vf_history_v1</code></td>
              <td>localStorage</td>
              <td>
                Lưu lịch sử tra cứu mã giảm giá của bạn trên thiết bị cục bộ.
                <strong> Không phải cookie.</strong>
              </td>
              <td>Vĩnh viễn cho đến khi bạn xóa dữ liệu trang web trong trình duyệt</td>
              <td>Không — dữ liệu không bao giờ rời khỏi thiết bị của bạn</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* What we do NOT use */}
      <section>
        <h2>Chúng tôi KHÔNG sử dụng</h2>
        <p>VoucherFinder cam kết không sử dụng các công nghệ sau:</p>
        <ul>
          <li>
            <strong>Cookie quảng cáo</strong> — Không có cookie của mạng quảng cáo
            (Google Ads, Facebook Ads, Criteo, v.v.).
          </li>
          <li>
            <strong>Cookie bên thứ ba (third-party cookies)</strong> — Không có script
            bên thứ ba nào đặt cookie trên trang của chúng tôi.
          </li>
          <li>
            <strong>Pixel tracking / fingerprinting</strong> — Không có pixel ẩn hay
            kỹ thuật nhận dạng thiết bị.
          </li>
          <li>
            <strong>Cookie mạng xã hội</strong> — Không có nút chia sẻ Facebook,
            Twitter, hay các nút mạng xã hội khác trên trang.
          </li>
        </ul>
      </section>

      {/* Analytics section */}
      <section>
        <h2>Công cụ phân tích (opt-in)</h2>
        <p>
          VoucherFinder có thể bật Google Analytics 4 hoặc Umami (tự host) để thu thập
          dữ liệu hành vi ẩn danh phục vụ cải thiện trải nghiệm người dùng. Tính năng
          này <strong>không được bật mặc định</strong> — phải được kích hoạt thủ công
          qua biến môi trường.
        </p>
        <p>Khi được bật, hệ thống theo dõi:</p>
        <ul>
          <li>Tên trang được truy cập (đường dẫn URL, không phải URL đầy đủ)</li>
          <li>Thao tác chính: nhấn nút tìm mã, sao chép mã voucher, nhấp ra Shopee</li>
          <li>Tỷ lệ thành công / thất bại khi tra cứu</li>
          <li>Session ID ngẫu nhiên (UUID4, chỉ lưu trong session trình duyệt)</li>
        </ul>
        <p>Không bao giờ thu thập: email, mật khẩu, URL sản phẩm đầy đủ, IP,
        hoặc bất kỳ dữ liệu cá nhân nào.</p>
        <p>
          Để tắt phân tích: đặt <code>NEXT_PUBLIC_ANALYTICS_ENABLED=false</code>{' '}
          trong biến môi trường và rebuild.
        </p>
      </section>

      {/* How to control */}
      <section>
        <h2>Cách kiểm soát hoặc xóa dữ liệu lưu trữ</h2>

        <h3>Xóa localStorage (lịch sử tra cứu)</h3>
        <p>
          Dữ liệu <code>vf_history_v1</code> nằm hoàn toàn trên thiết bị của bạn.
          Để xóa:
        </p>
        <ul>
          <li>
            <strong>Chrome / Edge:</strong> Cài đặt → Quyền riêng tư và bảo mật →
            Xóa dữ liệu duyệt web → Chọn "Cookie và dữ liệu trang web khác" →
            Xóa dữ liệu cho voucherfinder.app
          </li>
          <li>
            <strong>Firefox:</strong> Cài đặt → Quyền riêng tư và Bảo mật →
            Cookie và dữ liệu trang web → Quản lý dữ liệu → Xóa cho voucherfinder.app
          </li>
          <li>
            <strong>Safari:</strong> Cài đặt → Quyền riêng tư → Quản lý dữ liệu trang web
            → Tìm voucherfinder.app → Xóa
          </li>
        </ul>

        <h3>Xóa cookie đăng nhập quản trị</h3>
        <p>
          Nếu bạn đã đăng nhập vào trang quản trị và muốn đăng xuất ngay lập tức,
          truy cập trang <a href="/admin/login">Đăng nhập quản trị</a> và nhấn
          "Đăng xuất". Cookie sẽ bị xóa tự động.
        </p>

        <h3>Tắt cookie hoàn toàn</h3>
        <p>
          Hầu hết trình duyệt cho phép bạn tắt cookie hoàn toàn qua cài đặt.
          Lưu ý rằng nếu bạn tắt tất cả cookie, trang quản trị VoucherFinder sẽ
          không thể hoạt động (vì chức năng đăng nhập phụ thuộc vào cookie phiên).
          Trang tra cứu mã giảm giá công khai không bị ảnh hưởng vì không sử dụng cookie.
        </p>
      </section>

      {/* Changes */}
      <section>
        <h2>Thay đổi chính sách</h2>
        <p>
          Nếu VoucherFinder bắt đầu sử dụng bất kỳ cookie hoặc công nghệ theo dõi
          mới nào, trang này sẽ được cập nhật và thay đổi sẽ có hiệu lực sau 30 ngày.
        </p>
      </section>

      {/* Contact */}
      <section>
        <h2>Câu hỏi?</h2>
        <p>
          Nếu bạn có câu hỏi về cách VoucherFinder sử dụng cookie hoặc lưu trữ
          dữ liệu, vui lòng liên hệ qua <a href="/info/contact">trang Liên hệ</a> hoặc
          email: <a href={`mailto:${SITE_CONFIG.email}`}>{SITE_CONFIG.email}</a>.
        </p>
      </section>
    </InfoPageLayout>
  );
}
