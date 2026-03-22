'use client';

/**
 * BarChart — Lightweight SVG bar chart.
 * No external dependencies.
 *
 * Usage:
 *   <BarChart
 *     data={[{ label: 'T2', value: 42 }, { label: 'T3', value: 58 }]}
 *     height={120}
 *     color="bg-brand-500"
 *     showValues
 *   />
 */

import clsx from 'clsx';

export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartItem[];
  height?: number;
  color?: string;
  /** CSS color string e.g. '#2563eb' or 'bg-brand-500' */
  barColor?: string;
  showValues?: boolean;
  valueFormatter?: (v: number) => string;
  loading?: boolean;
  className?: string;
}

export function BarChart({
  data,
  height = 120,
  barColor,
  showValues = false,
  valueFormatter = (v) => String(v),
  loading = false,
  className,
}: BarChartProps) {
  if (loading) {
    return (
      <div className={className} style={{ height }}>
        <div className="flex items-end gap-1 h-full">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-100 rounded animate-pulse"
              style={{ height: `${30 + Math.random() * 70}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={clsx('w-full', className)}>
      {/* Bar area */}
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => {
          const pct = Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0);
          return (
            <div key={i} className="flex flex-col items-center flex-1 gap-1">
              {/* Value label */}
              {showValues && d.value > 0 && (
                <span className="text-[10px] text-gray-400 leading-none">
                  {valueFormatter(d.value)}
                </span>
              )}
              {/* Bar */}
              <div className="relative w-full flex items-end" style={{ height: `calc(100% - ${showValues ? '14px' : '0px'})` }}>
                <div
                  className={clsx(
                    'w-full rounded-sm transition-all duration-500',
                    barColor ?? 'bg-brand-400'
                  )}
                  style={{ height: `${pct}%` }}
                  title={`${d.label}: ${valueFormatter(d.value)}`}
                />
              </div>
              {/* X label */}
              <span className="text-[10px] text-gray-400 leading-none mt-1">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BarChart;
