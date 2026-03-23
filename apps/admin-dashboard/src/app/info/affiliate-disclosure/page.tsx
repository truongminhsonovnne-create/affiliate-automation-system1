/**
 * Affiliate Disclosure — /affiliate-disclosure
 *
 * Required FTC-equivalent disclosure for Vietnam + EU/UK markets.
 * Clearly states potential commission relationships.
 *
 * This page exists because:
 * 1. Shopee's affiliate/network review teams check for it
 * 2. EU DSA / Vietnam digital platform regulations increasingly expect it
 * 3. It builds trust by being proactively transparent
 */

import { InfoPageLayout, Prose } from '@/components/public';
import { SITE_METADATA_DESCRIPTION_TEMPLATE } from '@/lib/public/site-config';
import { Info } from 'lucide-react';

export const metadata = {
  title: 'Công khai liên kết',
  description:
    'Thông tin công khai về các mối quan hệ liên kết (affiliate) hiện tại và tiềm năng của VoucherFinder với các nền tảng thương mại điện tử.',
  keywords: [
    'công khai liên kết',
    'affiliate disclosure',
    'mối quan hệ affiliate',
    'minh bạch',
  ],

  alternates: {
    canonical: '/affiliate-disclosure',
  },

  openGraph: {
    title: 'Công khai liên kết | VoucherFinder',
    description:
      'Thông tin công khai về các mối quan hệ liên kết của VoucherFinder với các nền tảng thương mại điện tử.',
    url: '/affiliate-disclosure',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: 'Công khai liên kết | VoucherFinder',
  },
};

export default function AffiliateDisclosurePage() {
  return (
    <InfoPageLayout
      title="Công khai liên kết"
      description={SITE_METADATA_DESCRIPTION_TEMPLATE}
      lastUpdated="Tháng 3, 2026"
      breadcrumb={{ label: 'Công khai liên kết', href: '/affiliate-disclosure' }}
    >
      {/* Summary callout */}
      <div className="rounded-xl border border-brand-100 bg-brand-50 p-5 space-y-3 not-prose">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-brand-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand-900">Tóm tắt nhanh</p>
            <ul className="space-y-1.5 text-sm text-brand-800">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                VoucherFinder <strong>hiện không nhận hoa hồng affiliate</strong> từ Shopee hay bất kỳ nền tảng nào.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                Công cụ này <strong>không phải</strong> là chương trình affiliate.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                Nếu chương trình affiliate được bật trong tương lai, trang này sẽ được cập nhật rõ ràng.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* What we are */}
      <section>
        <h2>VoucherFinder là gì?</h2>
        <p>
          VoucherFinder là một công cụ tra cứu mã giảm giá miễn phí. Người dùng dán link sản phẩm
          Shopee, hệ thống trả về mã voucher đang hoạt động. Không có giao dịch tài chính giữa
          VoucherFinder và người dùng khi sử dụng công cụ.
        </p>
        <p>
          VoucherFinder không phải là publisher affiliate. Chúng tôi không có mã tracking,
          không gắn tham số affiliate vào đường dẫn, và không nhận hoa hồng từ các giao dịch
          của người dùng.
        </p>
      </section>

      {/* What might change */}
      <section>
        <h2>Chương trình affiliate trong tương lai</h2>
        <p>
          Trong tương lai, VoucherFinder có thể tham gia các chương trình affiliate của Shopee
          hoặc các nền tảng thương mại điện tử khác. Nếu điều này xảy ra:
        </p>
        <ul>
          <li>Trang này sẽ được cập nhật ngay lập tức để phản ánh mối quan hệ mới.</li>
          <li>
            Chúng tôi sẽ công khai rõ ràng: nền tảng nào, hình thức hoa hồng, và cách tính
            (ví dụ: % doanh số, phí cố định).
          </li>
          <li>
            <strong>Người dùng sẽ không bị tính phí thêm</strong> — hoa hồng affiliate (nếu có)
            không ảnh hưởng đến giá sản phẩm hoặc mã giảm giá bạn nhận được.
          </li>
        </ul>
      </section>

      {/* Current commission status */}
      <section>
        <h2>Tình trạng hiện tại</h2>
        <p>Tại thời điểm công bố này:</p>
        <ul>
          <li>
            <strong>VoucherFinder không có mối quan hệ affiliate</strong> với Shopee, Lazada,
            Tiki, TikTok Shop, hay bất kỳ nền tảng thương mại điện tử nào.
          </li>
          <li>
            Không có thu nhập phát sinh từ việc người dùng sử dụng công cụ này.
          </li>
          <li>
            VoucherFinder được vận hành như một dự án miễn phí, không có doanh thu từ affiliate.
          </li>
          <li>
            Không có nhận diện publisher ID, tracking link, hay mã giới thiệu được sử dụng.
          </li>
        </ul>
      </section>

      {/* Why we have this page */}
      <section>
        <h2>Tại sao trang này tồn tại?</h2>
        <p>
          Nhiều mạng lưới affiliate và đội ngũ compliance của các nền tảng thương mại điện tử
          (bao gồm Shopee Affiliate Program) yêu cầu các publisher công khai mối quan hệ
          tài chính tiềm năng. Việc có trang này thể hiện:
        </p>
        <ul>
          <li>
            <strong>Minh bạch</strong> — Người dùng biết rõ không có xung đột lợi ích giữa
            khuyến nghị của công cụ và hoa hồng affiliate.
          </li>
          <li>
            <strong>Tính hợp pháp</strong> — Tuân thủ các hướng dẫn của các chương trình
            affiliate đối tác tiềm năng.
          </li>
          <li>
            <strong>Tuân thủ pháp luật</strong> — Pháp luật một số quốc gia (bao gồm
            hướng dẫn của EU về Relationships with Influencers và các quy định
            tương tự) khuyến khích hoặc yêu cầu công khai này.
          </li>
        </ul>
      </section>

      {/* No endorsement */}
      <section>
        <h2>Không phải endorsement</h2>
        <p>
          Việc cung cấp mã giảm giá cho sản phẩm Shopee không đồng nghĩa với việc
          VoucherFinder đánh giá, đảm bảo chất lượng sản phẩm, hay ủng hộ người bán
          trên Shopee. Mọi giao dịch mua hàng diễn ra giữa bạn và Shopee (hoặc người bán),
          không liên quan đến VoucherFinder.
        </p>
        <p>
          Chúng tôi không kiểm soát giá cả, tình trạng còn hàng, chất lượng sản phẩm,
          hay dịch vụ sau mua hàng trên các nền tảng liên kết.
        </p>
      </section>

      {/* Commitment */}
      <section>
        <h2>Cam kết của chúng tôi</h2>
        <ul>
          <li>
            <strong>Công khai trước</strong> — Nếu bất kỳ thay đổi nào về mối quan hệ
            affiliate xảy ra, trang này sẽ được cập nhật rõ ràng trước khi thay đổi
            có hiệu lực.
          </li>
          <li>
            <strong>Không ảnh hưởng đến người dùng</strong> — Hoa hồng affiliate (nếu có
            trong tương lai) không làm tăng giá hoặc giảm mã giảm giá cho người dùng.
          </li>
          <li>
            <strong>Không giấu thông tin</strong> — Không có quảng cáo ẩn, không đường
            dẫn affiliate tracking trên trang.
          </li>
        </ul>
      </section>

      {/* Questions */}
      <section>
        <h2>Câu hỏi?</h2>
        <p>
          Nếu bạn có câu hỏi về chính sách này hoặc muốn xác minh tình trạng affiliate
          hiện tại của VoucherFinder, vui lòng liên hệ qua{' '}
          <a href="/info/contact">trang Liên hệ</a>.
        </p>
      </section>
    </InfoPageLayout>
  );
}
