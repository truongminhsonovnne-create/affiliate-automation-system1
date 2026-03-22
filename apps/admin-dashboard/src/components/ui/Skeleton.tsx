'use client';

/**
 * Design System v2 — Skeleton
 *
 * Premium loading placeholder with shimmer animation.
 * Maintains layout rhythm while content loads.
 *
 * Variants:
 *   text    — single/multiple lines
 *   card    — metric card layout
 *   table   — table rows
 *   avatar  — circular
 *   rect    — generic rectangle
 *   hero    — large hero search card shape
 *   chart   — bar chart shape
 *
 * Usage:
 *   <Skeleton variant="text" lines={3} />
 *   <Skeleton variant="hero" />
 *   <Skeleton variant="rect" className="h-32" />
 */

import clsx from 'clsx';

export type SkeletonVariant = 'text' | 'card' | 'table' | 'avatar' | 'rect' | 'hero' | 'chart';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  lines?: number;
  rows?: number;
  className?: string;
  width?: string;
  height?: string;
}

// =============================================================================
// Base shimmer styles
// =============================================================================

/**
 * Shimmer gradient for premium skeleton effect.
 * Applied via inline style for dynamic animation.
 */
const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--gray-100) 0%, var(--gray-200) 40%, var(--gray-100) 80%)',
  backgroundSize: '800px 100%',
  animation: 'shimmer 1.6s ease-in-out infinite',
};

function SkeletonBase({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={clsx('rounded-[var(--radius)]', className)}
      style={{ ...shimmerStyle, ...style }}
      aria-hidden="true"
    />
  );
}

// =============================================================================
// Text skeleton
// =============================================================================

function SkeletonText({ lines = 3 }: { lines: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          className={clsx(
            'h-3.5',
            // Last line is shorter to suggest natural text end
            i === lines - 1 && lines > 1 && 'w-3/4',
            i === lines - 1 && lines === 1 && 'w-full'
          )}
          style={{
            ...shimmerStyle,
            animationDelay: `${i * 60}ms`,
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Card skeleton — metric card shape
// =============================================================================

function SkeletonCard() {
  return (
    <div
      className="rounded-[var(--radius-md)] p-5"
      style={{
        backgroundColor: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-surface)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Text side */}
        <div className="flex-1 space-y-2.5">
          <SkeletonBase className="h-3 w-16" style={{ ...shimmerStyle, animationDelay: '0ms' }} />
          <SkeletonBase className="h-6 w-28" style={{ ...shimmerStyle, animationDelay: '80ms' }} />
          <SkeletonBase className="h-3 w-20" style={{ ...shimmerStyle, animationDelay: '160ms' }} />
        </div>
        {/* Icon circle */}
        <SkeletonBase
          className="h-11 w-11 rounded-xl flex-shrink-0"
          style={{ ...shimmerStyle, animationDelay: '240ms' }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Table skeleton
// =============================================================================

function SkeletonTable({ rows = 5 }: { rows: number }) {
  return (
    <div
      className="rounded-[var(--radius-md)] overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-surface)',
      }}
    >
      {/* Header row */}
      <div
        className="flex gap-4 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--gray-50)' }}
      >
        {[0.4, 0.6, 0.3, 0.5, 0.35].map((w, i) => (
          <SkeletonBase
            key={i}
            className="h-3 flex-1"
            style={{ ...shimmerStyle, animationDelay: `${i * 40}ms`, width: `${w * 100}%` }}
          />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3.5"
          style={{ borderBottom: i < rows - 1 ? '1px solid var(--border-subtle)' : undefined }}
        >
          {[0.5, 0.7, 0.4, 0.6, 0.45].map((w, j) => (
            <SkeletonBase
              key={j}
              className="h-3 flex-1"
              style={{
                ...shimmerStyle,
                animationDelay: `${(i + 1) * 5 * j * 15}ms`,
                width: `${w * 100}%`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Avatar skeleton
// =============================================================================

function SkeletonAvatar({ className }: { className?: string }) {
  return (
    <SkeletonBase
      className={clsx('rounded-full', className)}
      style={{ ...shimmerStyle, width: '2.5rem', height: '2.5rem' }}
    />
  );
}

// =============================================================================
// Hero search card skeleton
// =============================================================================

function SkeletonHero() {
  return (
    <div
      className="rounded-[var(--radius-lg)] overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-raised)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-float)',
      }}
    >
      {/* Top accent line */}
      <SkeletonBase
        className="w-full h-0.5 rounded-none rounded-t-[var(--radius-lg)]"
        style={{ borderRadius: 0, background: 'linear-gradient(90deg, var(--brand-100) 0%, var(--brand-200) 50%, var(--brand-100) 100%)', backgroundSize: '400px 100%', animation: 'shimmer 2s ease-in-out infinite' }}
      />
      {/* Input area */}
      <div className="flex items-center gap-3 px-6 py-5">
        {/* Icon */}
        <SkeletonBase
          className="h-11 w-11 rounded-xl flex-shrink-0"
          style={{ ...shimmerStyle, animationDelay: '0ms' }}
        />
        {/* Input lines */}
        <div className="flex-1 space-y-2">
          <SkeletonBase className="h-4 w-full" style={{ ...shimmerStyle, animationDelay: '80ms' }} />
          <SkeletonBase className="h-3 w-3/4" style={{ ...shimmerStyle, animationDelay: '160ms' }} />
        </div>
        {/* Button */}
        <SkeletonBase
          className="h-10 w-24 rounded-xl flex-shrink-0"
          style={{ ...shimmerStyle, animationDelay: '240ms' }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Chart skeleton
// =============================================================================

function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      className={clsx('rounded-[var(--radius-md)] p-5', className)}
      style={{
        backgroundColor: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-surface)',
      }}
    >
      <div className="flex items-end gap-2 h-32">
        {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.45, 0.75, 0.55, 0.65, 0.5, 0.7].map((h, i) => (
          <SkeletonBase
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${h * 100}%`, ...shimmerStyle, animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        {[0.3, 0.5, 0.4].map((w, i) => (
          <SkeletonBase
            key={i}
            className="h-2 flex-1"
            style={{ width: `${w * 100}%`, ...shimmerStyle, animationDelay: `${i * 80 + 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Rect skeleton
// =============================================================================

function SkeletonRect({ className, width, height }: SkeletonProps) {
  return (
    <SkeletonBase
      className={clsx('h-32', className)}
      style={{ ...shimmerStyle, width, height }}
    />
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function Skeleton({
  variant = 'rect',
  lines,
  rows,
  className,
  width,
  height,
}: SkeletonProps) {
  const effectiveLines = rows ?? lines;

  switch (variant) {
    case 'text':   return <SkeletonText lines={effectiveLines ?? 3} />;
    case 'card':   return <SkeletonCard />;
    case 'table':  return <SkeletonTable rows={effectiveLines ?? 5} />;
    case 'avatar': return <SkeletonAvatar className={className} />;
    case 'hero':   return <SkeletonHero />;
    case 'chart':  return <SkeletonChart className={className} />;
    case 'rect':
    default:
      return <SkeletonRect className={className} width={width} height={height} />;
  }
}

export default Skeleton;
