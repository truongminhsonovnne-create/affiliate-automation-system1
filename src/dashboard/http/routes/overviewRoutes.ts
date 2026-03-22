/**
 * Dashboard Overview Routes
 *
 * HTTP routes for dashboard overview, activity, failure insights, and trends.
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../controlPlane/http/middleware/errorHandler.js';
import * as overviewService from '../services/dashboardOverviewService.js';
import * as operationsService from '../services/dashboardOperationsService.js';
import { validateOverviewQuery, validateActivityQuery, validateTrendQuery, validateFailureInsightsQuery } from '../filters/schemas.js';
import { buildDashboardSuccessResponse, buildDashboardValidationError } from '../contracts.js';

const router = Router();

/**
 * GET /internal/dashboard/overview
 * Get dashboard overview with cards, health, and queue summary
 */
router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  // Validate query
  const validation = validateOverviewQuery(req.query);

  if (!validation.success) {
    res.status(400).json(buildDashboardValidationError(
      validation.error.errors[0]?.message || 'Invalid query',
      validation.error.errors,
      'query'
    ));
    return;
  }

  const { timeRange, customTimeRange, refresh } = validation.data;

  const result = await overviewService.getDashboardOverview({
    timeRange,
    customTimeRange,
    useCache: refresh !== true,
  });

  res.json(buildDashboardSuccessResponse(result));
}));

/**
 * GET /internal/dashboard/activity
 * Get unified activity feed
 */
router.get('/activity', asyncHandler(async (req: Request, res: Response) => {
  // Validate query
  const validation = validateActivityQuery(req.query);

  if (!validation.success) {
    res.status(400).json(buildDashboardValidationError(
      validation.error.errors[0]?.message || 'Invalid query',
      validation.error.errors,
      'query'
    ));
    return;
  }

  const {
    page,
    pageSize,
    timeRange,
    customTimeRange,
    type,
    severity,
    source,
    search,
  } = validation.data;

  // Parse time range
  let parsedTimeRange: { start: Date; end: Date } | undefined;
  if (customTimeRange) {
    parsedTimeRange = {
      start: new Date(customTimeRange.start),
      end: new Date(customTimeRange.end),
    };
  } else if (timeRange) {
    const ms = getTimeRangeMs(timeRange);
    parsedTimeRange = {
      start: new Date(Date.now() - ms),
      end: new Date(),
    };
  }

  const result = await operationsService.getDashboardActivity({
    page,
    pageSize,
    timeRange: parsedTimeRange,
    sources: source ? [source] : undefined,
    severities: severity ? [severity] : undefined,
    types: type ? [type] : undefined,
  });

  res.json(buildDashboardSuccessResponse(result));
}));

/**
 * GET /internal/dashboard/failure-insights
 * Get failure hotspots and top reasons
 */
router.get('/failure-insights', asyncHandler(async (req: Request, res: Response) => {
  // Validate query
  const validation = validateFailureInsightsQuery(req.query);

  if (!validation.success) {
    res.status(400).json(buildDashboardValidationError(
      validation.error.errors[0]?.message || 'Invalid query',
      validation.error.errors,
      'query'
    ));
    return;
  }

  const { timeRange, customTimeRange, limit } = validation.data;

  // Parse time range
  let parsedTimeRange: { start: Date; end: Date } | undefined;
  if (customTimeRange) {
    parsedTimeRange = {
      start: new Date(customTimeRange.start),
      end: new Date(customTimeRange.end),
    };
  } else if (timeRange) {
    const ms = getTimeRangeMs(timeRange);
    parsedTimeRange = {
      start: new Date(Date.now() - ms),
      end: new Date(),
    };
  }

  const result = await operationsService.getDashboardFailureInsights({
    timeRange: parsedTimeRange,
    limit,
  });

  res.json(buildDashboardSuccessResponse(result));
}));

/**
 * GET /internal/dashboard/trends
 * Get trend data for charts
 */
router.get('/trends', asyncHandler(async (req: Request, res: Response) => {
  // Validate query
  const validation = validateTrendQuery(req.query);

  if (!validation.success) {
    res.status(400).json(buildDashboardValidationError(
      validation.error.errors[0]?.message || 'Invalid query',
      validation.error.errors,
      'query'
    ));
    return;
  }

  const { timeRange, customTimeRange, bucketSize, metric } = validation.data;

  // Parse time range
  let parsedTimeRange: { start: Date; end: Date } | undefined;
  if (customTimeRange) {
    parsedTimeRange = {
      start: new Date(customTimeRange.start),
      end: new Date(customTimeRange.end),
    };
  } else if (timeRange) {
    const ms = getTimeRangeMs(timeRange);
    parsedTimeRange = {
      start: new Date(Date.now() - ms),
      end: new Date(),
    };
  }

  // Get all trends or specific metric
  let result;
  if (metric) {
    const trends = await operationsService.getDashboardTrendData({
      timeRange,
      customTimeRange: parsedTimeRange,
      bucketSize,
    });

    // Return specific metric
    result = trends[metric as keyof typeof trends] || trends;
  } else {
    result = await operationsService.getDashboardTrendData({
      timeRange,
      customTimeRange: parsedTimeRange,
      bucketSize,
    });
  }

  res.json(buildDashboardSuccessResponse(result));
}));

/**
 * Get time range in milliseconds
 */
function getTimeRangeMs(timeRange: string): number {
  const map: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return map[timeRange] || map['24h'];
}

export default router;
