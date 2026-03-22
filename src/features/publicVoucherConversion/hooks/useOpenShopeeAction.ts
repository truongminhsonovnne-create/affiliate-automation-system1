// =============================================================================
// Use Open Shopee Action Hook
// Production-grade hook for opening Shopee action
// =============================================================================

'use client';

import { useState, useCallback } from 'react';
import { VoucherOpenShopeeResult } from '../types';

interface UseOpenShopeeActionOptions {
  /** Called when open starts */
  onOpenStart?: () => void;
  /** Called when open succeeds */
  onOpenSuccess?: (result: VoucherOpenShopeeResult) => void;
  /** Called when open fails */
  onOpenError?: (error: Error) => void;
  /** Base Shopee URL */
  baseShopeeUrl?: string;
}

interface UseOpenShopeeActionReturn {
  /** Current open state */
  openState: 'idle' | 'opening' | 'opened' | 'error';
  /** Open Shopee */
  openShopee: (options?: {
    productUrl?: string;
    voucherCode?: string;
  }) => Promise<void>;
  /** Reset open state */
  resetOpenState: () => void;
  /** Error message if open failed */
  errorMessage: string | null;
}

/**
 * Hook for opening Shopee action
 */
export function useOpenShopeeAction(
  options?: UseOpenShopeeActionOptions
): UseOpenShopeeActionReturn {
  const [openState, setOpenState] = useState<'idle' | 'opening' | 'opened' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetOpenState = useCallback(() => {
    setOpenState('idle');
    setErrorMessage(null);
  }, []);

  const openShopee = useCallback(async (params?: {
    productUrl?: string;
    voucherCode?: string;
  }) => {
    // Prevent concurrent opens
    if (openState === 'opening') {
      return;
    }

    // Mark open start
    setOpenState('opening');
    setErrorMessage(null);
    options?.onOpenStart?.();

    try {
      // Build target URL
      let targetUrl = options?.baseShopeeUrl || 'https://shopee.vn';

      // If product URL provided, use it
      if (params?.productUrl) {
        targetUrl = params.productUrl;
      }

      // Open in new tab
      const opened = window.open(targetUrl, '_blank', 'noopener,noreferrer');

      if (opened) {
        setOpenState('opened');
        options?.onOpenSuccess?.({
          success: true,
          targetUrl,
        });

        // Reset after brief delay
        setTimeout(() => {
          setOpenState('idle');
        }, 2000);
      } else {
        throw new Error('Popup blocked');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open Shopee';
      setOpenState('error');
      setErrorMessage('Không thể mở Shopee. Vui lòng thử mở thủ công.');
      options?.onOpenError?.(new Error(errorMessage));
    }
  }, [openState, options]);

  return {
    openState,
    openShopee,
    resetOpenState,
    errorMessage,
  };
}
