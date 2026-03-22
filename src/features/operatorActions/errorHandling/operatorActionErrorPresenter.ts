/**
 * Operator Actions - Error Presenter
 * Maps mutation errors to UX-friendly messages
 */

import type { OperatorActionError, OperatorActionErrorType } from '../types';
import { ERROR_MESSAGES } from '../constants';

/**
 * Present an operator action error to the user
 */
export function presentOperatorActionError(
  error: OperatorActionError,
  context?: {
    actionType?: string;
    targetId?: string;
  }
): {
  title: string;
  message: string;
  hints?: string[];
  retryable: boolean;
  showRefresh?: boolean;
} {
  // Build hints based on error type
  const hints = buildErrorHints(error, context);

  return {
    title: getErrorTitle(error.type),
    message: getErrorMessage(error),
    hints,
    retryable: error.retryable,
    showRefresh: shouldShowRefresh(error.type),
  };
}

/**
 * Build a summary of the error
 */
export function buildOperatorActionErrorSummary(
  error: OperatorActionError,
  context?: {
    actionType?: string;
    targetId?: string;
  }
): string {
  const { message } = presentOperatorActionError(error, context);
  return message;
}

// =============================================================================
// ERROR TITLE
// =============================================================================

function getErrorTitle(errorType: OperatorActionErrorType): string {
  switch (errorType) {
    case 'UNAUTHORIZED':
      return 'Not Authorized';
    case 'FORBIDDEN':
      return 'Permission Denied';
    case 'VALIDATION_ERROR':
      return 'Invalid Input';
    case 'CONFLICT':
      return 'Conflict';
    case 'NOT_FOUND':
      return 'Not Found';
    case 'DEPENDENCY_FAILURE':
      return 'Service Unavailable';
    case 'TIMEOUT':
      return 'Request Timeout';
    case 'RATE_LIMITED':
      return 'Too Many Requests';
    case 'UNSAFE_OPERATION':
      return 'Operation Blocked';
    default:
      return 'Error';
  }
}

// =============================================================================
// ERROR MESSAGE
// =============================================================================

function getErrorMessage(error: OperatorActionError): string {
  // If error has a custom message, use it
  if (error.message && !error.message.includes('Unexpected error')) {
    return error.message;
  }

  // Otherwise map from type
  switch (error.type) {
    case 'UNAUTHORIZED':
      return ERROR_MESSAGES.UNAUTHORIZED;
    case 'FORBIDDEN':
      return ERROR_MESSAGES.FORBIDDEN;
    case 'VALIDATION_ERROR':
      return ERROR_MESSAGES.VALIDATION_ERROR;
    case 'CONFLICT':
      return ERROR_MESSAGES.CONFLICT;
    case 'NOT_FOUND':
      return ERROR_MESSAGES.NOT_FOUND;
    case 'DEPENDENCY_FAILURE':
      return ERROR_MESSAGES.DEPENDENCY_FAILURE;
    case 'TIMEOUT':
      return ERROR_MESSAGES.TIMEOUT;
    case 'RATE_LIMITED':
      return ERROR_MESSAGES.RATE_LIMITED;
    case 'UNSAFE_OPERATION':
      return ERROR_MESSAGES.UNSAFE_OPERATION;
    default:
      return ERROR_MESSAGES.UNKNOWN_ERROR;
  }
}

// =============================================================================
// ERROR HINTS
// =============================================================================

function buildErrorHints(
  error: OperatorActionError,
  context?: { actionType?: string; targetId?: string }
): string[] {
  const hints: string[] = [];

  switch (error.type) {
    case 'UNAUTHORIZED':
      hints.push('Please log in and try again.');
      break;

    case 'FORBIDDEN':
      hints.push('Contact your administrator if you need access.');
      break;

    case 'CONFLICT':
      hints.push('The target has changed. Please refresh and try again.');
      break;

    case 'NOT_FOUND':
      if (context?.targetId) {
        hints.push('The target may have been deleted.');
      }
      break;

    case 'VALIDATION_ERROR':
      hints.push('Please check your input and try again.');
      break;

    case 'DEPENDENCY_FAILURE':
      hints.push('Please wait a moment and try again.');
      break;

    case 'TIMEOUT':
      hints.push('The operation is taking longer than expected.');
      break;

    case 'RATE_LIMITED':
      hints.push('Please wait before trying again.');
      break;

    case 'UNSAFE_OPERATION':
      hints.push('This operation cannot be performed at this time.');
      break;
  }

  return hints;
}

// =============================================================================
// HELPERS
// =============================================================================

function shouldShowRefresh(errorType: OperatorActionErrorType): boolean {
  // Show refresh option for errors that might be resolved by refreshing
  return [
    'CONFLICT',
    'NOT_FOUND',
    'DEPENDENCY_FAILURE',
    'INTERNAL_ERROR',
  ].includes(errorType);
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: OperatorActionError): string {
  return `[${error.type}] ${error.message}`;
}

/**
 * Check if error is retryable
 */
export function isErrorRetryable(error: OperatorActionError): boolean {
  return error.retryable;
}

/**
 * Get HTTP status from error
 */
export function getErrorStatusCode(error: OperatorActionError): number | undefined {
  return error.statusCode;
}
