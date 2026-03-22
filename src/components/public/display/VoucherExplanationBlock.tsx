// =============================================================================
// Voucher Explanation Block
// Brief explanation for the user
// =============================================================================

interface VoucherExplanationBlockProps {
  summary?: string;
  tips?: string[];
}

/**
 * Explanation block for voucher results
 */
export function VoucherExplanationBlock({ summary, tips }: VoucherExplanationBlockProps) {
  if (!summary && (!tips || tips.length === 0)) {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-xl">
      {summary && (
        <p className="text-sm text-gray-600 mb-3">{summary}</p>
      )}
      {tips && tips.length > 0 && (
        <ul className="space-y-1">
          {tips.map((tip, index) => (
            <li key={index} className="text-sm text-gray-500 flex items-start gap-2">
              <span className="text-blue-500">•</span>
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
