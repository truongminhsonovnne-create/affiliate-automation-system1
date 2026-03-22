/**
 * Remediation Detail Panel
 *
 * Detailed view of a remediation item with all relevant information
 */

import React from 'react';
import type {
  ProductOpsRemediationDetailModel,
  ProductOpsRemediationStatus,
  ProductOpsRemediationRisk,
} from '../../../features/productOps/types';
import { REMEDIATION_STATUS_CONFIG, REMEDIATION_RISK_CONFIG } from '../../../features/productOps/constants';

interface RemediationDetailPanelProps {
  remediation: ProductOpsRemediationDetailModel;
}

export function RemediationDetailPanel({ remediation }: RemediationDetailPanelProps) {
  const statusConfig = REMEDIATION_STATUS_CONFIG;
  const riskConfig = REMEDIATION_RISK_CONFIG;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              {remediation.remediationKey}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Related to case: {remediation.caseKey}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={remediation.status} config={statusConfig} />
            <RiskBadge risk={remediation.risk} config={riskConfig} />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {remediation.description}
        </p>
      </div>

      {/* Required Actions */}
      {remediation.requiredActions.length > 0 && (
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Required Actions</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {remediation.requiredActions.map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Execution Plan */}
      {remediation.executionPlan && (
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Execution Plan</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {remediation.executionPlan}
          </p>
        </div>
      )}

      {/* Verification Steps */}
      {remediation.verificationSteps.length > 0 && (
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Verification Steps</h3>
          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
            {remediation.verificationSteps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Metadata */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Assigned to:</span>{' '}
            <span className="text-gray-900 font-medium">
              {remediation.assigneeName || 'Unassigned'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Created:</span>{' '}
            <span className="text-gray-900">
              {formatDate(remediation.createdAt)}
            </span>
          </div>
          {remediation.dueAt && (
            <div>
              <span className="text-gray-500">Due:</span>{' '}
              <span className={remediation.isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}>
                {formatDate(remediation.dueAt)}
                {remediation.isOverdue && ' (Overdue)'}
              </span>
            </div>
          )}
          {remediation.executedAt && (
            <div>
              <span className="text-gray-500">Executed:</span>{' '}
              <span className="text-gray-900">
                {formatDate(remediation.executedAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Related Evidence */}
      {remediation.relatedEvidence && remediation.relatedEvidence.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Related Evidence</h3>
          <ul className="space-y-2">
            {remediation.relatedEvidence.map((evidence, index) => (
              <li key={index} className="text-sm">
                <a
                  href={evidence.link}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {evidence.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Execution Notes */}
      {remediation.executionNotes && (
        <div className="border-t border-gray-200 px-4 py-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Execution Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {remediation.executionNotes}
          </p>
        </div>
      )}
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

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default RemediationDetailPanel;
