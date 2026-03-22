// =============================================================================
// Voucher Explanation Summary Component
// Production-grade component for displaying voucher explanation
// =============================================================================

'use client';

import { VoucherExplanationPresentation } from '../types';
import { COPYWRITING } from '../constants';

interface VoucherExplanationSummaryProps {
  explanation: VoucherExplanationPresentation | null;
}

/**
 * Brief explanation summary for the user
 */
export function VoucherExplanationSummary({ explanation }: VoucherExplanationSummaryProps) {
  if (!explanation) return null;

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-xl">
      <p className="text-sm text-gray-600">
        {explanation.summary}
      </p>
      {explanation.tips && explanation.tips.length > 0 && (
        <ul className="mt-2 space-y-1">
          {explanation.tips.map((tip, index) => (
            <li key={index} className="text-xs text-gray-500 flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
