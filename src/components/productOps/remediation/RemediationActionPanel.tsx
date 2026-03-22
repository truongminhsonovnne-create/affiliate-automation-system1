/**
 * Remediation Action Panel
 *
 * Action buttons for remediation decisions with permission awareness
 */

import React from 'react';
import type {
  ProductOpsRemediationDetailModel,
  ProductOpsRemediationActionModel,
} from '../../../features/productOps/types';

interface RemediationActionPanelProps {
  remediation: ProductOpsRemediationDetailModel;
  canApprove: boolean;
  canReject: boolean;
  canMarkExecuted: boolean;
  approveDisabledReason?: string;
  rejectDisabledReason?: string;
  executedDisabledReason?: string;
  isLoading?: boolean;
  onApproveClick: () => void;
  onRejectClick: () => void;
  onMarkExecutedClick: () => void;
}

export function RemediationActionPanel({
  remediation,
  canApprove,
  canReject,
  canMarkExecuted,
  approveDisabledReason,
  rejectDisabledReason,
  executedDisabledReason,
  isLoading,
  onApproveClick,
  onRejectClick,
  onMarkExecutedClick,
}: RemediationActionPanelProps) {
  const actions = getRemediationActions(
    remediation,
    canApprove,
    canReject,
    canMarkExecuted,
    approveDisabledReason,
    rejectDisabledReason,
    executedDisabledReason
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-medium text-gray-900">
          Actions
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Take action on this remediation
        </p>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <RemediationActionButton
              key={action.type}
              action={action}
              isLoading={isLoading}
              onClick={() => action.onClick()}
            />
          ))}
        </div>

        {/* Permission Notice */}
        {!canApprove && !canReject && !canMarkExecuted && (
          <p className="text-sm text-gray-500 mt-4">
            You do not have permission to take action on this remediation
          </p>
        )}
      </div>
    </div>
  );
}

// Action Button Component
function RemediationActionButton({
  action,
  isLoading,
  onClick,
}: {
  action: ProductOpsRemediationActionModel;
  isLoading?: boolean;
  onClick: () => void;
}) {
  const buttonStyles = getRemediationButtonStyles(action);

  return (
    <button
      onClick={onClick}
      disabled={action.disabled || isLoading}
      className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${buttonStyles} ${
        action.disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      title={action.disabledReason}
    >
      {isLoading ? 'Processing...' : action.label}
    </button>
  );
}

// Get button styles based on action type
function getRemediationButtonStyles(action: ProductOpsRemediationActionModel): string {
  if (action.disabled) {
    return 'bg-gray-100 text-gray-400';
  }

  switch (action.type) {
    case 'approve':
      return 'bg-green-600 text-white hover:bg-green-700';
    case 'reject':
      return 'bg-red-600 text-white hover:bg-red-700';
    case 'mark_executed':
      return 'bg-blue-600 text-white hover:bg-blue-700';
    default:
      return 'bg-gray-200 text-gray-700 hover:bg-gray-300';
  }
}

// Build action list based on remediation state and permissions
function getRemediationActions(
  remediation: ProductOpsRemediationDetailModel,
  canApprove: boolean,
  canReject: boolean,
  canMarkExecuted: boolean,
  approveDisabledReason?: string,
  rejectDisabledReason?: string,
  executedDisabledReason?: string
): (ProductOpsRemediationActionModel & { onClick: () => void })[] {
  const { status } = remediation;
  const actions: (ProductOpsRemediationActionModel & { onClick: () => void })[] = [];

  // Pending remediations can be approved or rejected
  if (status === 'pending') {
    actions.push({
      type: 'approve',
      label: 'Approve',
      description: 'Approve this remediation plan',
      requiresRationale: false,
      requiresConfirmation: false,
      disabled: !canApprove,
      disabledReason: approveDisabledReason,
      isDangerous: false,
      onClick: () => {}, // Will be replaced by parent
    });

    actions.push({
      type: 'reject',
      label: 'Reject',
      description: 'Reject this remediation plan',
      requiresRationale: true,
      requiresConfirmation: false,
      disabled: !canReject,
      disabledReason: rejectDisabledReason,
      isDangerous: true,
      onClick: () => {},
    });
  }

  // Approved remediations can be marked as executed
  if (status === 'approved') {
    actions.push({
      type: 'mark_executed',
      label: 'Mark as Executed',
      description: 'Confirm remediation has been executed',
      requiresRationale: false,
      requiresConfirmation: true,
      disabled: !canMarkExecuted,
      disabledReason: executedDisabledReason,
      isDangerous: false,
      onClick: () => {},
    });
  }

  // Rejected and executed remediations are read-only
  return actions;
}

export default RemediationActionPanel;
