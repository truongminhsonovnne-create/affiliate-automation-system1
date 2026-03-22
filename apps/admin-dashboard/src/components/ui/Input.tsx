'use client';

/**
 * Design System v2 — Input
 *
 * Unified text input with CSS custom-property foundation.
 * Integrates with DS label + error + helper patterns.
 *
 * Usage:
 *   <Input label="Email" placeholder="you@example.com" />
 *   <Input label="Search" icon={<Search />} />
 *   <Input label="Password" error="Required" type="password" />
 */

import { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export type InputSize = 'sm' | 'md' | 'lg';

// =============================================================================
// Types
// =============================================================================

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  size?: InputSize;
  fullWidth?: boolean;
}

type InputRef = React.ElementRef<'input'>;

// =============================================================================
// Styles
// =============================================================================

const SIZE_STYLES: Record<InputSize, string> = {
  sm: 'h-8 text-[var(--font-xs)] px-3',
  md: 'h-9 text-[var(--font-sm)] px-3',
  lg: 'h-11 text-[var(--font-base)] px-4',
};

const ICON_RIGHT_PAD: Record<InputSize, string> = {
  sm: '!pr-9',
  md: '!pr-9',
  lg: '!pr-12',
};

const ICON_POS: Record<InputSize, { pos: string; size: string }> = {
  sm: { pos: 'left-2.5 top-1/2 -translate-y-1/2', size: 'h-4 w-4' },
  md: { pos: 'left-3 top-1/2 -translate-y-1/2', size: 'h-4 w-4' },
  lg: { pos: 'left-4 top-1/2 -translate-y-1/2', size: 'h-5 w-5' },
};

// =============================================================================
// Component
// =============================================================================

const Input = forwardRef<InputRef, InputProps>(function Input(
  {
    label,
    helperText,
    error,
    icon,
    trailing,
    size = 'md',
    fullWidth = true,
    className,
    id: idProp,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const helperId = `${id}-helper`;
  const errorId  = `${id}-error`;

  const hasError = Boolean(error);
  const hasIcon  = Boolean(icon);

  return (
    <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="text-[var(--font-sm)] font-medium select-none cursor-pointer"
          style={{ color: 'var(--text-primary)' }}
        >
          {label}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative">
        {/* Leading icon */}
        {hasIcon && (
          <span
            className={clsx(
              'absolute pointer-events-none flex items-center',
              ICON_POS[size].pos
            )}
            style={{ color: 'var(--gray-400)' }}
            aria-hidden="true"
          >
            <span className={ICON_POS[size].size}>{icon}</span>
          </span>
        )}

        {/* Input element */}
        <input
          ref={ref}
          id={id}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? errorId : helperText ? helperId : undefined
          }
          className={clsx(
            // Base
            'w-full rounded-[var(--radius)]',
            'border',
            'bg-[var(--surface-raised)]',
            'text-[var(--text-primary)]',
            'placeholder:text-[var(--gray-400)]',
            'transition-all duration-[var(--duration)]',
            // Size
            SIZE_STYLES[size],
            // Icon padding
            hasIcon && ICON_RIGHT_PAD[size],
            // Trailing padding
            trailing && '!pr-10',
            // Error state
            hasError && [
              'border-[var(--error-500)]',
              'focus:border-[var(--error-500)]',
              'focus:shadow-[0_0_0_3px_rgb(239_68_68/0.12)]',
              'bg-[var(--error-50)]',
            ].join(' '),
            // Default focus
            !hasError && [
              'border-[var(--border-default)]',
              'focus:border-[var(--brand-400)]',
              'focus:shadow-[var(--shadow-focus-sm)]',
            ].join(' '),
            // Disabled
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--gray-50)]',
            className
          )}
          {...props}
        />

        {/* Error icon (trailing override) */}
        {hasError && !trailing && (
          <span
            className={clsx(
              'absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none',
              size === 'lg' && 'right-4'
            )}
            style={{ color: 'var(--error-500)' }}
            aria-hidden="true"
          >
            <AlertCircle className="h-4 w-4" />
          </span>
        )}

        {/* Custom trailing element */}
        {trailing && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {trailing}
          </span>
        )}
      </div>

      {/* Error message */}
      {hasError && (
        <p
          id={errorId}
          className="text-[var(--font-xs)] flex items-center gap-1"
          role="alert"
          style={{ color: 'var(--error-600)' }}
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Helper text (only when no error) */}
      {!hasError && helperText && (
        <p
          id={helperId}
          className="text-[var(--font-xs)]"
          style={{ color: 'var(--text-muted)' }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

export { Input };
export default Input;
