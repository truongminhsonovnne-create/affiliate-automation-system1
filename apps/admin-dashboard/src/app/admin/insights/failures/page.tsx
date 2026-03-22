'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, RefreshCw, AlertTriangle, TrendingDown, Zap } from 'lucide-react';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { DataTable } from '@/components/admin/display/DataTable';
import { ErrorState } from '@/components/admin/layout/ErrorState';
import { LoadingSkeleton } from '@/components/admin/layout/LoadingSkeleton';
import { EmptyState } from '@/components/ui';
import { MetricCard } from '@/components/admin/layout/MetricCard';
import { useFailureInsights } from '@/lib/api/dashboardApi';
import { formatRelativeTime } from '@/lib/formatters/date';
import { formatNumber } from '@/lib/formatters/number';

/**
 * Failure insights page
 */
export default function FailureInsightsPage() {
  const { fetchFailureInsights, fetchFailureTrends } = useFailureInsights();

  const { data: insightsData, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useQuery({
    queryKey: ['failure-insights'],
    queryFn: fetchFailureInsights,
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['failure-trends'],
    queryFn: fetchFailureTrends,
  });

  const insights = ((insightsData as any)?.data?.insights ?? []) as any[];
  const trends = (trendsData as any)?.data ?? {};

  const totalFailures = insights.reduce((acc: number, item: any) => acc + (item.count ?? 0), 0);
  const uniqueErrorTypes = insights.length;

  const columns = useMemo(
    () => [
      {
        key: 'error_type',
        header: 'Loại lỗi',
        width: '200px',
        render: (item: any) => (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" aria-hidden="true" />
            <span className="font-medium">{item.error_type}</span>
          </div>
        ),
      },
      {
        key: 'error_message',
        header: 'Thông báo lỗi',
        render: (item: any) => (
          <span className="text-sm text-gray-600 line-clamp-2">{item.error_message}</span>
        ),
      },
      {
        key: 'count',
        header: 'Số lần',
        width: '100px',
        align: 'right' as const,
        render: (item: any) => (
          <span className="font-semibold">{formatNumber(item.count)}</span>
        ),
      },
      {
        key: 'percentage',
        header: 'Tỷ lệ',
        width: '100px',
        align: 'right' as const,
        render: (item: any) => (
          <span className="text-red-600 font-medium">{item.percentage?.toFixed(1)}%</span>
        ),
      },
      {
        key: 'last_occurrence',
        header: 'Lần cuối',
        width: '150px',
        align: 'right' as const,
        render: (item: any) => (
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {formatRelativeTime(item.last_occurrence)}
          </span>
        ),
      },
      {
        key: 'affected_entities',
        header: 'Đối tượng bị ảnh hưởng',
        width: '150px',
        render: (item: any) => (
          <div className="flex flex-wrap gap-1">
            {item.affected_entities?.slice(0, 3).map((entity: string, i: number) => (
              <span
                key={i}
                className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {entity}
              </span>
            ))}
            {item.affected_entities && item.affected_entities.length > 3 && (
              <span className="px-1.5 py-0.5 text-xs text-gray-400">
                +{item.affected_entities.length - 3}
              </span>
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Phân tích lỗi"
        description="Phân tích và theo dõi các lỗi trong hệ thống"
        icon={BarChart3}
        actions={
          <button
            onClick={() => refetchInsights()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
        }
      />

      {insightsError ? (
        <ErrorState onRetry={() => refetchInsights()} />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Tổng số lỗi"
              value={formatNumber(totalFailures)}
              icon={AlertTriangle}
              variant="error"
            />
            <MetricCard
              title="Loại lỗi khác nhau"
              value={formatNumber(uniqueErrorTypes)}
              icon={Zap}
              variant="warning"
            />
            <MetricCard
              title="Lỗi mới (24h)"
              value={formatNumber(trends?.newFailures24h ?? 0)}
              icon={TrendingDown}
              variant="neutral"
              subtitle="So với 24h trước"
            />
          </div>

          {/* Trends Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Xu hướng lỗi (7 ngày gần nhất)</h3>
            {trendsLoading ? (
              <LoadingSkeleton variant="rect" />
            ) : (
              <div className="space-y-3">
                {['crawl', 'publish', 'ai_content', 'worker'].map((type) => {
                  const trend = trends?.trends?.[type];
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">{type}</span>
                        <span className="font-medium">{formatNumber(trend?.count ?? 0)} lỗi</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${Math.min(100, ((trend?.count ?? 0) / (trends?.maxCount ?? 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Error Breakdown Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Chi tiết các lỗi</h3>
            </div>
            {insightsLoading ? (
              <div className="p-4">
                <LoadingSkeleton variant="table" rows={10} />
              </div>
            ) : insights.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="Không có lỗi nào"
                description="Hệ thống hoạt động tốt, không có lỗi nào được ghi nhận."
              />
            ) : (
              <DataTable
                columns={columns}
                data={insights}
                keyExtractor={(item: any) => `${item.error_type}-${item.error_message}`}
                loading={insightsLoading}
                ariaLabel="Chi tiết các lỗi hệ thống"
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
