/**
 * Operator Actions - Generic Action Button Component
 * Production-grade button with permission, guard, and loading awareness
 */

import React, { useState, useCallback, useMemo } from 'react';
import type {
  OperatorActionType,
  OperatorActor,
  OperatorActionButtonProps,
  OperatorActionPermissionState,
  OperatorActionContext,
} from '../types';
import {
  ACTION_LABELS,
  ACTION_DESCRIPTIONS,
} from '../constants';
import {
  buildOperatorActionPermissionState,
} from '../permissions/operatorActionPermissions';
import {
  checkAllGuards,
} from '../guards/operatorActionGuards';

// =============================================================================
// PROP TYPES
// =============================================================================

export interface OperatorActionButtonComponentProps
  extends Omit<OperatorActionButtonProps, 'actionType' | 'targetId' | 'targetState'> {
  /** Action type */
  actionType: OperatorActionButtonProps['actionType'];

  /** Target entity ID */
  targetId: OperatorActionButtonProps['targetId'];

  /** Current target state (for guard checks) */
  targetState?: OperatorActionButtonProps['targetState'];

  /** Current user/actor */
  actor: OperatorActor;

  /** Callback when button is clicked */
  onClick: () => void | Promise<void>;

  /** Custom permission state (if already computed) */
  permissionState?: OperatorActionPermissionState;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Production-grade operator action button
 */
export function OperatorActionButton({
  actionType,
  targetId,
  targetState,
  actor,
  onClick,
  variant = 'secondary',
  size = 'md',
  label,
  showIcon = true,
  disabledReason,
  className = '',
  loading: externalLoading,
  permissionState: providedPermissionState,
}: OperatorActionButtonComponentProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Compute permission state if not provided
  const permissionState = useMemo(() => {
    if (providedPermissionState) return providedPermissionState;

    return buildOperatorActionPermissionState(actor, actionType, {
      targetState,
    });
  }, [providedPermissionState, actor, actionType, targetState]);

  // Compute guard results
  const guardResults = useMemo(() => {
    if (!permissionState.canShow) return null;

    const context: OperatorActionContext = {
      actor,
      actionType,
      targetType: getTargetTypeFromAction(actionType),
      targetId,
      targetState,
    };

    return checkAllGuards(actionType, context);
  }, [permissionState.canShow, actor, actionType, targetId, targetState]);

  // Determine disabled state
  const isDisabled = !permissionState.canShow || !permissionState.canExecute || externalLoading || isLoading;

  // Determine disabled reason
  const finalDisabledReason = useMemo(() => {
    if (disabledReason) return disabledReason;
    if (!permissionState.canShow) return permissionState.reason;
    if (!permissionState.canExecute) return permissionState.reason;
    if (guardResults && !guardResults.passed) {
      return guardResults.results.find((r) => !r.passed)?.reason;
    }
    return undefined;
  }, [disabledReason, permissionState, guardResults]);

  // Handle click
  const handleClick = useCallback(async () => {
    if (isDisabled) return;

    setIsLoading(true);
    try {
      await onClick();
    } finally {
      setIsLoading(false);
    }
  }, [isDisabled, onClick]);

  // Get variant class
  const variantClass = getVariantClass(variant, permissionState.canExecute);

  // Get size class
  const sizeClass = getSizeClass(size);

  // Get label
  const buttonLabel = label ?? ACTION_LABELS[actionType] ?? actionType;

  // Get icon
  const Icon = showIcon ? getIconByActionType(actionType) : null;

  return (
    <button
      className={`operator-action-button ${variantClass} ${sizeClass} ${className} ${isDisabled ? 'operator-action-button--disabled' : ''}`}
      onClick={handleClick}
      disabled={isDisabled}
      title={finalDisabledReason ?? ACTION_DESCRIPTIONS[actionType]}
      aria-disabled={isDisabled}
      aria-label={buttonLabel}
    >
      {isLoading || externalLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {Icon && <span className="operator-action-button__icon"><Icon /></span>}
          <span className="operator-action-button__label">{buttonLabel}</span>
        </>
      )}

      {/* Guard Warnings Tooltip */}
      {guardResults && guardResults.allWarnings.length > 0 && !isDisabled && (
        <WarningTooltip warnings={guardResults.allWarnings} />
      )}
    </button>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Warning tooltip for guard warnings */
function WarningTooltip({ warnings }: { warnings: string[] }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      className="operator-action-button__warning-tooltip"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <WarningIcon />
      {isVisible && (
        <div className="operator-action-button__warning-dropdown">
          <strong>Warnings:</strong>
          <ul>
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getTargetTypeFromAction(actionType: OperatorActionType): string {
  switch (actionType) {
    case 'RETRY_PUBLISH_JOB':
    case 'CANCEL_PUBLISH_JOB':
    case 'UNLOCK_PUBLISH_JOB':
      return 'publish_job';
    case 'REQUEUE_DEAD_LETTER':
    case 'RESOLVE_DEAD_LETTER':
      return 'dead_letter';
    default:
      return 'pipeline';
  }
}

function getVariantClass(
  variant: 'primary' | 'secondary' | 'destructive' | 'ghost',
  canExecute: boolean
): string {
  if (variant === 'destructive') {
    return 'operator-action-button--destructive';
  }
  if (variant === 'primary') {
    return 'operator-action-button--primary';
  }
  if (variant === 'ghost') {
    return 'operator-action-button--ghost';
  }
  return 'operator-action-button--secondary';
}

function getSizeClass(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'operator-action-button--sm';
    case 'lg':
      return 'operator-action-button--lg';
    default:
      return 'operator-action-button--md';
  }
}

function getIconByActionType(actionType: OperatorActionType) {
  switch (actionType) {
    case 'RETRY_PUBLISH_JOB':
      return RetryIcon;
    case 'CANCEL_PUBLISH_JOB':
      return CancelIcon;
    case 'UNLOCK_PUBLISH_JOB':
      return UnlockIcon;
    case 'REQUEUE_DEAD_LETTER':
      return RequeueIcon;
    case 'RESOLVE_DEAD_LETTER':
      return ResolveIcon;
    case 'TRIGGER_FLASH_SALE_CRAWL':
    case 'TRIGGER_SEARCH_CRAWL':
      return CrawlIcon;
    case 'TRIGGER_AI_ENRICHMENT':
      return EnrichmentIcon;
    case 'TRIGGER_PUBLISH_PREPARATION':
      return PreparationIcon;
    case 'TRIGGER_PUBLISHER_RUN':
      return PublishIcon;
    default:
      return ActionIcon;
  }
}

// =============================================================================
// ICONS
// =============================================================================

function LoadingSpinner() {
  return (
    <svg className="loading-spinner" width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="30" strokeDashoffset="10" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 8a6 6 0 0110.5-3.5M14 8a6 6 0 01-10.5 3.5" strokeLinecap="round" />
      <path d="M2 4v4h4M14 12V8h-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M5 5l6 6M11 5l-6 6" strokeLinecap="round" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="7" width="10" height="7" rx="1" />
      <path d="M5 7V5a3 3 0 016 0v2" strokeLinecap="round" />
    </svg>
  );
}

function RequeueIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 8h12M12 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ResolveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrawlIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}

function EnrichmentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2L2 6l6 4 6-4-6-4zM2 10l6 4 6-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PreparationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M5 8h6M8 5v6" strokeLinecap="round" />
    </svg>
  );
}

function PublishIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2v8M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12v2h12v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ActionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v6M5 8h6" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 1l6 10.5H1L7 1zM6.5 5v3.5h1V5h-1zm0 4v1.5h1V9h-1z" />
    </svg>
  );
}

export default OperatorActionButton;
