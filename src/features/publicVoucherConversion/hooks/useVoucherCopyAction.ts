// =============================================================================
// Use Voucher Copy Action Hook
// Production-grade hook for copy-to-clipboard action
// =============================================================================

'use client';

import { useState, useCallback } from 'react';
import { VoucherCopyResult } from '../types';
import { ACTION_TIMING } from '../constants';

interface UseVoucherCopyActionOptions {
  /** Called when copy starts */
  onCopyStart?: () => void;
  /** Called when copy succeeds */
  onCopySuccess?: (result: VoucherCopyResult) => void;
  /** Called when copy fails */
  onCopyError?: (error: Error) => void;
}

interface UseVoucherCopyActionReturn {
  /** Current copy state */
  copyState: 'idle' | 'copying' | 'copied' | 'error';
  /** Copy the voucher code to clipboard */
  copyToClipboard: (code: string) => Promise<void>;
  /** Reset copy state */
  resetCopyState: () => void;
  /** Error message if copy failed */
  errorMessage: string | null;
}

/**
 * Hook for copy-to-clipboard action
 */
export function useVoucherCopyAction(
  options?: UseVoucherCopyActionOptions
): UseVoucherCopyActionReturn {
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetCopyState = useCallback(() => {
    setCopyState('idle');
    setErrorMessage(null);
  }, []);

  const copyToClipboard = useCallback(async (code: string) => {
    // Prevent concurrent copies
    if (copyState === 'copying') {
      return;
    }

    // Mark copy start
    setCopyState('copying');
    setErrorMessage(null);
    options?.onCopyStart?.();

    try {
      // Try using Clipboard API
      await navigator.clipboard.writeText(code);

      // Success!
      setCopyState('copied');
      options?.onCopySuccess?.({
        success: true,
        code,
      });

      // Reset after duration
      setTimeout(() => {
        setCopyState('idle');
      }, ACTION_TIMING.COPY_SUCCESS_DURATION);
    } catch (error) {
      // Fallback for browsers that don't support Clipboard API
      try {
        // Create fallback textarea
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();

        // Execute copy
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (successful) {
          setCopyState('copied');
          options?.onCopySuccess?.({
            success: true,
            code,
          });

          setTimeout(() => {
            setCopyState('idle');
          }, ACTION_TIMING.COPY_SUCCESS_DURATION);
        } else {
          throw new Error('Fallback copy failed');
        }
      } catch (fallbackError) {
        // Both methods failed
        const error = fallbackError instanceof Error ? fallbackError : new Error('Copy failed');
        setCopyState('error');
        setErrorMessage('Không thể sao chép. Vui lòng thử chọn thủ công.');
        options?.onCopyError?.(error);
      }
    }
  }, [copyState, options]);

  return {
    copyState,
    copyToClipboard,
    resetCopyState,
    errorMessage,
  };
}
