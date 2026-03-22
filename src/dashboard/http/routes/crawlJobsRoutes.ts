/**
 * Dashboard Crawl Jobs Routes
 *
 * HTTP routes for dashboard crawl jobs.
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../controlPlane/http/middleware/errorHandler.js';
import * as crawlJobsService from '../services/dashboardCrawlJobsService.js';
import { validateCrawlJobListQuery, validateCrawlJobDetailQuery } from '../filters/schemas.js';
import { buildDashboardSuccessResponse, buildDashboardValidationError, buildDashboardNotFoundError } from '../contracts.js';

const router = Router();

/**
 * GET /internal/dashboard/crawl-jobs
 * Get paginated list of crawl jobs
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  // Validate query
  const validation = validateCrawlJobListQuery(req.query);

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
    sort,
    status,
    type,
    source,
    shopId,
    keyword,
    search,
  } = validation.data;

  const result = await crawlJobsService.getDashboardCrawlJobs({
    page,
    pageSize,
    sortField: sort?.field,
    sortDirection: sort?.direction,
    status,
    type,
    source,
    shopId,
    keyword,
    search,
  });

  res.json(buildDashboardSuccessResponse(result));
}));

/**
 * GET /internal/dashboard/crawl-jobs/:jobId
 * Get crawl job detail
 */
router.get('/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const result = await crawlJobsService.getDashboardCrawlJobDetail(jobId);

  if (!result) {
    res.status(404).json(buildDashboardNotFoundError('Crawl Job', jobId));
    return;
  }

  res.json(buildDashboardSuccessResponse(result));
}));

export default router;
