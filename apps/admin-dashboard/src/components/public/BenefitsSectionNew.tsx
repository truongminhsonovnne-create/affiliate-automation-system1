'use client';

/**
 * BenefitsSectionNew — Premium "Why use" section.
 *
 * Architecture:
 *  - Light section with subtle warm tint
 *  - Feature list with a two-column editorial layout (not 4 equal cards)
 *  - Each benefit uses a larger icon + strong label treatment
 *  - Different visual weight per item to avoid flat grid sameness
 */

const FEATURES = [
  {
    label: 'Nhanh — kết quả trong 3 giây',
    desc: 'Không cần chờ. Hệ thống kiểm tra và trả về mã tốt nhất ngay lập tức.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accent: true,
  },
  {
    label: 'Chính xác — kiểm tra điều kiện thực tế',
    desc: 'Mỗi mã được kiểm tra điều kiện sử dụng (giá tối thiểu, danh mục, số lượng) trước khi gợi ý.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 12l2 2 4-4M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accent: false,
  },
  {
    label: 'An toàn — không thu thập dữ liệu',
    desc: 'Không cookies, không analytics, không fingerprinting. Không lưu lịch sử tìm kiếm.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accent: false,
  },
  {
    label: 'Minh bạch — không có affiliate',
    desc: 'Không nhận hoa hồng từ giao dịch của bạn. Không liên kết chính thức với Shopee.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
        <path d="M12 8h.01M12 12v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
    accent: false,
  },
];

export function BenefitsSectionNew() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: '#fafaf9' }}
      aria-labelledby="benefits-heading"
    >
      {/* Subtle warm gradient at top */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.2), transparent)',
        }}
      />

      <div
        className="relative mx-auto"
        style={{ maxWidth: '72rem', padding: '5rem 1.5rem' }}
      >
        {/* Header */}
        <div className="mb-14 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div style={{ maxWidth: '26rem' }}>
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#f97316', letterSpacing: '0.12em' }}
            >
              Ưu điểm
            </p>
            <h2
              id="benefits-heading"
              className="font-black tracking-tight"
              style={{
                color: '#111827',
                fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
              }}
            >
              Không phải tool nào cũng như nhau
            </h2>
          </div>
          <p
            className="text-sm sm:text-base sm:max-w-sm"
            style={{ color: '#6b7280', lineHeight: 1.65 }}
          >
            Chúng tôi không chỉ tra cứu. Hệ thống kiểm tra điều kiện thực tế của mã
            trước khi gợi ý — giúp bạn tiết kiệm thời gian và không bị thất vọng.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.label}
              className="group relative flex gap-5 rounded-2xl p-6 transition-all duration-200"
              style={{
                backgroundColor: feature.accent ? '#ffffff' : '#ffffff',
                border: feature.accent
                  ? '1.5px solid rgba(249,115,22,0.25)'
                  : '1.5px solid #f3f4f6',
                boxShadow: feature.accent
                  ? '0 4px 20px rgba(249,115,22,0.06)'
                  : '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(249,115,22,0.35)';
                el.style.boxShadow = '0 4px 24px rgba(249,115,22,0.08)';
                el.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = feature.accent ? 'rgba(249,115,22,0.25)' : '#f3f4f6';
                el.style.boxShadow = feature.accent ? '0 4px 20px rgba(249,115,22,0.06)' : '0 1px 3px rgba(0,0,0,0.04)';
                el.style.transform = 'translateY(0)';
              }}
            >
              {/* Icon */}
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-colors duration-200"
                style={
                  feature.accent
                    ? {
                        backgroundColor: '#fff7ed',
                        color: '#f97316',
                        border: '1px solid rgba(249,115,22,0.2)',
                      }
                    : {
                        backgroundColor: '#f9fafb',
                        color: '#6b7280',
                        border: '1px solid #f3f4f6',
                      }
                }
              >
                {feature.icon}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <h3
                  className="mb-1.5 text-base font-semibold"
                  style={{
                    color: '#111827',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {feature.label}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280', lineHeight: 1.6 }}>
                  {feature.desc}
                </p>
              </div>

              {/* Accent corner mark */}
              {feature.accent && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '-1px',
                    right: '-1px',
                    width: '0',
                    height: '0',
                    borderTop: '16px solid rgba(249,115,22,0.15)',
                    borderLeft: '16px solid transparent',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Bottom disclaimer strip */}
        <div
          className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl px-6 py-4"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #f3f4f6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <p className="text-sm" style={{ color: '#6b7280', lineHeight: 1.55 }}>
            Mã được kiểm tra điều kiện sử dụng trước khi trả về. Luôn kiểm tra lại
            điều kiện mã tại bước thanh toán.
          </p>
          <a
            href="/info/affiliate-disclosure"
            className="flex-shrink-0 flex items-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors"
            style={{ color: '#ea580c' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#c2410c'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#ea580c'; }}
          >
            Công khai liên kết
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

export default BenefitsSectionNew;
