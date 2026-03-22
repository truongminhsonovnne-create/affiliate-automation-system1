/**
 * Commercial Validation Middleware
 */

import type { Request, Response, NextFunction } from 'express';

export interface DateRangeValidation {
  valid: boolean;
  startDate?: Date;
  endDate?: Date;
  error?: string;
}

/**
 * Validate date range from query params
 */
export function validateDateRange(query: Record<string, unknown>): DateRangeValidation {
  const startDateStr = query.startDate as string | undefined;
  const endDateStr = query.endDate as string | undefined;

  if (!startDateStr || !endDateStr) {
    return {
      valid: false,
      error: 'startDate and endDate are required',
    };
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (isNaN(startDate.getTime())) {
    return {
      valid: false,
      error: 'Invalid startDate format',
    };
  }

  if (isNaN(endDate.getTime())) {
    return {
      valid: false,
      error: 'Invalid endDate format',
    };
  }

  if (startDate > endDate) {
    return {
      valid: false,
      error: 'startDate must be before endDate',
    };
  }

  // Limit range to 90 days
  const maxRange = 90 * 24 * 60 * 60 * 1000;
  if (endDate.getTime() - startDate.getTime() > maxRange) {
    return {
      valid: false,
      error: 'Date range cannot exceed 90 days',
    };
  }

  return {
    valid: true,
    startDate,
    endDate,
  };
}

/**
 * Validate pagination params
 */
export function validatePagination(query: Record<string, unknown>): {
  valid: boolean;
  page?: number;
  limit?: number;
  error?: string;
} {
  const page = parseInt(query.page as string);
  const limit = parseInt(query.limit as string);

  if (query.page && isNaN(page)) {
    return { valid: false, error: 'Invalid page parameter' };
  }

  if (query.limit && isNaN(limit)) {
    return { valid: false, error: 'Invalid limit parameter' };
  }

  return {
    valid: true,
    page: page || 1,
    limit: Math.min(limit || 20, 100),
  };
}

/**
 * Validate UUID
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Express middleware for date range validation
 */
export function dateRangeMiddleware(req: Request, res: Response, next: NextFunction): void {
  const validation = validateDateRange(req.query);

  if (!validation.valid) {
    res.status(400).json({
      success: false,
      error: validation.error,
    });
    return;
  }

  (req as any).validatedDateRange = {
    startDate: validation.startDate!,
    endDate: validation.endDate!,
  };

  next();
}
