'use client';

/**
 * ResolutionProgress — Animated processing state shown while the API resolves.
 *
 * Supports all phases:
 *   queued     — Request received, waiting for worker
 *   processing — Worker is actively resolving
 *   retrying   — Transient failure, retrying automatically
 *
 * Shows skeleton-style progress with meaningful step descriptions,
 * a live elapsed timer, and a long-wait fallback after LONG_WAIT_THRESHOLD_MS.
 */

import { useEffect, useState } from 'react';
import { type LucideIcon, Link2, BrainCircuit, Database, Sparkles, RotateCw, Loader2, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

// =============================================================================
// Config
// =============================================================================

const LONG_WAIT_THRESHOLD_MS = 12_000;

export type ProgressPhase = 'queued' | 'processing' | 'retrying';

export interface ResolutionProgressProps {
  phase: ProgressPhase;
  /** Number of retry attempts (shown in retrying state) */
  retryCount?: number;
  /** Server-reported duration in ms (null if still processing) */
  serverDurationMs?: number | null;
  className?: string;
}

// =============================================================================
// Step definitions
// =============================================================================

const QUEUED_STEPS = [
  { id: 'submit', label: 'Gửi yêu cầu', icon: Link2 },
  { id: 'queue', label: 'Đang xếp hàng', icon: Database },
];

const PROCESSING_STEPS = [
  { id: 'context', label: 'Tải thông tin sản phẩm', icon: Database },
  { id: 'matching', label: 'Tìm voucher phù hợp', icon: BrainCircuit },
  { id: 'ranking', label: 'Xếp hạng ưu tiên', icon: Sparkles },
  { id: 'verify', label: 'Xác minh hiệu lực mã', icon: ShieldCheck },
];

// =============================================================================
// Phase config
// =============================================================================

const PHASE_CONFIG: Record<
  ProgressPhase,
  {
    headline: string;
    subtext: string;
    activeIcon: LucideIcon;
    accentColor: string;
    activeStepIndex: number;
  }
> = {
  queued: {
    headline: 'Đang xếp hàng...',
    subtext: 'Yêu cầu của bạn đã được tiếp nhận. Vui lòng chờ trong giây lát.',
    activeIcon: Loader2,
    accentColor: 'blue',
    activeStepIndex: 1,
  },
  processing: {
    headline: 'Đang phân tích sản phẩm...',
    subtext: 'Đang tìm voucher tốt nhất cho sản phẩm này.',
    activeIcon: BrainCircuit,
    accentColor: 'orange',
    activeStepIndex: 1,
  },
  retrying: {
    headline: 'Đang thử lại...',
    subtext: 'Gặp chút trục trặc nhỏ, đang khắc phục tự động.',
    activeIcon: RotateCw,
    accentColor: 'amber',
    activeStepIndex: 1,
  },
};

// =============================================================================
// Step item
// =============================================================================

interface StepItemProps {
  step: { id: string; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> };
  status: 'done' | 'active' | 'pending';
  delay?: number;
  accentColor: string;
}

const ACCENT_MAP: Record<string, { done: React.CSSProperties; active: React.CSSProperties; pending: React.CSSProperties }> = {
  blue: {
    done: { backgroundColor: '#dbeafe' },
    active: { backgroundColor: '#dbeafe', boxShadow: '0 0 0 4px #dbeafe' },
    pending: { backgroundColor: '#f3f4f6' },
  },
  orange: {
    done: { backgroundColor: '#bbf7d0' },
    active: { backgroundColor: '#ffedd5', boxShadow: '0 0 0 4px #ffedd5' },
    pending: { backgroundColor: '#f3f4f6' },
  },
  amber: {
    done: { backgroundColor: '#fef3c7' },
    active: { backgroundColor: '#fef3c7', boxShadow: '0 0 0 4px #fef3c7' },
    pending: { backgroundColor: '#f3f4f6' },
  },
};

function StepItem({ step, status, delay = 0, accentColor }: StepItemProps) {
  const Icon = step.icon;
  const colors = ACCENT_MAP[accentColor];

  return (
    <div
      className="flex items-center gap-3 transition-all duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300"
        style={colors[status]}
      >
        {status === 'done' ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4 animate-in zoom-in duration-200"
            style={{ color: '#22c55e' }}
            aria-hidden="true"
          >
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <Icon
            className="h-4 w-4 transition-colors duration-300"
            style={
              status === 'active'
                ? { color: '#f97316' }
                : { color: '#9ca3af' }
            }
            aria-hidden="true"
          />
        )}

        {status === 'active' && (
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-40"
            style={
              accentColor === 'blue'
                ? { backgroundColor: '#93c5fd' }
                : accentColor === 'orange'
                  ? { backgroundColor: '#fed7aa' }
                  : { backgroundColor: '#fde68a' }
            }
          />
        )}
      </div>

      <span
        className="text-sm font-medium transition-colors duration-300"
        style={
          status === 'done'
            ? { color: '#16a34a' }
            : status === 'active'
              ? { color: '#c2410c' }
              : { color: '#9ca3af' }
        }
      >
        {step.label}
      </span>
    </div>
  );
}

// =============================================================================
// Skeleton cards — mobile-optimized shimmer
// =============================================================================

function SkeletonCard() {
  return (
    <div
      className="space-y-3 rounded-2xl border bg-white p-4 overflow-hidden relative"
      style={{ borderColor: '#f3f4f6' }}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.04) 50%, transparent 100%)',
          animation: 'shimmer 1.5s ease-in-out infinite',
          backgroundSize: '200% 100%',
        }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-3 relative">
        <div className="h-9 w-9 rounded-xl" style={{ backgroundColor: '#f3f4f6' }} />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded-md" style={{ backgroundColor: '#f3f4f6' }} />
          <div className="h-3 w-1/2 rounded-md" style={{ backgroundColor: '#f3f4f6' }} />
        </div>
      </div>
      <div className="flex gap-2 relative">
        <div className="h-6 w-20 rounded-full" style={{ backgroundColor: '#f3f4f6' }} />
        <div className="h-6 w-24 rounded-full" style={{ backgroundColor: '#f3f4f6' }} />
      </div>
    </div>
  );
}

// =============================================================================
// Elapsed time ticker
// =============================================================================

function ElapsedTimer({ onLongWait }: { onLongWait: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 100));
    }, 100);
    return () => clearInterval(tick);
  }, []);

  const seconds = (elapsed / 10).toFixed(1);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span style={{ color: onLongWait ? '#d97706' : '#9ca3af' }}>
        Thời gian:
      </span>
      <span
        className="font-mono tabular-nums"
        style={
          onLongWait
            ? { color: '#d97706', fontWeight: 500 }
            : { color: '#9ca3af' }
        }
      >
        {seconds}s
      </span>
      {onLongWait && (
        <span style={{ color: '#d97706' }}>
          — Hệ thống đang xử lý, vui lòng đợi
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Long wait fallback
// =============================================================================

function LongWaitFallback({ elapsedMs }: { elapsedMs: number }) {
  const seconds = (elapsedMs / 1000).toFixed(0);

  return (
    <div className="mt-4 animate-in slide-in-from-bottom-2 fade-in duration-500">
      <div
        className="rounded-xl border px-4 py-3 text-sm"
        style={{
          borderColor: '#fde68a',
          backgroundColor: '#fffbeb',
          color: '#92400e',
        }}
      >
        <div className="flex items-start gap-2">
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 6v6l4 2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <div>
            <span style={{ fontWeight: 500 }}>Yêu cầu mất nhiều thời gian hơn bình thường.</span>
            {' '}
            <span style={{ color: '#b45309' }}>
              Đã chờ {seconds}s — chúng tôi đang tiếp tục tìm kiếm voucher tốt nhất cho bạn.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Retry attempt badge
// =============================================================================

function RetryBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <div className="mt-2 animate-in slide-in-from-top-1 fade-in duration-300">
      <div
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
        style={{
          borderColor: '#fde68a',
          backgroundColor: '#fffbeb',
          color: '#b45309',
        }}
      >
        <RotateCw className="h-3 w-3 animate-spin" style={{ animationDuration: '1.2s' }} />
        <span>Đang thử lại lần {count + 1}</span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ResolutionProgress({
  phase,
  retryCount = 0,
  serverDurationMs,
  className,
}: ResolutionProgressProps) {
  const config = PHASE_CONFIG[phase];
  const ActiveIcon = config.activeIcon;

  const isQueued = phase === 'queued';
  const isRetrying = phase === 'retrying';

  const steps = isQueued ? QUEUED_STEPS : PROCESSING_STEPS;
  const [activeIndex, setActiveIndex] = useState(config.activeStepIndex);

  // Auto-advance steps every 1.8s during processing to signal live analysis
  useEffect(() => {
    setActiveIndex(config.activeStepIndex);
    if (phase !== 'processing') return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, 1800);
    return () => clearInterval(interval);
  }, [phase, config.activeStepIndex, steps.length]);

  const [isLongWait, setIsLongWait] = useState(false);
  const [longWaitMs, setLongWaitMs] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLongWait(true);
      setLongWaitMs(LONG_WAIT_THRESHOLD_MS);
    }, LONG_WAIT_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  // Reset long-wait state when phase changes
  useEffect(() => {
    setIsLongWait(false);
  }, [phase]);

  const isProcessing = phase === 'processing';
  const bgColor = isProcessing ? '#fff7ed' : isQueued ? '#eff6ff' : '#fefce8';
  const borderColor = isProcessing ? '#fed7aa' : isQueued ? '#bfdbfe' : '#fde68a';
  const iconColor = isProcessing ? '#f97316' : isQueued ? '#2563eb' : '#d97706';

  return (
    <div
      className={clsx('flex flex-col items-center gap-4 rounded-3xl border bg-white p-6 sm:p-8 shadow-lg', className)}
      style={{ borderColor }}
    >
      {/* Animated icon */}
      <div className="relative">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20"
          style={{ backgroundColor: bgColor }}
        >
          <ActiveIcon
            className="h-8 w-8 sm:h-10 sm:w-10"
            style={
              isQueued
                ? { color: iconColor, animation: 'pulse 2s ease-in-out infinite' }
                : isProcessing
                  ? { color: iconColor }
                  : { color: iconColor, animation: 'spin 1.5s linear infinite' }
            }
            aria-hidden="true"
          />
        </div>

        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute h-2 w-2 rounded-full hidden sm:block"
            style={{
              backgroundColor: iconColor,
              top: '50%',
              left: '50%',
              transform: `rotate(${i * 120}deg) translateX(36px) translateY(-50%)`,
              animation: `orbit 1.5s linear infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Headline + subtext */}
      <div className="text-center px-2">
        <h2
          className="text-base font-bold sm:text-xl"
          style={{ color: isProcessing ? '#111827' : isQueued ? '#1e40af' : '#92400e' }}
        >
          {config.headline}
        </h2>
        <p className="mt-1 text-xs sm:text-sm" style={{ color: '#6b7280' }}>
          {config.subtext}
        </p>
      </div>

      {/* Retry attempt badge */}
      {isRetrying && <RetryBadge count={retryCount} />}

      {/* Skeleton result cards during processing */}
      {isProcessing && (
        <div className="w-full space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Steps list */}
      <div className="w-full space-y-3">
        {steps.map((step, i) => (
          <StepItem
            key={step.id}
            step={step}
            status={
              i < activeIndex ? 'done' :
                i === activeIndex ? 'active' :
                  'pending'
            }
            delay={i * 150}
            accentColor={config.accentColor}
          />
        ))}
      </div>

      {/* Elapsed timer */}
      <ElapsedTimer onLongWait={isLongWait} />

      {/* Long-wait fallback */}
      {isLongWait && (
        <LongWaitFallback elapsedMs={longWaitMs} />
      )}
    </div>
  );
}

export default ResolutionProgress;
