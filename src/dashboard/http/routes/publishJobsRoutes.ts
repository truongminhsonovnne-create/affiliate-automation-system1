/**
 * Dashboard Publish Jobs Routes
 *
 * HTTP routes for dashboard publish jobs (read + write).
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../controlPlane/http/middleware/errorHandler.js';
import * as publishJobsService from '../services/dashboardPublishJobsService.js';
import { validatePublishJobListQuery, validatePublishJobDetailQuery, validateCreatePublishJobBody } from '../filters/schemas.js';
import {
  buildDashboardSuccessResponse,
  buildDashboardValidationError,
  buildDashboardNotFoundError,
  buildDashboardInternalError,
} from '../contracts.js';

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

/**
 * POST /internal/dashboard/publish-jobs
 * Create a new publish job from the admin dashboard
 *
 * Body fields (all validated via Zod schema):
 *   platform      - shopee | lazada | tiktok | tiki  (required)
 *   contentType   - deal | voucher | product | seo_article | social | undefined
 *   sourceType    - masoffer | accesstrade | crawl | manual | undefined
 *   productIds    - comma-separated UUIDs, or undefined for all
 *   scheduledAt   - ISO timestamp string, or null for immediate, or undefined
 *   channel       - website | blog | tiktok | facebook | seo | email
 *   priority      - integer 0-10
 *   title         - optional job title override
 *   description   - optional job description / notes
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const validation = validateCreatePublishJobBody(req.body);

  if (!validation.success) {
    res.status(400).json(buildDashboardValidationError(
      validation.error.errors[0]?.message || 'Invalid request body',
      validation.error.errors,
      'body'
    ));
    return;
  }

  const data = validation.data;

  // Delegate to service
  const result = await publishJobsService.createDashboardPublishJob({
    platform: data.platform,
    contentType: data.contentType,
    sourceType: data.sourceType,
    productIds: data.productIds,
    scheduledAt: data.scheduledAt,
    channel: data.channel,
    priority: data.priority,
    title: data.title,
    description: data.description,
    actorId: req.cpContext?.actor?.id,
  });

  if (!result.success) {
    const statusCode = result.errorCode === 'VALIDATION_ERROR' ? 400
      : result.errorCode === 'NOT_FOUND' ? 404
      : result.errorCode === 'UNAUTHORIZED' ? 401
      : 500;

    res.status(statusCode).json(buildDashboardInternalError(
      result.error?.message || 'Failed to create publish job'
    ));
    return;
  }

  res.status(201).json(buildDashboardSuccessResponse(result.data));
}));

export default router;
