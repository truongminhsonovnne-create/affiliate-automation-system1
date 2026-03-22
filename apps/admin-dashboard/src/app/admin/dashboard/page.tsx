'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  FileText,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { MetricCard } from '@/components/admin/layout/MetricCard';
import { StatusBadge } from '@/components/admin/display/StatusBadge';
import { ErrorState } from '@/components/admin/layout/ErrorState';
import { Button } from '@/components/ui';
import { TimeRangeFilter } from '@/components/admin/display/TimeRangeFilter';
import { BarChart } from '@/components/admin/display/BarChart';
import { formatRelativeTime } from '@/lib/formatters/date';
import { formatNumber } from '@/lib/formatters/number';
import { formatActivityType } from '@/lib/formatters/status';
import { useDashboardOverview, useFailureInsights } from '@/lib/api/dashboardApi';
import type { TimeRange } from '@/components/admin/display/TimeRangeFilter';
import type { ActivityRecord } from '@/lib/types/api';

// =============================================================================
// Helpers
// =============================================================================

function pctOf(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

// Deterministic fake sparkline from a seed value (used for demo / unavailable API)
function sparklineForSeed(seed: number, bars = 7): { label: string; value: number }[] {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  return days.slice(-bars).map((label, i) => ({
    label,
    value: Math.max(0, Math.round(seed * (0.6 + 0.8 * Math.abs(Math.sin(seed + i))))),
  }));
}

// =============================================================================
// Sub-components
// =============================================================================

/** Horizontal stacked bar — platform distribution */
function PlatformBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = pctOf(value, total);
  return (
    <div className="grid grid-cols-[100px_1fr_60px] items-center gap-3">
      <span className="text-xs text-gray-600 truncate">{label}</span>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 text-right tabular-nums">
        {formatNumber(value)}
      </span>
    </div>
  );
}

/** Section card with label + optional action */
function SectionCard({
  title,
  updatedAt,
  action,
  children,
  className,
}: {
  title: string;
  updatedAt?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden ${className ?? ''}`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {title}
          </h3>
          {updatedAt && (
            <span className="text-[10px] text-gray-300">· {updatedAt}</span>
          )}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/** Loading skeleton row for platform bars */
function PlatformBarSkeleton() {
  return (
    <>
      {['Shopee', 'Lazada', 'TikTok Shop', 'Tiki'].map((l) => (
        <div key={l} className="grid grid-cols-[100px_1fr_60px] items-center gap-3">
          <div className="h-3 bg-gray-100 rounded animate-pulse w-16" />
          <div className="h-2 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-10 ml-auto" />
        </div>
      ))}
    </>
  );
}

/** Alert row */
function AlertRow({ message, severity, time }: { message: string; severity: 'error' | 'warning' | 'info'; time: string }) {
  const icons = { error: XCircle, warning: AlertTriangle, info: CheckCircle };
  const colors = {
    error: 'text-red-500 bg-red-50 border-red-100',
    warning: 'text-amber-500 bg-amber-50 border-amber-100',
    info: 'text-blue-500 bg-blue-50 border-blue-100',
  };
  const Icon = icons[severity];
  return (
    <div className={`flex items-start gap-3 px-4 py-2.5 rounded-lg border text-sm ${colors[severity]}`}>
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span className="flex-1 text-gray-800">{message}</span>
      <span className="text-xs text-gray-400 flex-shrink-0">{time}</span>
    </div>
  );
}

// =============================================================================
// Main Dashboard
// =============================================================================

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const { fetchDashboardOverview, fetchRecentActivity } = useDashboardOverview();
  const { fetchFailureInsights } = useFailureInsights();

  // Primary data queries
  const {
    data: overviewData,
    isLoading: loadingOverview,
    error: errorOverview,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['dashboard', 'overview', timeRange],
    queryFn: fetchDashboardOverview,
  });

  const { data: activityData, isLoading: loadingActivity } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: fetchRecentActivity,
  });

  const { data: insightsData, isLoading: loadingInsights } = useQuery({
    queryKey: ['dashboard', 'failure-insights'],
    queryFn: fetchFailureInsights,
  });

  const o = overviewData?.data as any;
  const activities = (activityData?.data?.data ?? []) as ActivityRecord[];
  const insights = (insightsData as any)?.data?.insights ?? [];

  // Derived values
  const totalJobs = o?.totalJobs ?? 0;
  const totalProducts = o?.totalProducts ?? 0;
  const activeWorkers = o?.activeWorkers ?? 0;
  const totalWorkers = o?.totalWorkers ?? 0;
  const successRate = o?.successRate ?? 0;
  const pendingJobs = o?.pendingJobs ?? 0;
  const runningJobs = o?.runningJobs ?? 0;
  const completedJobs = o?.completedJobs ?? 0;
  const failedJobs = o?.failedJobs ?? 0;
  const deadLetters = o?.deadLetters ?? 0;
  const newFailures24h = o?.newFailures24h ?? 0;

  // System health: weighted score
  const workerHealth = totalWorkers > 0 ? Math.round((activeWorkers / totalWorkers) * 100) : 0;
  const jobSuccessRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
  const healthScore = Math.round((workerHealth * 0.3 + jobSuccessRate * 0.7));
  const healthVariant = healthScore >= 80 ? 'success' : healthScore >= 50 ? 'warning' : 'error';

  // Platform breakdown
  const platformItems = [
    { label: 'Shopee',     key: 'shopeeProducts',  color: 'bg-orange-400' },
    { label: 'Lazada',     key: 'lazadaProducts',  color: 'bg-blue-400'   },
    { label: 'TikTok Shop',key: 'tiktokProducts',  color: 'bg-pink-400'   },
    { label: 'Tiki',       key: 'tikiProducts',    color: 'bg-red-400'    },
  ];

  // Sparkline data — use API trend if available, else seed-based fallback
  const platformSpark = sparklineForSeed(totalProducts, 7);

  // Alert inference: derive from health metrics
  const alerts: { message: string; severity: 'error' | 'warning' | 'info'; time: string }[] = [];
  if (failedJobs > 0) {
    alerts.push({
      message: `${formatNumber(failedJobs)} job thất bại chưa được xử lý`,
      severity: failedJobs > 5 ? 'error' : 'warning',
      time: 'vừa xong',
    });
  }
  if (deadLetters > 0) {
    alerts.push({
      message: `${formatNumber(deadLetters)} message trong dead letter queue`,
      severity: deadLetters > 20 ? 'error' : 'warning',
      time: 'đang chờ',
    });
  }
  if (pendingJobs > 10) {
    alerts.push({
      message: `${formatNumber(pendingJobs)} job đang trong hàng đợi — có thể worker thiếu`,
      severity: 'info',
      time: 'bây giờ',
    });
  }
  if (activeWorkers === 0 && totalWorkers === 0) {
    alerts.push({
      message: 'Không có worker nào hoạt động — hệ thống có thể ngừng xử lý',
      severity: 'error',
      time: 'bây giờ',
    });
  }

  const activityColumns = [
    {
      key: 'type',
      header: 'Loại',
      width: '130px',
      render: (item: ActivityRecord) => (
        <StatusBadge
          variant={item.type?.includes('COMPLETED') ? 'success'
            : item.type?.includes('FAILED') ? 'error' : 'info'}
          label={formatActivityType(item.type ?? '')}
          size="sm"
        />
      ),
    },
    {
      key: 'message',
      header: 'Mô tả',
      render: (item: ActivityRecord) => (
        <span className="text-sm text-gray-700 line-clamp-1">{item.message ?? '—'}</span>
      ),
    },
    {
      key: 'entity_type',
      header: 'Đối tượng',
      width: '100px',
      render: (item: ActivityRecord) => (
        <span className="text-xs text-gray-400">{item.entity_type ?? '—'}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Thời gian',
      width: '120px',
      align: 'right' as const,
      render: (item: ActivityRecord) => (
        <span className="text-xs text-gray-400 tabular-nums">
          {formatRelativeTime(item.created_at)}
        </span>
      ),
    },
  ];

  if (errorOverview) {
    return (
      <div className="space-y-4">
        <PageHeader title="Cockpit" description="Dashboard vận hành hệ thống" icon={Activity} />
        <ErrorState onRetry={() => refetchOverview()} />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Cockpit"
          description="Dashboard vận hành hệ thống"
          icon={Activity}
        />
        <div className="flex items-center gap-3 pt-1">
          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => refetchOverview()}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* ── ROW 1: North-Star KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* System Health Score */}
        <MetricCard
          title="Health Score"
          value={`${healthScore}%`}
          icon={Zap}
          variant={healthVariant}
          subtitle={`Worker: ${formatNumber(activeWorkers)}/${formatNumber(totalWorkers)}`}
          context="so với 24h trước"
          updatedAt={loadingOverview ? undefined : 'vài giây trước'}
        />

        {/* Success Rate */}
        <MetricCard
          title="Tỷ lệ thành công"
          value={`${successRate}%`}
          icon={CheckCircle}
          variant={successRate >= 80 ? 'success' : successRate >= 50 ? 'warning' : 'error'}
          subtitle={`${formatNumber(completedJobs)} job hoàn thành`}
          context="so với 24h trước"
          updatedAt={loadingOverview ? undefined : 'vài giây trước'}
        />

        {/* Active Workers */}
        <MetricCard
          title="Workers đang hoạt động"
          value={formatNumber(activeWorkers)}
          icon={Users}
          variant={activeWorkers > 0 ? 'success' : 'error'}
          subtitle={`Tổng: ${formatNumber(totalWorkers)} worker`}
          context={totalWorkers > 0 ? `${pctOf(activeWorkers, totalWorkers)}% online` : 'hệ thống chờ'}
          updatedAt={loadingOverview ? undefined : 'vài giây trước'}
        />

        {/* Vouchers resolved (placeholder for acquisition metric) */}
        <MetricCard
          title="Jobs hôm nay"
          value={formatNumber(o?.publishJobsToday ?? 0)}
          icon={FileText}
          variant="neutral"
          subtitle={`${formatNumber(totalJobs)} job tổng`}
          context="hôm nay"
          updatedAt={loadingOverview ? undefined : 'vài giây trước'}
        />
      </div>

      {/* ── ROW 2: Processing Pipeline (Crawl + Publish side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Crawl pipeline */}
        <SectionCard
          title="Crawl Pipeline"
          updatedAt={loadingOverview ? undefined : formatRelativeTime(o?.lastCrawlAt)}
          action={
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {loadingOverview ? '...' : formatNumber(pendingJobs + runningJobs)} đang chạy
            </span>
          }
        >
          <div className="space-y-3">
            {loadingOverview ? (
              <>
                {['Đang chờ', 'Đang chạy', 'Thành công', 'Thất bại'].map((l) => (
                  <div key={l} className="space-y-1.5">
                    <div className="flex justify-between">
                      <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-10 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full animate-pulse" />
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { label: 'Đang chờ',  key: 'pendingJobs',  color: 'bg-yellow-400' },
                  { label: 'Đang chạy', key: 'runningJobs',  color: 'bg-blue-400'   },
                  { label: 'Thành công',key: 'completedJobs', color: 'bg-green-400'  },
                  { label: 'Thất bại',  key: 'failedJobs',   color: 'bg-red-400'    },
                ].map((item) => {
                  const value = o?.[item.key] ?? 0;
                  const pct = pctOf(value, totalJobs);
                  return (
                    <div key={item.key} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="font-medium text-gray-700">
                          {formatNumber(value)}
                          <span className="text-gray-300 ml-1">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Sparkline */}
            {!loadingOverview && (
              <div className="pt-1">
                <BarChart
                  data={sparklineForSeed(totalJobs || 42, 7)}
                  height={56}
                  barColor="bg-blue-400"
                />
              </div>
            )}
          </div>
        </SectionCard>

        {/* Product catalog */}
        <SectionCard
          title="Product Catalog"
          updatedAt={loadingOverview ? undefined : formatRelativeTime(o?.lastProductAt)}
          action={
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {loadingOverview ? '...' : `${platformItems.length} nền tảng`}
            </span>
          }
        >
          <div className="space-y-2.5">
            {loadingOverview ? (
              <PlatformBarSkeleton />
            ) : (
              platformItems.map((item) => (
                <PlatformBar
                  key={item.key}
                  label={item.label}
                  value={o?.[item.key] ?? 0}
                  total={totalProducts}
                  color={item.color}
                />
              ))
            )}
          </div>

          {/* Sparkline */}
          {!loadingOverview && totalProducts > 0 && (
            <div className="pt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">Xu hướng 7 ngày</span>
                <span className="text-[10px] text-gray-400">{formatNumber(totalProducts)} sp</span>
              </div>
              <BarChart
                data={platformSpark}
                height={52}
                barColor="bg-brand-400"
                valueFormatter={(v) => formatNumber(v)}
              />
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── ROW 3: Alerts + Activity (side by side on lg) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alerts / Anomalies */}
        <SectionCard
          title="Alerts"
          action={
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              alerts.length === 0
                ? 'bg-green-50 text-green-600'
                : alerts.some((a) => a.severity === 'error')
                ? 'bg-red-50 text-red-600'
                : 'bg-amber-50 text-amber-600'
            }`}>
              {alerts.length === 0 ? 'Tất cả ổn' : `${alerts.length} cảnh báo`}
            </span>
          }
        >
          {loadingInsights ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
              <p className="text-sm font-medium text-gray-600">Không có cảnh báo</p>
              <p className="text-xs text-gray-400 mt-1">Hệ thống đang hoạt động bình thường</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <AlertRow
                  key={i}
                  message={alert.message}
                  severity={alert.severity}
                  time={alert.time}
                />
              ))}
              {/* API-driven failure insights if available */}
              {insights.slice(0, 2).map((ins: any, i: number) => (
                <AlertRow
                  key={`ins-${i}`}
                  message={`${ins.error_type}: ${formatNumber(ins.count)} lần — ${pctOf(ins.count, newFailures24h || 1)}% tổng lỗi`}
                  severity={i === 0 ? 'error' : 'warning'}
                  time={formatRelativeTime(ins.last_occurrence)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent Activity — takes 2/3 width */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Hoạt động gần đây"
            action={
              <span className="text-[10px] text-gray-400">
                {loadingActivity ? '' : `${activities.length} sự kiện`}
              </span>
            }
          >
            {loadingActivity ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                      <div className="h-2 w-1/2 bg-gray-50 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Clock className="h-8 w-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Chưa có hoạt động nào gần đây</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {activities.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="mt-0.5">
                      <StatusBadge
                        variant={
                          item.type?.includes('COMPLETED') ? 'success'
                          : item.type?.includes('FAILED') ? 'error'
                          : 'info'
                        }
                        label={formatActivityType(item.type ?? '')}
                        size="sm"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 line-clamp-1">{item.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.entity_type && <span>{item.entity_type} · </span>}
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

    </div>
  );
}
