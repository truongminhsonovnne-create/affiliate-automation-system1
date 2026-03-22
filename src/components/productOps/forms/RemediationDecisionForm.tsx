/**
 * Remediation Decision Form
 *
 * Form component for submitting remediation decisions with validation
 */

import React, { useState } from 'react';
import { z } from 'zod';
import type { ProductOpsRemediationDetailModel } from '../../../features/productOps/types';
import { DECISION_CONFIG_EXTENDED } from '../../../features/productOps/constants';

interface RemediationDecisionFormProps {
  remediation: ProductOpsRemediationDetailModel;
  decisionType: 'approve' | 'reject';
  onSubmit: (data: RemediationDecisionFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface RemediationDecisionFormData {
  rationale?: string;
  metadata?: Record<string, unknown>;
}

// Get schema based on decision type
function getRemediationDecisionSchema(decisionType: 'approve' | 'reject') {
  const needsRationale = decisionType === 'reject';

  return z.object({
    rationale: needsRationale
      ? z.string().min(DECISION_CONFIG_EXTENDED.RATIONALE_MIN_LENGTH, `Rationale must be at least ${DECISION_CONFIG_EXTENDED.RATIONALE_MIN_LENGTH} characters`)
        .max(DECISION_CONFIG_EXTENDED.RATIONALE_MAX_LENGTH, `Rationale must be less than ${DECISION_CONFIG_EXTENDED.RATIONALE_MAX_LENGTH} characters`)
      : z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  });
}

export function RemediationDecisionForm({
  remediation,
  decisionType,
  onSubmit,
  onCancel,
  isLoading,
}: RemediationDecisionFormProps) {
  const [rationale, setRationale] = useState('');
  const [errors, setErrors] = useState<{ rationale?: string }>({});

  const decisionLabels = {
    approve: 'Approve',
    reject: 'Reject',
  };

  const decisionDescriptions = {
    approve: 'Approve this remediation plan and allow execution',
    reject: 'Reject this remediation plan with the provided rationale',
  };

  const needsRationale = decisionType === 'reject';
  const isDangerous = decisionType === 'reject';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const schema = getRemediationDecisionSchema(decisionType);
    const result = schema.safeParse({ rationale });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        rationale: fieldErrors.rationale?.[0],
      });
      return;
    }

    setErrors({});

    try {
      await onSubmit({
        rationale: rationale.trim() || undefined,
      });
    } catch (error) {
      // Error handling is done by parent
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Decision Info */}
      <div className={`p-4 rounded-lg ${isDangerous ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
        <h3 className="font-medium text-gray-900">
          {decisionLabels[decisionType]}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {decisionDescriptions[decisionType]}
        </p>
      </div>

      {/* Remediation Info */}
      <div className="p-3 bg-gray-50 rounded-md">
        <p className="text-xs text-gray-500">Remediation</p>
        <p className="text-sm font-medium text-gray-900">
          {remediation.remediationKey}: {remediation.title}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Related to case: {remediation.caseKey}
        </p>
      </div>

      {/* Risk Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Risk Level:</span>
        <RiskBadge risk={remediation.risk} />
      </div>

      {/* Required Actions */}
      {remediation.requiredActions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Required Actions</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {remediation.requiredActions.map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Rationale Input */}
      <div>
        <label htmlFor="rationale" className="block text-sm font-medium text-gray-700 mb-1">
          Rationale
          {needsRationale && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          id="rationale"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={4}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
            errors.rationale ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder={needsRationale ? 'Explain why this remediation is being rejected...' : 'Optional notes...'}
          disabled={isLoading}
        />
        {errors.rationale && (
          <p className="text-sm text-red-600 mt-1">{errors.rationale}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {rationale.length}/{DECISION_CONFIG_EXTENDED.RATIONALE_MAX_LENGTH}
        </p>
      </div>

      {/* Warning for Rejection */}
      {isDangerous && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">
            ⚠️ Rejecting this remediation will prevent its execution. Please ensure you have reviewed the plan carefully.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${
            isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Processing...' : decisionLabels[decisionType]}
        </button>
      </div>
    </form>
  );
}

// Risk Badge Component
function RiskBadge({ risk }: { risk: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[risk] || colors.medium}`}>
      {risk.charAt(0).toUpperCase() + risk.slice(1)}
    </span>
  );
}

export default RemediationDecisionForm;
