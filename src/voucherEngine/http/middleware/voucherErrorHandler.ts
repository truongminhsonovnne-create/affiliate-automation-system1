/**
 * Voucher Error Handler
 *
 * Normalizes errors for the voucher engine API.
 */

import { Request, Response, NextFunction } from 'express';
import { serializeError } from '../api/serializers';

/**
 * Error handler middleware
 */
export function voucherErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Voucher Engine Error:', err.message);

  // Determine error type and serialize accordingly
  const error = normalizeError(err);

  const response = serializeError(
    error.code,
    error.message,
    error.details,
    error.recoverable
  );

  const statusCode = error.recoverable ? 400 : 500;
  res.status(statusCode).json(response);
}

/**
 * Not found handler
 */
export function voucherNotFoundHandler(
  req: Request,
  res: Response
): void {
  const response = serializeError(
    'NOT_FOUND',
    'Endpoint not found',
    { path: req.path },
    false
  );

  res.status(404).json(response);
}

/**
 * Normalize error to standard format
 */
function normalizeError(err: Error): {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
} {
  const message = err.message;

  // Check for specific error patterns
  if (message.includes('INVALID_URL') || message.includes('Invalid URL')) {
    return {
      code: 'INVALID_URL',
      message: 'Invalid product URL provided',
      details: { originalError: message },
      recoverable: true,
    };
  }

  if (message.includes('UNSUPPORTED_PLATFORM') || message.includes('not supported')) {
    return {
      code: 'UNSUPPORTED_PLATFORM',
      message: 'Platform not supported for voucher resolution',
      details: { originalError: message },
      recoverable: true,
    };
  }

  if (message.includes('PRODUCT_RESOLUTION_FAILED')) {
    return {
      code: 'PRODUCT_RESOLUTION_FAILED',
      message: 'Failed to resolve product from URL',
      details: { originalError: message },
      recoverable: true,
    };
  }

  if (message.includes('CATALOG_LOAD_FAILED') || message.includes('catalog')) {
    return {
      code: 'CATALOG_LOAD_FAILED',
      message: 'Failed to load voucher catalog',
      details: { originalError: message },
      recoverable: false,
    };
  }

  if (message.includes('timeout') || message.includes('TIMEOUT')) {
    return {
      code: 'TIMEOUT',
      message: 'Resolution timed out',
      details: { originalError: message },
      recoverable: true,
    };
  }

  if (message.includes('cache') || message.includes('CACHE')) {
    return {
      code: 'CACHE_ERROR',
      message: 'Cache operation failed',
      details: { originalError: message },
      recoverable: true,
    };
  }

  // Default to internal error
  return {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? { originalError: message } : undefined,
    recoverable: false,
  };
}

/**
 * Async handler wrapper
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
