// =============================================================================
// No Match Result View Component
// Production-grade view for when no voucher match is found
// =============================================================================

'use client';

import { VoucherNoMatchPresentationModel } from '../types';
import { COPYWRITING } from '../constants';

interface NoMatchResultViewProps {
  model: VoucherNoMatchPresentationModel;
  onRetry?: () => void;
}

/**
 * Clean no-match view
 */
export function NoMatchResultView({ model, onRetry }: NoMatchResultViewProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {/* Icon */}
      <div className="w-16 h-16 mb-6 rounded-full bg-gray-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {model.message}
      </h3>

      {/* Suggestion */}
      <p className="text-gray-600 mb-6 max-w-sm">
        {model.suggestion}
      </p>

      {/* Fallback */}
      {model.fallback.hasFallback && (
        <div className="mb-6 p-4 bg-blue-50 rounded-xl max-w-sm w-full">
          <p className="text-sm text-blue-800">
            {model.fallback.message}
          </p>
          {model.fallback.suggestion && (
            <p className="text-xs text-blue-600 mt-2">
              {model.fallback.suggestion}
            </p>
          )}
        </div>
      )}

      {/* Retry Button */}
      {model.canRetry && onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          {COPYWRITING.TRY_AGAIN}
        </button>
      )}
    </div>
  );
}
