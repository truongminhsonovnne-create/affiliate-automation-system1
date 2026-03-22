/**
 * Founder Cockpit HTTP Validation Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';

/**
 * Validate date range query parameters
 */
export function validateDateRangeQuery(req: Request, res: Response, next: NextFunction): void {
  const { startDate, endDate } = req.query;

  if (startDate || endDate) {
    const start = startDate ? new Date(startDate as string) : null;
    const end = endDate ? new Date(endDate as string) : null;

    if (start && isNaN(start.getTime())) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'Invalid startDate format' },
      });
      return;
    }

    if (end && isNaN(end.getTime())) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'Invalid endDate format' },
      });
      return;
    }

    if (start && end && start > end) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE_RANGE', message: 'startDate must be before endDate' },
      });
      return;
    }
  }

  next();
}

/**
 * Validate UUID path parameter
 */
export function validateUuidParam(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!value || !uuidRegex.test(value)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: `Invalid ${paramName} format` },
      });
      return;
    }

    next();
  };
}

/**
 * Validate pagination query parameters
 */
export function validatePagination(req: Request, res: Response, next: NextFunction): void {
  const { limit, offset } = req.query;

  if (limit) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_LIMIT', message: 'Limit must be between 1 and 100' },
      });
      return;
    }
  }

  if (offset) {
    const offsetNum = parseInt(offset as string, 10);
    if (isNaN(offsetNum) || offsetNum < 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_OFFSET', message: 'Offset must be >= 0' },
      });
      return;
    }
  }

  next();
}

/**
 * Validate decision status enum
 */
export function validateDecisionStatus(req: Request, res: Response, next: NextFunction): void {
  const { status, severity } = req.query;
  const validStatuses = ['pending', 'resolved', 'deferred'];
  const validSeverities = ['low', 'medium', 'high', 'critical'];

  if (status && !validStatuses.includes(status as string)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` },
    });
    return;
  }

  if (severity && !validSeverities.includes(severity as string)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_SEVERITY', message: `Severity must be one of: ${validSeverities.join(', ')}` },
    });
    return;
  }

  next();
}

/**
 * Validate followup status enum
 */
export function validateFollowupStatus(req: Request, res: Response, next: NextFunction): void {
  const { status, priority } = req.query;
  const validStatuses = ['pending', 'in_progress', 'completed'];
  const validPriorities = ['low', 'medium', 'high', 'critical'];

  if (status && !validStatuses.includes(status as string)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` },
    });
    return;
  }

  if (priority && !validPriorities.includes(priority as string)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PRIORITY', message: `Priority must be one of: ${validPriorities.join(', ')}` },
    });
    return;
  }

  next();
}

/**
 * Validate create review request body
 */
export function validateRunWeeklyReviewBody(req: Request, res: Response, next: NextFunction): void {
  const { startDate, endDate } = req.body;

  if (!startDate && !endDate) {
    // Both optional - will use defaults
    return next();
  }

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'Invalid startDate format' },
      });
      return;
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'Invalid endDate format' },
      });
      return;
    }
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_DATE_RANGE', message: 'startDate must be before endDate' },
    });
    return;
  }

  next();
}

/**
 * Validate resolve decision request body
 */
export function validateResolveDecisionBody(req: Request, res: Response, next: NextFunction): void {
  const { resolution, resolvedBy, action } = req.body;
  const validActions = ['approved', 'rejected', 'deferred'];

  if (!resolution || typeof resolution !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELD', message: 'resolution is required' },
    });
    return;
  }

  if (!resolvedBy || typeof resolvedBy !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELD', message: 'resolvedBy is required' },
    });
    return;
  }

  if (action && !validActions.includes(action)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ACTION', message: `action must be one of: ${validActions.join(', ')}` },
    });
    return;
  }

  next();
}

/**
 * Validate update followup request body
 */
export function validateUpdateFollowupBody(req: Request, res: Response, next: NextFunction): void {
  const { status, assignedTo, dueAt } = req.body;

  if (status !== undefined) {
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` },
      });
      return;
    }
  }

  if (dueAt !== undefined) {
    const due = new Date(dueAt);
    if (isNaN(due.getTime())) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'Invalid dueAt format' },
      });
      return;
    }
  }

  next();
}

/**
 * Sanitize query parameters - remove empty strings
 */
export function sanitizeQueryParams(req: Request, _res: Response, next: NextFunction): void {
  for (const [key, value] of Object.entries(req.query)) {
    if (value === '') {
      delete req.query[key];
    }
  }
  next();
}

/**
 * Log request summary
 */
export function logRequestSummary(req: Request, _res: Response, next: NextFunction): void {
  logger.debug({
    msg: 'Founder Cockpit Request',
    method: req.method,
    path: req.path,
    query: req.query,
  });
  next();
}
