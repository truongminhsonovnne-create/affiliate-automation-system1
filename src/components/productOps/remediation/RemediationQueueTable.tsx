/**
 * Remediation Queue Table
 *
 * Data table for displaying remediation items in queue
 */

import React from 'react';
import type {
  ProductOpsRemediationQueueItem,
  ProductOpsRemediationStatus,
  ProductOpsRemediationRisk,
} from '../../../features/productOps/types';
import { REMEDIATION_STATUS_CONFIG, REMEDIATION_RISK_CONFIG } from '../../../features/productOps/constants';

interface RemediationQueueTableProps {
  items: ProductOpsRemediationQueueItem[];
  onRowClick?: (item: ProductOpsRemediationQueueItem) => void;
  selectedId?: string;
  isLoading?: boolean;
}

export function RemediationQueueTable({
  items,
  onRowClick,
  selectedId,
  isLoading,
}: RemediationQueueTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 border-b border-gray-200" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b border-gray-200 px-4 py-3">
              <div className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-4 bg-gray-200 rounded flex-1" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No remediation items found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Remediation ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Case
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Risk
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Assigned To
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedId === item.id ? 'bg-blue-50' : ''
              }`}
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {item.isHighPriority && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      High
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {item.remediationKey}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-sm text-gray-500">{item.caseKey}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <StatusBadge status={item.status} config={REMEDIATION_STATUS_CONFIG} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <RiskBadge risk={item.risk} config={REMEDIATION_RISK_CONFIG} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-sm text-gray-600">
                  {item.assigneeName || 'Unassigned'}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {item.dueAt ? (
                  <DueDateCell dueAt={item.dueAt} isOverdue={item.isOverdue} />
                ) : (
                  <span className="text-sm text-gray-400">No due date</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Status Badge Component
function StatusBadge({
  status,
  config,
}: {
  status: ProductOpsRemediationStatus;
  config: typeof REMEDIATION_STATUS_CONFIG;
}) {
  const color = config.COLORS[status] || 'bg-gray-100 text-gray-800';
  const label = config.LABELS[status] || status;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// Risk Badge Component
function RiskBadge({
  risk,
  config,
}: {
  risk: ProductOpsRemediationRisk;
  config: typeof REMEDIATION_RISK_CONFIG;
}) {
  const color = config.COLORS[risk] || 'bg-gray-100 text-gray-800';
  const label = config.LABELS[risk] || risk;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// Due Date Cell Component
function DueDateCell({ dueAt, isOverdue }: { dueAt: Date; isOverdue: boolean }) {
  const formatted = new Date(dueAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
      {formatted}
      {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
    </span>
  );
}

export default RemediationQueueTable;
