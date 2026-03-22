/**
 * Review Decision Dialog
 *
 * Confirmation dialog with rationale input for review decisions
 */

import React, { useState, useEffect } from 'react';
import type {
  ProductOpsCaseDetailModel,
  ProductOpsDecisionType,
  ProductOpsDecisionActionModel,
} from '../../../features/productOps/types';
import { DECISION_CONFIG } from '../../../features/productOps/constants';

interface ReviewDecisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ReviewDecisionDialogData) => Promise<void>;
  caseDetail: ProductOpsCaseDetailModel;
  decisionType: ProductOpsDecisionType;
  action: ProductOpsDecisionActionModel;
  isLoading?: boolean;
}

export interface ReviewDecisionDialogData {
  rationale?: string;
  confirmation?: string;
}

export function ReviewDecisionDialog({
  isOpen,
  onClose,
  onConfirm,
  caseDetail,
  decisionType,
  action,
  isLoading,
}: ReviewDecisionDialogProps) {
  const [rationale, setRationale] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const config = DECISION_CONFIG[decisionType];
  const needsRationale = action.requiresRationale;
  const needsConfirmation = action.requiresConfirmation;
  const confirmationText = config?.confirmationText || `close ${caseDetail.caseKey}`;

  // Reset form when dialog opens/closes or decision type changes
  useEffect(() => {
    if (isOpen) {
      setRationale('');
      setConfirmation('');
      setError(null);
    }
  }, [isOpen, decisionType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate rationale if required
    if (needsRationale && !rationale.trim()) {
      setError('Please provide a rationale for this decision');
      return;
    }

    // Validate confirmation if required
    if (needsConfirmation && confirmation.toLowerCase() !== confirmationText.toLowerCase()) {
      setError(`Please type "${confirmationText}" to confirm`);
      return;
    }

    try {
      await onConfirm({
        rationale: rationale.trim() || undefined,
        confirmation: confirmation.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {config?.label || decisionType}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {config?.description || action.description}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4">
              {/* Case Info */}
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500">Case</p>
                <p className="text-sm font-medium text-gray-900">
                  {caseDetail.caseKey}: {caseDetail.title}
                </p>
              </div>

              {/* Rationale Input */}
              {needsRationale && (
                <div>
                  <label htmlFor="rationale" className="block text-sm font-medium text-gray-700 mb-1">
                    Rationale <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="rationale"
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Explain the reasoning behind this decision..."
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required for audit trail
                  </p>
                </div>
              )}

              {/* Confirmation Input */}
              {needsConfirmation && (
                <div>
                  <label htmlFor="confirmation" className="block text-sm font-medium text-gray-700 mb-1">
                    Type <code className="bg-gray-100 px-1 rounded">{confirmationText}</code> to confirm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="confirmation"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Type confirmation text..."
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* Warning for Dangerous Actions */}
              {action.isDangerous && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">
                    ⚠️ This action cannot be easily undone. Please ensure you have reviewed all evidence carefully.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : config?.label || 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ReviewDecisionDialog;
