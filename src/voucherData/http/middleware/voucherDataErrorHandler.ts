// =============================================================================
// Voucher Data Error Handler Middleware
// Production-grade error handler for voucher data API
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../../utils/logger.js';
import { ERROR_CODES } from '../constants.js';

export interface VoucherDataError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Handle voucher data errors
 */
export function handleVoucherDataError(error: Error, req: Request, res: Response, next: NextFunction): void {
  // Log error
  logger.error(
    {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    },
    'Voucher data API error'
  );

  // Handle known error types
  if (error.message.includes('not found') || error.message.includes('Source not found')) {
    res.status(404).json({
      error: {
        code: ERROR_CODES.CATALOG_NOT_FOUND,
        message: error.message,
      },
    });
    return;
  }

  if (error.message.includes('inactive')) {
    res.status(400).json({
      error: {
        code: ERROR_CODES.INGESTION_SOURCE_INACTIVE,
        message: error.message,
      },
    });
    return;
  }

  if (error.message.includes('validation')) {
    res.status(400).json({
      error: {
        code: ERROR_CODES.INGESTION_INVALID_PAYLOAD,
        message: error.message,
      },
    });
    return;
  }

  if (error.message.includes('rule') && error.message.includes('validation failed')) {
    res.status(400).json({
      error: {
        code: ERROR_CODES.RULE_VALIDATION_FAILED,
        message: error.message,
      },
    });
    return;
  }

  if (error.message.includes('rule') && error.message.includes('activation')) {
    res.status(400).json({
      error: {
        code: ERROR_CODES.RULE_ACTIVATION_FAILED,
        message: error.message,
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Handle Supabase errors
  if (error.message.includes('Supabase') || error.message.includes('database')) {
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database error occurred',
      },
    });
    return;
  }

  // Default to internal server error
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An internal error occurred'
        : error.message,
    },
  });
}

/**
 * Create a voucher data error
 */
export function createVoucherDataError(
  code: string,
  message: string,
  statusCode: number = 500,
  details?: unknown
): VoucherDataError {
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
export function handleNotFound(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
