// =============================================================================
// Voucher Candidate List
// Display list of alternative voucher candidates
// =============================================================================

'use client';

interface VoucherCandidate {
  voucherId: string;
  code: string;
  discountText: string;
  rank: number;
  reason: string;
}

interface VoucherCandidateListProps {
  candidates: VoucherCandidate[];
  onSelect?: (candidate: VoucherCandidate) => void;
}

/**
 * List of alternative voucher candidates
 */
export function VoucherCandidateList({ candidates, onSelect }: VoucherCandidateListProps) {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h4 className="text-sm font-medium text-gray-500 mb-3">
        Các lựa chọn khác
      </h4>
      <div className="space-y-3">
        {candidates.map((candidate) => (
          <button
            key={candidate.voucherId}
            onClick={() => onSelect?.(candidate)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
          >
            <div>
              <p className="font-medium text-gray-900">{candidate.discountText}</p>
              <p className="text-sm text-gray-500">{candidate.reason}</p>
            </div>
            <div className="text-right">
              <code className="text-sm font-mono text-blue-600">{candidate.code}</code>
              <p className="text-xs text-gray-400 mt-1">#{candidate.rank}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
