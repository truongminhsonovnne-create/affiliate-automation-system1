/**
 * Product Ops Loading State
 *
 * Reusable loading state component for Product Ops UI
 */

import React from 'react';

interface ProductOpsLoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

export function ProductOpsLoadingState({
  message = 'Loading...',
  size = 'md',
  fullPage = false,
}: ProductOpsLoadingStateProps) {
  const spinnerSizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${spinnerSizes[size]} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin`} />
      {message && (
        <p className="text-sm text-gray-500">{message}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="p-8 flex items-center justify-center">
      {content}
    </div>
  );
}

// Table Loading Skeleton
interface ProductOpsTableLoadingStateProps {
  rows?: number;
}

export function ProductOpsTableLoadingState({ rows = 5 }: ProductOpsTableLoadingStateProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="animate-pulse">
        {/* Header */}
        <div className="h-12 bg-gray-100 border-b border-gray-200" />

        {/* Rows */}
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="h-16 border-b border-gray-200 px-4 py-3">
            <div className="flex gap-4 items-center">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Card Loading Skeleton
interface ProductOpsCardLoadingStateProps {
  cards?: number;
}

export function ProductOpsCardLoadingState({ cards = 4 }: ProductOpsCardLoadingStateProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(cards)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Detail Loading State
interface ProductOpsDetailLoadingStateProps {
  hasHeader?: boolean;
  sections?: number;
}

export function ProductOpsDetailLoadingState({
  hasHeader = true,
  sections = 3,
}: ProductOpsDetailLoadingStateProps) {
  return (
    <div className="space-y-4">
      {hasHeader && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded w-16" />
              <div className="h-6 bg-gray-200 rounded w-20" />
            </div>
          </div>
        </div>
      )}

      {[...Array(sections)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-32 mb-3" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProductOpsLoadingState;
