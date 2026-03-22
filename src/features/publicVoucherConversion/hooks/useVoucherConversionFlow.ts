// =============================================================================
// Use Voucher Conversion Flow Hook
// Production-grade hook for orchestrating the conversion flow
// =============================================================================

'use client';

import { useState, useCallback } from 'react';
import { PublicVoucherResolveResponse } from '../../../publicApi/types';
import { VoucherResultPresentationModel, VoucherConversionViewState } from '../types';
import { buildVoucherResultPresentationModel } from '../presentation/resultPresentationBuilder';
import { buildNoMatchPresentationModel } from '../presentation/noMatchPresentationBuilder';
import { useVoucherCopyAction } from './useVoucherCopyAction';
import { useOpenShopeeAction } from './useOpenShopeeAction';
import { useResultInteractionState } from './useResultInteractionState';

interface UseVoucherConversionFlowOptions {
  /** Called when best voucher is viewed */
  onBestVoucherViewed?: () => void;
  /** Called when copy is clicked */
  onCopyClicked?: () => void;
  /** Called when copy succeeds */
  onCopySuccess?: () => void;
  /** Called when open shopee is clicked */
  onOpenShopeeClicked?: () => void;
  /** Called when no match is shown */
  onNoMatchViewed?: () => void;
}

interface UseVoucherConversionFlowReturn {
  /** Current view state */
  viewState: VoucherConversionViewState;
  /** Presentation model */
  presentation: VoucherResultPresentationModel | null;
  /** Loading state */
  isLoading: boolean;
  /** Copy action hook */
  copyAction: ReturnType<typeof useVoucherCopyAction>;
  /** Open Shopee action hook */
  openAction: ReturnType<typeof useOpenShopeeAction>;
  /** Interaction state hook */
  interaction: ReturnType<typeof useResultInteractionState>;
  /** Process API response */
  processResponse: (response: PublicVoucherResolveResponse) => void;
  /** Reset flow */
  reset: () => void;
}

/**
 * Hook for orchestrating the voucher conversion flow
 */
export function useVoucherConversionFlow(
  options?: UseVoucherConversionFlowOptions
): UseVoucherConversionFlowReturn {
  const [viewState, setViewState] = useState<VoucherConversionViewState>('loading');
  const [presentation, setPresentation] = useState<VoucherResultPresentationModel | null>(null);

  // Copy action
  const copyAction = useVoucherCopyAction({
    onCopyStart: () => {
      options?.onCopyClicked?.();
    },
    onCopySuccess: (result) => {
      options?.onCopySuccess?.();
    },
  });

  // Open Shopee action
  const openAction = useOpenShopeeAction({
    onOpenStart: () => {
      options?.onOpenShopeeClicked?.();
    },
  });

  // Interaction state
  const interaction = useResultInteractionState();

  // Process API response
  const processResponse = useCallback((response: PublicVoucherResolveResponse) => {
    // Build presentation model
    const model = buildVoucherResultPresentationModel(response);

    // If no match, build no-match model
    if (model.viewState === 'no_match') {
      const noMatchModel = buildNoMatchPresentationModel(response);
      // Update view state
      setViewState('no_match');
      options?.onNoMatchViewed?.();
    } else {
      // Success or other state
      setViewState(model.viewState);

      // Track best voucher viewed
      if (model.bestVoucher) {
        options?.onBestVoucherViewed?.();
      }
    }

    setPresentation(model);
  }, [options]);

  // Handle copy convenience method
  const handleCopy = useCallback(async (code: string) => {
    await copyAction.copyToClipboard(code);
  }, [copyAction]);

  // Handle open convenience method
  const handleOpen = useCallback(() => {
    openAction.openShopee({});
  }, [openAction]);

  // Reset flow
  const reset = useCallback(() => {
    setViewState('loading');
    setPresentation(null);
    copyAction.resetCopyState();
    openAction.resetOpenState();
    interaction.clearFeedback();
  }, [copyAction, openAction, interaction]);

  return {
    viewState,
    presentation,
    isLoading: viewState === 'loading',
    copyAction,
    openAction,
    interaction,
    processResponse,
    reset,
    handleCopy,
    handleOpen,
  };
}
