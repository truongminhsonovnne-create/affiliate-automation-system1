/**
 * Privacy Policy — /privacy
 *
 * Accurate reflection of what data VoucherFinder actually collects and processes.
 * Aligned with GDPR and Vietnamese PDPD 2018 requirements.
 */

import { InfoPageLayout, Prose } from '@/components/public';
import { SITE_CONFIG, SITE_METADATA_DESCRIPTION_TEMPLATE } from '@/lib/public/site-config';

export const metadata = {
  title: 'Chính sách bảo mật',
  description:
    'Chính sách bảo mật của VoucherFinder — dữ liệu nào được thu thập, cách sử dụng, lưu trữ, và quyền của bạn. Cam kết bảo vệ quyền riêng tư.',
  keywords: ['chính sách bảo mật', 'privacy policy', 'dữ liệu cá nhân', 'cookie'],

  alternates: {
    canonical: '/privacy',
  },

  openGraph: {
    title: 'Chính sách bảo mật | VoucherFinder',
    description:
      'Chính sách bảo mật của VoucherFinder — dữ liệu nào được thu thập, cách sử dụng, và quyền của bạn.',
    url: '/info/privacy',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'VoucherFinder — Chính sách bảo mật',
      },
    ],
  },

  twitter: {
    card: 'summary',
    title: 'Chính sách bảo mật | VoucherFinder',
  },
};

export default function PrivacyPage() {
  return (
    <InfoPageLayout
      title="Chính sách bảo mật"
      description={SITE_METADATA_DESCRIPTION_TEMPLATE}
      lastUpdated="Tháng 3, 2026"
      breadcrumb={{ label: 'Chính sách bảo mật', href: '/privacy' }}
    >
      {/* Overview */}
      <section>
        <h2>Tổng quan</h2>
        <p>
          VoucherFinder cam kết bảo vệ quyền riêng tư của bạn. Chúng tôi thu thập rất ít dữ liệu —
          thực tế chỉ những thông tin cần thiết để vận hành dịch vụ. Trang này mô tả chính xác
          dữ liệu nào được thu thập, cách sử dụng, và những gì chúng tôi không thu thập.
        </p>
      </section>

      {/* Data We Collect */}
      <section>
        <h2>Dữ liệu chúng tôi thu thập</h2>

        <h3>Dữ liệu bạn nhập (đầu vào công cụ)</h3>
        <p>
          Khi bạn sử dụng công cụ tìm mã giảm giá, bạn nhập <strong>đường dẫn (URL) sản phẩm Shopee</strong>.
          Đường dẫn này được xử lý tạm thời để phân tích sản phẩm và trả về kết quả. Chúng tôi{' '}
          <strong>không lưu trữ</strong> đường dẫn này trên máy chủ. Đường dẫn không được gắn với
          danh tính cá nhân của bạn.
        </p>

        <h3>Yêu cầu tra cứu (API nội bộ)</h3>
        <p>
          Khi bạn tra cứu mã giảm giá, trình duyệt của bạn gửi yêu cầu đến máy chủ
          của VoucherFinder, máy chủ này kết nối đến hệ thống khuyến mãi để lấy
          thông tin voucher. Trong quá trình này, yêu cầu có thể chứa địa chỉ IP
          và thông tin trình duyệt tiêu chuẩn của bạn — tương tự như bất kỳ trang
          web nào khác.
        </p>
        <p>
          <strong>Không có dữ liệu cá nhân như email, tên, số điện thoại được gửi kèm.</strong>
          Chúng tôi không chia sẻ dữ liệu này với bên thứ ba cho mục đích quảng cáo
          hay phân tích hành vi.
        </p>

        <h3>Dữ liệu tra cứu (localStorage)</h3>
        <p>
          Lịch sử tra cứu của bạn được lưu trong <strong>localStorage của trình duyệt</strong> — hoàn toàn
          nằm trên thiết bị của bạn. Chúng tôi không có quyền truy cập vào dữ liệu này. Bạn có thể
          xóa lịch sử bất cứ lúc nào bằng cách xóa dữ liệu trang web trong cài đặt trình duyệt.
        </p>
        <p>Dữ liệu localStorage bao gồm:</p>
        <ul>
          <li>Đường dẫn sản phẩm bạn đã tra cứu</li>
          <li>Mã giảm giá được trả về</li>
          <li>Nhãn hiển thị sản phẩm</li>
          <li>Trạng thái "ghim" của từng mục (nếu có)</li>
        </ul>

        <h3>Dữ liệu đăng nhập quản trị</h3>
        <p>
          Nếu bạn là quản trị viên của VoucherFinder, chúng tôi lưu trữ một <strong>session token</strong>{' '}
          (mã phiên làm việc) dưới dạng cookie để xác thực đăng nhập. Session được mã hóa bằng HMAC-SHA256
          và có thời hạn. Không có mật khẩu hoặc thông tin đăng nhập nào được lưu dưới dạng văn bản rõ.
        </p>

        <h3>Dữ liệu yêu cầu pháp lý (contact form)</h3>
        <p>
          Khi bạn gửi phản hồi qua trang Liên hệ, email và nội dung bạn nhập sẽ được gửi đến hộp thư
          của đội ngũ vận hành và được lưu trong hệ thống email. Chúng tôi không chia sẻ dữ liệu này
          với bên thứ ba.
        </p>

        <h3>Dữ liệu truy cập tiêu chuẩn (server logs)</h3>
        <p>
          Như mọi dịch vụ web, máy chủ lưu trữ nhật ký truy cập tiêu chuẩn bao gồm:
        </p>
        <ul>
          <li>Địa chỉ IP của yêu cầu</li>
          <li>Đường dẫn trang được truy cập</li>
          <li>Thời gian yêu cầu</li>
          <li>Trình duyệt và hệ điều hành (User-Agent)</li>
        </ul>
        <p>
          Các nhật ký này được sử dụng duy nhất để vận hành và bảo mật hệ thống. Chúng tôi không sử dụng
          các công cụ phân tích (analytics) của bên thứ ba như Google Analytics.
        </p>
      </section>

      {/* Cookies */}
      <section>
        <h2>Cookie và lưu trữ cục bộ</h2>
        <p>
          VoucherFinder chỉ sử dụng một số ít công nghệ lưu trữ. Chi tiết đầy đủ
          có trong trang <a href="/info/cookies">Chính sách Cookie</a>. Bảng dưới đây
          là tóm tắt nhanh:
        </p>
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Mục đích</th>
              <th>Thời hạn</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>admin_session_v2</code></td>
              <td>Xác thực đăng nhập quản trị viên</td>
              <td>7 ngày hoặc khi đăng xuất</td>
            </tr>
            <tr>
              <td><code>vf_history_v1</code></td>
              <td>Lưu trữ trong localStorage của trình duyệt — không phải cookie</td>
              <td>Vĩnh viễn cho đến khi bạn xóa</td>
            </tr>
          </tbody>
        </table>
        <p>
          Chúng tôi không sử dụng cookie tracking cho mục đích quảng cáo hay phân tích hành vi.
          Không có pixel tracking hay fingerprinting.
        </p>
      </section>

      {/* Third Parties */}
      <section>
        <h2>Dữ liệu được chia sẻ với bên thứ ba</h2>
        <p>
          VoucherFinder <strong>không bán, cho thuê, hoặc chia sẻ</strong> dữ liệu cá nhân của bạn
          với bất kỳ bên thứ ba nào cho mục đích tiếp thị.
        </p>
        <p>Dữ liệu có thể được chia sẻ trong các trường hợp sau:</p>
        <ul>
          <li>
            <strong>Khi bắt buộc pháp lý</strong> — Nếu yêu cầu bởi cơ quan nhà nước có thẩm quyền
            theo quy định của pháp luật Việt Nam.
          </li>
          <li>
            <strong>Để bảo vệ quyền lợi hợp pháp</strong> — Khi cần thiết để bảo vệ hệ thống khỏi
            truy cập trái phép hoặc lạm dụng.
          </li>
        </ul>
      </section>

      {/* Data Retention */}
      <section>
        <h2>Lưu trữ và xóa dữ liệu</h2>
        <p>Chính sách lưu trữ của chúng tôi:</p>
        <ul>
          <li>
            <strong>Dữ liệu localStorage</strong> — Lưu vĩnh viễn trên thiết bị của bạn cho đến khi bạn xóa.
            Không nằm trên máy chủ của chúng tôi.
          </li>
          <li>
            <strong>Session cookie quản trị</strong> — Tự động hết hạn sau 7 ngày hoặc khi đăng xuất.
          </li>
          <li>
            <strong>Tin nhắn liên hệ</strong> — Được giữ trong hệ thống email cho đến khi bạn yêu cầu xóa.
          </li>
          <li>
            <strong>Nhật ký truy cập máy chủ</strong> — Tự động xóa sau 90 ngày.
          </li>
        </ul>
      </section>

      {/* Your Rights */}
      <section>
        <h2>Quyền của bạn</h2>
        <p>Bạn có các quyền sau đối với dữ liệu của mình:</p>
        <ul>
          <li>
            <strong>Quyền truy cập</strong> — Yêu cầu thông tin về dữ liệu nào chúng tôi lưu trữ liên quan đến bạn.
          </li>
          <li>
            <strong>Quyền xóa</strong> — Yêu cầu xóa dữ liệu bạn đã gửi qua form liên hệ.
          </li>
          <li>
            <strong>Quyền phản đối</strong> — Phản đối việc xử lý dữ liệu trong các trường hợp cụ thể.
          </li>
          <li>
            <strong>Quyền rút lại consent</strong> — Rút lại bất kỳ sự đồng ý nào đã cho trước đó.
          </li>
        </ul>
        <p>
          Để thực hiện quyền của bạn, vui lòng gửi yêu cầu qua{' '}
          <a href="/info/contact">trang Liên hệ</a> với tiêu đề "Yêu cầu xóa dữ liệu" hoặc
          "Yêu cầu truy cập dữ liệu".
        </p>
      </section>

      {/* Data Controller */}
      <section>
        <h2>Bộ phận quản lý dữ liệu</h2>
        <p>
          VoucherFinder là dịch vụ được vận hành bởi một nhóm nhỏ. Để liên hệ về các vấn đề liên quan
          đến bảo mật dữ liệu: <a href={`mailto:${SITE_CONFIG.email}`}>{SITE_CONFIG.email}</a>
        </p>
      </section>

      {/* Changes */}
      <section>
        <h2>Thay đổi chính sách</h2>
        <p>
          Nếu có thay đổi về cách chúng tôi thu thập hoặc sử dụng dữ liệu, trang này sẽ được cập nhật
          và thông báo rõ ràng tại chân trang. Các thay đổi quan trọng sẽ có hiệu lực sau 30 ngày
          kể từ ngày đăng.
        </p>
      </section>
    </InfoPageLayout>
  );
}
