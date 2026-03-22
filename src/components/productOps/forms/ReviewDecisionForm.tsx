/**
 * Review Decision Form
 *
 * Form component for submitting review decisions with validation
 */

import React, { useState } from 'react';
import { z } from 'zod';
import type {
  ProductOpsCaseDetailModel,
  ProductOpsDecisionType,
} from '../../../features/productOps/types';
import { DECISION_CONFIG_EXTENDED } from '../../../features/productOps/constants';

interface ReviewDecisionFormProps {
  caseDetail: ProductOpsCaseDetailModel;
  decisionType: ProductOpsDecisionType;
  onSubmit: (data: ReviewDecisionFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface ReviewDecisionFormData {
  rationale?: string;
  metadata?: Record<string, unknown>;
}

// Get schema based on decision type
function getDecisionSchema(decisionType: ProductOpsDecisionType) {
  const needsRationale = ['reject', 'needs_more_evidence', 'close'].includes(decisionType);

  return z.object({
    rationale: needsRationale
      ? z.string().min(DECISION_CONFIG_EXTENDED.RATIONALE_MIN_LENGTH, `Rationale must be at least ${DECISION_CONFIG_EXTENDED.RATIONALE_MIN_LENGTH} characters`)
        .max(DECISION_CONFIG_EXTENDED.RATIONALE_MAX_LENGTH, `Rationale must be less than ${DECISION_CONFIG_EXTENDED.RATIONALE_MAX_LENGTH} characters`)
      : z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  });
}

export function ReviewDecisionForm({
  caseDetail,
  decisionType,
  onSubmit,
  onCancel,
  isLoading,
}: ReviewDecisionFormProps) {
  const [rationale, setRationale] = useState('');
  const [errors, setErrors] = useState<{ rationale?: string }>({});

  const decisionLabels: Record<string, string> = {
    accept: 'Accept',
    reject: 'Reject',
    defer: 'Defer',
    needs_more_evidence: 'Need More Evidence',
    close: 'Close',
  };

  const decisionDescriptions: Record<string, string> = {
    accept: 'Approve this case and proceed with the recommendation',
    reject: 'Reject this case with the provided rationale',
    defer: 'Defer this case for later review',
    needs_more_evidence: 'Request additional evidence before making a decision',
    close: 'Close this case without resolution',
  };

  const needsRationale = ['reject', 'needs_more_evidence', 'close'].includes(decisionType);
  const isDangerous = ['reject', 'close'].includes(decisionType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const schema = getDecisionSchema(decisionType);
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
      <div className={`p-4 rounded-lg ${isDangerous ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
        <h3 className="font-medium text-gray-900">
          {decisionLabels[decisionType]}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {decisionDescriptions[decisionType]}
        </p>
      </div>

      {/* Case Info */}
      <div className="p-3 bg-gray-50 rounded-md">
        <p className="text-xs text-gray-500">Case</p>
        <p className="text-sm font-medium text-gray-900">
          {caseDetail.caseKey}: {caseDetail.title}
        </p>
      </div>

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
          placeholder={DECISION_CONFIG_EXTENDED.RATIONALE_PLACEHOLDER}
          disabled={isLoading}
        />
        {errors.rationale && (
          <p className="text-sm text-red-600 mt-1">{errors.rationale}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {rationale.length}/{DECISION_CONFIG_EXTENDED.RATIONALE_MAX_LENGTH}
        </p>
      </div>

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

export default ReviewDecisionForm;
