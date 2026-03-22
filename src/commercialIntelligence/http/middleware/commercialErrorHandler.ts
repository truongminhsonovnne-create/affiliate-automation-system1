/**
 * Commercial Error Handler
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

/**
 * Commercial Error Handler Middleware
 */
export function commercialErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error({
    msg: 'Commercial intelligence error',
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Determine error type
  const isValidationError = err.message.includes('validation') || err.message.includes('invalid');
  const isNotFoundError = err.message.includes('not found');
  const isAuthError = err.message.includes('unauthorized') || err.message.includes('forbidden');

  const statusCode = isValidationError
    ? 400
    : isNotFoundError
    ? 404
    : isAuthError
    ? 403
    : 500;

  res.status(statusCode).json({
    success: false,
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Not Found Handler
 */
export function commercialNotFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
}

/**
 * Async Handler Wrapper
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
