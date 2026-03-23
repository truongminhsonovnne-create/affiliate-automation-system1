'use client';

/**
 * FaqSectionNew — Premium accordion FAQ section.
 *
 * Architecture:
 *  - Clean white section with subtle top border
 *  - Accordion items with left brand accent on open
 *  - Strong typography hierarchy
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'VoucherFinder là gì?',
    a: 'VoucherFinder là công cụ tra cứu mã giảm giá miễn phí cho sản phẩm trên Shopee Việt Nam. Chỉ cần dán link sản phẩm Shopee, hệ thống sẽ tìm và trả về mã voucher đang hoạt động cho sản phẩm đó.',
  },
  {
    q: 'Có miễn phí không?',
    a: 'Hoàn toàn miễn phí. Không phí dịch vụ, không giới hạn tra cứu mỗi ngày, không cần đăng ký tài khoản.',
  },
  {
    q: 'Có cần đăng nhập Shopee không?',
    a: 'Không. VoucherFinder chỉ cần link sản phẩm — không cần đăng nhập Shopee, không cần cung cấp email hay bất kỳ thông tin cá nhân nào.',
  },
  {
    q: 'Mã voucher có luôn hoạt động không?',
    a: 'Không đảm bảo 100%. Các mã được tìm thấy đang hoạt động trên hệ thống Shopee tại thời điểm kiểm tra, nhưng có thể hết hạn hoặc đạt giới hạn sử dụng ngoài tầm kiểm soát của chúng tôi. Luôn kiểm tra lại điều kiện mã tại bước thanh toán.',
  },
  {
    q: 'VoucherFinder có nhận hoa hồng affiliate không?',
    a: 'Không. VoucherFinder không có mối quan hệ affiliate với Shopee hay bất kỳ sàn thương mại điện tử nào, và không nhận hoa hồng từ giao dịch của bạn. Xem Công khai liên kết để biết chi tiết.',
  },
  {
    q: 'Dữ liệu cá nhân của tôi có an toàn không?',
    a: 'An toàn. Không thu thập dữ liệu cá nhân, không có công cụ theo dõi (analytics, pixel, fingerprinting), không lưu trữ thông tin thanh toán. Không đặt cookie theo dõi.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyHeight, setBodyHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (open) {
      const el = bodyRef.current;
      if (el) setBodyHeight(el.scrollHeight);
    } else {
      setBodyHeight(undefined);
    }
  }, [open]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 py-5 text-left transition-all duration-150 rounded-none"
        style={{ borderBottom: '1px solid #f3f4f6' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fafaf9'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
      >
        <span
          className="text-base font-semibold"
          style={{
            color: open ? '#c2410c' : '#111827',
            transition: 'color 200ms ease',
            letterSpacing: '-0.01em',
          }}
        >
          {q}
        </span>
        <ChevronDown
          className="mt-0.5 flex-shrink-0 transition-all duration-200"
          style={{
            height: '1.25rem',
            width: '1.25rem',
            color: open ? '#f97316' : '#9ca3af',
            transform: open ? 'rotate(-180deg)' : 'rotate(0deg)',
          }}
          aria-hidden="true"
        />
      </button>

      {/* Animated answer */}
      <div
        aria-hidden={!open}
        style={{
          height: open && bodyHeight !== undefined ? bodyHeight : 0,
          overflow: 'hidden',
          transition: 'height 280ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          ref={bodyRef}
          className="pb-5 text-sm"
          style={{ color: '#6b7280', lineHeight: 1.7 }}
        >
          {a}
        </div>
      </div>
    </div>
  );
}

export function FaqSectionNew() {
  return (
    <section
      className="relative"
      style={{ backgroundColor: '#ffffff' }}
      aria-labelledby="faq-heading"
    >
      <div
        className="mx-auto"
        style={{ maxWidth: '42rem', padding: '5rem 1.5rem' }}
      >
        {/* Header */}
        <div className="mb-10">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: '#f97316', letterSpacing: '0.12em' }}
          >
            FAQ
          </p>
          <h2
            id="faq-heading"
            className="font-black tracking-tight"
            style={{
              color: '#111827',
              fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              marginBottom: '0.75rem',
            }}
          >
            Câu hỏi thường gặp
          </h2>
          <p className="text-base" style={{ color: '#6b7280', lineHeight: 1.6 }}>
            Trả lời thẳng thắn — không marketing.
          </p>
        </div>

        {/* Accordion */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: '1px solid #f3f4f6',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          {/* Top brand accent line */}
          <div
            aria-hidden="true"
            style={{ height: '2px', background: 'linear-gradient(90deg, #f97316, #fb923c, #f97316)' }}
          />

          <div style={{ padding: '0 1.25rem' }}>
            {FAQS.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>

        {/* Still have questions CTA */}
        <div
          className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl px-6 py-5"
          style={{
            backgroundColor: '#fff7ed',
            border: '1px solid #fed7aa',
          }}
        >
          <p className="text-sm font-medium" style={{ color: '#c2410c' }}>
            Không tìm thấy câu trả lời bạn cần?
          </p>
          <a
            href="/info/contact"
            className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white transition-all duration-150 whitespace-nowrap"
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#f97316',
              boxShadow: '0 2px 8px rgba(249,115,22,0.25)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.backgroundColor = '#ea580c';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#f97316';
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            Liên hệ / Báo lỗi
          </a>
        </div>
      </div>
    </section>
  );
}

export default FaqSectionNew;
