/**
 * Growth Loading State
 *
 * Loading skeleton component for growth pages
 */

import React from 'react';

interface GrowthLoadingStateProps {
  type?: 'shop' | 'category' | 'tool';
  className?: string;
}

/**
 * Skeleton pulse animation
 */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Shop loading skeleton
 */
function ShopLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <Skeleton className="h-8 w-1/2" />

      {/* Subtitle */}
      <Skeleton className="h-5 w-1/3" />

      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <Skeleton className="h-12 w-40 rounded-lg" />
        <Skeleton className="h-12 w-32 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Category loading skeleton
 */
function CategoryLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <Skeleton className="h-8 w-1/3" />

      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Patterns */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Tool loading skeleton
 */
function ToolLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <Skeleton className="h-8 w-1/2" />

      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Growth loading state component
 */
export function GrowthLoadingState({
  type = 'shop',
  className = '',
}: GrowthLoadingStateProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {type === 'shop' && <ShopLoadingSkeleton />}
      {type === 'category' && <CategoryLoadingSkeleton />}
      {type === 'tool' && <ToolLoadingSkeleton />}
    </div>
  );
}
