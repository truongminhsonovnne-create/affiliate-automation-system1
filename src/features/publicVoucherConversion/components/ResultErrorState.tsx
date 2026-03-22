// =============================================================================
// Result Error State Component
// Production-grade error state for resolution failures
// =============================================================================

'use client';

import { ERROR_MESSAGES } from '../constants';

interface ResultErrorStateProps {
  error?: string;
  onRetry?: () => void;
}

/**
 * Clean error state
 */
export function ResultErrorState({ error, onRetry }: ResultErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {/* Icon */}
      <div className="w-16 h-16 mb-6 rounded-full bg-red-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {ERROR_MESSAGES.RESOLUTION_FAILED}
      </h3>

      {/* Message */}
      <p className="text-gray-600 mb-6 max-w-sm">
        {error || 'Đã xảy ra lỗi. Vui lòng thử lại sau.'}
      </p>

      {/* Retry Button */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
