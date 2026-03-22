// =============================================================================
// Open Shopee Hint Component
// Production-grade hint for guiding users to open Shopee after copying
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import { COPYWRITING, ACTION_TIMING } from '../constants';

interface OpenShopeeHintProps {
  /** Whether copy was successful */
  isCopied?: boolean;
  /** Shopee URL to open */
  shopeeUrl?: string;
}

/**
 * Hint shown after successful copy - guides user to open Shopee
 */
export function OpenShopeeHint({ isCopied = false, shopeeUrl }: OpenShopeeHintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show hint after copy success
  useEffect(() => {
    if (isCopied && !dismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, ACTION_TIMING.FEEDBACK_SHOW_DELAY);

      // Auto-hide after some time
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, ACTION_TIMING.COPY_SUCCESS_DURATION + 1000);

      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    } else {
      setIsVisible(false);
    }
  }, [isCopied, dismissed]);

  // Don't show if dismissed or not copied
  if (!isCopied || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    setIsVisible(false);
  };

  const handleOpenShopee = () => {
    if (shopeeUrl) {
      window.open(shopeeUrl, '_blank');
    } else {
      window.open('https://shopee.vn', '_blank');
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className="text-sm text-blue-800 font-medium mb-2">
            {COPYWRITING.TIP_USE_CODE}
          </p>
          <button
            onClick={handleOpenShopee}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Mở Shopee ngay →
          </button>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-blue-400 hover:text-blue-600"
          aria-label="Đóng"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
