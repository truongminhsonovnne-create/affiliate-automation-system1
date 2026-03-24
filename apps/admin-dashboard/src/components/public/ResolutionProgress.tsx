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
    done: { backgroundColor: 'var(--info-100)' },
    active: { backgroundColor: 'var(--info-100)', boxShadow: '0 0 0 4px var(--info-100)' },
    pending: { backgroundColor: 'var(--bg-subtle)' },
  },
  orange: {
    done: { backgroundColor: 'var(--success-100)' },
    active: { backgroundColor: 'var(--brand-100)', boxShadow: '0 0 0 4px var(--brand-100)' },
    pending: { backgroundColor: 'var(--bg-subtle)' },
  },
  amber: {
    done: { backgroundColor: 'var(--warning-100)' },
    active: { backgroundColor: 'var(--warning-100)', boxShadow: '0 0 0 4px var(--warning-100)' },
    pending: { backgroundColor: 'var(--bg-subtle)' },
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
            style={{ color: 'var(--success-500)' }}
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
                ? { color: 'var(--brand-500)' }
                : { color: 'var(--text-muted)' }
            }
            aria-hidden="true"
          />
        )}

        {status === 'active' && (
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-40"
            style={
              accentColor === 'blue'
                ? { backgroundColor: 'var(--info-200)' }
                : accentColor === 'orange'
                  ? { backgroundColor: 'var(--brand-200)' }
                  : { backgroundColor: 'var(--warning-200)' }
            }
          />
        )}
      </div>

      <span
        className="text-sm font-medium transition-colors duration-300"
        style={
          status === 'done'
            ? { color: 'var(--success-600)' }
            : status === 'active'
              ? { color: 'var(--brand-600)' }
              : { color: 'var(--text-muted)' }
        }
      >
        {step.label}
      </span>
    </div>
  );
}

// =============================================================================
// Skeleton cards (shown during processing)
// =============================================================================

function SkeletonCard() {
  return (
    <div
      className="animate-pulse space-y-3 rounded-2xl border bg-white p-4"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded-md" style={{ backgroundColor: 'var(--bg-subtle)' }} />
          <div className="h-3 w-1/2 rounded-md" style={{ backgroundColor: 'var(--bg-subtle)' }} />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded-full" style={{ backgroundColor: 'var(--bg-subtle)' }} />
        <div className="h-6 w-24 rounded-full" style={{ backgroundColor: 'var(--bg-subtle)' }} />
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
      <span style={{ color: onLongWait ? 'var(--warning-500)' : 'var(--text-muted)' }}>
        Thời gian:
      </span>
      <span
        className="font-mono tabular-nums"
        style={
          onLongWait
            ? { color: 'var(--warning-500)', fontWeight: 500 }
            : { color: 'var(--text-muted)' }
        }
      >
        {seconds}s
      </span>
      {onLongWait && (
        <span style={{ color: 'var(--warning-500)' }}>
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
          borderColor: 'var(--warning-200)',
          backgroundColor: 'var(--warning-50)',
          color: 'var(--warning-700)',
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
            <span style={{ color: 'var(--warning-600)' }}>
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
    <div className="mt-3 animate-in slide-in-from-top-1 fade-in duration-300">
      <div
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
        style={{
          borderColor: 'var(--warning-200)',
          backgroundColor: 'var(--warning-50)',
          color: 'var(--warning-700)',
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

  return (
    <div
      className={clsx('flex flex-col items-center gap-5 rounded-3xl border bg-white p-8 shadow-lg', className)}
      style={
        phase === 'queued'
          ? { borderColor: 'var(--info-100)' }
          : phase === 'processing'
            ? { borderColor: 'var(--brand-100)', boxShadow: 'var(--shadow-brand)' }
            : { borderColor: 'var(--warning-200)' }
      }
    >
      {/* Animated icon with orbiting dots */}
      <div className="relative">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={
            phase === 'queued'
              ? { backgroundColor: 'var(--info-50)' }
              : phase === 'processing'
                ? { backgroundColor: 'var(--brand-50)' }
                : { backgroundColor: 'var(--warning-50)' }
          }
        >
          <ActiveIcon
            className="h-10 w-10"
            style={
              phase === 'queued'
                ? { color: 'var(--info-400)', animation: 'pulse 2s ease-in-out infinite' }
                : phase === 'processing'
                  ? { color: 'var(--brand-400)' }
                  : { color: 'var(--warning-500)', animation: 'spin 1.5s linear infinite' }
            }
            aria-hidden="true"
          />
        </div>

        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute h-2 w-2 rounded-full"
            style={
              phase === 'queued'
                ? { backgroundColor: 'var(--info-400)', top: '50%', left: '50%', transform: `rotate(${i * 120}deg) translateX(42px) translateY(-50%)`, animation: `orbit 1.5s linear infinite`, animationDelay: `${i * 0.5}s` }
                : phase === 'processing'
                  ? { backgroundColor: 'var(--brand-400)', top: '50%', left: '50%', transform: `rotate(${i * 120}deg) translateX(42px) translateY(-50%)`, animation: `orbit 1.5s linear infinite`, animationDelay: `${i * 0.5}s` }
                  : { backgroundColor: 'var(--warning-400)', top: '50%', left: '50%', transform: `rotate(${i * 120}deg) translateX(42px) translateY(-50%)`, animation: `orbit 1.5s linear infinite`, animationDelay: `${i * 0.5}s` }
            }
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Headline + subtext */}
      <div className="text-center">
        <h2
          className="text-xl font-bold"
          style={
            phase === 'queued'
              ? { color: 'var(--info-800)' }
              : phase === 'processing'
                ? { color: 'var(--gray-800)' }
                : { color: 'var(--warning-800)' }
          }
        >
          {config.headline}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{config.subtext}</p>
      </div>

      {/* Retry attempt badge */}
      {isRetrying && <RetryBadge count={retryCount} />}

      {/* Skeleton result cards during processing */}
      {phase === 'processing' && (
        <div className="w-full max-w-sm space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Steps list */}
      <div className="w-full max-w-sm space-y-4">
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
