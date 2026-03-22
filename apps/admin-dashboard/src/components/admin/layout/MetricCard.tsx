'use client';

/**
 * MetricCard — Dashboard KPI card
 *
 * Shows a single key metric with optional trend indicator.
 * Clickable variant for drill-down navigation.
 *
 * Variants: neutral | success | warning | error
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  /** Trend vs previous period */
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: number;
    label?: string;
  };
  /** Border accent color variant */
  variant?: 'neutral' | 'success' | 'warning' | 'error';
  subtitle?: string;
  /** Short context line shown below subtitle — e.g. "so với tuần trước" */
  context?: string;
  /** Secondary value shown as muted text below the main value */
  secondary?: string;
  /** ISO timestamp string — shown as "Cập nhật: X phút trước" */
  updatedAt?: string;
  onClick?: () => void;
  className?: string;
}

const VARIANT_STYLES: Record<
  NonNullable<MetricCardProps['variant']>,
  {
    border: string;
    iconBg: string;
    iconColor: string;
    trendUp: string;
    trendDown: string;
    trendStable: string;
  }
> = {
  neutral: {
    border: 'border-l-gray-300',
    iconBg: 'bg-gray-50',
    iconColor: 'text-gray-400',
    trendUp: 'text-green-600',
    trendDown: 'text-red-600',
    trendStable: 'text-gray-500',
  },
  success: {
    border: 'border-l-green-500',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-500',
    trendUp: 'text-green-600',
    trendDown: 'text-red-600',
    trendStable: 'text-gray-500',
  },
  warning: {
    border: 'border-l-amber-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    trendUp: 'text-green-600',
    trendDown: 'text-amber-700',
    trendStable: 'text-gray-500',
  },
  error: {
    border: 'border-l-red-500',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    trendUp: 'text-green-600',
    trendDown: 'text-red-600',
    trendStable: 'text-gray-500',
  },
};

const TrendIcon = ({ direction }: { direction: NonNullable<MetricCardProps['trend']>['direction'] }) => {
  if (direction === 'up') return <TrendingUp className="h-3.5 w-3.5" />;
  if (direction === 'down') return <TrendingDown className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'neutral',
  subtitle,
  context,
  secondary,
  updatedAt,
  onClick,
  className,
}: MetricCardProps) {
  const styles = VARIANT_STYLES[variant];
  const isClickable = Boolean(onClick);
  const trendColor = trend
    ? trend.direction === 'up'
      ? styles.trendUp
      : trend.direction === 'down'
      ? styles.trendDown
      : styles.trendStable
    : '';

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
      className={clsx(
        'relative bg-white rounded-xl border border-gray-200 p-4',
        'border-l-4 shadow-card',
        styles.border,
        isClickable && [
          'cursor-pointer text-left w-full',
          'hover:shadow-md hover:border-gray-300 transition-shadow duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset',
        ],
        className
      )}
    >
      {/* Content */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: title + value */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
            {title}
          </p>

          {/* Value */}
          <p className="mt-1.5 text-2xl font-bold text-gray-900 truncate">
            {value}
          </p>

          {/* Subtitle / context */}
          {(subtitle || context) && (
            <p className="mt-1 text-xs text-gray-400 truncate">
              {subtitle}{subtitle && context && <span className="mx-1">·</span>}{context}
            </p>
          )}

          {/* Secondary value */}
          {secondary && (
            <p className="mt-0.5 text-xs text-gray-400">{secondary}</p>
          )}

          {/* Trend */}
          {trend && (
            <div className={clsx('mt-2 flex items-center gap-1.5', trendColor)}>
              <TrendIcon direction={trend.direction} />
              <span className="text-xs font-semibold">
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-xs text-gray-400">{trend.label}</span>
              )}
            </div>
          )}

          {/* Updated timestamp */}
          {updatedAt && (
            <p className="mt-2 text-[10px] text-gray-300">
              Cập nhật: {updatedAt}
            </p>
          )}
        </div>

        {/* Right: icon */}
        {Icon && (
          <div
            className={clsx(
              'flex-shrink-0 flex items-center justify-center',
              'h-10 w-10 rounded-xl',
              styles.iconBg
            )}
          >
            <Icon className={clsx('h-5 w-5', styles.iconColor)} aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}

export default MetricCard;
