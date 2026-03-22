/**
 * About Page — /about
 *
 * Explains what VoucherFinder is, how it works, who runs it, and why it exists.
 * Designed to pass Shopee affiliate/network publisher review.
 */

import { InfoPageLayout } from '@/components/public';
import { ShieldCheck, Zap, Lock, Star } from 'lucide-react';

export const metadata = {
  title: 'Giới thiệu VoucherFinder',
  description:
    'Tìm hiểu VoucherFinder là gì, cách thức hoạt động, đội ngũ vận hành, và cam kết của chúng tôi trong việc giúp người mua sắm tiết kiệm khi mua trên Shopee Việt Nam.',
  keywords: [
    'về VoucherFinder',
    'giới thiệu VoucherFinder',
    'cách hoạt động',
    'mã giảm giá Shopee',
    'tiết kiệm Shopee',
  ],

  alternates: {
    canonical: '/about',
  },

  openGraph: {
    title: 'Về VoucherFinder — Công cụ tìm mã giảm giá Shopee miễn phí',
    description:
      'Tìm hiểu VoucherFinder là gì, cách thức hoạt động, và cam kết của chúng tôi trong việc giúp người mua sắm tiết kiệm khi mua trên Shopee.',
    url: '/about',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: 'Về VoucherFinder',
    description: 'Công cụ tìm mã giảm giá Shopee miễn phí, không quảng cáo.',
  },
};

export default function AboutPage() {
  return (
    <InfoPageLayout
      title="Về VoucherFinder"
      description="Công cụ tìm mã giảm giá Shopee miễn phí — không quảng cáo, không phí dịch vụ."
      lastUpdated="Tháng 3, 2026"
      breadcrumb={{ label: 'Giới thiệu', href: '/about' }}
    >
      {/* Mission statement */}
      <section>
        <h2>VoucherFinder là gì?</h2>
        <p>
          VoucherFinder là một công cụ tra cứu mã giảm giá miễn phí, được xây dựng
          để giúp người mua sắm trên <strong>Shopee Việt Nam</strong> tìm được mã
          voucher tốt nhất cho sản phẩm họ muốn mua.
        </p>
        <p>
          Chúng tôi không phải trang thương mại điện tử, không bán hàng, và không
          phải là đại lý hay chi nhánh chính thức của Shopee. VoucherFinder là một
          công cụ độc lập do một nhóm nhỏ vận hành với mục tiêu duy nhất: giúp bạn
          tiết kiệm thời gian và tiền bạc khi mua sắm.
        </p>
      </section>

      {/* How it works */}
      <section>
        <h2>Cách thức hoạt động</h2>
        <p>
          VoucherFinder kết nối với các hệ thống khuyến mãi đối tác để tra cứu và
          xác thực các mã voucher còn hiệu lực cho sản phẩm cụ thể mà bạn nhập vào.
        </p>
        <p>Quy trình đơn giản trong 3 bước:</p>
        <ol>
          <li>
            <strong>Dán đường dẫn sản phẩm Shopee</strong> — sao chép link sản phẩm
            từ trang Shopee và dán vào thanh tra cứu.
          </li>
          <li>
            <strong>Đợi hệ thống phân tích</strong> — VoucherFinder tự động kiểm tra
            các chương trình khuyến mãi đang hoạt động cho sản phẩm đó.
          </li>
          <li>
            <strong>Sao chép mã và mua sắm</strong> — chọn mã voucher phù hợp nhất,
            sao chép, và sử dụng khi thanh toán trên Shopee.
          </li>
        </ol>
        <p>
          Toàn bộ quá trình diễn ra trong vài giây. Không cần đăng nhập Shopee,
          không cần tạo tài khoản VoucherFinder.
        </p>
      </section>

      {/* Key differentiators */}
      <section>
        <h2>Điểm khác biệt</h2>
        <div className="not-prose grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: Zap,
              title: 'Miễn phí hoàn toàn',
              desc: 'Không phí dịch vụ, không giới hạn số lần tra cứu, không yêu cầu đăng ký.',
            },
            {
              icon: ShieldCheck,
              title: 'Không quảng cáo',
              desc: 'Không có banner, popup, hay liên kết tiếp thị ảnh hưởng đến trải nghiệm.',
            },
            {
              icon: Lock,
              title: 'Riêng tư',
              desc: 'Không lưu trữ thông tin cá nhân. Không yêu cầu đăng nhập Shopee hay tài khoản bên thứ ba.',
            },
            {
              icon: Star,
              title: 'Lịch sử cục bộ',
              desc: 'Lịch sử tra cứu được lưu trong trình duyệt (localStorage) — hoàn toàn trên thiết bị của bạn.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-gray-200 bg-white p-4 space-y-2"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                  <Icon className="h-4 w-4 text-brand-600" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
              </div>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Limitations */}
      <section>
        <h2>Giới hạn của dịch vụ</h2>
        <p>VoucherFinder có một số điểm cần lưu ý để bạn có kỳ vọng thực tế:</p>
        <ul>
          <li>
            <strong>Không đảm bảo mã luôn hoạt động</strong> — Các mã voucher có thể
            hết hạn hoặc bị giới hạn số lượng sử dụng ngoài tầm kiểm soát của chúng tôi.
            Chúng tôi cố gắng xác thực mã, nhưng không thể đảm bảo 100%.
          </li>
          <li>
            <strong>Chỉ hỗ trợ Shopee Việt Nam</strong> — Hiện tại, công cụ chỉ
            phân tích sản phẩm trên Shopee Việt Nam. Các nền tảng khác (Lazada, Tiki,
            TikTok Shop, v.v.) chưa được hỗ trợ.
          </li>
          <li>
            <strong>Không phải công cụ affiliate</strong> — VoucherFinder không theo dõi
            hay ghi nhận hoa hồng từ các giao dịch mua hàng của bạn. Xem{' '}
            <a href="/affiliate-disclosure">trang Công khai liên kết</a> để biết chi tiết.
          </li>
        </ul>
        <div className="note">
          <p className="note-title">Lưu ý</p>
          <p>
            Các chương trình khuyến mãi trên Shopee có thể thay đổi bất cứ lúc nào
            mà không có thông báo trước. Luôn kiểm tra lại mã tại bước thanh toán
            trước khi xác nhận đơn hàng.
          </p>
        </div>
      </section>

      {/* No conflict of interest */}
      <section>
        <h2>Cam kết không có xung đột lợi ích</h2>
        <p>
          VoucherFinder hoạt động độc lập. Chúng tôi không có mối quan hệ tài chính
          với Shopee hay bất kỳ người bán nào trên nền tảng.
        </p>
        <p>
          Điều này có nghĩa: mã voucher chúng tôi hiển thị không bị ảnh hưởng bởi
          bất kỳ khoản hoa hồng hay thỏa thuận thương mại nào. Chúng tôi luôn hiển
          thị mã tốt nhất cho sản phẩm của bạn — không phải mã nào có hoa hồng cao nhất.
        </p>
        <p>
          Xem <a href="/affiliate-disclosure">Công khai liên kết</a> để biết chính
          sách đầy đủ về mối quan hệ với các nền tảng thương mại điện tử.
        </p>
      </section>

      {/* Data commitments */}
      <section>
        <h2>Cam kết về dữ liệu</h2>
        <ul>
          <li>
            <strong>Không thu thập dữ liệu cá nhân</strong> — Chúng tôi không lưu trữ
            email, số điện thoại hay bất kỳ thông tin nhận dạng nào của bạn khi bạn
            sử dụng công cụ tra cứu.
          </li>
          <li>
            <strong>Không bán dữ liệu</strong> — Không có hoạt động thương mại hóa
            dữ liệu người dùng dưới bất kỳ hình thức nào.
          </li>
          <li>
            <strong>Không theo dõi hành vi</strong> — Không có Google Analytics,
            pixel tracking, hay fingerprinting trên trang.
          </li>
          <li>
            <strong>Minh bạch</strong> — Mọi thông tin về cách dữ liệu được xử lý
            đều có trong <a href="/privacy">Chính sách bảo mật</a> và{' '}
            <a href="/cookies">Chính sách Cookie</a>.
          </li>
        </ul>
      </section>

      {/* Contact CTA */}
      <section>
        <h2>Câu hỏi?</h2>
        <p>
          Nếu bạn có phản hồi, báo lỗi, câu hỏi về dịch vụ, hoặc muốn hợp tác,
          vui lòng xem trang <a href="/contact">Liên hệ</a> để biết thông tin
          liên lạc. Chúng tôi đọc mọi tin nhắn và phản hồi trong vòng 2–5 ngày
          làm việc.
        </p>
      </section>
    </InfoPageLayout>
  );
}
