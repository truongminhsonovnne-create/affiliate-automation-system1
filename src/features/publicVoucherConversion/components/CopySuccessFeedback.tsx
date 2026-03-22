// =============================================================================
// Copy Success Feedback Component
// Production-grade feedback for successful copy action
// =============================================================================

'use client';

interface CopySuccessFeedbackProps {
  show: boolean;
  message?: string;
}

/**
 * Subtle success feedback for copy action
 */
export function CopySuccessFeedback({ show, message = '✓ Đã sao chép!' }: CopySuccessFeedbackProps) {
  if (!show) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in"
    >
      <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}
