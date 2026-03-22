/**
 * Platform Parity Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';

export interface ParityError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
}

/**
 * Global error handler for platform parity routes
 */
export function platformParityErrorHandler(
  err: ParityError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Platform Parity Error:', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle known error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized access',
      },
    });
    return;
  }

  if (err.name === 'ForbiddenError') {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access forbidden',
      },
    });
    return;
  }

  if (err.name === 'NotFoundError') {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: err.message,
      },
    });
    return;
  }

  // Handle database errors
  if (err.message?.includes('database') || err.message?.includes('supabase')) {
    res.status(503).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
    });
    return;
  }

  // Default to internal server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    return fn(req, res, next).catch(() => Promise.resolve(next));
  };
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
