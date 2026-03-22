/**
 * Human Loop Impact Panel
 *
 * Panel showing human-in-the-loop impact metrics and outcomes
 */

import React from 'react';
import type { ProductOpsImpactModel } from '../../../features/productOps/types';

interface HumanLoopImpactPanelProps {
  impacts: ProductOpsImpactModel[];
  isLoading?: boolean;
}

export function HumanLoopImpactPanel({ impacts, isLoading }: HumanLoopImpactPanelProps) {
  if (isLoading) {
    return <HumanLoopImpactPanelSkeleton />;
  }

  if (impacts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Human Loop Impact</h3>
        <p className="text-gray-500 text-sm">No impact data available</p>
      </div>
    );
  }

  // Group impacts by category
  const groupedImpacts = impacts.reduce((acc, impact) => {
    const category = categorizeImpact(impact.metric);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(impact);
    return acc;
  }, {} as Record<string, ProductOpsImpactModel[]>);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-lg font-medium text-gray-900">Human Loop Impact</h3>
        <p className="text-sm text-gray-500 mt-1">
          Measure of human-in-the-loop intervention effectiveness
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {Object.entries(groupedImpacts).map(([category, categoryImpacts]) => (
          <ImpactCategorySection
            key={category}
            category={category}
            impacts={categoryImpacts}
          />
        ))}
      </div>
    </div>
  );
}

// Categorize impact metric
function categorizeImpact(metric: string): string {
  const lowerMetric = metric.toLowerCase();
  if (lowerMetric.includes('time') || lowerMetric.includes('hour') || lowerMetric.includes('minute')) {
    return 'Efficiency';
  }
  if (lowerMetric.includes('accuracy') || lowerMetric.includes('precision') || lowerMetric.includes('error')) {
    return 'Accuracy';
  }
  if (lowerMetric.includes('cost') || lowerMetric.includes('saving') || lowerMetric.includes('revenue')) {
    return 'Business Value';
  }
  return 'Other';
}

// Impact Category Section
function ImpactCategorySection({
  category,
  impacts,
}: {
  category: string;
  impacts: ProductOpsImpactModel[];
}) {
  return (
    <div className="px-4 py-3">
      <h4 className="text-sm font-medium text-gray-700 mb-2">{category}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {impacts.map((impact, index) => (
          <ImpactCard key={index} impact={impact} />
        ))}
      </div>
    </div>
  );
}

// Impact Card Component
function ImpactCard({ impact }: { impact: ProductOpsImpactModel }) {
  const trendConfig = {
    up: { icon: '↑', color: 'text-green-600', bgColor: 'bg-green-50' },
    down: { icon: '↓', color: 'text-red-600', bgColor: 'bg-red-50' },
    stable: { icon: '→', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  };

  const trend = trendConfig[impact.trend];

  return (
    <div className={`p-3 rounded-md ${trend.bgColor}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500">{impact.metric}</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {formatValue(impact.value, impact.unit)}
          </p>
        </div>
        <div className={`text-right ${trend.color}`}>
          <span className="text-lg font-bold">{trend.icon}</span>
          <span className="text-sm">{Math.abs(impact.change)}%</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">{impact.period}</p>
    </div>
  );
}

// Format value with unit
function formatValue(value: number, unit: string): string {
  if (unit === '%') {
    return `${value}%`;
  }
  if (unit === '$' || unit === 'USD') {
    return `$${value.toLocaleString()}`;
  }
  if (unit === 'hours' || unit === 'minutes') {
    return `${value} ${unit}`;
  }
  return value.toLocaleString();
}

// Skeleton Component
function HumanLoopImpactPanelSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-64 mt-2 animate-pulse" />
      </div>

      <div className="divide-y divide-gray-200">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-4 py-3">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="p-3 bg-gray-100 rounded-md animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-20" />
                  <div className="h-5 bg-gray-200 rounded w-16 mt-2" />
                  <div className="h-3 bg-gray-200 rounded w-12 mt-2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HumanLoopImpactPanel;
