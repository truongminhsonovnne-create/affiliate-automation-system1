/**
 * Product Governance Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';

export interface GovernanceError {
  type: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export function governanceErrorHandler(
  err: Error | GovernanceError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Governance Error]', err);

  // Handle known error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation failed',
      message: err.message,
    });
    return;
  }

  if (err.name === 'NotFoundError') {
    res.status(404).json({
      error: 'Resource not found',
      message: err.message,
    });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      error: 'Unauthorized',
      message: err.message,
    });
    return;
  }

  // Default internal server error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
}
