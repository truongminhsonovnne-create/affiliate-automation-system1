/**
 * Workbench Summary Cards
 *
 * Summary metric cards for the workbench dashboard
 */

import React from 'react';
import type { ProductOpsWorkbenchSummaryModel } from '../../../features/productOps/types';

interface WorkbenchSummaryCardsProps {
  summary: ProductOpsWorkbenchSummaryModel;
  isLoading?: boolean;
}

export function WorkbenchSummaryCards({ summary, isLoading }: WorkbenchSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { overview, queueHealth, aging, remediations } = summary;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Open Cases Card */}
      <SummaryCard
        title="Open Cases"
        value={overview.totalOpenCases}
        subtitle="Awaiting review"
        color="blue"
        icon="folder"
      />

      {/* In Review Card */}
      <SummaryCard
        title="In Review"
        value={overview.totalInReview}
        subtitle="Currently reviewing"
        color="yellow"
        icon="clock"
      />

      {/* Pending Decision Card */}
      <SummaryCard
        title="Pending Decision"
        value={overview.totalPendingDecision}
        subtitle="Awaiting decision"
        color="orange"
        icon="alert-circle"
      />

      {/* Critical Cases Card */}
      <SummaryCard
        title="Critical Cases"
        value={queueHealth.criticalCount}
        subtitle={`${queueHealth.staleCount} stale`}
        color="red"
        icon="alert-triangle"
        highlight={queueHealth.criticalCount > 0}
      />
    </div>
  );
}

// Individual Summary Card
interface SummaryCardProps {
  title: string;
  value: number;
  subtitle: string;
  color: 'blue' | 'yellow' | 'orange' | 'red' | 'green' | 'purple';
  icon: string;
  highlight?: boolean;
}

function SummaryCard({ title, value, subtitle, color, highlight }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    orange: 'bg-orange-50 border-orange-200',
    red: 'bg-red-50 border-red-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  const textColorClasses = {
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]} ${highlight ? 'ring-2 ring-red-400' : ''}`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${textColorClasses[color]}`}>
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

// Queue Health Card (Secondary)
interface QueueHealthCardsProps {
  health: ProductOpsWorkbenchSummaryModel['queueHealth'];
  isLoading?: boolean;
}

export function QueueHealthCards({ health, isLoading }: QueueHealthCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <HealthCard label="Critical" value={health.criticalCount} color="red" />
      <HealthCard label="High" value={health.highCount} color="orange" />
      <HealthCard label="Stale" value={health.staleCount} color="yellow" />
      <HealthCard label="New Today" value={health.newTodayCount} color="green" />
    </div>
  );
}

function HealthCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    red: 'text-red-600',
    orange: 'text-orange-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

// Aging Distribution Card
interface AgingCardsProps {
  aging: ProductOpsWorkbenchSummaryModel['aging'];
  isLoading?: boolean;
}

export function AgingCards({ aging, isLoading }: AgingCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded border border-gray-200 p-3 text-center">
            <div className="animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-12 mx-auto mb-2" />
              <div className="h-5 bg-gray-200 rounded w-8 mx-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const buckets = [
    { label: '<24h', value: aging.lessThan24h, color: 'green' },
    { label: '1-3d', value: aging.between1to3Days, color: 'blue' },
    { label: '3-7d', value: aging.between3to7Days, color: 'yellow' },
    { label: '7-14d', value: aging.between7to14Days, color: 'orange' },
    { label: '>14d', value: aging.moreThan14Days, color: 'red' },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {buckets.map((bucket) => (
        <div key={bucket.label} className="bg-white rounded border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">{bucket.label}</p>
          <p className={`text-lg font-semibold text-${bucket.color}-600`}>{bucket.value}</p>
        </div>
      ))}
    </div>
  );
}

// Remediation Summary Card
interface RemediationSummaryCardsProps {
  remediations: ProductOpsWorkbenchSummaryModel['remediations'];
  isLoading?: boolean;
}

export function RemediationSummaryCards({ remediations, isLoading }: RemediationSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Pending Approval</p>
        <p className="text-xl font-semibold text-yellow-600">{remediations.pendingApproval}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Approved (Not Executed)</p>
        <p className="text-xl font-semibold text-blue-600">{remediations.approvedNotExecuted}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-500">In Progress</p>
        <p className="text-xl font-semibold text-purple-600">{remediations.inProgress}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Executed This Week</p>
        <p className="text-xl font-semibold text-green-600">{remediations.executedThisWeek}</p>
      </div>
    </div>
  );
}

export default WorkbenchSummaryCards;
