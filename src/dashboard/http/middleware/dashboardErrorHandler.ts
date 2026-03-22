/**
 * Dashboard Error Handler
 *
 * Normalizes dashboard API errors.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createLogger } from '../../../observability/logger/structuredLogger.js';

const logger = createLogger({ subsystem: 'dashboard_error_handler' });

/**
 * Dashboard error handler middleware
 */
export function dashboardErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const correlationId = (req as any).cpContext?.correlationId || 'unknown';

  // Log error
  logger.error('Dashboard error', err, {
    path: req.path,
    method: req.method,
    correlationId,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      ok: false,
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors[0]?.message || 'Invalid request',
        details: err.errors,
      },
      timestamp: new Date().toISOString(),
      correlationId,
    });
    return;
  }

  // Handle known error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      ok: false,
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
      timestamp: new Date().toISOString(),
      correlationId,
    });
    return;
  }

  if (err.name === 'NotFoundError') {
    res.status(404).json({
      ok: false,
      status: 'error',
      error: {
        code: 'NOT_FOUND',
        message: err.message,
      },
      timestamp: new Date().toISOString(),
      correlationId,
    });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      ok: false,
      status: 'error',
      error: {
        code: 'UNAUTHORIZED',
        message: err.message,
      },
      timestamp: new Date().toISOString(),
      correlationId,
    });
    return;
  }

  // Handle database errors
  if (err.message?.includes('database') || err.message?.includes('supabase')) {
    res.status(503).json({
      ok: false,
      status: 'error',
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
      },
      timestamp: new Date().toISOString(),
      correlationId,
    });
    return;
  }

  // Handle cache errors
  if (err.message?.includes('cache')) {
    res.status(500).json({
      ok: false,
      status: 'error',
      error: {
        code: 'CACHE_ERROR',
        message: 'Cache operation failed',
      },
      timestamp: new Date().toISOString(),
      correlationId,
    });
    return;
  }

  // Default to internal server error
  res.status(500).json({
    ok: false,
    status: 'error',
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
    timestamp: new Date().toISOString(),
    correlationId,
  });
}

/**
 * Not found handler for dashboard routes
 */
export function dashboardNotFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    status: 'error',
    error: {
      code: 'NOT_FOUND',
      message: `Route '${req.path}' not found`,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Async error wrapper for dashboard route handlers
 */
export function dashboardAsyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
