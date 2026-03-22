'use client';

/**
 * TimeRangeFilter — Segmented control for dashboard time ranges.
 * Used by BI-style dashboards to scope KPI comparisons.
 *
 * Usage:
 *   <TimeRangeFilter value={range} onChange={setRange} />
 */

import clsx from 'clsx';

export type TimeRange = '1h' | '24h' | '7d' | '30d';

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '1h',  label: '1h'  },
  { value: '24h', label: '24h' },
  { value: '7d',  label: '7d'  },
  { value: '30d', label: '30d' },
];

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

export function TimeRangeFilter({ value, onChange, className }: TimeRangeFilterProps) {
  return (
    <div
      role="group"
      aria-label="Khoảng thời gian"
      className={clsx(
        'inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5',
        className
      )}
    >
      {RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          aria-pressed={value === r.value}
          className={clsx(
            'px-3 py-1 text-xs font-medium rounded-md transition-all duration-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
            value === r.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export default TimeRangeFilter;
