/**
 * Terms of Service — /terms
 *
 * Clear, realistic terms that reflect the actual service scope.
 * Written to be enforceable — no placeholder "all rights reserved" fluff.
 */

import { InfoPageLayout, Prose } from '@/components/public';
import { SITE_CONFIG, SITE_METADATA_DESCRIPTION_TEMPLATE } from '@/lib/public/site-config';

export const metadata = {
  title: 'Điều khoản sử dụng',
  description:
    'Điều khoản sử dụng dịch vụ VoucherFinder — quyền, trách nhiệm, và giới hạn của người dùng khi sử dụng công cụ tìm mã giảm giá Shopee.',
  keywords: ['điều khoản sử dụng', 'terms of service', 'tos'],

  alternates: {
    canonical: '/terms',
  },

  openGraph: {
    title: 'Điều khoản sử dụng | VoucherFinder',
    description:
      'Điều khoản sử dụng dịch vụ VoucherFinder — quyền, trách nhiệm, và giới hạn.',
    url: '/terms',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: 'Điều khoản sử dụng | VoucherFinder',
  },
};

export default function TermsPage() {
  return (
    <InfoPageLayout
      title="Điều khoản sử dụng"
      description={`${SITE_METADATA_DESCRIPTION_TEMPLATE}. Sử dụng VoucherFinder đồng nghĩa với việc bạn đồng ý với các điều khoản này.`}
      lastUpdated="Tháng 3, 2026"
      breadcrumb={{ label: 'Điều khoản sử dụng', href: '/terms' }}
    >
      {/* Acceptance */}
      <section>
        <h2>1. Chấp nhận điều khoản</h2>
        <p>
          Bằng việc truy cập hoặc sử dụng VoucherFinder, bạn xác nhận rằng đã đọc, hiểu, và đồng ý
          bị ràng buộc bởi các Điều khoản sử dụng này. Nếu bạn không đồng ý với bất kỳ phần nào
          của điều khoản, vui lòng ngừng sử dụng dịch vụ.
        </p>
      </section>

      {/* Service Description */}
      <section>
        <h2>2. Mô tả dịch vụ</h2>
        <p>
          VoucherFinder là công cụ tra cứu mã giảm giá miễn phí cho sản phẩm trên Shopee Việt Nam.
          Dịch vụ hoạt động bằng cách kết nối với hệ thống API nội bộ để phân tích và xác thực
          các mã voucher hợp lệ cho sản phẩm cụ thể.
        </p>
        <p>Chúng tôi cung cấp dịch vụ này trên cơ sở "như hiện có" ("as is").</p>
      </section>

      {/* User Obligations */}
      <section>
        <h2>3. Trách nhiệm của người dùng</h2>
        <p>Bạn đồng ý sử dụng VoucherFinder một cách có trách nhiệm:</p>
        <ul>
          <li>
            <strong>Không sử dụng cho mục đích bất hợp pháp</strong> — Không sử dụng công cụ cho
            bất kỳ hoạt động trái phép, lừa đảo, hoặc vi phạm quyền sở hữu trí tuệ.
          </li>
          <li>
            <strong>Không spam hoặc lạm dụng</strong> — Không gửi yêu cầu tự động, spam, hoặc
            sử dụng bot để truy cập dịch vụ.
          </li>
          <li>
            <strong>Tuân thủ pháp luật</strong> — Chịu trách nhiệm đảm bảo việc sử dụng của bạn
            tuân thủ pháp luật Việt Nam hiện hành.
          </li>
          <li>
            <strong>Độ tuổi</strong> — Bạn phải đủ 16 tuổi trở lên để sử dụng dịch vụ.
          </li>
        </ul>
      </section>

      {/* Disclaimer / No Warranty */}
      <section>
        <h2>4. Không có bảo hành</h2>
        <p>
          VoucherFinder được cung cấp trên cơ sở "như hiện có" và "như sẵn có" mà không có bảo hành
          dưới bất kỳ hình thức nào, rõ ràng hay ngụ ý.
        </p>
        <p>Chúng tôi không bảo đảm:</p>
        <ul>
          <li>Mã giảm giá luôn hoạt động hoặc còn hiệu lực tại thời điểm bạn sử dụng.</li>
          <li>Dịch vụ không bị gián đoạn, an toàn, hoặc không có lỗi.</li>
          <li>Kết quả phân tích hoàn toàn chính xác hoặc phù hợp với mục đích cụ thể của bạn.</li>
          <li>Mức giảm giá được hiển thị là mức tốt nhất có thể.</li>
        </ul>
        <p>
          Các mã voucher được cung cấp bởi hệ thống đối tác của Shopee và nằm ngoài tầm kiểm soát
          trực tiếp của VoucherFinder. Chúng tôi không chịu trách nhiệm nếu mã không hoạt động
          hoặc đã hết hạn.
        </p>
      </section>

      {/* Limitation of Liability */}
      <section>
        <h2>5. Giới hạn trách nhiệm</h2>
        <p>
          Trong phạm vi tối đa được pháp luật cho phép, VoucherFinder và các bên vận hành{' '}
          <strong>không chịu trách nhiệm</strong> đối với bất kỳ thiệt hại gián tiếp, ngẫu nhiên,
          đặc biệt, hoặc do hậu quả nào phát sinh từ:
        </p>
        <ul>
          <li>Việc sử dụng hoặc không thể sử dụng dịch vụ.</li>
          <li>Các mã giảm giá không hoạt động, hết hạn, hoặc không đúng như quảng cáo.</li>
          <li>Thiệt hại phát sinh từ giao dịch mua hàng trên Shopee.</li>
          <li>Mọi tổn thất tài chính, mất dữ liệu, hoặc thiệt hại uy tín.</li>
        </ul>
        <p>
          Trách nhiệm tổng cộng của chúng tôi (nếu có) không vượt quá{' '}
          <strong>50.000 VNĐ (năm mươi nghìn đồng)</strong> cho bất kỳ khiếu nại nào phát
          sinh từ việc sử dụng dịch vụ.
        </p>
      </section>

      {/* Intellectual Property */}
      <section>
        <h2>6. Sở hữu trí tuệ</h2>
        <p>
          Tên thương hiệu "VoucherFinder", logo, giao diện người dùng, mã nguồn, và nội dung
          trên trang web này thuộc quyền sở hữu của VoucherFinder hoặc các bên cấp phép.
        </p>
        <p>Bạn không được:</p>
        <ul>
          <li>Sao chép, phân phối, hoặc tạo sản phẩm phái sinh từ mã nguồn hoặc nội dung.</li>
          <li>Sử dụng thương hiệu VoucherFinder để mạo danh hoặc gây nhầm lẫn.</li>
          <li>Thu thập nội dung bằng công cụ tự động mà không có sự đồng ý bằng văn bản.</li>
        </ul>
      </section>

      {/* Third Party Links */}
      <section>
        <h2>7. Đường dẫn đến bên thứ ba</h2>
        <p>
          Trang này có thể chứa đường dẫn đến trang web của bên thứ ba (bao gồm Shopee và các
          nền tảng thương mại điện tử khác). Các đường dẫn này chỉ nhằm mục đích thuận tiện cho
          bạn. Chúng tôi không kiểm soát, xác minh, hay chịu trách nhiệm về nội dung, chính
          sách bảo mật, hay hoạt động của các trang bên thứ ba.
        </p>
        <p>
          Khi rời khỏi VoucherFinder, bạn nên đọc điều khoản và chính sách bảo mật của trang
          đích trước khi cung cấp bất kỳ thông tin nào.
        </p>
      </section>

      {/* Service Changes */}
      <section>
        <h2>8. Thay đổi dịch vụ</h2>
        <p>
          VoucherFinder giữ quyền thay đổi, tạm ngừng, hoặc ngừng cung cấp dịch vụ (toàn bộ
          hoặc một phần) bất cứ lúc nào, có hoặc không có thông báo trước.
        </p>
        <p>
          Chúng tôi có thể thay đổi cấu trúc giá, tính năng, hoặc phạm vi dịch vụ mà không
          chịu trách nhiệm về bất kỳ thiệt hại nào phát sinh từ các thay đổi đó.
        </p>
      </section>

      {/* Account / Admin Access */}
      <section>
        <h2>9. Tài khoản quản trị</h2>
        <p>
          Một số tính năng của VoucherFinder (bảng điều khiển quản trị) yêu cầu đăng nhập bằng
          tài khoản được cấp phép. Bạn chịu trách nhiệm:
        </p>
        <ul>
          <li>Bảo mật thông tin đăng nhập của mình.</li>
          <li>Thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép.</li>
          <li>Đăng xuất sau mỗi phiên làm việc trên thiết bị dùng chung.</li>
        </ul>
      </section>

      {/* Termination */}
      <section>
        <h2>10. Chấm dứt</h2>
        <p>
          Bạn có thể ngừng sử dụng VoucherFinder bất cứ lúc nào mà không cần thông báo.
          Chúng tôi có thể chấm dứt hoặc tạm ngừng quyền truy cập của bạn nếu:
        </p>
        <ul>
          <li>Bạn vi phạm các điều khoản sử dụng này.</li>
          <li>Hành vi của bạn gây nguy hiểm cho hệ thống hoặc người dùng khác.</li>
          <li>Chúng tôi bị yêu cầu bởi cơ quan có thẩm quyền.</li>
        </ul>
      </section>

      {/* Governing Law */}
      <section>
        <h2>11. Luật áp dụng và giải quyết tranh chấp</h2>
        <p>
          Các điều khoản này được điều chỉnh bởi và được giải thích theo pháp luật
          <strong> nước Cộng hòa xã hội chủ nghĩa Việt Nam</strong>.
        </p>
        <p>
          Mọi tranh chấp phát sinh từ hoặc liên quan đến việc sử dụng VoucherFinder sẽ được
          giải quyết trước tiên bằng thương lượng thiện chí. Nếu không đạt được thỏa thuận
          trong vòng 30 ngày, tranh chấp sẽ được đưa ra Tòa án nhân dân có thẩm quyền
          tại Thành phố Hồ Chí Minh.
        </p>
      </section>

      {/* Contact */}
      <section>
        <h2>12. Liên hệ</h2>
        <p>
          Nếu bạn có câu hỏi về các điều khoản này, vui lòng liên hệ qua{' '}
          <a href="/contact">trang Liên hệ</a> hoặc email:{' '}
          <a href={`mailto:${SITE_CONFIG.email}`}>{SITE_CONFIG.email}</a>.
        </p>
      </section>
    </InfoPageLayout>
  );
}
