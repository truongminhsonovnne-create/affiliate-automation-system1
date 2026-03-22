// =============================================================================
// Result Skeleton Component
// Production-grade skeleton loader for result state
// =============================================================================

/**
 * Skeleton loader for result area
 */
export function ResultSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="h-6 w-32 bg-gray-200 rounded mb-6" />

      {/* Card skeleton */}
      <div className="bg-gray-100 rounded-2xl p-6">
        {/* Discount skeleton */}
        <div className="flex items-start justify-between mb-4">
          <div className="h-8 w-40 bg-gray-200 rounded" />
          <div className="h-6 w-16 bg-gray-200 rounded-full" />
        </div>

        {/* Code skeleton */}
        <div className="flex items-center gap-3 p-4 bg-white/50 rounded-xl mb-4">
          <div className="h-8 w-24 bg-gray-200 rounded" />
          <div className="h-10 w-20 bg-gray-200 rounded-lg ml-auto" />
        </div>

        {/* Details skeleton */}
        <div className="space-y-2 mb-6">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>

        {/* Button skeleton */}
        <div className="h-12 w-full bg-gray-200 rounded-xl" />
      </div>

      {/* Candidates skeleton */}
      <div className="mt-6">
        <div className="h-5 w-36 bg-gray-200 rounded mb-3" />
        <div className="space-y-2">
          <div className="h-16 bg-gray-100 rounded-xl" />
          <div className="h-16 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
