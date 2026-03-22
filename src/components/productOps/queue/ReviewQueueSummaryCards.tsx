/**
 * Review Queue Summary Cards
 *
 * Summary cards showing queue health metrics
 */

import React from 'react';

interface SummaryCardsProps {
  openCases: number;
  highSeverity: number;
  staleReviews: number;
  pendingRemediations: number;
  assignedToMe: number;
}

export function ReviewQueueSummaryCards({
  openCases,
  highSeverity,
  staleReviews,
  pendingRemediations,
  assignedToMe,
}: SummaryCardsProps) {
  const cards = [
    { label: 'Open Cases', value: openCases, color: 'blue' },
    { label: 'High Severity', value: highSeverity, color: 'red' },
    { label: 'Stale Reviews', value: staleReviews, color: 'orange' },
    { label: 'Pending Remediations', value: pendingRemediations, color: 'purple' },
    { label: 'Assigned to Me', value: assignedToMe, color: 'green' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}

export default ReviewQueueSummaryCards;
