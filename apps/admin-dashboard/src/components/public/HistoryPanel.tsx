'use client';

/**
 * HistoryPanel — Collapsible history sidebar/section for recent lookups.
 *
 * Layout modes:
 *   - collapsed: shows a thin bar at the bottom with a single "Recent lookups" button
 *   - expanded: shows the full history list
 *
 * Transitions are animated. Items are sorted pinned-first, then recency.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Pin,
  PinOff,
  Trash2,
  RefreshCw,
  History,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertTriangle,
  SearchX,
  WifiOff,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';
import { useHistory } from '@/lib/public/useHistory';
import type { LookupHistoryEntry } from '@/lib/public/history-types';
import { formatExpiry } from '@/lib/public/api-client';
import { useAnalytics } from '@/lib/public/analytics-context';

// =============================================================================
// Outcome icon
// =============================================================================

const OUTCOME_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  no_match: SearchX,
  invalid_link: AlertTriangle,
  rate_limited: Clock,
  error: WifiOff,
};

const OUTCOME_COLORS: Record<string, string> = {
  success: 'text-emerald-500 bg-emerald-50',
  no_match: 'text-gray-400 bg-gray-50',
  invalid_link: 'text-amber-500 bg-amber-50',
  rate_limited: 'text-blue-500 bg-blue-50',
  error: 'text-red-500 bg-red-50',
};

function OutcomeDot({ outcome }: { outcome: string }) {
  const Icon = OUTCOME_ICONS[outcome] ?? AlertTriangle;
  const colors = OUTCOME_COLORS[outcome] ?? 'text-gray-400 bg-gray-50';
  return (
    <div className={clsx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', colors)}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </div>
  );
}

// =============================================================================
// Single history item
// =============================================================================

interface HistoryItemProps {
  entry: LookupHistoryEntry;
  onRestore: (entry: LookupHistoryEntry) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
}

function HistoryItem({
  entry,
  onRestore,
  onTogglePin,
  onDelete,
  isSelected,
}: HistoryItemProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { track } = useAnalytics();

  // Format relative time
  const timeLabel = formatRelativeTime(entry.performedAt);

  // Copy code if available
  const handleCopyCode = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const code = entry.result?.bestCode;
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        track.couponCopy('history', code, entry.result?.bestDiscountText ?? '');
      } catch {
        // Silently fail
      }
    },
    [entry.result?.bestCode, entry.result?.bestDiscountText, track]
  );

  // Can copy code? Only for successful entries that aren't expired
  const canCopyCode =
    entry.outcome === 'success' &&
    entry.result?.bestCode &&
    !entry.result?.isExpired;

  return (
    <div
      className={clsx(
        'group relative rounded-xl border transition-all duration-150',
        'bg-white hover:bg-gray-50',
        isSelected
          ? 'border-orange-300 ring-2 ring-orange-100 shadow-sm'
          : 'border-gray-100 hover:border-gray-200'
      )}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Outcome icon */}
        <div className="flex-shrink-0 mt-0.5">
          <OutcomeDot outcome={entry.outcome} />
        </div>

        {/* Content — takes available space */}
        <div className="min-w-0 flex-1">
          {/* Display label */}
          <p className="truncate text-sm font-semibold text-gray-800" title={entry.inputUrl}>
            {entry.displayLabel}
          </p>

          {/* Outcome + time row */}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-xs text-gray-500">{entry.outcomeLabel}</span>
            <span className="text-gray-200" aria-hidden="true">·</span>
            <span className="text-xs text-gray-400">{timeLabel}</span>
          </div>

          {/* Result summary for success */}
          {entry.outcome === 'success' && entry.result && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-orange-600">
                {entry.result.bestDiscountText}
              </span>
              {entry.result.candidateCount > 1 && (
                <span className="text-xs text-gray-400">
                  +{entry.result.candidateCount - 1} khác
                </span>
              )}
              {entry.result.isExpired && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                  Hết hạn
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions — always visible on mobile, hover-only on desktop */}
        <div
          className={clsx(
            'flex items-center gap-0.5 flex-shrink-0',
            /* Touch devices: always show. Pointer devices: show on hover/pinned */
            'sm:opacity-0 sm:group-hover:opacity-100 sm:[&.always-show]:opacity-100',
            entry.pinned ? 'always-show' : ''
          )}
        >
          {/* Copy code */}
          {canCopyCode && (
            <button
              type="button"
              onClick={handleCopyCode}
              aria-label="Sao chép mã voucher"
              className={clsx(
                'flex items-center justify-center rounded-lg p-1.5 min-h-[36px] min-w-[36px]', // 44px-ish tap target
                'text-xs transition-colors active:scale-95',
                copied
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              )}
            >
              {copied ? (
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}

          {/* Open in Shopee */}
          {entry.outcome === 'success' && (
            <a
              href={entry.inputUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="Mở sản phẩm"
              className="flex items-center justify-center rounded-lg p-1.5 min-h-[36px] min-w-[36px] text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:scale-95"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}

          {/* Toggle pin */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(entry.id);
            }}
            aria-label={entry.pinned ? 'Bỏ ghim' : 'Ghim'}
            className={clsx(
              'flex items-center justify-center rounded-lg p-1.5 min-h-[36px] min-w-[36px] text-xs transition-colors active:scale-95',
              entry.pinned
                ? 'bg-orange-100 text-orange-500'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            )}
          >
            {entry.pinned ? (
              <PinOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Pin className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            aria-label="Xóa khỏi lịch sử"
            className="flex items-center justify-center rounded-lg p-1.5 min-h-[36px] min-w-[36px] text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 active:scale-95"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Clickable — restore — full-card touch target */}
      <button
        type="button"
        onClick={() => onRestore(entry)}
        className="absolute inset-0 w-full cursor-pointer rounded-xl opacity-0"
        aria-label={`Mở lại kết quả cho ${entry.displayLabel}`}
      />
    </div>
  );
}

// =============================================================================
// Empty state
// =============================================================================

function HistoryEmpty() {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      {/* Animated illustration */}
      <div className="relative mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
          <History className="h-7 w-7 text-gray-400" aria-hidden="true" />
        </div>
        {/* Decorative orbiting dots */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute h-2 w-2 rounded-full bg-gray-300"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${i * 120}deg) translateX(36px) translateY(-50%)`,
              animation: `orbit-empty 3s linear infinite`,
              animationDelay: `${i * 1}s`,
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      <h3 className="text-sm font-semibold text-gray-700">Chưa có lịch sử tra cứu</h3>
      <p className="mt-1.5 max-w-48 text-xs text-gray-400 leading-relaxed">
        Các lần tìm kiếm gần đây sẽ xuất hiện ở đây để bạn mở lại nhanh.
      </p>

      <style>{`
        @keyframes orbit-empty {
          from { transform: rotate(0deg) translateX(36px) translateY(-50%); }
          to { transform: rotate(360deg) translateX(36px) translateY(-50%); }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export interface HistoryPanelProps {
  onRestoreEntry: (entry: LookupHistoryEntry) => void;
  className?: string;
}

export function HistoryPanel({ onRestoreEntry, className }: HistoryPanelProps) {
  const {
    entries,
    isLoading,
    totalCount,
    togglePin,
    deleteEntry,
    deleteEntries,
    clearAll,
  } = useHistory();
  const { track } = useAnalytics();
  const [expanded, setExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!expanded) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [expanded]);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(() => {
    deleteEntries(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [selectedIds, deleteEntries]);

  const handleTogglePin = useCallback((id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    // Track save_link when user pins (not when unpins)
    if (!entry.pinned) track.saveLink(true);
    togglePin(id);
  }, [entries, togglePin, track]);

  const handleClearAll = useCallback(() => {
    clearAll();
    setSelectedIds(new Set());
    setShowClearConfirm(false);
    setExpanded(false);
  }, [clearAll]);

  const pinnedEntries = entries.filter((e) => e.pinned);
  const recentEntries = entries.filter((e) => !e.pinned);
  const hasSelection = selectedIds.size > 0;

  return (
    <div ref={panelRef} className={clsx('relative', className)}>
      {/* ── Collapsed trigger bar ── */}
      <button
        type="button"
        onClick={() => {
          if (!expanded) track.recentSearchOpen();
          setExpanded((v) => !v);
        }}
        aria-expanded={expanded}
        aria-controls="history-panel"
        aria-label={`Lịch sử tra cứu — ${totalCount} mục`}
        className={clsx(
          'flex w-full items-center justify-between rounded-xl border px-4 py-3',
          'transition-all duration-200',
          expanded
            ? 'border-orange-200 bg-orange-50 text-orange-700 shadow-sm'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
          totalCount === 0 && 'opacity-50 cursor-default'
        )}
      >
        <div className="flex items-center gap-2.5">
          <History className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-semibold">Lịch sử tra cứu</span>
          {totalCount > 0 && (
            <span
              className={clsx(
                'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
                expanded ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
              )}
            >
              {totalCount}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {/* ── Expanded panel — fixed bottom on mobile ── */}
      <div
        id="history-panel"
        role="dialog"
        aria-label="Lịch sử tra cứu"
        aria-modal="false"
        className={clsx(
          'left-0 right-0 z-50 overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl',
          'transition-all duration-300',
          expanded
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-full pointer-events-none',
          'fixed bottom-0 max-h-[70dvh]', // mobile: fixed bottom, respects safe area
          'sm:absolute sm:bottom-full sm:max-h-96', // desktop: absolute above trigger
          'sm:left-0 sm:right-0'
        )}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-800">Lịch sử tra cứu</h2>
            {isLoading && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-gray-400" aria-hidden="true" />
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Bulk delete */}
            {hasSelection && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Xóa ({selectedIds.size})
              </button>
            )}

            {/* Clear all */}
            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                disabled={totalCount === 0}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
              >
                Xóa tất cả
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Xóa hết?</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 active:scale-95"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Entry list — scrollable, respects safe area on mobile */}
        <div
          className="overflow-y-auto overscroll-contain"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="p-3 space-y-2">
            {entries.length === 0 ? (
              <HistoryEmpty />
            ) : (
              <>
                {/* Pinned section */}
                {pinnedEntries.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1">
                      <Pin className="h-3 w-3 text-orange-400" aria-hidden="true" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Đã ghim
                      </span>
                    </div>
                    {pinnedEntries.map((entry) => (
                      <HistoryItem
                        key={entry.id}
                        entry={entry}
                        onRestore={onRestoreEntry}
                        onTogglePin={handleTogglePin}
                        onDelete={deleteEntry}
                        isSelected={selectedIds.has(entry.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Recent section */}
                {recentEntries.length > 0 && (
                  <div className={clsx('space-y-1.5', pinnedEntries.length > 0 && 'pt-2 border-t border-gray-100')}>
                    {recentEntries.length > 0 && (
                      <div className="flex items-center gap-2 px-1">
                        <Clock className="h-3 w-3 text-gray-400" aria-hidden="true" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Gần đây
                        </span>
                      </div>
                    )}
                    {recentEntries.map((entry) => (
                      <HistoryItem
                        key={entry.id}
                        entry={entry}
                        onRestore={onRestoreEntry}
                        onTogglePin={handleTogglePin}
                        onDelete={deleteEntry}
                        isSelected={selectedIds.has(entry.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Relative time formatter
// =============================================================================

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) return 'Vừa xong';
  if (seconds < 60) return `${seconds} giây trước`;
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return new Date(isoDate).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' });
}

export default HistoryPanel;
