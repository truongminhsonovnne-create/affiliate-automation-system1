'use client';

/**
 * Design System — Textarea
 *
 * Usage:
 *   <Textarea label="Notes" placeholder="Enter notes..." />
 */

import { forwardRef, useId } from 'react';
import clsx from 'clsx';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
}

type TextareaRef = React.ElementRef<'textarea'>;

const Textarea = forwardRef<TextareaRef, TextareaProps>(function Textarea(
  {
    label,
    helperText,
    error,
    fullWidth = true,
    className,
    id: idProp,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const hasError = Boolean(error);

  return (
    <div className={clsx('flex flex-col gap-1', fullWidth && 'w-full')}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-700 select-none"
        >
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={id}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
        className={clsx(
          'w-full rounded-md border bg-white px-3 py-2',
          'text-sm text-gray-900 placeholder:text-gray-400',
          'transition-all duration-150 resize-y min-h-[80px]',
          'focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
          hasError && 'border-red-300 focus:ring-red-100 focus:border-red-400',
          !hasError && 'border-gray-200',
          className
        )}
        {...props}
      />

      {hasError && (
        <p id={errorId} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      {!hasError && helperText && (
        <p id={helperId} className="text-xs text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

export { Textarea };
export default Textarea;
