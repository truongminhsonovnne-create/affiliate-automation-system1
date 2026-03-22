/**
 * Product Ops Error State
 *
 * Reusable error state component for Product Ops UI
 */

import React from 'react';

interface ProductOpsErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string;
  retryable?: boolean;
  onRetry?: () => void;
}

export function ProductOpsErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  error,
  retryable = true,
  onRetry,
}: ProductOpsErrorStateProps) {
  // Extract message from Error object if provided
  const errorMessage = error
    ? typeof error === 'string'
      ? error
      : error.message
    : message;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {/* Error Icon */}
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>

      {/* Message */}
      <p className="text-sm text-gray-500 mb-4 max-w-md">{errorMessage}</p>

      {/* Retry Button */}
      {retryable && onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// Table Error State
interface ProductOpsTableErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ProductOpsTableErrorState({
  title = 'Failed to load data',
  message = 'There was an error loading the table data.',
  onRetry,
}: ProductOpsTableErrorStateProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-8">
        <ProductOpsErrorState
          title={title}
          message={message}
          onRetry={onRetry}
        />
      </div>
    </div>
  );
}

// Detail Error State
interface ProductOpsDetailErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ProductOpsDetailErrorState({
  title = 'Failed to load details',
  message = 'There was an error loading the item details.',
  onRetry,
}: ProductOpsDetailErrorStateProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <ProductOpsErrorState
          title={title}
          message={message}
          onRetry={onRetry}
        />
      </div>
    </div>
  );
}

// Inline Error State (for forms, cards, etc.)
interface ProductOpsInlineErrorStateProps {
  message: string;
  onDismiss?: () => void;
}

export function ProductOpsInlineErrorState({
  message,
  onDismiss,
}: ProductOpsInlineErrorStateProps) {
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-md">
      {/* Error Icon */}
      <div className="flex-shrink-0 w-5 h-5 text-red-500">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Message */}
      <p className="text-sm text-red-700 flex-1">{message}</p>

      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-red-400 hover:text-red-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ProductOpsErrorState;
