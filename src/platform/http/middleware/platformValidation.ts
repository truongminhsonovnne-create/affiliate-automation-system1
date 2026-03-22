/**
 * Platform HTTP Validation Middleware
 */

import type { Request, Response, NextFunction } from 'express';

export function validatePlatformKey(req: Request, res: Response, next: NextFunction): void {
  const { platformKey } = req.params;

  if (!platformKey || platformKey.length < 3) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PLATFORM_KEY', message: 'Platform key must be at least 3 characters' },
    });
    return;
  }

  const validKeys = ['shopee', 'tiktok_shop', 'lazada', 'tokopedia', 'generic'];
  if (!validKeys.includes(platformKey)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PLATFORM_KEY', message: `Platform key must be one of: ${validKeys.join(', ')}` },
    });
    return;
  }

  next();
}

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

export function validateReviewType(req: Request, res: Response, next: NextFunction): void {
  const { reviewType } = req.body;
  const validTypes = ['initial', 'incremental', 'pre_launch', 'post_launch', 'quarterly'];

  if (reviewType && !validTypes.includes(reviewType)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_REVIEW_TYPE', message: `Review type must be one of: ${validTypes.join(', ')}` },
    });
    return;
  }

  next();
}

export function validatePlatformStatus(req: Request, res: Response, next: NextFunction): void {
  const { status } = req.body;
  const validStatuses = ['planned', 'preparing', 'ready', 'beta', 'active', 'deprecated', 'sunset'];

  if (status && !validStatuses.includes(status)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` },
    });
    return;
  }

  next();
}
