/**
 * Dashboard Query Validation Middleware
 *
 * Validates query parameters for dashboard endpoints.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function validateDashboardQuery(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        ...req.query,
        ...req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          ok: false,
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid query parameters',
            details: error.errors,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Parse and validate time range from query
 */
export function parseTimeRange(req: Request, res: Response, next: NextFunction): void {
  const { timeRange, customStart, customEnd } = req.query;

  // If custom time range provided, validate it
  if (customStart && customEnd) {
    const start = new Date(customStart as string);
    const end = new Date(customEnd as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        ok: false,
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid custom time range dates',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (start >= end) {
      res.status(400).json({
        ok: false,
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Start date must be before end date',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  next();
}

/**
 * Sanitize pagination parameters
 */
export function sanitizePagination(req: Request, res: Response, next: NextFunction): void {
  const { page, pageSize } = req.query;

  // Ensure page is a positive integer
  if (page !== undefined) {
    const parsedPage = parseInt(page as string, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      req.query.page = '1';
    } else {
      req.query.page = String(parsedPage);
    }
  }

  // Clamp page size between 1 and 100
  if (pageSize !== undefined) {
    const parsedSize = parseInt(pageSize as string, 10);
    if (isNaN(parsedSize) || parsedSize < 1) {
      req.query.pageSize = '20';
    } else if (parsedSize > 100) {
      req.query.pageSize = '100';
    } else {
      req.query.pageSize = String(parsedSize);
    }
  }

  next();
}
