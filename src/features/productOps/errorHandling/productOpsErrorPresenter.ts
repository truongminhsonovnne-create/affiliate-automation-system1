/**
 * Product Ops Error Presenter
 *
 * Maps backend errors to UX-friendly messages
 */

import { ERROR_MESSAGES } from '../constants';
import type { ProductOpsUiError } from '../types';

// ============================================================================
// Error Classification
// ============================================================================

export type ProductOpsErrorType =
  | 'permission_denied'
  | 'stale_state'
  | 'invalid_transition'
  | 'validation'
  | 'dependency'
  | 'audit_required'
  | 'not_found'
  | 'internal';

// ============================================================================
// Error Presenter
// ============================================================================

/**
 * Map backend error to UX-friendly presentation
 */
export function presentProductOpsError(error: unknown): ProductOpsUiError {
  // Handle string errors
  if (typeof error === 'string') {
    return {
      type: 'internal',
      message: error,
      retryable: true,
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    return mapErrorToPresentation(error);
  }

  // Handle structured errors
  if (isStructuredError(error)) {
    return mapStructuredError(error);
  }

  // Default fallback
  return {
    type: 'internal',
    message: ERROR_MESSAGES.INTERNAL_ERROR,
    retryable: true,
  };
}

/**
 * Map Error to presentation
 */
function mapErrorToPresentation(error: Error): ProductOpsUiError {
  const message = error.message.toLowerCase();

  // Permission errors
  if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
    return {
      type: 'permission_denied',
      message: ERROR_MESSAGES.PERMISSION_DENIED,
      code: 'PERMISSION_DENIED',
      retryable: false,
    };
  }

  // Stale state / conflict
  if (message.includes('stale') || message.includes('conflict') || message.includes('version')) {
    return {
      type: 'stale_state',
      message: ERROR_MESSAGES.STALE_STATE,
      code: 'STALE_STATE',
      retryable: true,
    };
  }

  // Invalid transition
  if (message.includes('transition') || message.includes('invalid status') || message.includes('cannot change')) {
    return {
      type: 'invalid_transition',
      message: ERROR_MESSAGES.INVALID_TRANSITION,
      code: 'INVALID_TRANSITION',
      retryable: false,
    };
  }

  // Validation errors
  if (message.includes('validation') || message.includes('invalid input') || message.includes('required')) {
    return {
      type: 'validation',
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: error.message,
      code: 'VALIDATION_ERROR',
      retryable: false,
    };
  }

  // Not found
  if (message.includes('not found') || message.includes('404') || message.includes('does not exist')) {
    return {
      type: 'not_found',
      message: ERROR_MESSAGES.NOT_FOUND,
      code: 'NOT_FOUND',
      retryable: false,
    };
  }

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return {
      type: 'dependency',
      message: ERROR_MESSAGES.NETWORK_ERROR,
      code: 'NETWORK_ERROR',
      retryable: true,
    };
  }

  // Default to internal
  return {
    type: 'internal',
    message: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
    code: 'INTERNAL_ERROR',
    retryable: true,
  };
}

/**
 * Map structured error response
 */
function mapStructuredError(error: {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}): ProductOpsUiError {
  const code = error.code?.toLowerCase() || '';

  // Permission
  if (code.includes('permission') || code.includes('unauthorized')) {
    return {
      type: 'permission_denied',
      message: error.message || ERROR_MESSAGES.PERMISSION_DENIED,
      code: error.code,
      details: error.details,
      retryable: false,
    };
  }

  // Stale state
  if (code.includes('stale') || code.includes('conflict') || code.includes('version')) {
    return {
      type: 'stale_state',
      message: error.message || ERROR_MESSAGES.STALE_STATE,
      code: error.code,
      details: error.details,
      retryable: true,
    };
  }

  // Invalid transition
  if (code.includes('transition') || code.includes('invalid_status')) {
    return {
      type: 'invalid_transition',
      message: error.message || ERROR_MESSAGES.INVALID_TRANSITION,
      code: error.code,
      details: error.details,
      retryable: false,
    };
  }

  // Validation
  if (code.includes('validation') || code.includes('invalid_input')) {
    return {
      type: 'validation',
      message: error.message || ERROR_MESSAGES.VALIDATION_FAILED,
      code: error.code,
      details: error.details,
      retryable: false,
    };
  }

  // Audit required
  if (code.includes('audit')) {
    return {
      type: 'audit_required',
      message: error.message || ERROR_MESSAGES.AUDIT_REQUIRED,
      code: error.code,
      details: error.details,
      retryable: false,
    };
  }

  // Not found
  if (code.includes('not_found') || code.includes('404')) {
    return {
      type: 'not_found',
      message: error.message || ERROR_MESSAGES.NOT_FOUND,
      code: error.code,
      retryable: false,
    };
  }

  // Default
  return {
    type: 'internal',
    message: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
    code: error.code,
    details: error.details,
    retryable: true,
  };
}

/**
 * Check if error is structured
 */
function isStructuredError(error: unknown): error is { code?: string; message?: string; details?: Record<string, unknown> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'message' in error)
  );
}

// ============================================================================
// Error Message Helpers
// ============================================================================

/**
 * Get user-friendly error title
 */
export function getErrorTitle(error: ProductOpsUiError): string {
  switch (error.type) {
    case 'permission_denied':
      return 'Permission Denied';
    case 'stale_state':
      return 'Out of Date';
    case 'invalid_transition':
      return 'Invalid Action';
    case 'validation':
      return 'Invalid Input';
    case 'dependency':
      return 'Connection Error';
    case 'audit_required':
      return 'Additional Information Required';
    case 'not_found':
      return 'Not Found';
    case 'internal':
    default:
      return 'Something Went Wrong';
  }
}

/**
 * Get error action label
 */
export function getErrorActionLabel(error: ProductOpsUiError): string | undefined {
  if (!error.retryable) return undefined;

  switch (error.type) {
    case 'stale_state':
      return 'Refresh';
    case 'dependency':
      return 'Try Again';
    case 'internal':
      return 'Try Again';
    default:
      return undefined;
  }
}

/**
 * Determine if error should show in toast
 */
export function shouldShowErrorInToast(error: ProductOpsUiError): boolean {
  // Don't show in toast for permission denied or not found
  return !['permission_denied', 'not_found'].includes(error.type);
}
