/**
 * Operator Actions - Confirmation Dialog Component
 * Production-grade confirmation dialog with accessibility
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  OperatorActionConfirmationModel,
  OperatorActionSeverity,
} from '../types';
import {
  CONFIRMATION_VARIANTS,
} from '../constants';

// =============================================================================
// PROP TYPES
// =============================================================================

export interface ActionConfirmationDialogProps {
  /** Confirmation model */
  confirmation: OperatorActionConfirmationModel;

  /** Whether dialog is open */
  isOpen: boolean;

  /** Callback when dialog closes */
  onClose: () => void;

  /** Callback when confirmed */
  onConfirm: () => void | Promise<void>;

  /** Whether confirmation is loading */
  isLoading?: boolean;

  /** Custom confirm button label */
  confirmLabel?: string;

  /** Custom cancel button label */
  cancelLabel?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Production-grade confirmation dialog
 */
export function ActionConfirmationDialog({
  confirmation,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  confirmLabel,
  cancelLabel,
}: ActionConfirmationDialogProps) {
  const [typedText, setTypedText] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTypedText('');
      setIsConfirming(false);
    }
  }, [isOpen]);

  // Handle confirmation
  const handleConfirm = useCallback(async () => {
    // Check typing confirmation if required
    if (confirmation.requireTypingConfirmation) {
      if (typedText !== confirmation.typingConfirmationText) {
        return;
      }
    }

    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  }, [confirmation, typedText, onConfirm]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && !isLoading && canConfirm) {
        handleConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, handleConfirm, onClose]);

  // Determine if can confirm
  const canConfirm = isLoading
    ? false
    : confirmation.requireTypingConfirmation
      ? typedText === confirmation.typingConfirmationText
      : true;

  // Get variant based on severity
  const variant = getVariantBySeverity(confirmation.severity);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="confirmation-dialog-overlay" onClick={onClose}>
      <div
        className={`confirmation-dialog confirmation-dialog--${variant}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
      >
        {/* Header */}
        <div className="confirmation-dialog__header">
          <h2 id="confirmation-title" className="confirmation-dialog__title">
            {confirmation.title}
          </h2>
          <button
            className="confirmation-dialog__close"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isLoading}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="confirmation-dialog__body">
          {/* Summary */}
          <p className="confirmation-dialog__summary">{confirmation.summary}</p>

          {/* Description */}
          {confirmation.description && (
            <p id="confirmation-description" className="confirmation-dialog__description">
              {confirmation.description}
            </p>
          )}

          {/* Warnings */}
          {confirmation.warnings.length > 0 && (
            <div className="confirmation-dialog__section">
              <WarningList warnings={confirmation.warnings} />
            </div>
          )}

          {/* Consequences */}
          {confirmation.consequences.length > 0 && (
            <div className="confirmation-dialog__section">
              <ConsequenceList consequences={confirmation.consequences} />
            </div>
          )}

          {/* Target Metadata */}
          {confirmation.targetMetadata && (
            <div className="confirmation-dialog__section">
              <TargetMetadata metadata={confirmation.targetMetadata} />
            </div>
          )}

          {/* Typing Confirmation */}
          {confirmation.requireTypingConfirmation && (
            <div className="confirmation-dialog__section">
              <label className="confirmation-dialog__typing-label">
                Type <code>{confirmation.typingConfirmationText}</code> to confirm:
                <input
                  type="text"
                  className="confirmation-dialog__typing-input"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder={`Type "${confirmation.typingConfirmationText}"`}
                  autoFocus
                  disabled={isLoading}
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="confirmation-dialog__footer">
          <button
            className="confirmation-dialog__button confirmation-dialog__button--cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel ?? confirmation.cancelLabel}
          </button>
          <button
            className={`confirmation-dialog__button confirmation-dialog__button--confirm confirmation-dialog__button--${variant}`}
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
          >
            {isLoading || isConfirming ? (
              <LoadingSpinner />
            ) : (
              confirmLabel ?? confirmation.confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Warning list component */
function WarningList({ warnings }: { warnings: string[] }) {
  return (
    <div className="confirmation-dialog__warnings">
      <h4 className="confirmation-dialog__section-title">
        <WarningIcon /> Warnings
      </h4>
      <ul className="confirmation-dialog__list">
        {warnings.map((warning, index) => (
          <li key={index} className="confirmation-dialog__list-item confirmation-dialog__list-item--warning">
            {warning}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Consequence list component */
function ConsequenceList({ consequences }: { consequences: string[] }) {
  return (
    <div className="confirmation-dialog__consequences">
      <h4 className="confirmation-dialog__section-title">
        <InfoIcon /> What will happen
      </h4>
      <ul className="confirmation-dialog__list">
        {consequences.map((consequence, index) => (
          <li key={index} className="confirmation-dialog__list-item">
            {consequence}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Target metadata display */
function TargetMetadata({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata).filter(([, value]) => value !== undefined);

  if (entries.length === 0) return null;

  return (
    <div className="confirmation-dialog__metadata">
      <h4 className="confirmation-dialog__section-title">Target Details</h4>
      <dl className="confirmation-dialog__metadata-list">
        {entries.map(([key, value]) => (
          <div key={key} className="confirmation-dialog__metadata-item">
            <dt>{formatMetadataKey(key)}</dt>
            <dd>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getVariantBySeverity(severity: OperatorActionSeverity): string {
  return CONFIRMATION_VARIANTS[severity] ?? 'default';
}

function formatMetadataKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// =============================================================================
// ICONS (Inline SVG)
// =============================================================================

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 5L5 15M5 5l10 10" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.5l7 13H1L8 1.5zM7.5 9v3.5h1V9h-1zm0-4v1.5h1V5.5h-1z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7 4h2v5H7V4zm0 6h2v2H7v-2z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="loading-spinner" width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="40" strokeDashoffset="10" />
    </svg>
  );
}

export default ActionConfirmationDialog;
