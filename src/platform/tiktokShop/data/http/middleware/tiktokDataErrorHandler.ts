/**
 * TikTok Shop Data Error Handler Middleware
 * Normalizes errors for TikTok Shop data APIs
 */

import { Request, Response, NextFunction } from 'express';

export interface TikTokDataError {
  code: number;
  message: string;
  details?: unknown;
  timestamp: string;
}

/**
 * Handle TikTok Shop data errors
 */
export function handleTikTokDataError(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const timestamp = new Date().toISOString();

  // Log error for debugging
  console.error(`[TikTokDataError] ${timestamp}`, {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
  });

  // Determine error type and status code
  let statusCode = 500;
  let message = 'Internal server error';

  if (error.message.includes('not found') || error.message.includes('does not exist')) {
    statusCode = 404;
    message = error.message;
  } else if (error.message.includes('validation') || error.message.includes('invalid')) {
    statusCode = 400;
    message = error.message;
  } else if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
    statusCode = 403;
    message = 'Access denied';
  } else if (error.message.includes('timeout') || error.message.includes('timeout')) {
    statusCode = 504;
    message = 'Gateway timeout';
  }

  const errorResponse: TikTokDataError = {
    code: statusCode,
    message,
    timestamp,
  };

  // Add details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      path: req.path,
      method: req.method,
      stack: error.stack,
    };
  }

  res.status(statusCode).json({
    error: errorResponse,
  });
}

/**
 * Handle async route errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create not found handler
 */
export function createNotFoundHandler() {
  return (req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 404,
        message: `Route not found: ${req.method} ${req.path}`,
        timestamp: new Date().toISOString(),
      },
    });
  };
}

/**
 * Create health check error handler
 */
export function handleHealthCheckError(error: Error): {
  status: 'unhealthy';
  error: string;
  timestamp: string;
} {
  return {
    status: 'unhealthy',
    error: error.message,
    timestamp: new Date().toISOString(),
  };
}
