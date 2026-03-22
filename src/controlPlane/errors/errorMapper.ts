/**
 * Error Mapper
 *
 * Maps domain errors to standardized API errors.
 */

import type { AdminApiError } from '../types.js';
import { ERROR_CODES } from '../constants.js';

export type ErrorCategory =
  | 'validation'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'unsafe_operation'
  | 'dependency_failure'
  | 'internal';

/**
 * Map a domain error to a control plane API error
 */
export function mapControlPlaneError(
  error: unknown,
  context?: {
    actionType?: string;
    targetType?: string;
    targetId?: string;
  }
): AdminApiError {
  // Handle known error types
  if (error instanceof Error) {
    const errorCode = (error as any).code;

    // Validation errors
    if (
      errorCode === 'VALIDATION_ERROR' ||
      errorCode === 'INVALID_INPUT' ||
      error.message.includes('validation')
    ) {
      return {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: error.message,
      };
    }

    // Authorization errors
    if (
      errorCode === 'FORBIDDEN' ||
      errorCode === 'UNAUTHORIZED' ||
      errorCode === 'INSUFFICIENT_PERMISSION' ||
      error.message.includes('permission') ||
      error.message.includes('forbidden')
    ) {
      return {
        code: ERROR_CODES.FORBIDDEN,
        message: error.message,
      };
    }

    // Not found errors
    if (
      errorCode === 'NOT_FOUND' ||
      errorCode === 'TARGET_NOT_FOUND' ||
      error.message.includes('not found')
    ) {
      return {
        code: ERROR_CODES.NOT_FOUND,
        message: error.message,
      };
    }

    // Conflict errors
    if (
      errorCode === 'CONFLICT' ||
      errorCode === 'DUPLICATE_ACTION' ||
      errorCode === 'INVALID_STATE_TRANSITION' ||
      error.message.includes('conflict') ||
      error.message.includes('already')
    ) {
      return {
        code: ERROR_CODES.CONFLICT,
        message: error.message,
      };
    }

    // Safety errors
    if (
      errorCode === 'UNSAFE_OPERATION' ||
      errorCode === 'GUARD_REJECTED' ||
      errorCode === 'SAFETY_VIOLATION'
    ) {
      return {
        code: ERROR_CODES.UNSAFE_OPERATION,
        message: error.message,
      };
    }

    // Dependency failures
    if (
      errorCode === 'DEPENDENCY_FAILURE' ||
      errorCode === 'DATABASE_ERROR' ||
      errorCode === 'EXTERNAL_SERVICE_ERROR'
    ) {
      return {
        code: ERROR_CODES.DEPENDENCY_FAILURE,
        message: error.message,
      };
    }

    // Timeout errors
    if (
      errorCode === 'TIMEOUT' ||
      errorCode === 'ACTION_TIMEOUT' ||
      error.message.includes('timeout')
    ) {
      return {
        code: ERROR_CODES.TIMEOUT,
        message: error.message,
      };
    }

    // Default to internal error
    return {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: error.message,
    };
  }

  // Handle unknown errors
  return {
    code: ERROR_CODES.UNHANDLED_ERROR,
    message: String(error),
  };
}

/**
 * Build a control plane API error
 */
export function buildControlPlaneApiError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): AdminApiError {
  return {
    code,
    message,
    details,
  };
}

/**
 * Create validation error
 */
export function createValidationError(
  message: string,
  field?: string,
  details?: Record<string, unknown>
): AdminApiError {
  return buildControlPlaneApiError(ERROR_CODES.VALIDATION_ERROR, message, {
    ...details,
    field,
  });
}

/**
 * Create authorization error
 */
export function createAuthorizationError(message: string = 'Insufficient permissions'): AdminApiError {
  return buildControlPlaneApiError(ERROR_CODES.FORBIDDEN, message);
}

/**
 * Create not found error
 */
export function createNotFoundError(resource: string, id?: string): AdminApiError {
  return buildControlPlaneApiError(
    ERROR_CODES.NOT_FOUND,
    id ? `${resource} '${id}' not found` : `${resource} not found`
  );
}

/**
 * Create conflict error
 */
export function createConflictError(message: string): AdminApiError {
  return buildControlPlaneApiError(ERROR_CODES.CONFLICT, message);
}

/**
 * Create internal error
 */
export function createInternalError(message: string = 'Internal server error'): AdminApiError {
  return buildControlPlaneApiError(ERROR_CODES.INTERNAL_ERROR, message);
}

/**
 * Create timeout error
 */
export function createTimeoutError(message: string = 'Operation timed out'): AdminApiError {
  return buildControlPlaneApiError(ERROR_CODES.TIMEOUT, message);
}

/**
 * Create guard rejection error
 */
export function createGuardRejectionError(message: string, reason: string): AdminApiError {
  return buildControlPlaneApiError(ERROR_CODES.GUARD_REJECTED, message, { reason });
}

/**
 * Determine error category
 */
export function getErrorCategory(error: AdminApiError): ErrorCategory {
  switch (error.code) {
    case ERROR_CODES.VALIDATION_ERROR:
    case ERROR_CODES.INVALID_INPUT:
    case ERROR_CODES.MISSING_REQUIRED_FIELD:
    case ERROR_CODES.INVALID_FORMAT:
      return 'validation';

    case ERROR_CODES.FORBIDDEN:
    case ERROR_CODES.UNAUTHORIZED:
    case ERROR_CODES.INSUFFICIENT_PERMISSION:
      return 'authorization';

    case ERROR_CODES.NOT_FOUND:
    case ERROR_CODES.TARGET_NOT_FOUND:
      return 'not_found';

    case ERROR_CODES.CONFLICT:
    case ERROR_CODES.INVALID_STATE_TRANSITION:
    case ERROR_CODES.DUPLICATE_ACTION:
    case ERROR_CODES.ALREADY_IN_STATE:
      return 'conflict';

    case ERROR_CODES.UNSAFE_OPERATION:
    case ERROR_CODES.GUARD_REJECTED:
    case ERROR_CODES.SAFETY_VIOLATION:
      return 'unsafe_operation';

    case ERROR_CODES.DEPENDENCY_FAILURE:
    case ERROR_CODES.DATABASE_ERROR:
    case ERROR_CODES.EXTERNAL_SERVICE_ERROR:
      return 'dependency_failure';

    default:
      return 'internal';
  }
}
