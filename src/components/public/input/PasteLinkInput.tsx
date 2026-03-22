// =============================================================================
// Paste Link Input
// Large, prominent input for pasting Shopee product links
// =============================================================================

'use client';

import { useState, useCallback, useRef } from 'react';

interface PasteLinkInputProps {
  onSubmit: (input: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Large, prominent paste link input
 */
export function PasteLinkInput({
  onSubmit,
  isLoading = false,
  placeholder = 'Dán link sản phẩm Shopee vào đây...',
  disabled = false,
}: PasteLinkInputProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle paste event
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      // Auto-submit on paste if it looks like a URL
      if (pastedText.includes('shopee') || pastedText.includes('http')) {
        // Don't auto-submit, let user click button
      }
    }
  }, []);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setError(null);
  }, []);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!input.trim()) {
      setError('Vui lòng nhập link sản phẩm');
      return;
    }

    if (input.length < 10) {
      setError('Link quá ngắn');
      return;
    }

    setError(null);
    onSubmit(input.trim());
  }, [input, onSubmit]);

  // Handle keyboard shortcut (Cmd/Ctrl + Enter to submit)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="w-full">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={`
            w-full h-24 p-4 text-base
            border-2 rounded-xl resize-none
            transition-all duration-200
            placeholder:text-gray-400
            ${error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
            }
            ${disabled || isLoading ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
          `}
          style={{ outline: 'none' }}
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={disabled || isLoading || !input.trim()}
        className={`
          w-full mt-4 py-3 px-6
          text-base font-medium rounded-xl
          transition-all duration-200
          ${input.trim() && !isLoading
            ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Đang tìm mã...
          </span>
        ) : (
          'Tìm mã giảm giá'
        )}
      </button>

      <p className="mt-3 text-xs text-center text-gray-400">
        Dán link sản phẩm Shopee và nhấn nút tìm mã
      </p>
    </div>
  );
}
