/**
 * Founder Cockpit HTTP Error Handler Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';

export interface FounderCockpitError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Create formatted error response
 */
export function createError(code: string, message: string, statusCode: number, details?: unknown): FounderCockpitError {
  return { code, message, statusCode, details };
}

/**
 * Not Found Error
 */
export class NotFoundError extends Error implements FounderCockpitError {
  code = 'NOT_FOUND';
  statusCode = 404;

  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

/**
 * Validation Error
 */
export class ValidationError extends Error implements FounderCockpitError {
  code = 'VALIDATION_ERROR';
  statusCode = 400;
  details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Bad Request Error
 */
export class BadRequestError extends Error implements FounderCockpitError {
  code = 'BAD_REQUEST';
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

/**
 * Unauthorized Error
 */
export class UnauthorizedError extends Error implements FounderCockpitError {
  code = 'UNAUTHORIZED';
  statusCode = 401;

  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden Error
 */
export class ForbiddenError extends Error implements FounderCockpitError {
  code = 'FORBIDDEN';
  statusCode = 403;

  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Internal Server Error
 */
export class InternalServerError extends Error implements FounderCockpitError {
  code = 'INTERNAL_ERROR';
  statusCode = 500;
  details: unknown;

  constructor(message = 'Internal server error', details?: unknown) {
    super(message);
    this.name = 'InternalServerError';
    this.details = details;
  }
}

/**
 * Service Unavailable Error
 */
export class ServiceUnavailableError extends Error implements FounderCockpitError {
  code = 'SERVICE_UNAVAILABLE';
  statusCode = 503;

  constructor(message = 'Service unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Error handler middleware
 */
export function founderCockpitErrorHandler(
  err: Error | FounderCockpitError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logger.error({
    msg: 'Founder Cockpit Error',
    error: err.message,
    name: err.name,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle known error types
  if (err instanceof NotFoundError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  if (err instanceof BadRequestError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof UnauthorizedError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof ForbiddenError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof ServiceUnavailableError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Handle generic errors
  const statusCode = (err as FounderCockpitError).statusCode || 500;
  const code = (err as FounderCockpitError).code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { details: (err as Error).stack }),
    },
  });
}

/**
 * Async error wrapper - catches async errors and passes to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler for unmatched routes
 */
export function founderCockpitNotFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
}

/**
 * Rate limit exceeded handler
 */
export function founderCockpitRateLimitHandler(_req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  });
}
