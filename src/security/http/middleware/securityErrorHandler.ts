/**
 * Security Layer - Security Error Handler
 * Normalize security-related errors
 */

import { SECURITY_ERROR_MESSAGES } from '../constants';

// =============================================================================
// ERROR TYPES
// =============================================================================

/** Security error codes */
export type SecurityErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'CSRF_FAILURE'
  | 'RATE_LIMITED'
  | 'INVALID_ORIGIN'
  | 'ENVIRONMENT_POLICY'
  | 'PERMISSION_DENIED';

/** Security error */
export interface SecurityError extends Error {
  code: SecurityErrorCode;
  statusCode: number;
  details?: Record<string, unknown>;
}

// =============================================================================
// ERROR FACTORIES
// =============================================================================

/**
 * Create security error
 */
export function createSecurityError(
  code: SecurityErrorCode,
  message?: string,
  details?: Record<string, unknown>
): SecurityError {
  const error = new Error(message ?? SECURITY_ERROR_MESSAGES[code]) as SecurityError;
  error.code = code;
  error.statusCode = getStatusCode(code);
  error.details = details;
  return error;
}

/**
 * Create unauthorized error
 */
export function createUnauthorizedError(message?: string): SecurityError {
  return createSecurityError('UNAUTHORIZED', message);
}

/**
 * Create forbidden error
 */
export function createForbiddenError(message?: string): SecurityError {
  return createSecurityError('FORBIDDEN', message);
}

/**
 * Create permission denied error
 */
export function createPermissionDeniedError(
  permission: string,
  resource?: string
): SecurityError {
  return createSecurityError(
    'PERMISSION_DENIED',
    `Permission denied: ${permission}${resource ? ` on ${resource}` : ''}`
  );
}

/**
 * Create token expired error
 */
export function createTokenExpiredError(): SecurityError {
  return createSecurityError('TOKEN_EXPIRED', SECURITY_ERROR_MESSAGES.TOKEN_EXPIRED);
}

/**
 * Create token invalid error
 */
export function createTokenInvalidError(): SecurityError {
  return createSecurityError('TOKEN_INVALID', SECURITY_ERROR_MESSAGES.TOKEN_INVALID);
}

/**
 * Create CSRF failure error
 */
export function createCSRFError(message?: string): SecurityError {
  return createSecurityError('CSRF_FAILURE', message ?? SECURITY_ERROR_MESSAGES.CSRF_FAILURE);
}

/**
 * Create rate limited error
 */
export function createRateLimitedError(retryAfter?: number): SecurityError {
  const error = createSecurityError('RATE_LIMITED', SECURITY_ERROR_MESSAGES.RATE_LIMITED);
  if (retryAfter) {
    error.details = { retryAfter };
  }
  return error;
}

/**
 * Create invalid origin error
 */
export function createInvalidOriginError(): SecurityError {
  return createSecurityError('INVALID_ORIGIN', SECURITY_ERROR_MESSAGES.INVALID_ORIGIN);
}

/**
 * Create environment policy error
 */
export function createEnvironmentPolicyError(operation: string): SecurityError {
  return createSecurityError(
    'ENVIRONMENT_POLICY',
    `${operation} is not allowed in current environment`
  );
}

// =============================================================================
// ERROR MAPPING
// =============================================================================

/**
 * Map error to security error
 */
export function mapToSecurityError(error: unknown): SecurityError {
  if (isSecurityError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('unauthorized') || message.includes('not authenticated')) {
      return createUnauthorizedError(error.message);
    }

    if (message.includes('forbidden') || message.includes('permission')) {
      return createPermissionDeniedError('unknown', 'unknown');
    }

    if (message.includes('token') && message.includes('expired')) {
      return createTokenExpiredError();
    }

    if (message.includes('token') && message.includes('invalid')) {
      return createTokenInvalidError();
    }
  }

  return createSecurityError('UNAUTHORIZED', 'Authentication required');
}

/**
 * Check if error is security error
 */
export function isSecurityError(error: unknown): error is SecurityError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'statusCode' in error
  );
}

// =============================================================================
// STATUS CODE MAPPING
// =============================================================================

/**
 * Get HTTP status code for security error code
 */
function getStatusCode(code: SecurityErrorCode): number {
  const mapping: Record<SecurityErrorCode, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    TOKEN_EXPIRED: 401,
    TOKEN_INVALID: 401,
    CSRF_FAILURE: 403,
    RATE_LIMITED: 429,
    INVALID_ORIGIN: 403,
    ENVIRONMENT_POLICY: 403,
    PERMISSION_DENIED: 403,
  };

  return mapping[code] ?? 500;
}

// =============================================================================
// RESPONSE FORMATTING
// =============================================================================

/**
 * Format security error for response
 */
export function formatSecurityErrorResponse(
  error: SecurityError,
  options?: {
    includeDetails?: boolean;
    includeCode?: boolean;
  }
): {
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  statusCode: number;
} {
  return {
    error: {
      message: error.message,
      code: options?.includeCode ? error.code : undefined,
      details: options?.includeDetails ? error.details : undefined,
    },
    statusCode: error.statusCode,
  };
}

/**
 * Handle security error in request handler
 */
export function handleSecurityError(
  error: unknown
): {
  error: { message: string };
  statusCode: number;
} {
  const securityError = mapToSecurityError(error);
  return formatSecurityErrorResponse(securityError, { includeCode: true });
}
