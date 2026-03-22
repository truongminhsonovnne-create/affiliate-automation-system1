/**
 * Voucher Intelligence Error Handler Middleware
 */

import type { Request, Response, NextFunction } from 'express';

export interface IntelligenceError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Handle errors
 */
export function voucherIntelligenceErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[VoucherIntelligence] Error:', err);

  // Determine error type
  const error = err as IntelligenceError;

  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(error.details && { details: error.details }),
    },
  });
}

/**
 * Create error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, unknown>
): IntelligenceError {
  return {
    code,
    message,
    statusCode,
    details,
  };
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
