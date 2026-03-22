'use client';

/**
 * LoadingSkeleton — Wraps the DS Skeleton component for backward compatibility.
 * Prefer importing <Skeleton> directly from '@/components/ui'.
 */

export { Skeleton as DSLoadingSkeleton } from '@/components/ui';
export type { SkeletonProps as DSLoadingSkeletonProps } from '@/components/ui';
export type { SkeletonProps as LoadingSkeletonProps } from '@/components/ui';

import { Skeleton } from '@/components/ui';
export { Skeleton };
export { Skeleton as LoadingSkeleton };
export default Skeleton;
