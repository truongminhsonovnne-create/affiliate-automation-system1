/**
 * Workbench Trend Panels
 *
 * Trend visualization panels for workbench dashboard
 */

import React from 'react';
import type { ProductOpsTrendModel, ProductOpsImpactModel } from '../../../features/productOps/types';

interface WorkbenchTrendPanelsProps {
  trends: ProductOpsTrendModel[];
  impacts: ProductOpsImpactModel[];
  isLoading?: boolean;
}

export function WorkbenchTrendPanels({ trends, impacts, isLoading }: WorkbenchTrendPanelsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChartSkeleton />
        <ImpactListSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Trend Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Case Trends</h3>
        <TrendChart data={trends} />
      </div>

      {/* Impact Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Impact Metrics</h3>
        <ImpactList impacts={impacts} />
      </div>
    </div>
  );
}

// Trend Chart Component
function TrendChart({ data }: { data: ProductOpsTrendModel[] }) {
  if (data.length === 0) {
    return <p className="text-gray-500 text-sm">No trend data available</p>;
  }

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.casesCreated, d.casesResolved))
  );

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>Created</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Resolved</span>
        </div>
      </div>

      {/* Chart Bars */}
      <div className="flex items-end justify-between h-40 gap-2">
        {data.map((period, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-1 items-end h-32">
              {/* Created Bar */}
              <div
                className="flex-1 bg-blue-500 rounded-t"
                style={{ height: `${(period.casesCreated / maxValue) * 100}%` }}
                title={`Created: ${period.casesCreated}`}
              />
              {/* Resolved Bar */}
              <div
                className="flex-1 bg-green-500 rounded-t"
                style={{ height: `${(period.casesResolved / maxValue) * 100}%` }}
                title={`Resolved: ${period.casesResolved}`}
              />
            </div>
            <span className="text-xs text-gray-500">{period.period}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Impact List Component
function ImpactList({ impacts }: { impacts: ProductOpsImpactModel[] }) {
  if (impacts.length === 0) {
    return <p className="text-gray-500 text-sm">No impact metrics available</p>;
  }

  return (
    <div className="space-y-3">
      {impacts.map((impact, index) => (
        <ImpactItem key={index} impact={impact} />
      ))}
    </div>
  );
}

// Impact Item Component
function ImpactItem({ impact }: { impact: ProductOpsImpactModel }) {
  const trendIcon = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  const trendColor = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-gray-600',
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
      <div>
        <p className="text-sm font-medium text-gray-900">{impact.metric}</p>
        <p className="text-xs text-gray-500">{impact.period}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-gray-900">
          {impact.value.toLocaleString()} {impact.unit}
        </p>
        <p className={`text-xs ${trendColor[impact.trend]}`}>
          {trendIcon[impact.trend]} {Math.abs(impact.change)}%
        </p>
      </div>
    </div>
  );
}

// Skeleton Components
function TrendChartSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
      <div className="h-40 animate-pulse flex items-end gap-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex-1 flex gap-1 justify-center h-full">
            <div className="w-4 bg-gray-200 rounded-t" style={{ height: `${30 + Math.random() * 70}%` }} />
            <div className="w-4 bg-gray-200 rounded-t" style={{ height: `${30 + Math.random() * 70}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ImpactListSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-3 bg-gray-100 rounded-md animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-5 bg-gray-200 rounded w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorkbenchTrendPanels;
