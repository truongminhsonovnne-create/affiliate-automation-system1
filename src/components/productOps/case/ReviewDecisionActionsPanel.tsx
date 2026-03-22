/**
 * Review Decision Actions Panel
 *
 * Safe decision action panel with permission-aware buttons
 */

import React from 'react';
import type {
  ProductOpsCaseDetailModel,
  ProductOpsDecisionActionModel,
  ProductOpsDecisionType,
} from '../../../features/productOps/types';

interface ReviewDecisionActionsPanelProps {
  caseDetail: ProductOpsCaseDetailModel;
  canReview: boolean;
  reviewDisabledReason?: string;
  isLoading?: boolean;
  onDecisionClick: (decisionType: ProductOpsDecisionType) => void;
}

export function ReviewDecisionActionsPanel({
  caseDetail,
  canReview,
  reviewDisabledReason,
  isLoading,
  onDecisionClick,
}: ReviewDecisionActionsPanelProps) {
  const actions = getDecisionActions(caseDetail, canReview, reviewDisabledReason);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-medium text-gray-900">
          Actions
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Make a decision on this case
        </p>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <DecisionButton
              key={action.type}
              action={action}
              isLoading={isLoading}
              onClick={() => onDecisionClick(action.type)}
            />
          ))}
        </div>

        {!canReview && (
          <p className="text-sm text-gray-500 mt-4">
            {reviewDisabledReason || 'You do not have permission to review this case'}
          </p>
        )}
      </div>
    </div>
  );
}

// Decision Button Component
function DecisionButton({
  action,
  isLoading,
  onClick,
}: {
  action: ProductOpsDecisionActionModel;
  isLoading?: boolean;
  onClick: () => void;
}) {
  const buttonStyles = getButtonStyles(action);

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
function getButtonStyles(action: ProductOpsDecisionActionModel): string {
  if (action.disabled) {
    return 'bg-gray-100 text-gray-400';
  }

  switch (action.type) {
    case 'accept':
      return 'bg-green-600 text-white hover:bg-green-700';
    case 'reject':
      return 'bg-red-600 text-white hover:bg-red-700';
    case 'defer':
      return 'bg-yellow-500 text-white hover:bg-yellow-600';
    case 'needs_more_evidence':
      return 'bg-blue-600 text-white hover:bg-blue-700';
    case 'close':
      return 'bg-gray-600 text-white hover:bg-gray-700';
    default:
      return 'bg-gray-200 text-gray-700 hover:bg-gray-300';
  }
}

// Build decision actions based on case state
function getDecisionActions(
  caseDetail: ProductOpsCaseDetailModel,
  canReview: boolean,
  reviewDisabledReason?: string
): ProductOpsDecisionActionModel[] {
  const terminalStatuses = ['accepted', 'rejected', 'closed'];
  const isTerminal = terminalStatuses.includes(caseDetail.status);

  if (isTerminal) {
    return [
      {
        type: 'close' as ProductOpsDecisionType,
        label: 'Close',
        description: 'Archive this case',
        requiresRationale: false,
        requiresConfirmation: true,
        disabled: !canReview,
        disabledReason: reviewDisabledReason,
        isDangerous: false,
      },
    ];
  }

  return [
    {
      type: 'accept' as ProductOpsDecisionType,
      label: 'Accept',
      description: 'Approve and proceed',
      requiresRationale: false,
      requiresConfirmation: false,
      disabled: !canReview,
      disabledReason: reviewDisabledReason,
      isDangerous: false,
    },
    {
      type: 'reject' as ProductOpsDecisionType,
      label: 'Reject',
      description: 'Reject this case',
      requiresRationale: true,
      requiresConfirmation: true,
      disabled: !canReview,
      disabledReason: reviewDisabledReason,
      isDangerous: true,
    },
    {
      type: 'defer' as ProductOpsDecisionType,
      label: 'Defer',
      description: 'Defer for later',
      requiresRationale: false,
      requiresConfirmation: false,
      disabled: !canReview,
      disabledReason: reviewDisabledReason,
      isDangerous: false,
    },
    {
      type: 'needs_more_evidence' as ProductOpsDecisionType,
      label: 'Need More Evidence',
      description: 'Request additional information',
      requiresRationale: true,
      requiresConfirmation: false,
      disabled: !canReview,
      disabledReason: reviewDisabledReason,
      isDangerous: false,
    },
    {
      type: 'close' as ProductOpsDecisionType,
      label: 'Close',
      description: 'Archive without resolution',
      requiresRationale: true,
      requiresConfirmation: true,
      disabled: !canReview,
      disabledReason: reviewDisabledReason,
      isDangerous: true,
    },
  ];
}

export default ReviewDecisionActionsPanel;
