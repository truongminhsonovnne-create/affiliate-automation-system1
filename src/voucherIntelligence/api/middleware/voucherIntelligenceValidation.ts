/**
 * Voucher Intelligence Validation Middleware
 */

import type { Request, Response, NextFunction } from 'express';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate analyze request
 */
export function validateAnalyzeRequest(req: Request, res: Response, next: NextFunction): void {
  const errors: ValidationError[] = [];

  // Validate time window
  if (req.body.timeWindowStart) {
    const start = new Date(req.body.timeWindowStart);
    if (isNaN(start.getTime())) {
      errors.push({ field: 'timeWindowStart', message: 'Invalid date format' });
    }
  }

  if (req.body.timeWindowEnd) {
    const end = new Date(req.body.timeWindowEnd);
    if (isNaN(end.getTime())) {
      errors.push({ field: 'timeWindowEnd', message: 'Invalid date format' });
    }
  }

  // Validate platform
  if (req.body.platform) {
    const validPlatforms = ['shopee', 'tiktok', 'lazada'];
    if (!validPlatforms.includes(req.body.platform)) {
      errors.push({ field: 'platform', message: 'Invalid platform' });
    }
  }

  // Validate minSampleSize
  if (req.body.minSampleSize !== undefined) {
    if (typeof req.body.minSampleSize !== 'number' || req.body.minSampleSize < 1) {
      errors.push({ field: 'minSampleSize', message: 'Must be a positive number' });
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors,
      },
    });
    return;
  }

  next();
}

/**
 * Validate query params
 */
export function validateQueryParams(req: Request, res: Response, next: NextFunction): void {
  const errors: ValidationError[] = [];

  // Validate limit
  if (req.query.limit) {
    const limit = parseInt(req.query.limit as string, 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push({ field: 'limit', message: 'Must be between 1 and 100' });
    }
  }

  // Validate offset
  if (req.query.offset) {
    const offset = parseInt(req.query.offset as string, 10);
    if (isNaN(offset) || offset < 0) {
      errors.push({ field: 'offset', message: 'Must be a non-negative number' });
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Query validation failed',
        details: errors,
      },
    });
    return;
  }

  next();
}
