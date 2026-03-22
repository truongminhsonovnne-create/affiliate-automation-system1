/**
 * Review Queue Table
 *
 * Production-grade data table for review queue
 */

import React from 'react';
import type {
  ProductOpsCaseRowModel,
  ProductOpsCaseSeverity,
  ProductOpsCaseStatus,
} from '../../../features/productOps/types';
import { SEVERITY_CONFIG, STATUS_CONFIG, UI_CONFIG } from '../../../features/productOps/constants';

interface ReviewQueueTableProps {
  cases: ProductOpsCaseRowModel[];
  isLoading?: boolean;
  onRowClick?: (caseId: string) => void;
  selectedCaseId?: string;
}

export function ReviewQueueTable({
  cases,
  isLoading,
  onRowClick,
  selectedCaseId,
}: ReviewQueueTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 border-b" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No cases found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <HeaderCell>Case</HeaderCell>
            <HeaderCell>Type</HeaderCell>
            <HeaderCell>Severity</HeaderCell>
            <HeaderCell>Status</HeaderCell>
            <HeaderCell>Assignee</HeaderCell>
            <HeaderCell>Age</HeaderCell>
            <HeaderCell>Evidence</HeaderCell>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {cases.map((caseItem) => (
            <TableRow
              key={caseItem.id}
              caseItem={caseItem}
              isSelected={selectedCaseId === caseItem.id}
              onClick={() => onRowClick?.(caseItem.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Header Cell Component
function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      {children}
    </th>
  );
}

// Table Row Component
function TableRow({
  caseItem,
  isSelected,
  onClick,
}: {
  caseItem: ProductOpsCaseRowModel;
  isSelected: boolean;
  onClick: () => void;
}) {
  const severityColor = SEVERITY_CONFIG.COLORS[caseItem.severity] || '#6b7280';
  const statusColor = STATUS_CONFIG.COLORS[caseItem.status] || '#6b7280';
  const statusLabel = STATUS_CONFIG.LABELS[caseItem.status] || caseItem.status;

  return (
    <tr
      className={`cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-50'
          : 'hover:bg-gray-50'
      } ${caseItem.isStale ? 'bg-red-50' : ''}`}
      onClick={onClick}
    >
      {/* Case */}
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            {caseItem.title}
          </span>
          <span className="text-xs text-gray-500">
            {caseItem.caseKey}
          </span>
        </div>
      </td>

      {/* Type */}
      <td className="px-6 py-4">
        <span className="text-sm text-gray-600">
          {formatCaseType(caseItem.caseType)}
        </span>
      </td>

      {/* Severity */}
      <td className="px-6 py-4">
        <SeverityBadge severity={caseItem.severity} color={severityColor} />
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <StatusBadge status={caseItem.status} color={statusColor} label={statusLabel} />
      </td>

      {/* Assignee */}
      <td className="px-6 py-4">
        {caseItem.assigneeName ? (
          <span className="text-sm text-gray-600">{caseItem.assigneeName}</span>
        ) : (
          <span className="text-sm text-gray-400 italic">Unassigned</span>
        )}
      </td>

      {/* Age */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{caseItem.daysInQueue}d</span>
          {caseItem.isStale && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
              Stale
            </span>
          )}
        </div>
      </td>

      {/* Evidence */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600">{caseItem.evidenceCount}</span>
          {caseItem.hasRecommendation && (
            <span className="text-green-600" title="Has recommendation">
              ✓
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// Severity Badge Component
function SeverityBadge({
  severity,
  color,
}: {
  severity: ProductOpsCaseSeverity;
  color: string;
}) {
  const label = SEVERITY_CONFIG.LABELS[severity] || severity;

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      {label}
    </span>
  );
}

// Status Badge Component
function StatusBadge({
  status,
  color,
  label,
}: {
  status: ProductOpsCaseStatus;
  color: string;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      {label}
    </span>
  );
}

// Helper function to format case type
function formatCaseType(caseType: string): string {
  const labels: Record<string, string> = {
    voucher_quality: 'Voucher Quality',
    ranking_anomaly: 'Ranking Anomaly',
    no_match_escalation: 'No Match',
    copy_failure_analysis: 'Copy Failure',
    experiment_guardrail_breach: 'Guardrail',
    content_quality: 'Content',
    system_anomaly: 'System',
    manual_review: 'Manual',
  };

  return labels[caseType] || caseType;
}

export default ReviewQueueTable;
