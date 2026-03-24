/**
 * FAQ Page — /info/faq
 *
 * Câu hỏi thường gặp về VoucherFinder.
 * Giúp người dùng tự giải đáp thắc mắc, tăng trust,
 * hỗ trợ SEO long-tail, và giảm tải cho contact form.
 */

import { InfoPageLayout } from '@/components/public';

export const metadata = {
    title: 'FAQ — Câu hỏi thường gặp',
    description:
        'Giải đáp các câu hỏi thường gặp về VoucherFinder: cách hoạt động, bảo mật dữ liệu, lý do không tìm thấy mã, và cách khắc phục sự cố.',
    keywords: [
        'FAQ VoucherFinder',
        'câu hỏi thường gặp',
        'cách hoạt động VoucherFinder',
        'mã giảm giá Shopee không hoạt động',
        'VoucherFinder bảo mật',
    ],

    alternates: {
        canonical: '/info/faq',
    },

    openGraph: {
        title: 'FAQ — Câu hỏi thường gặp | VoucherFinder',
        description:
            'Giải đáp các câu hỏi thường gặp về VoucherFinder: cách hoạt động, bảo mật, và khắc phục sự cố.',
        url: '/info/faq',
        type: 'website',
        images: [
            {
                url: '/og-default.png',
                width: 1200,
                height: 630,
                alt: 'VoucherFinder — Câu hỏi thường gặp',
            },
        ],
    },

    twitter: {
        card: 'summary',
        title: 'FAQ | VoucherFinder',
        description: 'Giải đáp nhanh các câu hỏi thường gặp về công cụ tìm mã giảm giá Shopee.',
    },
};

export default function FaqPage() {
    return (
        <InfoPageLayout
            title="Câu hỏi thường gặp (FAQ)"
            description="Giải đáp nhanh những thắc mắc phổ biến nhất về VoucherFinder."
            lastUpdated="Tháng 3, 2026"
            breadcrumb={{ label: 'FAQ', href: '/info/faq' }}
        >
            {/* Intro */}
            <section>
                <p>
                    Không tìm thấy câu trả lời bạn cần? Hãy gửi câu hỏi qua{' '}
                    <a href="/info/contact">trang Liên hệ</a> — chúng tôi phản hồi trong 2–5 ngày làm việc.
                </p>
            </section>

            {/* Cách hoạt động */}
            <section>
                <h2>VoucherFinder hoạt động như thế nào?</h2>
                <p>
                    Bạn dán link sản phẩm Shopee vào thanh tra cứu. Hệ thống tự động kết nối với cơ sở dữ
                    liệu khuyến mãi nội bộ để tìm các mã voucher đang hoạt động cho sản phẩm đó. Toàn bộ quá
                    trình diễn ra trong 2–3 giây. Không cần đăng nhập, không cần tạo tài khoản.
                </p>
            </section>

            {/* Miễn phí */}
            <section>
                <h2>Dịch vụ có miễn phí không? Có phí ẩn không?</h2>
                <p>
                    Hoàn toàn miễn phí. Không có gói trả phí, không có giới hạn số lần tra cứu, không có phí
                    hoa hồng khi bạn dùng mã. VoucherFinder hiện không có doanh thu từ việc bạn sử dụng công
                    cụ này.
                </p>
            </section>

            {/* Mã có đảm bảo không */}
            <section>
                <h2>Mã giảm giá có đảm bảo hoạt động không?</h2>
                <p>
                    Chúng tôi cố gắng hiển thị các mã còn hiệu lực tại thời điểm tra cứu, nhưng không thể
                    đảm bảo 100%. Lý do: các mã voucher trên Shopee có thể hết hạn, hết lượt dùng, hoặc bị
                    giới hạn theo tài khoản/địa chỉ giao hàng ngoài tầm kiểm soát của chúng tôi.
                </p>
                <div className="note">
                    <p className="note-title">Lưu ý</p>
                    <p>
                        Luôn kiểm tra lại mã tại bước thanh toán trước khi xác nhận đơn hàng để tránh bất ngờ.
                    </p>
                </div>
            </section>

            {/* Không tìm thấy mã */}
            <section>
                <h2>Tại sao không tìm thấy mã cho sản phẩm của tôi?</h2>
                <p>Một số trường hợp có thể xảy ra:</p>
                <ul>
                    <li>
                        <strong>Không có khuyến mãi:</strong> Sản phẩm không thuộc danh mục có chương trình
                        voucher tại thời điểm tra cứu.
                    </li>
                    <li>
                        <strong>Link có tham số thừa:</strong> Thử dán link sản phẩm sạch (chỉ giữ phần
                        shopee.vn/... hoặc rút gọn shope.ee/...) thay vì link copy từ quảng cáo.
                    </li>
                    <li>
                        <strong>Shop không tham gia:</strong> Một số người bán không tham gia chương trình
                        voucher của Shopee.
                    </li>
                </ul>
                <p>
                    Nếu bạn thường xuyên gặp vấn đề này, hãy gửi phản hồi qua{' '}
                    <a href="/info/contact">trang Liên hệ</a> để chúng tôi cải thiện.
                </p>
            </section>

            {/* Mã không hoạt động */}
            <section>
                <h2>Mã không hoạt động khi thanh toán — phải làm gì?</h2>
                <p>Thử tuần tự các bước sau:</p>
                <ol>
                    <li>
                        Kiểm tra hạn sử dụng của mã trực tiếp trên Shopee (mục <strong>Kho Voucher</strong>).
                    </li>
                    <li>
                        Đảm bảo đơn hàng đáp ứng điều kiện tối thiểu (giá trị đơn, danh mục sản phẩm).
                    </li>
                    <li>
                        Một số mã chỉ áp dụng cho lần mua đầu tiên hoặc giới hạn 1 lần/tài khoản.
                    </li>
                    <li>
                        Nếu mã vẫn không hoạt động, vui lòng{' '}
                        <a href="/info/contact">báo lỗi</a> — cung cấp link sản phẩm và mã bạn đã dùng.
                    </li>
                </ol>
            </section>

            {/* Dữ liệu cá nhân */}
            <section>
                <h2>VoucherFinder có lưu thông tin cá nhân của tôi không?</h2>
                <p>
                    Không. VoucherFinder không yêu cầu đăng ký, không lưu email hay tên của bạn trên máy
                    chủ. Lịch sử tra cứu được lưu trong <strong>localStorage</strong> của trình duyệt —
                    hoàn toàn trên thiết bị của bạn, không gửi về server. Xem chi tiết tại{' '}
                    <a href="/info/privacy">Chính sách bảo mật</a>.
                </p>
            </section>

            {/* Xóa lịch sử */}
            <section>
                <h2>Làm sao để xóa lịch sử tra cứu?</h2>
                <p>
                    Lịch sử tra cứu nằm hoàn toàn trong localStorage của trình duyệt, không trên server của
                    chúng tôi. Để xóa:
                </p>
                <ul>
                    <li>
                        <strong>Chrome/Edge:</strong> Cài đặt → Quyền riêng tư và bảo mật → Xóa dữ liệu duyệt
                        web → Chọn &ldquo;Cookie và dữ liệu trang web khác&rdquo;
                    </li>
                    <li>
                        <strong>Firefox:</strong> Cài đặt → Quyền riêng tư → Cookie và dữ liệu trang web →
                        Quản lý dữ liệu → Xóa cho voucherfinder.app
                    </li>
                    <li>
                        <strong>Safari:</strong> Cài đặt → Quyền riêng tư → Quản lý dữ liệu trang web
                    </li>
                </ul>
                <p>
                    Xem hướng dẫn chi tiết hơn tại <a href="/info/cookies">Chính sách Cookie</a>.
                </p>
            </section>

            {/* Lazada/TikTok */}
            <section>
                <h2>VoucherFinder có hỗ trợ Lazada, Tiki, TikTok Shop không?</h2>
                <p>
                    Hiện tại, VoucherFinder chỉ hỗ trợ <strong>Shopee Việt Nam</strong> (shopee.vn và
                    shope.ee). Chúng tôi đang đánh giá khả năng mở rộng sang các nền tảng khác. Nếu bạn muốn
                    thấy hỗ trợ cho một nền tảng cụ thể, hãy gửi đề xuất qua{' '}
                    <a href="/info/contact">trang Liên hệ</a>.
                </p>
            </section>

            {/* Shopee chính thức */}
            <section>
                <h2>VoucherFinder có phải là trang chính thức của Shopee không?</h2>
                <p>
                    Không. VoucherFinder là công cụ <strong>độc lập</strong> do một nhóm kỹ sư xây dựng và
                    vận hành. Chúng tôi không có liên kết chính thức với Shopee, không phải đại lý hay chi
                    nhánh của Shopee. Mọi thắc mắc về đơn hàng hoặc tài khoản Shopee vui lòng liên hệ trực
                    tiếp bộ phận hỗ trợ của Shopee.
                </p>
            </section>

            {/* Hợp tác */}
            <section>
                <h2>Tôi muốn hợp tác hoặc có ý kiến đóng góp — liên hệ thế nào?</h2>
                <p>
                    Vui lòng gửi tin nhắn qua <a href="/info/contact">trang Liên hệ</a>. Chọn chủ đề{' '}
                    <em>&ldquo;Hợp tác / Đối tác&rdquo;</em> hoặc <em>&ldquo;Đề xuất tính năng mới&rdquo;</em>{' '}
                    tùy theo nội dung. Chúng tôi phản hồi trong vòng 2–5 ngày làm việc và đọc mọi tin nhắn
                    nhận được.
                </p>
            </section>

            {/* CTA cuối */}
            <section>
                <h2>Vẫn còn thắc mắc?</h2>
                <p>
                    Nếu câu hỏi của bạn chưa được giải đáp ở trên, hãy gửi tin nhắn qua{' '}
                    <a href="/info/contact">trang Liên hệ</a>. Chúng tôi đọc mọi phản hồi và cải thiện FAQ
                    liên tục dựa trên câu hỏi thực tế nhận được.
                </p>
            </section>
        </InfoPageLayout>
    );
}
