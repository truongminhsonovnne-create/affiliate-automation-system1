/**
 * Platform HTTP Error Handler Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';

export class PlatformError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'PlatformError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class PlatformNotFoundError extends PlatformError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'PlatformNotFoundError';
  }
}

export class PlatformValidationError extends PlatformError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'PlatformValidationError';
  }
}

export function platformErrorHandler(
  err: Error | PlatformError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({
    msg: 'Platform Error',
    error: err.message,
    name: err.name,
    code: (err as PlatformError).code,
  });

  if (err instanceof PlatformError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
}

export function platformNotFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
}
