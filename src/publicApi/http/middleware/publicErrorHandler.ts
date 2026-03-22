// =============================================================================
// Public API HTTP Middleware - Error Handler
// Production-grade error handler for public API
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';

/**
 * Handle public API errors
 */
export function handlePublicApiError(error: Error, req: Request, res: Response, next: NextFunction): void {
  // Log error
  logger.error(
    {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    },
    'Public API error'
  );

  // Handle known error types
  if (error.message.includes('timeout')) {
    res.status(504).json({
      error: {
        code: 'TIMEOUT',
        message: 'Yêu cầu mất quá lâu. Vui lòng thử lại.',
      },
    });
    return;
  }

  if (error.message.includes('rate limit')) {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
      },
    });
    return;
  }

  // Default to internal server error
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
        : error.message,
    },
  });
}

/**
 * Not found handler for public API
 */
export function handlePublicApiNotFound(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} không tồn tại`,
    },
  });
}
