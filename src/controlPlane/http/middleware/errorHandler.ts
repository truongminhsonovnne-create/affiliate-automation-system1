/**
 * Error Handler Middleware
 *
 * Normalizes API errors and builds consistent error responses.
 */

import type { Request, Response, NextFunction } from 'express';
import { AdminApiResponse } from '../../types.js';
import { mapControlPlaneError } from '../../errors/errorMapper.js';
import { createResponseBuilder } from '../../contracts.js';
import { createLogger } from '../../../observability/logger/structuredLogger.js';

const logger = createLogger({ subsystem: 'control_plane_error_handler' });

/**
 * Express error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const correlationId = req.cpContext?.correlationId || 'unknown';
  const requestId = req.cpContext?.requestId || 'unknown';

  // Log error
  logger.error('Request error', err, {
    correlationId,
    requestId,
    path: req.path,
    method: req.method,
  });

  // Map error to API error
  const apiError = mapControlPlaneError(err, {
    actionType: req.cpContext?.correlationId,
  });

  // Build response
  const response = createResponseBuilder(correlationId, requestId).error(apiError);

  // Set status code based on error type
  const statusCode = getStatusCode(apiError.code);
  res.status(statusCode).json(response);
}

/**
 * Get HTTP status code from error code
 */
function getStatusCode(errorCode: string): number {
  switch (errorCode) {
    case 'VALIDATION_ERROR':
    case 'INVALID_INPUT':
    case 'MISSING_REQUIRED_FIELD':
    case 'INVALID_FORMAT':
      return 400;

    case 'FORBIDDEN':
    case 'UNAUTHORIZED':
    case 'INSUFFICIENT_PERMISSION':
      return 403;

    case 'NOT_FOUND':
    case 'TARGET_NOT_FOUND':
      return 404;

    case 'CONFLICT':
    case 'DUPLICATE_ACTION':
    case 'INVALID_STATE_TRANSITION':
    case 'ALREADY_IN_STATE':
      return 409;

    case 'UNSAFE_OPERATION':
    case 'GUARD_REJECTED':
    case 'SAFETY_VIOLATION':
      return 422;

    case 'TIMEOUT':
    case 'ACTION_TIMEOUT':
      return 504;

    case 'DEPENDENCY_FAILURE':
    case 'DATABASE_ERROR':
    case 'EXTERNAL_SERVICE_ERROR':
      return 503;

    default:
      return 500;
  }
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const correlationId = req.cpContext?.correlationId || 'unknown';
  const requestId = req.cpContext?.requestId || 'unknown';

  const response = createResponseBuilder(correlationId, requestId).notFound('Route', req.path);

  res.status(404).json(response);
}

/**
 * Async error wrapper
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
