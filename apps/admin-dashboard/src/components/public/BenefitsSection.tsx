'use client';

/**
 * BenefitsSection — "Tại sao dùng VoucherFinder" section.
 *
 * Layout:
 *  - Section header
 *  - Hero feature: full-width card (icon left, text right)
 *    — emphasises the core value proposition with brand gradient treatment
 *  - 3 compact row items below
 *    — each: icon circle + label + one-liner, light treatment
 *  This creates clear visual hierarchy rather than 4 identical boxes.
 */

const BENEFITS_HERO = {
  title: 'Một bước: dán link sản phẩm',
  desc: 'Dán link sản phẩm — hệ thống tự kiểm tra mã đang hoạt động và chỉ trả về mã phù hợp nhất.',
  icon: (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
};

const BENEFITS_ROW = [
  {
    title: 'Nhanh chóng',
    desc: 'Tìm trong 2–3 giây.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Chính xác',
    desc: 'Mã được kiểm tra điều kiện trước khi gợi ý.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Riêng tư',
    desc: 'Không theo dõi, không thu thập dữ liệu.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function BenefitsSection() {
  return (
    <section
      className="mx-auto"
      aria-labelledby="benefits-heading"
      style={{ maxWidth: '44rem', paddingLeft: '1rem', paddingRight: '1rem' }}
    >
      <div className="section-header">
        <h2 id="benefits-heading">Tại sao dùng VoucherFinder</h2>
        <p>Thay vì tự mò mẫm — để công cụ tìm giúp bạn</p>
      </div>

      {/* ── Hero feature card ── */}
      <div
        className="mb-5 flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-start"
        style={{
          background: 'linear-gradient(135deg, var(--brand-50) 0%, var(--gray-50) 100%)',
          border: '1px solid var(--brand-100)',
        }}
      >
        <div
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: 'white',
            border: '1px solid var(--brand-100)',
            boxShadow: 'var(--shadow-card)',
            color: 'var(--brand-600)',
          }}
        >
          {BENEFITS_HERO.icon}
        </div>
        <div className="flex-1">
          <h3 className="mb-2 text-base font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {BENEFITS_HERO.title}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {BENEFITS_HERO.desc}
          </p>
        </div>
      </div>

      {/* ── 3 compact row items ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {BENEFITS_ROW.map((b) => (
          <div
            key={b.title}
            className="flex flex-col rounded-xl px-4 py-4"
            style={{
              backgroundColor: 'var(--bg-raised)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--brand-50)', color: 'var(--brand-600)' }}
            >
              {b.icon}
            </div>
            <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {b.title}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {b.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default BenefitsSection;
