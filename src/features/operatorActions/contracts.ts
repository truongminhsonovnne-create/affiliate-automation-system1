/**
 * Operator Actions - API Contracts
 * Request/Response normalization between frontend and control plane
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  OperatorActionType,
  OperatorActionMutationInput,
  OperatorActionMutationResult,
  OperatorActionError,
  OperatorActionApiResponse,
  OperatorActionContext,
} from './types';
import { OPERATOR_ACTION_ERRORS } from './types';
import {
  ACTION_TIMEOUT_BY_TYPE,
  ACTION_TIMEOUT_MS,
} from './constants';

/**
 * Build a standardized operator action request
 */
export function buildOperatorActionRequest(
  actionType: OperatorActionType,
  targetId: string,
  options?: {
    payload?: Record<string, unknown>;
    reason?: string;
    correlationId?: string;
    timeout?: number;
  }
): RequestInit & { url: string; timeout: number } {
  const correlationId = options?.correlationId ?? uuidv4();
  const timeout = options?.timeout ?? ACTION_TIMEOUT_BY_TYPE[actionType] ?? ACTION_TIMEOUT_MS;

  return {
    url: `/api/operator-actions/${actionType.toLowerCase().replace(/_/g, '-')}`,
    method: 'POST',
    timeout,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
    body: JSON.stringify({
      actionType,
      targetId,
      payload: options?.payload ?? {},
      reason: options?.reason,
      correlationId,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Normalize operator action response from API
 */
export function normalizeOperatorActionResponse<T = unknown>(
  response: Response,
  actionType: OperatorActionType,
  correlationId?: string
): OperatorActionApiResponse<OperatorActionMutationResult> {
  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return {
      error: {
        code: 'INVALID_RESPONSE',
        message: 'Invalid response from server',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: correlationId ?? uuidv4(),
        correlationId,
      },
    };
  }

  // Parse JSON
  let data: unknown;
  try {
    data = response.json();
  } catch {
    return {
      error: {
        code: 'PARSE_ERROR',
        message: 'Failed to parse server response',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: correlationId ?? uuidv4(),
        correlationId,
      },
    };
  }

  // Validate response structure
  if (!isValidResponseStructure(data)) {
    return {
      error: {
        code: 'INVALID_STRUCTURE',
        message: 'Response has invalid structure',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: correlationId ?? uuidv4(),
        correlationId,
      },
    };
  }

  // Handle error responses
  if (!response.ok || data.error) {
    const errorType = mapHttpStatusToErrorType(response.status);
    return {
      error: {
        code: data.error?.code ?? errorType,
        message: data.error?.message ?? getDefaultErrorMessage(response.status),
        details: data.error?.details,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: data.metadata?.requestId ?? correlationId ?? uuidv4(),
        correlationId: data.metadata?.correlationId ?? correlationId,
      },
    };
  }

  // Success response
  return {
    data: {
      success: true,
      actionType,
      targetId: data.data?.targetId ?? '',
      message: data.data?.message,
      updatedState: data.data?.updatedState,
      correlationId: data.metadata?.correlationId ?? correlationId,
      timestamp: data.metadata?.timestamp ? new Date(data.metadata.timestamp) : new Date(),
    },
    metadata: {
      timestamp: data.metadata?.timestamp ?? new Date().toISOString(),
      requestId: data.metadata?.requestId ?? uuidv4(),
      correlationId: data.metadata?.correlationId ?? correlationId,
    },
  };
}

/**
 * Map operator action error to user-friendly presentation
 */
export function mapOperatorActionError(
  error: unknown,
  context?: Partial<OperatorActionContext>
): OperatorActionError {
  // Handle Response errors from fetch
  if (error instanceof Response) {
    return {
      type: mapHttpStatusToErrorType(error.status),
      message: getDefaultErrorMessage(error.status),
      retryable: isRetryableHttpStatus(error.status),
      statusCode: error.status,
    };
  }

  // Handle typed OperatorActionError
  if (isOperatorActionError(error)) {
    return error;
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return {
        type: OPERATOR_ACTION_ERRORS.INTERNAL_ERROR,
        message: 'Network error. Please check your connection.',
        originalError: error,
        context: context as Record<string, unknown>,
        retryable: true,
      };
    }

    if (message.includes('timeout')) {
      return {
        type: OPERATOR_ACTION_ERRORS.TIMEOUT,
        message: 'The operation took too long. Please try again.',
        originalError: error,
        context: context as Record<string, unknown>,
        retryable: true,
      };
    }

    return {
      type: OPERATOR_ACTION_ERRORS.INTERNAL_ERROR,
      message: error.message,
      originalError: error,
      context: context as Record<string, unknown>,
      retryable: false,
    };
  }

  // Handle unknown errors
  return {
    type: OPERATOR_ACTION_ERRORS.INTERNAL_ERROR,
    message: 'An unexpected error occurred.',
    context: context as Record<string, unknown>,
    retryable: false,
  };
}

/**
 * Build error from API response
 */
export function buildErrorFromApiResponse(
  response: OperatorActionApiResponse<unknown>
): OperatorActionError {
  const errorCode = response.error?.code ?? 'UNKNOWN';
  const errorMessage = response.error?.message ?? 'An unknown error occurred';

  return {
    type: mapErrorCodeToErrorType(errorCode),
    message: errorMessage,
    context: response.error?.details,
    retryable: isRetryableErrorCode(errorCode),
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Validate response structure
 */
function isValidResponseStructure(data: unknown): data is {
  data?: {
    success?: boolean;
    targetId?: string;
    message?: string;
    updatedState?: Record<string, unknown>;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    timestamp?: string;
    requestId?: string;
    correlationId?: string;
  };
} {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Must have either data or error
  if (!obj.data && !obj.error) {
    return false;
  }

  return true;
}

/**
 * Check if error is OperatorActionError
 */
function isOperatorActionError(error: unknown): error is OperatorActionError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const obj = error as Record<string, unknown>;

  return (
    typeof obj.type === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.retryable === 'boolean'
  );
}

/**
 * Map HTTP status to error type
 */
function mapHttpStatusToErrorType(status: number): OperatorActionError['type'] {
  switch (status) {
    case 401:
      return OPERATOR_ACTION_ERRORS.UNAUTHORIZED;
    case 403:
      return OPERATOR_ACTION_ERRORS.FORBIDDEN;
    case 404:
      return OPERATOR_ACTION_ERRORS.NOT_FOUND;
    case 409:
      return OPERATOR_ACTION_ERRORS.CONFLICT;
    case 422:
      return OPERATOR_ACTION_ERRORS.VALIDATION_ERROR;
    case 429:
      return OPERATOR_ACTION_ERRORS.RATE_LIMITED;
    case 500:
    case 502:
    case 503:
      return OPERATOR_ACTION_ERRORS.INTERNAL_ERROR;
    case 504:
      return OPERATOR_ACTION_ERRORS.TIMEOUT;
    default:
      return OPERATOR_ACTION_ERRORS.INTERNAL_ERROR;
  }
}

/**
 * Map error code to error type
 */
function mapErrorCodeToErrorType(code: string): OperatorActionError['type'] {
  const codeUpper = code.toUpperCase();

  if (codeUpper.includes('UNAUTHORIZED')) return OPERATOR_ACTION_ERRORS.UNAUTHORIZED;
  if (codeUpper.includes('FORBIDDEN')) return OPERATOR_ACTION_ERRORS.FORBIDDEN;
  if (codeUpper.includes('VALIDATION')) return OPERATOR_ACTION_ERRORS.VALIDATION_ERROR;
  if (codeUpper.includes('CONFLICT')) return OPERATOR_ACTION_ERRORS.CONFLICT;
  if (codeUpper.includes('NOT_FOUND')) return OPERATOR_ACTION_ERRORS.NOT_FOUND;
  if (codeUpper.includes('DEPENDENCY')) return OPERATOR_ACTION_ERRORS.DEPENDENCY_FAILURE;
  if (codeUpper.includes('TIMEOUT')) return OPERATOR_ACTION_ERRORS.TIMEOUT;
  if (codeUpper.includes('RATE_LIMIT')) return OPERATOR_ACTION_ERRORS.RATE_LIMITED;
  if (codeUpper.includes('UNSAFE')) return OPERATOR_ACTION_ERRORS.UNSAFE_OPERATION;

  return OPERATOR_ACTION_ERRORS.INTERNAL_ERROR;
}

/**
 * Check if HTTP status is retryable
 */
function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/**
 * Check if error code is retryable
 */
function isRetryableErrorCode(code: string): boolean {
  const codeUpper = code.toUpperCase();
  return (
    codeUpper.includes('TIMEOUT') ||
    codeUpper.includes('RATE_LIMIT') ||
    codeUpper.includes('DEPENDENCY') ||
    codeUpper.includes('NETWORK')
  );
}

/**
 * Get default error message for HTTP status
 */
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'You are not authenticated. Please log in.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'The resource has been modified. Please refresh and try again.';
    case 422:
      return 'The request could not be processed. Please check your input.';
    case 429:
      return 'Too many requests. Please wait before trying again.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
      return 'Service unavailable. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    case 504:
      return 'Request timed out. Please try again.';
    default:
      return 'An unexpected error occurred.';
  }
}

/**
 * Validate mutation input
 */
export function validateMutationInput(
  input: OperatorActionMutationInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.actionType) {
    errors.push('Action type is required');
  }

  if (!input.targetId) {
    errors.push('Target ID is required');
  }

  if (input.targetId && !isValidUUID(input.targetId)) {
    errors.push('Target ID must be a valid UUID');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if string is valid UUID
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
