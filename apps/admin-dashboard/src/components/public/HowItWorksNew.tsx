'use client';

/**
 * HowItWorksNew — Premium "How it works" section.
 *
 * Architecture:
 *  - Dark/inverted section band to create strong visual rhythm break
 *  - Numbered steps (top)
 *  - "Nền tảng nào" platform support grid (bottom)
 */

const STEPS = [
  {
    num: '01',
    title: 'Dán link sản phẩm',
    desc: 'Copy URL từ Shopee (app hoặc trình duyệt) và dán vào ô tra cứu. Không cần đăng nhập, không cần tài khoản.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Hệ thống quét voucher',
    desc: 'Trong 2–3 giây, hệ thống kiểm tra hàng trăm mã voucher còn hiệu lực phù hợp với sản phẩm của bạn.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.75" />
        <path d="M21 21l-4.35-4.35M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Copy & tiết kiệm ngay',
    desc: 'Nhấn sao chép mã voucher tốt nhất — áp dụng tại bước thanh toán trên Shopee. Xong.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.75" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const PLATFORMS = [
  { name: 'Shopee', tag: 'shopee.vn', note: 'Hỗ trợ đầy đủ', status: 'active', icon: '🛒' },
  { name: 'Shopee Short', tag: 'shope.ee', note: 'Link rút gọn tự động expand', status: 'active', icon: '🔗' },
  { name: 'AccessTrade', tag: 'Nguồn dữ liệu', note: '4.700+ voucher được kiểm chứng', status: 'active', icon: '✓' },
  { name: 'MasOffer', tag: 'Nguồn dữ liệu', note: 'Cập nhật thường xuyên', status: 'active', icon: '↻' },
];

export function HowItWorksNew() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: '#111827' }}
      aria-labelledby="how-it-works-heading"
    >
      {/* Grain texture */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />

      <div
        className="relative mx-auto"
        style={{ maxWidth: '72rem', padding: '5rem 1.5rem' }}
      >
        {/* Header */}
        <div className="mb-16" style={{ maxWidth: '32rem' }}>
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: '#f97316', letterSpacing: '0.12em' }}
          >
            Quy trình
          </p>
          <h2
            id="how-it-works-heading"
            className="font-black tracking-tight"
            style={{
              color: '#ffffff',
              fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              marginBottom: '0.75rem',
            }}
          >
            Ba bước đơn giản.
            <br />
            Không phức tạp.
          </h2>
          <p className="text-base" style={{ color: '#9ca3af', lineHeight: 1.6 }}>
            Không cần tạo tài khoản. Không cần đăng nhập Shopee. Không cần mất thời gian.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className="relative rounded-2xl p-6 transition-all duration-200 group"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.backgroundColor = 'rgba(255,255,255,0.07)';
                el.style.borderColor = 'rgba(249,115,22,0.3)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.backgroundColor = 'rgba(255,255,255,0.04)';
                el.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              {/* Large background number */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', top: '-0.5rem', right: '1.25rem',
                  fontSize: '6rem', fontWeight: '900',
                  color: 'rgba(255,255,255,0.03)',
                  lineHeight: 1, letterSpacing: '-0.05em',
                  userSelect: 'none', pointerEvents: 'none',
                }}
              >
                {step.num}
              </div>

              {/* Icon */}
              <div
                className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: 'rgba(249,115,22,0.12)',
                  color: '#fb923c',
                  border: '1px solid rgba(249,115,22,0.2)',
                }}
              >
                {step.icon}
              </div>

              {/* Content */}
              <h3
                className="mb-2 text-base font-semibold"
                style={{ color: '#ffffff', letterSpacing: '-0.01em' }}
              >
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#9ca3af', lineHeight: 1.65 }}>
                {step.desc}
              </p>

              {/* Connector arrow */}
              {i < STEPS.length - 1 && (
                <div
                  className="hidden absolute -right-3 top-1/2 -translate-y-1/2 sm:flex items-center justify-center"
                  aria-hidden="true"
                >
                  <div
                    style={{
                      width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Trust block: "Hỗ trợ nền tảng nào" ── */}
        <div
          className="mt-16 rounded-2xl p-6"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p
                className="mb-1 text-xs font-semibold uppercase tracking-widest"
                style={{ color: '#f97316', letterSpacing: '0.12em' }}
              >
                Hệ thống hỗ trợ
              </p>
              <h3
                className="font-bold"
                style={{ color: '#ffffff', fontSize: '1.1rem' }}
              >
                Nền tảng & nguồn dữ liệu
              </h3>
            </div>
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#4ade80' }} />
              Cập nhật thường xuyên
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <p
                  className="text-2xl mb-2"
                  role="img"
                  aria-label={p.name}
                >
                  {p.icon}
                </p>
                <p
                  className="text-sm font-semibold"
                  style={{ color: '#ffffff', marginBottom: '0.25rem' }}
                >
                  {p.name}
                </p>
                <p
                  className="text-xs font-medium"
                  style={{ color: '#f97316', marginBottom: '0.25rem' }}
                >
                  {p.tag}
                </p>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  {p.note}
                </p>
              </div>
            ))}
          </div>

          {/* Trust statement */}
          <p className="mt-4 text-xs" style={{ color: '#4b5563' }}>
            Chỉ hiển thị voucher và deal đã được kiểm chứng điều kiện sử dụng thực tế. Không spam, không mã giả.
          </p>
        </div>
      </div>
    </section>
  );
}

export default HowItWorksNew;
