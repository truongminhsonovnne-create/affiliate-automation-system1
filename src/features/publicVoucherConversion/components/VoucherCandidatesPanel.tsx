// =============================================================================
// Voucher Candidates Panel Component
// Production-grade panel for displaying alternative voucher candidates
// =============================================================================

'use client';

import { VoucherCandidatePresentation } from '../types';
import { COPYWRITING, LAYOUT } from '../constants';

interface VoucherCandidatesPanelProps {
  candidates: VoucherCandidatePresentation[];
  onSelect?: (candidate: VoucherCandidatePresentation) => void;
}

/**
 * Clean panel for alternative voucher candidates
 */
export function VoucherCandidatesPanel({ candidates, onSelect }: VoucherCandidatesPanelProps) {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h4 className="text-sm font-medium text-gray-500 mb-3">
        {COPYWRITING.ALTERNATIVE_LABEL}
      </h4>
      <div className="space-y-2">
        {candidates.map((candidate) => (
          <button
            key={candidate.voucherId}
            onClick={() => onSelect?.(candidate)}
            aria-label={`Chọn voucher ${candidate.discountText}, mã ${candidate.code}`}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left group"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {candidate.discountText}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {candidate.reason}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <code className="text-sm font-mono font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {candidate.code}
              </code>
              <span className="text-xs text-gray-400">
                #{candidate.rank}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
