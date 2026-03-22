/**
 * Product Ops Empty State
 *
 * Reusable empty state component for Product Ops UI
 */

import React from 'react';

interface ProductOpsEmptyStateProps {
  title: string;
  description?: string;
  icon?: 'search' | 'folder' | 'inbox' | 'checkmark';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ProductOpsEmptyState({
  title,
  description,
  icon = 'folder',
  action,
}: ProductOpsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {/* Icon */}
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <EmptyStateIcon icon={icon} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-500 mb-4 max-w-md">{description}</p>
      )}

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Empty State Icon
function EmptyStateIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'search':
      return (
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'folder':
      return (
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    case 'inbox':
      return (
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      );
    case 'checkmark':
      return (
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      );
  }
}

// Table Empty State
interface ProductOpsTableEmptyStateProps {
  title?: string;
  description?: string;
  filters?: string[];
}

export function ProductOpsTableEmptyState({
  title = 'No items found',
  description = 'There are no items matching your current filters.',
  filters,
}: ProductOpsTableEmptyStateProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-8">
        <ProductOpsEmptyState
          title={title}
          description={description}
          icon="inbox"
        />
        {filters && filters.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="text-xs text-gray-500">Active filters:</span>
            {filters.map((filter, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
              >
                {filter}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Queue Empty State
interface ProductOpsQueueEmptyStateProps {
  title?: string;
  description?: string;
}

export function ProductOpsQueueEmptyState({
  title = 'Queue is empty',
  description = 'Great job! There are no cases waiting for review.',
}: ProductOpsQueueEmptyStateProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <ProductOpsEmptyState
        title={title}
        description={description}
        icon="checkmark"
      />
    </div>
  );
}

// Search Empty State
interface ProductOpsSearchEmptyStateProps {
  query: string;
  onClear?: () => void;
}

export function ProductOpsSearchEmptyState({
  query,
  onClear,
}: ProductOpsSearchEmptyStateProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <ProductOpsEmptyState
        title="No results found"
        description={`We couldn't find any items matching "${query}"`}
        icon="search"
        action={onClear ? {
          label: 'Clear search',
          onClick: onClear,
        } : undefined}
      />
    </div>
  );
}

export default ProductOpsEmptyState;
