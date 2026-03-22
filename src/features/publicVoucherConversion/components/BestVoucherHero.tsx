// =============================================================================
// Best Voucher Hero Component
// Production-grade hero component for displaying the best voucher
// =============================================================================

'use client';

import { useMemo } from 'react';
import { VoucherBestPresentation } from '../types';
import { COPYWRITING, LAYOUT } from '../constants';
import { useVoucherCopyAction } from '../hooks/useVoucherCopyAction';
import { useOpenShopeeAction } from '../hooks/useOpenShopeeAction';
import { VoucherConfidenceBadge } from './VoucherConfidenceBadge';
import { CopySuccessFeedback } from './CopySuccessFeedback';

interface BestVoucherHeroProps {
  voucher: VoucherBestPresentation;
  onCopy?: (code: string) => void;
  onOpenShopee?: () => void;
}

/**
 * Best voucher hero - the most prominent element
 */
export function BestVoucherHero({
  voucher,
  onCopy,
  onOpenShopee,
}: BestVoucherHeroProps) {
  const {
    copyState,
    copyToClipboard,
    errorMessage,
  } = useVoucherCopyAction();

  const {
    openState,
    openShopee,
  } = useOpenShopeeAction();

  const isMobile = typeof window !== 'undefined' && window.innerWidth < LAYOUT.MOBILE_BREAKPOINT;

  // Format discount display
  const discountDisplay = useMemo(() => {
    return voucher.discountValue;
  }, [voucher.discountValue]);

  // Handle copy
  const handleCopy = async () => {
    await copyToClipboard(voucher.code);
    onCopy?.(voucher.code);
  };

  // Handle open
  const handleOpen = () => {
    openShopee({});
    onOpenShopee?.();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-blue-100 font-medium">
              {COPYWRITING.BEST_VOUCHER_LABEL}
            </p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {discountDisplay}
            </h3>
          </div>
          <VoucherConfidenceBadge variant="success" />
        </div>

        {/* Code and Copy Button */}
        <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl mb-4">
          <code className="flex-1 text-xl font-mono font-bold text-white">
            {voucher.code}
          </code>
          <button
            onClick={handleCopy}
            disabled={copyState === 'copying'}
            aria-label={`Sao chép mã ${voucher.code}`}
            className={`
              px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
              ${copyState === 'copied'
                ? 'bg-green-500 text-white'
                : copyState === 'copying'
                  ? 'bg-white/50 text-white/70 cursor-wait'
                  : 'bg-white text-blue-600 hover:bg-blue-50 active:scale-95'
              }
            `}
          >
            {copyState === 'copied' ? (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {COPYWRITING.COPIED_BUTTON}
              </span>
            ) : (
              COPYWRITING.COPY_BUTTON
            )}
          </button>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-sm text-blue-100">
          {voucher.minSpend && (
            <p>Áp dụng đơn từ {voucher.minSpend}</p>
          )}
          {voucher.maxDiscount && (
            <p>Giảm tối đa {voucher.maxDiscount}</p>
          )}
          <p>Hết hạn: {new Date(voucher.validUntil).toLocaleDateString('vi-VN')}</p>
        </div>

        {/* Open Shopee Button */}
        <button
          onClick={handleOpen}
          disabled={openState === 'opening'}
          aria-label="Mở Shopee để mua sản phẩm"
          className={`
            w-full mt-6 py-3.5 px-6 rounded-xl font-semibold text-base
            transition-all duration-200 flex items-center justify-center gap-2
            bg-white text-blue-600 hover:bg-blue-50 active:scale-[0.98]
            ${openState === 'opening' ? 'opacity-70 cursor-wait' : ''}
          `}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {COPYWRITING.OPEN_SHOPEE_BUTTON}
        </button>

        {/* Error message */}
        {errorMessage && (
          <p className="mt-3 text-sm text-red-200 text-center">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
