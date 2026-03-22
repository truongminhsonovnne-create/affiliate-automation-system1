'use client';

/**
 * HowItWorks — "Cách hoạt động" section.
 *
 * Design: horizontal 3-step timeline on desktop, stacked on mobile.
 * Each step is a numbered card with a dashed connector line linking the three steps.
 * Premium card treatment: rounded-2xl, shadow-card, brand number badge.
 */

const STEPS = [
  {
    number: '01',
    title: 'Dán link sản phẩm Shopee',
    desc: 'Copy URL sản phẩm từ Shopee (app hoặc web), dán vào ô tìm kiếm.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Chọn mã phù hợp nhất',
    desc: 'Hệ thống kiểm tra và chọn mã phù hợp nhất trong 2–3 giây.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.75" />
        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Copy mã & tiết kiệm ngay',
    desc: 'Nhấn copy — áp dụng tại bước thanh toán trên Shopee. Không cần đăng nhập.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.75" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section
      className="mx-auto"
      aria-labelledby="how-it-works-heading"
      style={{ maxWidth: '44rem', paddingLeft: '1rem', paddingRight: '1rem' }}
    >
      <div className="section-header">
        <h2 id="how-it-works-heading">Cách hoạt động</h2>
        <p>Ba bước đơn giản — không cần đăng nhập</p>
      </div>

      {/* Steps */}
      <div className="relative">
        {/* Dashed connector line — horizontal on desktop */}
        <div
          className="absolute top-6 hidden w-full px-12 sm:block"
          aria-hidden="true"
        >
          <div
            className="h-px w-full"
            style={{
              background: `repeating-linear-gradient(
                90deg,
                var(--border-default) 0,
                var(--border-default) 6px,
                transparent 6px,
                transparent 12px
              )`,
            }}
          />
        </div>

        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3" role="list">
          {STEPS.map((step) => (
            <li key={step.number} className="relative flex flex-col">
              <div
                className="flex flex-col rounded-2xl p-5"
                style={{
                  backgroundColor: 'var(--bg-raised)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Top: number badge + icon */}
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg font-bold"
                    style={{ backgroundColor: 'var(--brand-500)', color: 'white', fontSize: '0.75rem' }}
                    aria-hidden="true"
                  >
                    {step.number}
                  </span>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: 'var(--brand-50)', color: 'var(--brand-600)' }}
                  >
                    {step.icon}
                  </div>
                </div>

                {/* Title */}
                <h3
                  className="mb-2 text-sm font-semibold leading-snug"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {step.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;
