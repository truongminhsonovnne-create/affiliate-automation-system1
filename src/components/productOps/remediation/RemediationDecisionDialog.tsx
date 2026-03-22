/**
 * Remediation Decision Dialog
 *
 * Confirmation dialog for remediation actions
 */

import React, { useState, useEffect } from 'react';
import type {
  ProductOpsRemediationDetailModel,
  ProductOpsRemediationActionModel,
} from '../../../features/productOps/types';

interface RemediationDecisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: RemediationDecisionDialogData) => Promise<void>;
  remediation: ProductOpsRemediationDetailModel;
  action: ProductOpsRemediationActionModel;
  isLoading?: boolean;
}

export interface RemediationDecisionDialogData {
  rationale?: string;
  confirmation?: string;
}

export function RemediationDecisionDialog({
  isOpen,
  onClose,
  onConfirm,
  remediation,
  action,
  isLoading,
}: RemediationDecisionDialogProps) {
  const [rationale, setRationale] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const needsRationale = action.requiresRationale;
  const needsConfirmation = action.requiresConfirmation;
  const confirmationText = action.type;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setRationale('');
      setConfirmation('');
      setError(null);
    }
  }, [isOpen]);

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
              {action.label}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {action.description}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4">
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
                    ⚠️ This action cannot be easily undone. Please ensure you have reviewed the remediation plan carefully.
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
                {isLoading ? 'Processing...' : action.label}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RemediationDecisionDialog;
