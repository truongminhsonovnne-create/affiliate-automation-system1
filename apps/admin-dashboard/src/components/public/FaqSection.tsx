'use client';

/**
 * FaqSection — Premium animated accordion FAQ for the landing page.
 *
 * Micro-interactions:
 *  - Left-border + background tint on open
 *  - Chevron rotates 180° with color shift
 *  - Question text shifts to brand on open
 *  - Answer panel expands with ease-out curve
 *
 * Legal links live in LandingFooter — NOT here (avoids duplication).
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'VoucherFinder là gì?',
    a: 'VoucherFinder là công cụ tra cứu mã giảm giá miễn phí cho sản phẩm trên Shopee Việt Nam. Chỉ cần dán link sản phẩm Shopee, hệ thống sẽ tìm và trả về mã voucher đang hoạt động cho sản phẩm đó.',
  },
  {
    q: 'VoucherFinder có miễn phí không?',
    a: 'Hoàn toàn miễn phí. Không phí dịch vụ, không giới hạn tra cứu mỗi ngày, không cần đăng ký.',
  },
  {
    q: 'Có cần đăng nhập Shopee không?',
    a: 'Không. VoucherFinder chỉ cần link sản phẩm — không cần đăng nhập Shopee, không cần cung cấp email hay bất kỳ thông tin cá nhân nào.',
  },
  {
    q: 'Mã voucher có luôn hoạt động không?',
    a: 'Không đảm bảo 100%. Các mã được tìm thấy đang hoạt động trên hệ thống Shopee, nhưng có thể hết hạn hoặc đạt giới hạn sử dụng ngoài tầm kiểm soát của chúng tôi. Luôn kiểm tra lại điều kiện mã tại bước thanh toán.',
  },
  {
    q: 'VoucherFinder có phải là chương trình affiliate không?',
    a: 'Không. VoucherFinder không có mối quan hệ affiliate với Shopee hay bất kỳ sàn thương mại điện tử nào, và không nhận hoa hồng từ giao dịch của bạn. Xem Công khai liên kết để biết chi tiết.',
  },
  {
    q: 'Hệ thống có an toàn không?',
    a: 'An toàn. Không thu thập dữ liệu cá nhân, không có công cụ theo dõi (analytics, pixel, fingerprinting), không lưu trữ thông tin thanh toán. Chi tiết: Chính sách bảo mật và Cookie.',
  },
];

// ── Animated accordion item ───────────────────────────────────────────────────

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
    <div
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        borderLeft: open ? '2px solid var(--brand-500)' : '2px solid transparent',
        paddingLeft: open ? '0.875rem' : '1rem',
        backgroundColor: open ? 'var(--bg-subtle)' : 'transparent',
        transition:
          'border-left-color 200ms ease, border-left-width 200ms ease, padding-left 200ms ease, background-color 200ms ease',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 py-4 text-left active:scale-[0.99]"
        style={{ transition: 'transform 100ms ease', transformOrigin: 'center' }}
      >
        <span
          className="text-sm font-medium"
          style={{
            color: open ? 'var(--brand-700)' : 'var(--text-primary)',
            transition: 'color 200ms ease',
          }}
        >
          {q}
        </span>
        <ChevronDown
          className="mt-0.5 h-4 w-4 flex-shrink-0"
          style={{
            color: open ? 'var(--brand-500)' : 'var(--text-muted)',
            transform: open ? 'rotate(-180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease, color 200ms ease',
          }}
          aria-hidden="true"
        />
      </button>

      {/* Animated answer panel */}
      <div
        aria-hidden={!open}
        style={{
          height: open && bodyHeight !== undefined ? bodyHeight : 0,
          overflow: 'hidden',
          transition: 'height 250ms ease-out',
        }}
      >
        <div
          ref={bodyRef}
          className="pb-4 text-sm leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {a}
        </div>
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export function FaqSection() {
  return (
    <section
      className="mx-auto"
      aria-labelledby="faq-heading"
      style={{ maxWidth: '42rem', paddingLeft: '1rem', paddingRight: '1rem' }}
    >
      <div className="section-header">
        <h2 id="faq-heading" style={{ color: 'var(--text-primary)' }}>
          Câu hỏi thường gặp
        </h2>
        <p>Trả lời nhanh — không marketing</p>
      </div>

      <div
        className="rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-raised)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        {/* Top gradient accent line */}
        <div
          aria-hidden="true"
          style={{
            height: '2px',
            background:
              'linear-gradient(90deg, var(--brand-400), var(--brand-600), var(--brand-400))',
          }}
        />
        <div>
          {FAQS.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
