// =============================================================================
// Voucher Result Card
// Display card for best voucher match
// =============================================================================

'use client';

import { useState } from 'react';

interface VoucherResultCardProps {
  voucher: {
    code: string;
    discountValue: string;
    minSpend: string | null;
    maxDiscount: string | null;
    validUntil: string;
    headline: string;
  };
  onCopy: (code: string) => void;
  onOpenShopee: () => void;
  isPrimary?: boolean;
}

/**
 * Best voucher result card
 */
export function VoucherResultCard({
  voucher,
  onCopy,
  onOpenShopee,
  isPrimary = true,
}: VoucherResultCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(voucher.code);
    setCopied(true);
    onCopy(voucher.code);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenShopee = () => {
    onOpenShopee();
  };

  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      ${isPrimary ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gray-50 border border-gray-200'}
    `}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className={`text-sm ${isPrimary ? 'text-blue-100' : 'text-gray-500'}`}>
              Mã giảm giá tốt nhất
            </p>
            <h3 className={`text-2xl font-bold mt-1 ${isPrimary ? 'text-white' : 'text-gray-900'}`}>
              {voucher.discountValue}
            </h3>
          </div>
          <div className={`
            px-3 py-1 rounded-full text-xs font-medium
            ${isPrimary ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}
          `}>
            ✓ Đã kiểm tra
          </div>
        </div>

        {/* Code */}
        <div className={`
          flex items-center justify-between p-4 rounded-xl mb-4
          ${isPrimary ? 'bg-white/10 backdrop-blur-sm' : 'bg-white border border-gray-200'}
        `}>
          <code className={`text-xl font-mono font-bold ${isPrimary ? 'text-white' : 'text-gray-900'}`}>
            {voucher.code}
          </code>
          <button
            onClick={handleCopy}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${copied
                ? 'bg-green-500 text-white'
                : isPrimary
                  ? 'bg-white text-blue-600 hover:bg-blue-50'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }
            `}
          >
            {copied ? '✓ Đã chép' : 'Sao chép'}
          </button>
        </div>

        {/* Details */}
        <div className={`space-y-2 text-sm ${isPrimary ? 'text-blue-100' : 'text-gray-600'}`}>
          {voucher.minSpend && (
            <p>Áp dụng đơn từ {voucher.minSpend}</p>
          )}
          {voucher.maxDiscount && (
            <p>Giảm tối đa {voucher.maxDiscount}</p>
          )}
          <p>Hết hạn: {new Date(voucher.validUntil).toLocaleDateString('vi-VN')}</p>
        </div>

        {/* CTA */}
        <button
          onClick={handleOpenShopee}
          className={`
            w-full mt-6 py-3 px-6 rounded-xl font-medium transition-colors
            ${isPrimary
              ? 'bg-white text-blue-600 hover:bg-blue-50'
              : 'bg-gray-900 text-white hover:bg-gray-800'
            }
          `}
        >
          Mua ngay trên Shopee →
        </button>
      </div>
    </div>
  );
}
