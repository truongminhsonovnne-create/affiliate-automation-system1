'use client';

/**
 * LinkInput — Paste-anywhere input with paste detection,
 * inline validation, example links, and accessible focus management.
 */

import { useRef, useState, useCallback, useId } from 'react';
import { Link2, AlertCircle, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import type { ResolutionStatus } from '@/lib/public/api-client';

// =============================================================================
// Types
// =============================================================================

export interface LinkInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  status: ResolutionStatus;
  /** Whether to show example links */
  showExamples?: boolean;
  /** Disabled during processing */
  disabled?: boolean;
  className?: string;
}

// =============================================================================
// Example links for user guidance
// =============================================================================

const EXAMPLE_LINKS = [
  {
    label: 'Sản phẩm Shopee',
    url: 'https://shopee.vn/product/tai-nghe-bluetooth/1234567890',
    badge: 'Phổ biến',
  },
  {
    label: 'Sản phẩm Shopee VN',
    url: 'https://shopee.vn/-Tai-nghe-Bluetooth-Ch%C3%ADnh-h%C3%A3ng-i.12345678.9876543210',
    badge: 'VN',
  },
];

// =============================================================================
// URL Validation (lightweight client-side pre-check)
// =============================================================================

function isProbablyShopeeUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.includes('shopee') ||
    trimmed.includes('lazada') ||
    trimmed.includes('tiki') ||
    trimmed.includes('tiktok') ||
    trimmed.startsWith('http')
  );
}

function isTooShort(value: string): boolean {
  return value.trim().length > 0 && value.trim().length < 5;
}

function looksLikeUrl(value: string): boolean {
  return value.trim().includes('.') && value.trim().length > 4;
}

// =============================================================================
// Component
// =============================================================================

export function LinkInput({
  value,
  onChange,
  onSubmit,
  status,
  showExamples = true,
  disabled = false,
  className,
}: LinkInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasPasted, setHasPasted] = useState(false);
  const [showExamplesList, setShowExamplesList] = useState(false);
  const inputId = useId();
  const hintId = useId();

  // Detect paste events to give feedback
  const handlePaste = useCallback(() => {
    setHasPasted(true);
    setTimeout(() => setHasPasted(false), 2000);
  }, []);

  // Enter key triggers submit
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (value.trim().length >= 5 && !disabled) {
          onSubmit();
        }
      }
    },
    [value, onSubmit, disabled]
  );

  const isProcessing =
    status === 'queued' || status === 'processing' || status === 'retrying';
  const isDisabled = disabled || isProcessing;

  // Compute inline validation hint
  const validationHint = getValidationHint(value, status);

  return (
    <div className={clsx('w-full', className)}>
      {/* Input wrapper */}
      <div
        className={clsx(
          'relative flex items-center rounded-2xl border-2 transition-all duration-200',
          'bg-white shadow-card',
          'px-3 sm:px-4', // tighter horizontal padding on mobile
          isDisabled
            ? 'border-gray-200 opacity-60'
            : validationHint?.type === 'error'
            ? 'border-red-300 focus-within:border-red-400'
            : hasPasted
            ? 'border-green-400 bg-green-50/30'
            : 'border-gray-200 focus-within:border-brand-400',
          'focus-within:ring-2 focus-within:ring-brand-100 focus-within:ring-inset' // ring-inset prevents layout shift
        )}
      >
        {/* Icon */}
        <div className="flex-shrink-0 pl-4">
          <Link2
            className={clsx(
              'h-5 w-5 transition-colors',
              hasPasted
                ? 'text-green-500'
                : validationHint?.type === 'error'
                ? 'text-red-400'
                : 'text-gray-400'
            )}
          />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showExamplesList}
          aria-controls={hintId}
          aria-invalid={validationHint?.type === 'error'}
          aria-describedby={validationHint ? hintId : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="url"
          enterKeyHint="go"
          placeholder="Dán link sản phẩm Shopee..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowExamplesList(true)}
          onBlur={() => setTimeout(() => setShowExamplesList(false), 200)}
          disabled={isDisabled}
          className={clsx(
            'flex-1 border-0 bg-transparent px-3 py-4',
            /* 16px font prevents iOS auto-zoom on focus */
            'text-base sm:text-base',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-0',
            'disabled:cursor-not-allowed',
            'transition-colors',
            /* ensure minimum 44px touch target on the input itself */
            'min-h-[44px]'
          )}
        />

        {/* Paste feedback badge */}
        {hasPasted && !isProcessing && (
          <span className="mr-3 flex-shrink-0 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700">
            Đã dán ✓
          </span>
        )}

        {/* Submit button — full width on mobile, shrinks on sm+ */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isDisabled || value.trim().length < 5}
          aria-label="Tìm mã giảm giá"
          className={clsx(
            'flex-shrink-0 flex items-center justify-center gap-2 rounded-xl px-4',
            'h-11 min-w-[44px]',   // 44px tap target minimum
            'font-semibold text-sm transition-all duration-200',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !isDisabled && value.trim().length >= 5
              ? 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 active:scale-95 shadow-brand-sm hover:shadow-brand'
              : 'bg-gray-200 text-gray-400',
            'sm:px-5 sm:py-2.5 sm:h-auto' // larger on sm+
          )}
        >
          {isProcessing ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="hidden sm:inline">Đang tìm...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>Tìm mã</span>
            </>
          )}
        </button>
      </div>

      {/* Inline validation hint */}
      {validationHint && (
        <div
          id={hintId}
          role="alert"
          className={clsx(
            'mt-2 flex items-start gap-1.5 px-1 text-sm',
            validationHint.type === 'error' ? 'text-red-600' : 'text-gray-500'
          )}
        >
          {validationHint.type === 'error' && (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          )}
          <span>{validationHint.message}</span>
        </div>
      )}

      {/* Examples dropdown */}
      {showExamples && showExamplesList && !isProcessing && value.trim().length === 0 && (
        <div
          className={clsx(
            'mt-2 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
        >
          <div className="border-b border-gray-100 px-4 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Ví dụ link hợp lệ
            </p>
          </div>
          <ul className="divide-y divide-gray-50" role="listbox" aria-label="Ví dụ link">
            {EXAMPLE_LINKS.map((example, i) => (
              <li key={i}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Don't steal focus from input
                    onChange(example.url);
                    setShowExamplesList(false);
                    inputRef.current?.focus();
                  }}
                  className={clsx(
                    'flex w-full items-center justify-between px-4 py-3 text-left',
                    'transition-colors hover:bg-brand-50',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">{example.label}</span>
                      <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {example.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-400">{example.url}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Validation hint logic
// =============================================================================

function getValidationHint(
  value: string,
  status: ResolutionStatus
): { type: 'error' | 'hint'; message: string } | null {
  const trimmed = value.trim();

  // Show real error states inline
  if (status === 'invalid_link' && trimmed.length > 0) {
    return {
      type: 'error',
      message: 'Link không hợp lệ. Vui lòng nhập link sản phẩm Shopee.',
    };
  }

  // Pre-check: too short but user has typed something
  if (isTooShort(trimmed)) {
    return {
      type: 'hint',
      message: 'Link quá ngắn. Vui lòng nhập đầy đủ link sản phẩm.',
    };
  }

  // Pre-check: looks like text, not URL
  if (trimmed.length > 0 && !looksLikeUrl(trimmed)) {
    return {
      type: 'hint',
      message: 'Link nên bắt đầu bằng https:// và chứa tên miền.',
    };
  }

  return null;
}

export default LinkInput;
