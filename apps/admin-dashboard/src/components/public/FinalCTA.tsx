'use client';

/**
 * FinalCTA — Premium final call-to-action section.
 *
 * Architecture:
 *  - Dark/inverted band to bookend the page visually
 *  - Large bold headline
 *  - Prominent search shortcut
 */

import Link from 'next/link';
import { Zap, ArrowRight } from 'lucide-react';

export function FinalCTA() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: '#fafaf9' }}
      aria-label="Final call to action"
    >
      {/* Top border */}
      <div
        aria-hidden="true"
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.2), transparent)',
        }}
      />

      <div
        className="relative mx-auto text-center"
        style={{ maxWidth: '36rem', padding: '6rem 1.5rem' }}
      >
        {/* Icon */}
        <div
          className="mx-auto mb-6 flex items-center justify-center rounded-2xl"
          style={{
            width: '4rem',
            height: '4rem',
            backgroundColor: '#fff7ed',
            border: '1px solid #fed7aa',
            boxShadow: '0 4px 20px rgba(249,115,22,0.1)',
          }}
          aria-hidden="true"
        >
          <Zap className="h-7 w-7" style={{ color: '#f97316', fill: '#f97316' }} />
        </div>

        {/* Headline */}
        <h2
          className="font-black tracking-tight"
          style={{
            color: '#111827',
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            marginBottom: '1rem',
          }}
        >
          Sẵn sàng tiết kiệm?
        </h2>

        {/* Sub */}
        <p
          className="text-base sm:text-lg mb-10"
          style={{
            color: '#6b7280',
            lineHeight: 1.6,
            maxWidth: '28rem',
            margin: '0 auto 2.5rem',
          }}
        >
          Dán link sản phẩm Shopee — tìm mã giảm giá tốt nhất trong 3 giây.
        </p>

        {/* CTA */}
        <Link
          href="/home"
          className="inline-flex items-center gap-3 rounded-2xl text-base font-bold text-white transition-all duration-150"
          style={{
            padding: '1rem 2.5rem',
            backgroundColor: '#f97316',
            boxShadow: '0 8px 30px rgba(249,115,22,0.3)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = '#ea580c';
            el.style.boxShadow = '0 12px 40px rgba(249,115,22,0.4)';
            el.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = '#f97316';
            el.style.boxShadow = '0 8px 30px rgba(249,115,22,0.3)';
            el.style.transform = 'translateY(0)';
          }}
        >
          <Zap className="h-5 w-5" aria-hidden="true" />
          Tra cứu voucher ngay
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>

        {/* Trust microcopy */}
        <p className="mt-4 text-xs" style={{ color: '#9ca3af' }}>
          Miễn phí · Không cần đăng nhập · Không giới hạn
        </p>
      </div>
    </section>
  );
}

export default FinalCTA;
