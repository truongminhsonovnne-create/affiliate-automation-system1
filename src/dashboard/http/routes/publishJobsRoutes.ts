/**
 * Dashboard Publish Jobs Routes
 *
 * HTTP routes for dashboard publish jobs.
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../controlPlane/http/middleware/errorHandler.js';
import * as publishJobsService from '../services/dashboardPublishJobsService.js';
import { validatePublishJobListQuery, validatePublishJobDetailQuery } from '../filters/schemas.js';
import { buildDashboardSuccessResponse, buildDashboardValidationError, buildDashboardNotFoundError } from '../contracts.js';

const router = Router();

/**
 * GET /internal/dashboard/publish-jobs
 * Get paginated list of publish jobs
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  // Validate query
  const validation = validatePublishJobListQuery(req.query);

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
    channel,
    priority,
    claimedBy,
    search,
  } = validation.data;

  const result = await publishJobsService.getDashboardPublishJobs({
    page,
    pageSize,
    sortField: sort?.field,
    sortDirection: sort?.direction,
    status,
    channel,
    priority,
    claimedBy,
    search,
  });

  res.json(buildDashboardSuccessResponse(result));
}));

/**
 * GET /internal/dashboard/publish-jobs/:jobId
 * Get publish job detail
 */
router.get('/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const result = await publishJobsService.getDashboardPublishJobDetail(jobId);

  if (!result) {
    res.status(404).json(buildDashboardNotFoundError('Publish Job', jobId));
    return;
  }

  res.json(buildDashboardSuccessResponse(result));
}));

export default router;
