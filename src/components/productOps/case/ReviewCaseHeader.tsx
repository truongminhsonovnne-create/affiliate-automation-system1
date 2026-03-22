/**
 * Review Case Header
 *
 * Header component showing case metadata for detail page
 */

import React from 'react';
import type {
  ProductOpsCaseDetailModel,
  ProductOpsCaseSeverity,
} from '../../../features/productOps/types';
import { SEVERITY_CONFIG, STATUS_CONFIG } from '../../../features/productOps/constants';

interface ReviewCaseHeaderProps {
  caseDetail: ProductOpsCaseDetailModel;
}

export function ReviewCaseHeader({ caseDetail }: ReviewCaseHeaderProps) {
  const severityColor = SEVERITY_CONFIG.COLORS[caseDetail.severity];
  const severityLabel = SEVERITY_CONFIG.LABELS[caseDetail.severity];
  const statusColor = STATUS_CONFIG.COLORS[caseDetail.status];
  const statusLabel = STATUS_CONFIG.LABELS[caseDetail.status] || caseDetail.status;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      {/* Case Key & Title */}
      <div className="mb-4">
        <p className="text-sm text-gray-500">{caseDetail.caseKey}</p>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">
          {caseDetail.title}
        </h1>
      </div>

      {/* Meta Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Severity */}
        <Badge
          label={severityLabel}
          color={severityColor}
          bgColor={`${severityColor}15`}
        />

        {/* Status */}
        <Badge
          label={statusLabel}
          color={statusColor}
          bgColor={`${statusColor}15`}
        />

        {/* Assignee */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Assigned to:</span>
          <span className="font-medium">
            {caseDetail.assigneeName || 'Unassigned'}
          </span>
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-4 text-sm text-gray-500 ml-auto">
          <span>Created: {formatDate(caseDetail.createdAt)}</span>
          <span>Updated: {formatDate(caseDetail.updatedAt)}</span>
          {caseDetail.dueAt && (
            <span className="text-orange-600">
              Due: {formatDate(caseDetail.dueAt)}
            </span>
          )}
        </div>
      </div>

      {/* Stale Warning */}
      {caseDetail.isStale && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">
            ⚠️ This case is stale and requires attention
          </p>
        </div>
      )}
    </div>
  );
}

// Badge Component
function Badge({
  label,
  color,
  bgColor,
}: {
  label: string;
  color: string;
  bgColor: string;
}) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: bgColor, color }}
    >
      {label}
    </span>
  );
}

// Helper to format dates
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default ReviewCaseHeader;
