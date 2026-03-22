'use client';

/**
 * Design System — Select
 *
 * Native <select> wrapper with consistent styling.
 * For complex use cases (searchable, multi-select), extend separately.
 *
 * Usage:
 *   <Select label="Status" options={options} value={v} onChange={setV} />
 */

import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

type SelectRef = React.ElementRef<'select'>;

const SIZE_STYLES = {
  sm: 'h-8 pl-3 pr-8 text-xs',
  md: 'h-9 pl-3 pr-9 text-sm',
  lg: 'h-11 pl-4 pr-10 text-base',
};

const Select = forwardRef<SelectRef, SelectProps>(function Select(
  {
    label,
    helperText,
    error,
    options,
    placeholder,
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

      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          className={clsx(
            'w-full appearance-none rounded-md border bg-white',
            'text-gray-900 transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
            'cursor-pointer',
            SIZE_STYLES[size],
            hasError && 'border-red-300 focus:ring-red-100 focus:border-red-400',
            !hasError && 'border-gray-200',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Chevron icon */}
        <span
          className={clsx(
            'absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400',
            size === 'lg' && 'right-4'
          )}
          aria-hidden="true"
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </div>

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

export { Select };
export default Select;
