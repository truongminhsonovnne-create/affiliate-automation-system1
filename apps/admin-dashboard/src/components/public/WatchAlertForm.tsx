'use client';

/**
 * WatchAlertForm — Retention hook v1: watch a shop / category / keyword.
 *
 * UX flow:
 *   1. User picks a target type (shop / category / keyword)
 *   2. User types a value
 *   3. User enters email
 *   4. Confirm → stored in localStorage, no backend required
 *
 * Places to mount this component:
 *   - NoMatchRichPanel in ResultStates.tsx  ✓ (replaces WatchShopCard)
 *   - /deals/hot  section   (suggested v2)
 *   - /deals/expiring section (suggested v2)
 */

import { useState, useCallback, useEffect } from 'react';
import { Bell, Mail, RefreshCw, CheckCircle, Tag, Package, Search, X, ChevronDown } from 'lucide-react';
import { subscribe, isSubscribed, type SubscriptionTarget, type TargetType } from '@/lib/public/subscription-store';
import clsx from 'clsx';

// ── Target type selector ──────────────────────────────────────────────────────

const TARGET_TYPES: { value: TargetType; label: string; icon: React.ElementType; placeholder: string; hint: string }[] = [
  {
    value: 'shop',
    label: 'Theo Shop',
    icon: Tag,
    placeholder: 'VD: chotshop.hn hoặc tai-nghe-official',
    hint: 'Nhập tên hoặc link shop trên Shopee',
  },
  {
    value: 'category',
    label: 'Theo Danh mục',
    icon: Package,
    placeholder: 'VD: áo thun nam, kem chống nắng',
    hint: 'Nhập tên danh mục sản phẩm',
  },
  {
    value: 'keyword',
    label: 'Theo Từ khóa',
    icon: Search,
    placeholder: 'VD: iPhone 16 case, máy massage',
    hint: 'Nhập từ khóa sản phẩm bạn quan tâm',
  },
];

// ── Success state ─────────────────────────────────────────────────────────────

function SuccessState({ target, onDismiss }: { target: SubscriptionTarget; onDismiss: () => void }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: '#dcfce7' }}
          aria-hidden="true"
        >
          <CheckCircle className="h-5 w-5" style={{ color: '#16a34a' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: '#166534' }}>
              Đã bật thông báo!
            </p>
            <button
              onClick={onDismiss}
              className="flex-shrink-0 rounded-lg p-1 transition-colors"
              style={{ color: '#15803d' }}
              aria-label="Đóng"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: '#15803d' }}>
            Chúng tôi sẽ gửi email khi có voucher mới cho{' '}
            <span className="font-semibold">{target.label}</span>.
          </p>
          <p className="mt-1 text-[11px]" style={{ color: '#16a34a' }}>
            Cập nhật 2 lần/ngày · Miễn phí · Không spam
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function WatchAlertForm({
  /** Pre-fill target type (e.g. when embedded in a shop-specific context) */
  defaultType,
  /** Pre-fill target value/label */
  defaultValue,
  defaultLabel,
  /** Called when user successfully subscribes */
  onSubscribed,
  className,
}: {
  defaultType?: TargetType;
  defaultValue?: string;
  defaultLabel?: string;
  onSubscribed?: (target: SubscriptionTarget) => void;
  className?: string;
}) {
  const [type, setType] = useState<TargetType>(defaultType ?? 'shop');
  const [value, setValue] = useState(defaultValue ?? '');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);

  const selectedType = TARGET_TYPES.find((t) => t.value === type)!;

  // Check if already subscribed to this value on mount
  useEffect(() => {
    if (defaultValue && isSubscribed(defaultValue)) {
      setSubscribed(true);
    }
  }, [defaultValue]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim() || !value.trim()) return;

      const label = value.trim();
      const target: SubscriptionTarget = { type, value: label.toLowerCase().replace(/\s+/g, '-'), label };

      setLoading(true);
      // Small artificial delay so loading spinner is visible
      await new Promise((r) => setTimeout(r, 700));
      setLoading(false);

      subscribe(email.trim(), target);
      setSubmitted(true);
      onSubscribed?.(target);
    },
    [email, value, type, onSubscribed]
  );

  // ── Already subscribed ──────────────────────────────────────────────────────
  if (subscribed && !submitted) {
    const target: SubscriptionTarget = {
      type: type,
      value: defaultValue ?? '',
      label: defaultLabel ?? defaultValue ?? '',
    };
    return (
      <div className={clsx('rounded-2xl border border-emerald-100 bg-emerald-50 p-4', className)}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: '#dcfce7' }}
            aria-hidden="true"
          >
            <Bell className="h-4 w-4" style={{ color: '#16a34a' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#166534' }}>
              Đang theo dõi
            </p>
            <p className="text-xs" style={{ color: '#15803d' }}>
              Bạn đã nhận thông báo cho {target.label} — cập nhật 2 lần/ngày.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (submitted) {
    const target: SubscriptionTarget = {
      type,
      value: value.toLowerCase().replace(/\s+/g, '-'),
      label: value.trim(),
    };
    return (
      <SuccessState
        target={target}
        onDismiss={() => setSubmitted(false)}
      />
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div
      className={clsx('rounded-2xl border bg-white px-5 py-5', className)}
      style={{ borderColor: '#fed7aa', background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 60%)' }}
      aria-label="Theo dõi voucher mới"
    >
      {/* Header */}
      <div className="mb-4 flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: '#fef3c7' }}
          aria-hidden="true"
        >
          <Bell className="h-5 w-5" style={{ color: '#d97706' }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: '#92400e' }}>
            Khi có voucher mới — thông báo ngay
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>
            Nhập email, chúng tôi sẽ gửi thông báo khi có khuyến mãi phù hợp.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {/* Target type selector */}
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: '#78350f' }}>
            Theo dõi
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setTypeMenuOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm text-left transition-shadow"
              style={{
                borderColor: '#fde68a',
                backgroundColor: '#ffffff',
                color: '#78350f',
              }}
              aria-haspopup="listbox"
              aria-expanded={typeMenuOpen}
            >
              <span className="flex items-center gap-2">
                <selectedType.icon className="h-4 w-4 flex-shrink-0" style={{ color: '#d97706' }} aria-hidden="true" />
                {selectedType.label}
              </span>
              <ChevronDown
                className="h-4 w-4 flex-shrink-0 transition-transform"
                style={{ transform: typeMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: '#d97706' }}
                aria-hidden="true"
              />
            </button>

            {typeMenuOpen && (
              <div
                className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border bg-white py-1 shadow-lg"
                style={{ borderColor: '#fde68a' }}
                role="listbox"
              >
                {TARGET_TYPES.map(({ value: v, label, icon: Icon }) => (
                  <button
                    key={v}
                    type="button"
                    role="option"
                    aria-selected={type === v}
                    onClick={() => { setType(v); setTypeMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors"
                    style={{ color: type === v ? '#92400e' : '#78350f', backgroundColor: type === v ? '#fef3c7' : 'transparent' }}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" style={{ color: '#d97706' }} aria-hidden="true" />
                    {label}
                    {type === v && (
                      <CheckCircle className="ml-auto h-3.5 w-3.5" style={{ color: '#d97706' }} aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-1 text-[11px]" style={{ color: '#b45309' }}>
            {selectedType.hint}
          </p>
        </div>

        {/* Value input */}
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: '#78350f' }}>
            {type === 'shop' ? 'Tên shop' : type === 'category' ? 'Danh mục' : 'Từ khóa'}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={selectedType.placeholder}
            required
            className="w-full rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-shadow focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            aria-label={type === 'shop' ? 'Tên shop' : type === 'category' ? 'Danh mục sản phẩm' : 'Từ khóa'}
          />
        </div>

        {/* Email */}
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: '#78350f' }}>
            Email nhận thông báo <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
            className="w-full rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-shadow focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            aria-label="Địa chỉ email nhận thông báo"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !email.trim() || !value.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backgroundColor: '#d97706',
            boxShadow: '0 2px 8px rgba(217,119,6,0.25)',
          }}
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              Đang lưu...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" aria-hidden="true" />
              Bật thông báo
            </>
          )}
        </button>

        {/* Disclaimer */}
        <p className="text-center text-[11px]" style={{ color: '#b45309' }}>
          Miễn phí · Không spam · Hủy bất kỳ lúc nào
        </p>
      </form>
    </div>
  );
}

export default WatchAlertForm;
