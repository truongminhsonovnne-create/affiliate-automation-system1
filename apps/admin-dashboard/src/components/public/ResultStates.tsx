'use client';

/**
 * ResultStates — Optimized feedback states to keep users engaged.
 *
 * Design goals:
 *  - Never leave the user stranded — every state has a clear next action
 *  - "No match" → enriched panel with 4 escape routes (deals, retry, watch, other link)
 *  - "Error" → friendly tone + prominent retry + secondary CTAs
 *  - "Rate limited / expired / failed" → actionable recovery paths
 *  - Mobile-first: full-width cards, large tap targets, no dead ends
 *
 * States:
 *   no_match     — enriched panel (primary focus)
 *   invalid_link — recovery with format guide
 *   error        — retry + deals + try-again-elsewhere
 *   rate_limited — cooldown timer + secondary paths
 *   expired      — retry + view deals
 *   failed       — retry + try another product
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  SearchX,
  AlertTriangle,
  WifiOff,
  Clock,
  RefreshCw,
  Lightbulb,
  Flame,
  Grid3X3,
  Search,
  DatabaseZap,
  CalendarClock,
  HelpCircle,
  Mail,
  Bell,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import type { ErrorCard } from '@/lib/public/api-client';

// =============================================================================
// Types
// =============================================================================

export type ResultStateVariant =
  | 'no_match'
  | 'invalid_link'
  | 'error'
  | 'rate_limited'
  | 'expired'
  | 'failed';

export interface ResultStatesProps {
  variant: ResultStateVariant;
  error?: ErrorCard | null;
  onRetry?: () => void;
  checkedAt?: Date;
  className?: string;
}

// =============================================================================
// Shared: WatchShopCard — mock "notify me" UI to capture intent
// =============================================================================

function WatchShopCard() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    // Mock API call — replace with real endpoint when ready
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  }, [email]);

  if (submitted) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
        role="status"
      >
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: '#dcfce7' }}
          aria-hidden="true"
        >
          <Bell className="h-4 w-4" style={{ color: '#16a34a' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#166534' }}>
            Đã bật thông báo!
          </p>
          <p className="text-xs" style={{ color: '#15803d' }}>
            Chúng tôi sẽ gửi email khi có voucher mới cho sản phẩm này.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-4"
      aria-label="Nhận thông báo khi có voucher"
    >
      <div className="mb-3 flex items-start gap-2.5">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: '#fef3c7' }}
          aria-hidden="true"
        >
          <Bell className="h-4 w-4" style={{ color: '#d97706' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
            Khi có voucher mới — thông báo ngay
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>
            Nhập email, chúng tôi sẽ báo khi shop có khuyến mãi mới.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          required
          className="flex-1 min-w-0 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
          style={{ color: '#111827' }}
          aria-label="Địa chỉ email"
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="flex-shrink-0 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: '#d97706' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#b45309'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#d97706'; }}
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Mail className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">Bật thông báo</span>
        </button>
      </div>
    </form>
  );
}

// =============================================================================
// Shared: NextStepCard — reusable action card
// =============================================================================

interface NextStepCardProps {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  hoverBg: string;
  className?: string;
}

function NextStepCard({
  href,
  label,
  description,
  icon: Icon,
  iconBg,
  iconColor,
  borderColor,
  hoverBg,
  className,
}: NextStepCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      className={clsx(
        'flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-all active:scale-[0.98]',
        className
      )}
      style={{
        backgroundColor: hovered ? hoverBg : '#ffffff',
        borderColor: hovered ? borderColor : '#f3f4f6',
        boxShadow: hovered ? `0 4px 12px ${borderColor}40` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: iconBg }}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#111827' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: '#9ca3af' }} aria-hidden="true" />
    </Link>
  );
}

// =============================================================================
// no_match — enriched panel with 4 escape routes
// =============================================================================

function NoMatchRichPanel({
  onRetry,
  checkedAt,
}: {
  onRetry?: () => void;
  checkedAt?: Date;
}) {
  const timeLabel = checkedAt
    ? checkedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;

  const REASONS = [
    {
      icon: TrendingUp,
      iconBg: '#f0fdf4',
      iconColor: '#16a34a',
      title: 'Sản phẩm chưa trong chương trình',
      desc: 'Không phải mọi sản phẩm đều có voucher — shop/người bán quyết định có tham gia khuyến mãi hay không.',
    },
    {
      icon: Clock,
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
      title: 'Voucher vừa hết hoặc chưa bắt đầu',
      desc: 'Các chiến dịch khuyến mãi có thời hạn ngắn. Hệ thống cập nhật 2 lần/ngày (6:00 và 18:00 UTC).',
    },
    {
      icon: Search,
      iconBg: '#fafafa',
      iconColor: '#6b7280',
      title: 'Link có thể cần làm sạch',
      desc: 'Link từ quảng cáo/chia sẻ đôi khi chứa tham số thừa. Thử copy link trực tiếp từ trang sản phẩm.',
    },
  ];

  return (
    <div
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-3xl border bg-white"
      style={{ borderColor: '#e5e7eb' }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 pt-5 pb-4"
        style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 60%)',
          borderBottom: '1px solid #f3f4f6',
        }}
      >
        {/* Icon + title */}
        <div className="flex items-start gap-3.5">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
            aria-hidden="true"
          >
            <SearchX className="h-6 w-6" style={{ color: '#6b7280' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold leading-snug" style={{ color: '#111827' }}>
              Chưa tìm thấy voucher cho sản phẩm này
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: '#6b7280' }}>
              Hệ thống đã quét toàn bộ nguồn khuyến mãi nhưng chưa có mã phù hợp.
            </p>
          </div>
        </div>

        {/* Meta pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: '#eef2ff', color: '#4338ca' }}
          >
            <DatabaseZap className="h-3 w-3" aria-hidden="true" />
            MasOffer + AccessTrade
          </span>
          {timeLabel && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
            >
              <CalendarClock className="h-3 w-3" aria-hidden="true" />
              Kiểm tra lúc {timeLabel}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: '#f0fdf4', color: '#166534' }}
          >
            <Clock className="h-3 w-3" aria-hidden="true" />
            Cập nhật 2 lần/ngày
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-5 py-5 space-y-5">

        {/* Why section */}
        <div>
          <p
            className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#9ca3af' }}
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Tại sao không tìm thấy?
          </p>
          <div className="space-y-2">
            {REASONS.map(({ icon: Icon, iconBg, iconColor, title, desc }, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}
              >
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: iconBg }}
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" style={{ color: iconColor }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#374151' }}>{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed" style={{ color: '#6b7280' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Watch shop card */}
        <WatchShopCard />

        {/* Next steps */}
        <div>
          <p
            className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#9ca3af' }}
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            Bạn có thể làm gì tiếp?
          </p>
          <div className="space-y-2">
            <NextStepCard
              href="/deals/hot"
              label="Xem mã hot hôm nay"
              description="Deal giảm đến 50% — nhiều mã đang active"
              icon={Flame}
              iconBg="#fff1f2"
              iconColor="#be123c"
              borderColor="#fecdd3"
              hoverBg="#fff1f2"
            />
            <NextStepCard
              href="/deals/expiring"
              label="Mã sắp hết hạn"
              description="Nhiều voucher chỉ còn vài giờ — nhanh tay!"
              icon={Clock}
              iconBg="#fefce8"
              iconColor="#92400e"
              borderColor="#fde68a"
              hoverBg="#fefce8"
            />
            <NextStepCard
              href="/deals"
              label="Khám phá tất cả deals"
              description="Hơn 4.700 voucher đang hoạt động"
              icon={Grid3X3}
              iconBg="#f9fafb"
              iconColor="#374151"
              borderColor="#e5e7eb"
              hoverBg="#f9fafb"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 pt-1">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
              style={{
                backgroundColor: '#f97316',
                boxShadow: '0 2px 12px rgba(249,115,22,0.3)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ea580c'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f97316'; }}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Thử sản phẩm khác
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// error — friendly error with next-step recovery
// =============================================================================

function ErrorRichPanel({
  error,
  onRetry,
}: {
  error?: ErrorCard | null;
  onRetry?: () => void;
}) {
  const displayMessage = error?.message ?? 'Hệ thống gặp sự cố khi xử lý yêu cầu của bạn.';

  return (
    <div
      role="status"
      aria-live="assertive"
      className="overflow-hidden rounded-3xl border bg-white"
      style={{ borderColor: '#fecaca' }}
    >
      {/* Header */}
      <div
        className="px-5 pt-5 pb-4"
        style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 60%)',
          borderBottom: '1px solid #fee2e2',
        }}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
            aria-hidden="true"
          >
            <WifiOff className="h-6 w-6" style={{ color: '#dc2626' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold leading-snug" style={{ color: '#111827' }}>
              Kết nối gặp trục trặc
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: '#6b7280' }}>
              {displayMessage}
            </p>
          </div>
        </div>

        {/* Error code */}
        {error?.code && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono"
              style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
            >
              <span style={{ color: '#f87171' }}>#</span>
              {error.code}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
            >
              Đây thường là lỗi tạm thời
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-5 space-y-5">
        {/* Tips */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" style={{ color: '#d97706' }} aria-hidden="true" />
            <span className="text-xs font-semibold" style={{ color: '#92400e' }}>Có thể thử ngay</span>
          </div>
          <ul className="space-y-1.5" role="list">
            {[
              'Nhấn "Thử lại" bên dưới — hệ thống thường tự phục hồi sau vài giây.',
              'Đợi 30 giây rồi refresh trang.',
              'Nếu tiếp diễn, thử sản phẩm khác.',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#92400e' }}>
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: '#d97706' }} aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Recovery cards */}
        <div className="space-y-2">
          <NextStepCard
            href="/deals/hot"
            label="Xem mã hot hôm nay"
            description="Nhiều voucher đang active — không cần tìm kiếm"
            icon={Flame}
            iconBg="#fff1f2"
            iconColor="#be123c"
            borderColor="#fecdd3"
            hoverBg="#fff1f2"
          />
          <NextStepCard
            href="/deals"
            label="Khám phá tất cả deals"
            description="Hơn 4.700 voucher đang hoạt động"
            icon={Grid3X3}
            iconBg="#f9fafb"
            iconColor="#374151"
            borderColor="#e5e7eb"
            hoverBg="#f9fafb"
          />
        </div>

        {/* Retry CTA */}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{
              backgroundColor: '#f97316',
              boxShadow: '0 2px 12px rgba(249,115,22,0.3)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ea580c'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f97316'; }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Thử lại ngay
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// rate_limited — cooldown with escape routes
// =============================================================================

function RateLimitedPanel({ onRetry }: { onRetry?: () => void }) {
  const [cooldown, setCooldown] = useState(60);

  // Simple countdown (mock — real implementation would sync with server)
  useState(() => {
    const interval = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  });

  return (
    <div
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-3xl border bg-white"
      style={{ borderColor: '#bfdbfe' }}
    >
      <div
        className="px-5 pt-5 pb-4"
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 60%)',
          borderBottom: '1px solid #dbeafe',
        }}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}
            aria-hidden="true"
          >
            <Clock className="h-6 w-6" style={{ color: '#2563eb' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold leading-snug" style={{ color: '#111827' }}>
              Thao tác quá nhanh
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: '#6b7280' }}>
              Bạn đã thực hiện quá nhiều tra cứu. Vui lòng chờ một chút.
            </p>
          </div>
        </div>

        {/* Countdown pill */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold"
            style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
          >
            <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '2s' }} aria-hidden="true" />
            Chờ {cooldown}s
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
          >
            Tự động mở khóa sớm thôi
          </span>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Tips */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" style={{ color: '#d97706' }} aria-hidden="true" />
            <span className="text-xs font-semibold" style={{ color: '#92400e' }}>Trong lúc chờ</span>
          </div>
          <ul className="space-y-1.5" role="list">
            {[
              'Xem các deal hot đang có sẵn — không cần chờ!',
              'Tìm hiểu thêm về cách hoạt động của VoucherFinder.',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#92400e' }}>
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: '#d97706' }} aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <NextStepCard
          href="/deals/hot"
          label="Xem mã hot hôm nay"
          description="Không cần chờ — các deal đã sẵn sàng"
          icon={Flame}
          iconBg="#fff1f2"
          iconColor="#be123c"
          borderColor="#fecdd3"
          hoverBg="#fff1f2"
        />

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={cooldown > 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: '#f97316' }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Thử lại sau ({cooldown}s)
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// expired / failed — similar recovery layout
// =============================================================================

function ExpiredFailedPanel({
  variant,
  onRetry,
}: {
  variant: 'expired' | 'failed';
  onRetry?: () => void;
}) {
  const isExpired = variant === 'expired';
  const Icon = isExpired ? Clock : AlertTriangle;
  const title = isExpired ? 'Yêu cầu đã hết hạn' : 'Xử lý thất bại';
  const desc = isExpired
    ? 'Yêu cầu của bạn mất quá nhiều thời gian nên đã bị hủy.'
    : 'Hệ thống gặp sự cố khi xử lý. Thử lại thường sẽ thành công.';

  const borderColor = isExpired ? '#fde68a' : '#fecaca';
  const headerBg = isExpired ? '#fefce8' : '#fef2f2';
  const iconBg = isExpired ? '#fefce8' : '#fef2f2';
  const iconColor = isExpired ? '#d97706' : '#dc2626';

  return (
    <div
      role="status"
      aria-live="assertive"
      className="overflow-hidden rounded-3xl border bg-white"
      style={{ borderColor }}
    >
      <div
        className="px-5 pt-5 pb-4"
        style={{
          background: `linear-gradient(135deg, ${headerBg} 0%, #ffffff 60%)`,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: iconBg, border: `1px solid ${borderColor}` }}
            aria-hidden="true"
          >
            <Icon className="h-6 w-6" style={{ color: iconColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold leading-snug" style={{ color: '#111827' }}>
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: '#6b7280' }}>
              {desc}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        <NextStepCard
          href="/deals/hot"
          label="Xem mã hot hôm nay"
          description="Nhiều deal mới được cập nhật mỗi ngày"
          icon={Flame}
          iconBg="#fff1f2"
          iconColor="#be123c"
          borderColor="#fecdd3"
          hoverBg="#fff1f2"
        />
        <NextStepCard
          href="/deals/expiring"
          label="Mã sắp hết hạn"
          description="Voucher chỉ còn vài giờ — nhanh tay!"
          icon={Clock}
          iconBg="#fefce8"
          iconColor="#92400e"
          borderColor="#fde68a"
          hoverBg="#fefce8"
        />

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{
              backgroundColor: '#f97316',
              boxShadow: '0 2px 12px rgba(249,115,22,0.3)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ea580c'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f97316'; }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Thử lại ngay
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// invalid_link — recovery with format guide
// =============================================================================

function InvalidLinkPanel() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-3xl border bg-white"
      style={{ borderColor: '#fed7aa' }}
    >
      <div
        className="px-5 pt-5 pb-4"
        style={{
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 60%)',
          borderBottom: '1px solid #fed7aa',
        }}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
            aria-hidden="true"
          >
            <AlertTriangle className="h-6 w-6" style={{ color: '#ea580c' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold leading-snug" style={{ color: '#111827' }}>
              Link không hợp lệ
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: '#6b7280' }}>
              Hệ thống chỉ hỗ trợ link Shopee. Vui lòng kiểm tra lại định dạng.
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Format guide */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}
        >
          <p className="mb-3 text-xs font-semibold" style={{ color: '#374151' }}>
            Link hỗ trợ:
          </p>
          <div className="space-y-2">
            {[
              { prefix: 'shopee.vn', example: 'https://shopee.vn/tai-nghe-i.123456.7890123456' },
              { prefix: 'shope.ee', example: 'https://shope.ee/6V0pXyZ6aX' },
            ].map(({ prefix, example }) => (
              <div key={prefix} className="flex items-start gap-2">
                <div
                  className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold"
                  style={{ backgroundColor: '#f97316', color: '#ffffff' }}
                  aria-hidden="true"
                >
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: '#111827' }}>{prefix}</p>
                  <code className="text-[11px] break-all" style={{ color: '#6b7280' }}>{example}</code>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs" style={{ color: '#9ca3af' }}>
            Sao chép trực tiếp từ ứng dụng Shopee hoặc trang sản phẩm trên trình duyệt.
          </p>
        </div>

        <NextStepCard
          href="/deals/hot"
          label="Xem mã hot hôm nay"
          description="Nhiều voucher đang active — không cần nhập link"
          icon={Flame}
          iconBg="#fff1f2"
          iconColor="#be123c"
          borderColor="#fecdd3"
          hoverBg="#fff1f2"
        />
        <NextStepCard
          href="/deals"
          label="Khám phá tất cả deals"
          description="Danh sách đầy đủ voucher Shopee"
          icon={Grid3X3}
          iconBg="#f9fafb"
          iconColor="#374151"
          borderColor="#e5e7eb"
          hoverBg="#f9fafb"
        />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ResultStates({
  variant,
  error,
  onRetry,
  checkedAt,
  className,
}: ResultStatesProps) {
  // no_match gets the enriched panel
  if (variant === 'no_match') {
    return (
      <div className={clsx(className)}>
        <NoMatchRichPanel onRetry={onRetry} checkedAt={checkedAt} />
      </div>
    );
  }

  // error — rich panel
  if (variant === 'error') {
    return (
      <div className={clsx(className)}>
        <ErrorRichPanel error={error} onRetry={onRetry} />
      </div>
    );
  }

  // rate_limited — cooldown panel
  if (variant === 'rate_limited') {
    return (
      <div className={clsx(className)}>
        <RateLimitedPanel onRetry={onRetry} />
      </div>
    );
  }

  // expired / failed — recovery panel
  if (variant === 'expired' || variant === 'failed') {
    return (
      <div className={clsx(className)}>
        <ExpiredFailedPanel variant={variant} onRetry={onRetry} />
      </div>
    );
  }

  // invalid_link
  if (variant === 'invalid_link') {
    return (
      <div className={clsx(className)}>
        <InvalidLinkPanel />
      </div>
    );
  }

  return null;
}

export default ResultStates;
