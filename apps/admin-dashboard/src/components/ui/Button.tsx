'use client';

/**
 * Design System v2 — Button
 *
 * Premium button component with consistent design token usage.
 *
 * Variants: primary | secondary | ghost | destructive | outline-brand
 * Sizes:    sm | md | lg
 * States:   default, hover, active, focus, disabled, loading
 *
 * Usage:
 *   <Button variant="primary" size="md">Save</Button>
 *   <Button variant="destructive" loading={isLoading}>Delete</Button>
 */

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

// =============================================================================
// Types
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline-brand';
export type ButtonSize    = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  /** Reduce padding for compact layouts */
  compact?: boolean;
}

type ButtonRef = React.ElementRef<'button'>;

// =============================================================================
// Styles
// =============================================================================

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--brand-500)] text-white',
    'hover:bg-[var(--brand-600)]',
    'active:bg-[var(--brand-700)] active:scale-[0.98]',
    'focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2',
    'disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none',
    'shadow-[var(--shadow-brand-sm)]',
    'hover:shadow-[var(--shadow-brand)] hover:-translate-y-px',
    'active:translate-y-0 active:shadow-[var(--shadow-1)]',
  ].join(' '),

  secondary: [
    'bg-[var(--surface-raised)] text-[var(--text-secondary)]',
    'border border-[var(--border-default)]',
    'hover:bg-[var(--gray-50)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-2)]',
    'active:bg-[var(--gray-100)] active:scale-[0.98]',
    'focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--surface-raised)]',
    'shadow-[var(--shadow-1)]',
  ].join(' '),

  ghost: [
    'bg-transparent text-[var(--text-secondary)]',
    'hover:bg-[var(--gray-100)] hover:text-[var(--text-primary)]',
    'active:bg-[var(--gray-200)] active:scale-[0.98]',
    'focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),

  destructive: [
    'bg-[var(--error-500)] text-white',
    'hover:bg-[var(--error-600)]',
    'active:bg-[var(--error-700)] active:scale-[0.98]',
    'focus-visible:ring-2 focus-visible:ring-[var(--error-400)] focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'shadow-[0_2px_8px_rgb(239_68_68/0.25)]',
    'hover:shadow-[0_4px_14px_rgb(239_68_68/0.30)]',
  ].join(' '),

  'outline-brand': [
    'bg-transparent text-[var(--brand-600)]',
    'border border-[var(--brand-300)]',
    'hover:bg-[var(--brand-50)] hover:border-[var(--brand-400)] hover:text-[var(--brand-700)]',
    'active:bg-[var(--brand-100)] active:scale-[0.98]',
    'focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-8 text-[var(--font-xs)] font-semibold gap-1.5 rounded-[var(--radius)] px-3',
  md: 'h-9 text-[var(--font-sm)] font-semibold gap-2 rounded-[var(--radius)] px-4',
  lg: 'h-11 text-[var(--font-base)] font-semibold gap-2 rounded-[var(--radius-md)] px-6',
};

const COMPACT_SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-[var(--font-2xs)] font-semibold gap-1.5 rounded-[var(--radius)]',
  md: 'h-8 text-[var(--font-xs)] font-semibold gap-1.5 rounded-[var(--radius)] px-3',
  lg: 'h-9 text-[var(--font-sm)] font-semibold gap-1.5 rounded-[var(--radius)] px-4',
};

const ICON_SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

// =============================================================================
// Component
// =============================================================================

const Button = forwardRef<ButtonRef, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    compact = false,
    disabled,
    className,
    children,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;
  const iconOnly = !children && Boolean(icon);
  const sizeClass = compact ? COMPACT_SIZE_STYLES[size] : SIZE_STYLES[size];

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={clsx(
        // Base
        'inline-flex items-center justify-center',
        'font-semibold',
        'transition-all duration-[var(--duration)]',
        'cursor-pointer select-none',
        'whitespace-nowrap',
        'relative overflow-hidden',

        // Width
        fullWidth && 'w-full',

        // Variant
        VARIANT_STYLES[variant],

        // Size — icon-only overrides padding
        iconOnly ? [sizeClass, '!p-0'].join(' ') : sizeClass,

        // Disabled (extra safety beyond CSS)
        isDisabled && 'opacity-45 cursor-not-allowed pointer-events-none',

        className
      )}
      {...props}
    >
      {/* Loading overlay */}
      {loading && (
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'inherit' }}
          aria-hidden="true"
        >
          <Loader2
            className={clsx(ICON_SIZE_STYLES[size], 'animate-spin')}
            aria-hidden="true"
          />
        </span>
      )}

      {/* Icon left (non-loading) */}
      {!loading && icon && iconPosition === 'left' && (
        <span className={clsx(ICON_SIZE_STYLES[size], 'flex-shrink-0 flex items-center')} aria-hidden="true">
          {icon}
        </span>
      )}

      {/* Label */}
      {children && (
        <span className={loading ? 'opacity-0' : ''}>{children}</span>
      )}

      {/* Icon right */}
      {!loading && icon && iconPosition === 'right' && (
        <span className={clsx(ICON_SIZE_STYLES[size], 'flex-shrink-0 flex items-center')} aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
});

export { Button };
export default Button;
