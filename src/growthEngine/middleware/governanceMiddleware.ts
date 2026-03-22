/**
 * Growth Engine Middleware
 *
 * Express middleware for request validation and governance enforcement.
 */

import { Request, Response, NextFunction } from 'express';
import { GrowthSurfaceType, GrowthSurfaceStatus } from '../types';

export interface GrowthRequestContext {
  surfaceId?: string;
  surfaceType?: GrowthSurfaceType;
  action?: string;
  userRole?: string;
}

/**
 * Validate surface ID parameter
 */
export function validateSurfaceId(req: Request, res: Response, next: NextFunction): void {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Invalid surface ID',
    });
    return;
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    res.status(400).json({
      success: false,
      error: 'Surface ID must be a valid UUID',
    });
    return;
  }

  next();
}

/**
 * Validate surface type
 */
export function validateSurfaceType(req: Request, res: Response, next: NextFunction): void {
  const { surfaceType } = req.body;

  if (!surfaceType) {
    return next(); // Optional field
  }

  const validTypes = [
    'shop_page',
    'category_page',
    'intent_page',
    'tool_entry',
    'discovery_page',
    'ranking_page',
    'guide_page',
  ];

  if (!validTypes.includes(surfaceType)) {
    res.status(400).json({
      success: false,
      error: `Invalid surface type. Must be one of: ${validTypes.join(', ')}`,
    });
    return;
  }

  next();
}

/**
 * Validate pagination parameters
 */
export function validatePagination(req: Request, res: Response, next: NextFunction): void {
  const { limit, offset } = req.query;

  if (limit !== undefined) {
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100',
      });
      return;
    }
  }

  if (offset !== undefined) {
    const offsetNum = Number(offset);
    if (isNaN(offsetNum) || offsetNum < 0) {
      res.status(400).json({
        success: false,
        error: 'Offset must be >= 0',
      });
      return;
    }
  }

  next();
}

/**
 * Validate date range parameters
 */
export function validateDateRange(req: Request, res: Response, next: NextFunction): void {
  const { startDate, endDate } = req.query;

  if (startDate) {
    const start = new Date(startDate as string);
    if (isNaN(start.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid startDate format',
      });
      return;
    }
  }

  if (endDate) {
    const end = new Date(endDate as string);
    if (isNaN(end.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid endDate format',
      });
      return;
    }

    if (startDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      if (end < start) {
        res.status(400).json({
          success: false,
          error: 'endDate must be after startDate',
        });
        return;
      }
    }
  }

  next();
}

/**
 * Rate limiting - track requests per surface
 */
export function createRateLimiter(maxRequests: number = 100, windowMs: number = 60000) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    let record = requests.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      requests.set(key, record);
    }

    record.count++;

    if (record.count > maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}

/**
 * Add governance context to request
 */
export function addGovernanceContext(req: Request, res: Response, next: NextFunction): void {
  (req as any).governanceContext = {
    timestamp: new Date(),
    requestId: crypto.randomUUID(),
  };
  next();
}

/**
 * Error handling middleware
 */
export function governanceErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Growth Engine Error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId: (req as any).governanceContext?.requestId,
  });
}
