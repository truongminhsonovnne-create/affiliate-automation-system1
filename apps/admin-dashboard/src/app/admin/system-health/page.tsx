'use client';

/**
 * System Health Page — /admin/system-health
 *
 * Internal admin debug surface.
 * No secrets or tokens are ever returned to the UI.
 *
 * Sections:
 *  - Source health (per-source sync state, checkpoint, errors)
 *  - Offer catalog health (active/expired/inactive counts per source)
 *  - Recent sync runs (last 20 runs with fetch/insert/update counts)
 *  - Recent sync errors (last 30 errors)
 *  - Resolution quality (success rate, avg latency, confidence distribution)
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  Database,
  TrendingUp,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { MetricCard } from '@/components/admin/layout/MetricCard';
import { StatusBadge } from '@/components/admin/display/StatusBadge';
import { ErrorState } from '@/components/admin/layout/ErrorState';
import { formatRelativeTime } from '@/lib/formatters/date';
import { formatNumber } from '@/lib/formatters/number';

// ── API client ──────────────────────────────────────────────────────────────

interface SourceHealth {
  source: string;
  sourceName: string;
  isEnabled: boolean;
  lastSyncedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  pendingContinue: boolean;
  retryCount: number;
  maxRetries: number;
}

interface OfferCounts {
  source: string;
  total: number;
  active: number;
  expired: number;
  inactive: number;
  noCoupon: number;
  withCoupon: number;
}

interface SyncRunRow {
  id: string;
  source: string;
  jobName: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errorSummary: string | null;
  durationMs: number | null;
}

interface SyncErrorRow {
  id: string;
  source: string;
  stage: string;
  errorMessage: string;
  createdAt: string;
}

interface ResolutionStats {
  totalRequests: number;
  succeeded: number;
  failed: number;
  noMatch: number;
  pending: number;
  successRate: number;
  avgDurationMs: number | null;
  requestsLast24h: number;
  successRate24h: number;
  topPlatform: string | null;
}

interface ConfidenceStats {
  avgConfidence: number;
  lowConfidenceCount: number;
  highConfidenceCount: number;
  total: number;
  p25: number;
  p50: number;
  p75: number;
}

interface SystemHealthData {
  generatedAt: string;
  sources: SourceHealth[];
  offerCounts: OfferCounts[];
  recentSyncRuns: SyncRunRow[];
  recentSyncErrors: SyncErrorRow[];
  resolutionStats: ResolutionStats;
  confidenceStats: ConfidenceStats;
}

async function fetchSystemHealth(hours = 24): Promise<SystemHealthData> {
  const response = await fetch(`/api/admin/debug/system-health?hours=${hours}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`System health API: ${response.status} — ${(body as any)?.message ?? response.statusText}`);
  }
  return response.json() as Promise<SystemHealthData>;
}

// ── Formatters ─────────────────────────────────────────────────────────────

function formatMs(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function sourceColor(source: string): string {
  const map: Record<string, string> = {
    masoffer: '#1d4ed8',
    accesstrade: '#15803d',
    shopee: '#c2410c',
    ecomobi: '#7c3aed',
  };
  return map[source] ?? '#6b7280';
}

function sourceBg(source: string): string {
  const map: Record<string, string> = {
    masoffer: '#eff6ff',
    accesstrade: '#f0fdf4',
    shopee: '#fff7ed',
    ecomobi: '#f5f3ff',
  };
  return map[source] ?? '#f9fafb';
}

// ── Sub-components ───────────────────────────────────────────────────────

function SectionCard({ title, children, action, updatedAt }: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  updatedAt?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
          {updatedAt && <span className="text-[10px] text-gray-300">· {updatedAt}</span>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SourceRow({ src }: { src: SourceHealth }) {
  const healthColor = src.lastStatus === 'completed'
    ? '#22c55e' : src.lastStatus === 'failed'
    ? '#ef4444' : '#f59e0b';

  const healthIcon = src.lastStatus === 'completed'
    ? <CheckCircle className="h-4 w-4" style={{ color: healthColor }} />
    : src.lastStatus === 'failed'
    ? <XCircle className="h-4 w-4" style={{ color: healthColor }} />
    : <AlertTriangle className="h-4 w-4" style={{ color: healthColor }} />;

  const statusLabel = src.lastStatus === 'completed' ? 'OK'
    : src.lastStatus === 'failed' ? 'Lỗi'
    : src.pendingContinue ? 'Chưa xong'
    : src.lastStatus ?? '—';

  return (
    <div className="flex flex-col gap-3 rounded-xl p-4" style={{ backgroundColor: sourceBg(src.source), border: '1px solid #f3f4f6' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-white"
            style={{ backgroundColor: sourceColor(src.source) }}
          >
            {src.source === 'masoffer' ? 'MO' : src.source === 'accesstrade' ? 'AT' : src.source.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#111827' }}>{src.sourceName}</p>
            <p className="text-xs" style={{ color: '#9ca3af' }}>{src.source}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!src.isEnabled && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500">Disabled</span>
          )}
          {src.pendingContinue && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600">Pending</span>
          )}
          {src.retryCount > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-600">
              Retry {src.retryCount}/{src.maxRetries}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: healthColor }}>
            {healthIcon}
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Last sync info */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-gray-400 mb-0.5">Sync cuối</p>
          <p className="font-medium" style={{ color: '#374151' }}>
            {src.lastSyncedAt ? formatRelativeTime(src.lastSyncedAt) : '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5">Thành công</p>
          <p className="font-medium" style={{ color: '#374151' }}>
            {src.lastSuccessAt ? formatRelativeTime(src.lastSuccessAt) : '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5">Thất bại</p>
          <p className="font-medium" style={{ color: '#374151' }}>
            {src.lastFailureAt ? formatRelativeTime(src.lastFailureAt) : '—'}
          </p>
        </div>
      </div>

      {src.lastError && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2 bg-red-50 border border-red-100">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700 line-clamp-2">{src.lastError}</p>
        </div>
      )}
    </div>
  );
}

function OfferCountsRow({ counts }: { counts: OfferCounts }) {
  const total = counts.total || 1;
  const activePct = Math.round((counts.active / total) * 100);
  const couponPct = Math.round((counts.withCoupon / total) * 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: '#111827' }}>
          {counts.source}
        </span>
        <span className="text-xs font-medium" style={{ color: '#6b7280' }}>
          {formatNumber(counts.total)} records
        </span>
      </div>
      <div className="flex gap-1 h-5 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-400 transition-all"
          style={{ width: `${activePct}%` }}
          title={`Active: ${activePct}%`}
        />
        <div
          className="h-full bg-amber-300 transition-all"
          style={{ width: `${Math.round((counts.expired / total) * 100)}%` }}
          title={`Expired: ${Math.round((counts.expired / total) * 100)}%`}
        />
        <div
          className="h-full bg-gray-200 transition-all"
          style={{ width: `${Math.max(1, 100 - activePct - Math.round((counts.expired / total) * 100))}%` }}
          title="Inactive"
        />
      </div>
      <div className="flex gap-3 text-[10px]" style={{ color: '#9ca3af' }}>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
          Active {activePct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300 inline-block" />
          Expired {Math.round((counts.expired / total) * 100)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-200 inline-block" />
          Coupon {couponPct}%
        </span>
      </div>
    </div>
  );
}

function SyncRunRow({ run }: { run: SyncRunRow }) {
  const statusColor = run.status === 'completed'
    ? '#22c55e' : run.status === 'failed'
    ? '#ef4444' : '#f59e0b';
  const statusLabel = run.status === 'completed' ? 'OK'
    : run.status === 'failed' ? 'Lỗi'
    : run.status === 'running' ? 'Running' : run.status;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <span
        className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white"
        style={{ backgroundColor: sourceColor(run.source) }}
      >
        {run.source === 'masoffer' ? 'MO' : run.source === 'accesstrade' ? 'AT' : run.source.slice(0, 2).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium" style={{ color: '#374151' }}>{run.jobName}</span>
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
          >
            {statusLabel}
          </span>
          <span className="text-[10px]" style={{ color: '#d1d5db' }}>
            {formatRelativeTime(run.startedAt)}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]" style={{ color: '#9ca3af' }}>
          <span>F: <strong style={{ color: '#374151' }}>{formatNumber(run.recordsFetched)}</strong></span>
          <span>I: <strong style={{ color: '#374151' }}>{formatNumber(run.recordsInserted)}</strong></span>
          <span>U: <strong style={{ color: '#374151' }}>{formatNumber(run.recordsUpdated)}</strong></span>
          <span>S: <strong style={{ color: '#374151' }}>{formatNumber(run.recordsSkipped)}</strong></span>
          {run.durationMs != null && (
            <span>⏱ {formatMs(run.durationMs)}</span>
          )}
        </div>
        {run.errorSummary && (
          <p className="mt-1 text-[10px] text-red-500 line-clamp-1">{run.errorSummary}</p>
        )}
      </div>
    </div>
  );
}

function SyncErrorRow({ err }: { err: SyncErrorRow }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-600">{err.source}</span>
          <span className="text-[10px]" style={{ color: '#d1d5db' }}>{err.stage}</span>
          <span className="text-[10px]" style={{ color: '#d1d5db' }}>{formatRelativeTime(err.createdAt)}</span>
        </div>
        <p className="text-xs" style={{ color: '#6b7280' }}>{err.errorMessage}</p>
      </div>
    </div>
  );
}

function ConfidenceBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-24 text-gray-500">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium tabular-nums w-12 text-right" style={{ color }}>{value.toFixed(2)}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function SystemHealthPage() {
  const [hours, setHours] = useState(24);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['system-health', hours],
    queryFn: () => fetchSystemHealth(hours),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const d = data as SystemHealthData | undefined;

  // ── Derived metrics ──────────────────────────────────────────────────────
  const totalOffers = d?.offerCounts.reduce((acc, c) => acc + c.total, 0) ?? 0;
  const totalActiveOffers = d?.offerCounts.reduce((acc, c) => acc + c.active, 0) ?? 0;
  const syncRunCount = d?.recentSyncRuns.length ?? 0;
  const syncErrorCount = d?.recentSyncErrors.length ?? 0;
  const recentFailedRuns = d?.recentSyncRuns.filter((r) => r.status === 'failed').length ?? 0;
  const lowConfRate = d?.confidenceStats.total
    ? Math.round((d.confidenceStats.lowConfidenceCount / d.confidenceStats.total) * 100)
    : 0;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="System Health"
          description="Health debug surface — source sync, offer catalog, resolution quality"
          icon={Activity}
        />
        <div className="flex items-center gap-3 pt-1">
          {/* Time range filter */}
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="text-xs font-medium bg-transparent border-none outline-none cursor-pointer"
              style={{ color: '#374151' }}
            >
              <option value={6}>6h</option>
              <option value={24}>24h</option>
              <option value={72}>3 days</option>
              <option value={168}>7 days</option>
            </select>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Generation timestamp ── */}
      {d?.generatedAt && (
        <p className="text-[11px] text-gray-300 -mt-2">
          Generated {formatRelativeTime(d.generatedAt)} · Auto-refreshes every 60s
        </p>
      )}

      {error && !data && (
        <ErrorState onRetry={() => refetch()} />
      )}

      {/* ── Source Health ── */}
      <SectionCard title="Source Health" updatedAt={d?.generatedAt ? formatRelativeTime(d.generatedAt) : undefined}>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {d?.sources.map((src) => (
              <SourceRow key={src.source} src={src} />
            ))}
            {(!d?.sources || d.sources.length === 0) && (
              <p className="text-sm text-gray-400 py-4 text-center">No sources configured.</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Total Offers"
          value={isLoading ? '—' : formatNumber(totalOffers)}
          icon={Database}
          variant={totalOffers > 0 ? 'success' : 'neutral'}
          subtitle={isLoading ? '' : `${formatNumber(totalActiveOffers)} active`}
          context={isLoading ? '' : `across ${d?.offerCounts.length ?? 0} sources`}
        />
        <MetricCard
          title="Sync Runs (window)"
          value={isLoading ? '—' : formatNumber(syncRunCount)}
          icon={Zap}
          variant={recentFailedRuns === 0 ? 'success' : recentFailedRuns <= 2 ? 'warning' : 'error'}
          subtitle={isLoading ? '' : `${formatNumber(syncErrorCount)} errors`}
          context={isLoading ? '' : `${formatNumber(recentFailedRuns)} failed`}
        />
        <MetricCard
          title="Resolve Success Rate"
          value={isLoading ? '—' : (d ? `${d.resolutionStats.successRate}%` : '—')}
          icon={TrendingUp}
          variant={
            !d || isLoading ? 'neutral'
            : d.resolutionStats.successRate >= 80 ? 'success'
            : d.resolutionStats.successRate >= 50 ? 'warning'
            : 'error'
          }
          subtitle={d ? `${formatNumber(d.resolutionStats.totalRequests)} total requests` : ''}
          context={d ? `avg ${formatMs(d.resolutionStats.avgDurationMs)}` : ''}
        />
        <MetricCard
          title="Confidence Score"
          value={isLoading || !d ? '—' : `${(d.confidenceStats.avgConfidence * 100).toFixed(0)}%`}
          icon={TrendingUp}
          variant={!d || isLoading ? 'neutral' : d.confidenceStats.avgConfidence >= 0.7 ? 'success'
            : d.confidenceStats.avgConfidence >= 0.4 ? 'warning' : 'error'}
          subtitle={isLoading || !d ? '' : `${formatNumber(d.confidenceStats.total)} records scored`}
          context={isLoading || !d ? '' : `${lowConfRate}% low confidence (<0.4)`}
        />
      </div>

      {/* ── Catalog health + Resolution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Offer catalog */}
        <SectionCard title="Offer Catalog">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <div key={i} className="h-16 rounded-lg animate-pulse bg-gray-50" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {d?.offerCounts.map((c) => (
                <OfferCountsRow key={c.source} counts={c} />
              ))}
              {(!d?.offerCounts || d.offerCounts.length === 0) && (
                <p className="text-sm text-gray-400 py-4 text-center">No offer data.</p>
              )}
            </div>
          )}
        </SectionCard>

        {/* Resolution stats */}
        <SectionCard title="Resolution Quality">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-8 rounded-lg animate-pulse bg-gray-50" />)}
            </div>
          ) : d?.resolutionStats ? (
            <div className="space-y-3">
              {[
                { label: 'Total requests', value: formatNumber(d.resolutionStats.totalRequests), color: '#374151' },
                { label: 'Succeeded', value: formatNumber(d.resolutionStats.succeeded), color: '#22c55e' },
                { label: 'Failed', value: formatNumber(d.resolutionStats.failed), color: '#ef4444' },
                { label: 'No match', value: formatNumber(d.resolutionStats.noMatch), color: '#f59e0b' },
                { label: 'Pending', value: formatNumber(d.resolutionStats.pending), color: '#6b7280' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#6b7280' }}>{row.label}</span>
                  <span className="text-xs font-semibold" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-3 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: '#374151' }}>Confidence Distribution</span>
                </div>
                <ConfidenceBar label="p25" value={d.confidenceStats.p25} max={1} color="#f59e0b" />
                <ConfidenceBar label="p50" value={d.confidenceStats.p50} max={1} color="#22c55e" />
                <ConfidenceBar label="p75" value={d.confidenceStats.p75} max={1} color="#15803d" />
                <div className="mt-2 flex justify-between text-[10px]" style={{ color: '#9ca3af' }}>
                  <span>{formatNumber(d.confidenceStats.lowConfidenceCount)} low (&lt;0.4)</span>
                  <span>{formatNumber(d.confidenceStats.highConfidenceCount)} high (&gt;=0.8)</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">No resolution data available yet.</p>
          )}
        </SectionCard>
      </div>

      {/* ── Sync runs + errors ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent sync runs */}
        <SectionCard
          title="Recent Sync Runs"
          action={
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              Last {hours}h
            </span>
          }
        >
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 rounded-lg animate-pulse bg-gray-50" />)}
            </div>
          ) : d?.recentSyncRuns.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No sync runs in the last {hours}h.</p>
          ) : (
            <div className="space-y-0">
              {d?.recentSyncRuns.slice(0, 10).map((run) => (
                <SyncRunRow key={run.id} run={run} />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent sync errors */}
        <SectionCard
          title="Recent Sync Errors"
          action={
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              syncErrorCount === 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            }`}>
              {syncErrorCount === 0 ? 'OK' : `${syncErrorCount} errors`}
            </span>
          }
        >
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg animate-pulse bg-gray-50" />)}
            </div>
          ) : d?.recentSyncErrors.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle className="h-8 w-8 text-green-300 mb-2" />
              <p className="text-sm font-medium" style={{ color: '#6b7280' }}>Không có lỗi sync nào</p>
              <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>Trong {hours}h qua</p>
            </div>
          ) : (
            <div className="space-y-0">
              {d?.recentSyncErrors.slice(0, 15).map((err) => (
                <SyncErrorRow key={err.id} err={err} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

    </div>
  );
}
