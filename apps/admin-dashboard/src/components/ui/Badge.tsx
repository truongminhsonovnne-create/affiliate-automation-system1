'use client';

/**
 * Design System v2 — Badge
 *
 * Compact status labels. For large/complex status display, use StatusBadge.
 *
 * Variants: solid | soft
 * Colors:   default | success | warning | error | info | brand
 * Sizes:   sm | md
 *
 * Usage:
 *   <Badge color="success">Active</Badge>
 *   <Badge color="error" variant="solid">Failed</Badge>
 *   <Badge color="brand" dot>Online</Badge>
 */

import clsx from 'clsx';

export type BadgeColor = 'default' | 'success' | 'warning' | 'error' | 'info' | 'brand';
export type BadgeVariant = 'soft' | 'solid';
export type BadgeSize = 'sm' | 'md';

// =============================================================================
// Solid variant — colored bg + white text
// =============================================================================

const SOLID_STYLES: Record<BadgeColor, string> = {
  default: 'bg-[var(--gray-500)] text-white',
  success: 'bg-[var(--success-600)] text-white',
  warning: 'bg-[var(--warning-500)] text-white',
  error:   'bg-[var(--error-500)] text-white',
  info:    'bg-[var(--info-600)] text-white',
  brand:   'bg-[var(--brand-500)] text-white',
};

// =============================================================================
// Soft variant — tinted bg + colored text
// =============================================================================

const SOFT_STYLES: Record<BadgeColor, string> = {
  default: 'bg-[var(--gray-100)] text-[var(--gray-600)]',
  success: 'bg-[var(--success-50)]  text-[var(--success-700)]',
  warning: 'bg-[var(--warning-50)]  text-[var(--warning-700)]',
  error:   'bg-[var(--error-50)]   text-[var(--error-700)]',
  info:    'bg-[var(--info-50)]    text-[var(--info-700)]',
  brand:   'bg-[var(--brand-50)]  text-[var(--brand-700)]',
};

// =============================================================================
// Dot colors — uses bg- utility for Tailwind JIT
// =============================================================================

const DOT_STYLES: Record<BadgeColor, string> = {
  default: 'bg-[var(--gray-400)]',
  success: 'bg-[var(--success-500)]',
  warning: 'bg-[var(--warning-500)]',
  error:   'bg-[var(--error-500)]',
  info:    'bg-[var(--info-500)]',
  brand:   'bg-[var(--brand-500)]',
};

// =============================================================================
// Size styles
// =============================================================================

const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-0.5 text-[var(--font-xs)]',
};

// =============================================================================
// Component
// =============================================================================

export interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  color = 'default',
  variant = 'soft',
  size = 'md',
  dot = false,
  className,
}: BadgeProps) {
  const colorStyle = variant === 'solid' ? SOLID_STYLES[color] : SOFT_STYLES[color];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-semibold rounded-full select-none',
        colorStyle,
        SIZE_STYLES[size],
        className
      )}
    >
      {dot && (
        <span
          className={clsx('h-1.5 w-1.5 rounded-full flex-shrink-0', DOT_STYLES[color])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

// =============================================================================
// Convenience presets
// =============================================================================

export function SuccessBadge({ children, ...props }: Omit<BadgeProps, 'color'>) {
  return <Badge color="success" {...props}>{children}</Badge>;
}

export function WarningBadge({ children, ...props }: Omit<BadgeProps, 'color'>) {
  return <Badge color="warning" {...props}>{children}</Badge>;
}

export function ErrorBadge({ children, ...props }: Omit<BadgeProps, 'color'>) {
  return <Badge color="error" {...props}>{children}</Badge>;
}

export function InfoBadge({ children, ...props }: Omit<BadgeProps, 'color'>) {
  return <Badge color="info" {...props}>{children}</Badge>;
}

export function BrandBadge({ children, ...props }: Omit<BadgeProps, 'color'>) {
  return <Badge color="brand" {...props}>{children}</Badge>;
}

// =============================================================================
// StatusDot — standalone colored dot
// =============================================================================

export function StatusDot({ color }: { color: BadgeColor }) {
  return (
    <span
      className={clsx('h-2 w-2 rounded-full flex-shrink-0', DOT_STYLES[color])}
      aria-hidden="true"
    />
  );
}

export default Badge;
