'use client';

/**
 * DealsFilterBar — Filter controls for discovery pages.
 *
 * Controls:
 *  - Source filter (All / MasOffer / AccessTrade)
 *  - Sort order (Hot / Mới / Sắp hết / Chất lượng)
 *  - Deal type (Tất cả / Coupon / Voucher / Deal / Khuyến mãi)
 *  - Category (platform shortcuts)
 */

import { useCallback } from 'react';

export interface DealsFilterState {
  source: string;
  sort: string;
  deal_type: string;
  category: string;
}

interface DealsFilterBarProps {
  filters: DealsFilterState;
  onChange: (filters: DealsFilterState) => void;
  /** Show source filter */
  showSource?: boolean;
  /** Show sort filter */
  showSort?: boolean;
  /** Show deal type filter */
  showDealType?: boolean;
  /** Show category shortcuts */
  showCategory?: boolean;
}

const SOURCE_OPTIONS = [
  { value: 'all', label: 'Tất cả nguồn' },
  { value: 'masoffer', label: 'MasOffer' },
  { value: 'accesstrade', label: 'AccessTrade' },
];

const SORT_OPTIONS = [
  { value: 'hot', label: '🔥 Hot nhất' },
  { value: 'new', label: '✨ Mới nhất' },
  { value: 'expiring', label: '⏰ Sắp hết hạn' },
  { value: 'quality', label: '⭐ Chất lượng' },
];

const DEAL_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại' },
  { value: 'coupon', label: 'Coupon' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'deal', label: 'Deal' },
  { value: 'promotion', label: 'Khuyến mãi' },
  { value: 'campaign', label: 'Campaign' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'Tất cả nền tảng' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'tiki', label: 'Tiki' },
  { value: 'tiktok', label: 'Tiktok Shop' },
  { value: 'sendo', label: 'Sendo' },
  { value: 'grab', label: 'Grab' },
  { value: 'gojek', label: 'Gojek' },
  { value: 'foody', label: 'Foody' },
  { value: 'fashion', label: 'Thời trang' },
  { value: 'beauty', label: 'Làm đẹp' },
];

// ── Select ─────────────────────────────────────────────────────────────────────

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#9ca3af' }}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl px-3 py-2 text-sm font-medium transition-all cursor-pointer"
        style={{
          backgroundColor: '#ffffff',
          color: '#374151',
          border: '1px solid #f3f4f6',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          minWidth: '9rem',
        }}
        onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#fb923c'; }}
        onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#f3f4f6'; }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Main FilterBar ─────────────────────────────────────────────────────────────

export function DealsFilterBar({
  filters,
  onChange,
  showSource = true,
  showSort = true,
  showDealType = false,
  showCategory = false,
}: DealsFilterBarProps) {
  const set = useCallback(
    (key: keyof DealsFilterState, value: string) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange]
  );

  return (
    <div
      className="flex flex-wrap items-end gap-3 p-4 rounded-2xl"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #f3f4f6',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {showSource && (
        <FilterSelect
          label="Nguồn"
          options={SOURCE_OPTIONS}
          value={filters.source}
          onChange={(v) => set('source', v)}
        />
      )}

      {showSort && (
        <FilterSelect
          label="Sắp xếp"
          options={SORT_OPTIONS}
          value={filters.sort}
          onChange={(v) => set('sort', v)}
        />
      )}

      {showDealType && (
        <FilterSelect
          label="Loại deal"
          options={DEAL_TYPE_OPTIONS}
          value={filters.deal_type}
          onChange={(v) => set('deal_type', v)}
        />
      )}

      {showCategory && (
        <FilterSelect
          label="Nền tảng"
          options={CATEGORY_OPTIONS}
          value={filters.category}
          onChange={(v) => set('category', v)}
        />
      )}

      {/* Active filter indicator */}
      {(filters.source !== 'all' || filters.deal_type || filters.category || filters.sort !== 'hot') && (
        <button
          type="button"
          onClick={() => onChange({ source: 'all', sort: 'hot', deal_type: '', category: '' })}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
          style={{ color: '#9ca3af', backgroundColor: '#f9fafb' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#9ca3af'; (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'; }}
        >
          ✕ Xóa lọc
        </button>
      )}
    </div>
  );
}
