// =============================================================================
// Voucher Confidence Badge Component
// Production-grade badge showing voucher confidence
// =============================================================================

'use client';

interface VoucherConfidenceBadgeProps {
  variant?: 'success' | 'info' | 'warning';
  children?: React.ReactNode;
}

/**
 * Clean confidence badge
 */
export function VoucherConfidenceBadge({
  variant = 'success',
  children,
}: VoucherConfidenceBadgeProps) {
  const variantStyles = {
    success: 'bg-green-100 text-green-700',
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
        ${variantStyles[variant]}
      `}
    >
      {children || (
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          ✓
        </span>
      )}
    </span>
  );
}
