/**
 * Operator Actions - Result Toast Component
 * Action feedback/toast pattern for success and error states
 */

import React, { useEffect, useState, useCallback } from 'react';
import type {
  OperatorActionFeedbackModel,
  OperatorActionType,
} from '../types';
import { TOAST_DURATION_MS, TOAST_PERSISTENT_TYPES, ACTION_LABELS } from '../constants';

// =============================================================================
// PROP TYPES
// =============================================================================

export interface ActionResultToastProps {
  /** Toast feedback model */
  feedback: OperatorActionFeedbackModel;

  /** Callback when toast is dismissed */
  onDismiss?: () => void;

  /** Callback when retry is clicked */
  onRetry?: () => void;

  /** Callback when refresh is clicked */
  onRefresh?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Toast component for action results
 */
export function ActionResultToast({
  feedback,
  onDismiss,
  onRetry,
  onRefresh,
}: ActionResultToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  // Auto-dismiss after duration (unless persistent)
  useEffect(() => {
    const isPersistent = TOAST_PERSISTENT_TYPES.includes(feedback.type as typeof TOAST_PERSISTENT_TYPES[number]);
    if (isPersistent) return;

    const duration = TOAST_DURATION_MS[feedback.type as keyof typeof TOAST_DURATION_MS] ?? TOAST_DURATION_MS.info;
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [feedback.type]);

  // Handle dismiss with animation
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 200);
  }, [onDismiss]);

  // Get icon by type
  const Icon = getIconByType(feedback.type);

  // Get action label
  const actionLabel = ACTION_LABELS[feedback.actionType] ?? feedback.actionType;

  return (
    <div
      className={`action-toast action-toast--${feedback.type} ${isVisible ? 'action-toast--visible' : ''} ${isExiting ? 'action-toast--exiting' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className="action-toast__icon">
        <Icon />
      </div>

      <div className="action-toast__content">
        <div className="action-toast__header">
          <span className="action-toast__title">{feedback.title}</span>
          <span className="action-toast__action">{actionLabel}</span>
        </div>

        <p className="action-toast__message">{feedback.message}</p>

        {/* Hints */}
        {feedback.hints && feedback.hints.length > 0 && (
          <ul className="action-toast__hints">
            {feedback.hints.map((hint, index) => (
              <li key={index}>{hint}</li>
            ))}
          </ul>
        )}

        {/* Action Buttons */}
        <div className="action-toast__actions">
          {feedback.showRetry && onRetry && (
            <button
              className="action-toast__button action-toast__button--retry"
              onClick={onRetry}
            >
              Retry
            </button>
          )}
          {feedback.showRefresh && onRefresh && (
            <button
              className="action-toast__button action-toast__button--refresh"
              onClick={onRefresh}
            >
              Refresh
            </button>
          )}
          <button
            className="action-toast__button action-toast__button--dismiss"
            onClick={handleDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>

      <button
        className="action-toast__close"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

// =============================================================================
// TOAST CONTAINER
// =============================================================================

export interface ToastContainerProps {
  /** Array of toasts to display */
  toasts: OperatorActionFeedbackModel[];

  /** Callback when toast is dismissed */
  onDismiss: (id: string) => void;

  /** Callback when retry is clicked */
  onRetry?: (actionType: OperatorActionType, targetId?: string) => void;

  /** Callback when refresh is clicked */
  onRefresh?: () => void;

  /** Position of toasts */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Container for multiple toasts
 */
export function ToastContainer({
  toasts,
  onDismiss,
  onRetry,
  onRefresh,
  position = 'top-right',
}: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={`toast-container toast-container--${position}`}>
      {toasts.map((toast) => (
        <ActionResultToast
          key={toast.timestamp.toISOString()}
          feedback={toast}
          onDismiss={() => onDismiss(toast.timestamp.toISOString())}
          onRetry={onRetry ? () => onRetry(toast.actionType, toast.targetId) : undefined}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

// =============================================================================
// TOAST BUILDER
// =============================================================================

/**
 * Build a success toast model
 */
export function buildSuccessToast(
  actionType: OperatorActionType,
  message: string,
  options?: {
    targetId?: string;
    hints?: string[];
    showRefresh?: boolean;
  }
): OperatorActionFeedbackModel {
  return {
    type: 'success',
    actionType,
    title: 'Success',
    message,
    hints: options?.hints,
    showRefresh: options?.showRefresh,
    targetId: options?.targetId,
    timestamp: new Date(),
  };
}

/**
 * Build an error toast model
 */
export function buildErrorToast(
  actionType: OperatorActionType,
  message: string,
  options?: {
    targetId?: string;
    hints?: string[];
    showRetry?: boolean;
    showRefresh?: boolean;
  }
): OperatorActionFeedbackModel {
  return {
    type: 'error',
    actionType,
    title: 'Error',
    message,
    hints: options?.hints,
    showRetry: options?.showRetry,
    showRefresh: options?.showRefresh,
    targetId: options?.targetId,
    timestamp: new Date(),
  };
}

/**
 * Build a warning toast model
 */
export function buildWarningToast(
  actionType: OperatorActionType,
  message: string,
  options?: {
    targetId?: string;
    hints?: string[];
  }
): OperatorActionFeedbackModel {
  return {
    type: 'warning',
    actionType,
    title: 'Warning',
    message,
    hints: options?.hints,
    targetId: options?.targetId,
    timestamp: new Date(),
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function getIconByType(type: string) {
  switch (type) {
    case 'success':
      return SuccessIcon;
    case 'error':
      return ErrorIcon;
    case 'warning':
      return WarningIcon;
    case 'info':
    default:
      return InfoIcon;
  }
}

// =============================================================================
// ICONS
// =============================================================================

function SuccessIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 6v4M10 13v1" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 2l8 14H2L10 2z" />
      <path d="M10 8v3M10 14v1" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 9v5M10 6.5v1" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4L4 12M4 4l8 8" strokeLinecap="round" />
    </svg>
  );
}

export default ActionResultToast;
