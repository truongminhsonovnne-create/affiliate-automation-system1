/**
 * Growth Empty State
 *
 * Empty state component for growth pages
 */

import React from 'react';
import type { GrowthSurfaceEmptyState } from '../../../growthPages/types/index.js';

interface GrowthEmptyStateProps {
  emptyState: GrowthSurfaceEmptyState;
  className?: string;
}

/**
 * Growth empty state component
 */
export function GrowthEmptyState({
  emptyState,
  className = '',
}: GrowthEmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="mb-4">
        <svg
          className="mx-auto w-16 h-16 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {emptyState.title}
      </h3>
      <p className="text-gray-600 mb-6">
        {emptyState.message}
      </p>
      {emptyState.action && (
        <a
          href={emptyState.action.href}
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          {emptyState.action.label}
        </a>
      )}
    </div>
  );
}
