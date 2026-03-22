/**
 * Dashboard AI Content Routes
 *
 * HTTP routes for dashboard AI content.
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../controlPlane/http/middleware/errorHandler.js';
import * as aiContentService from '../services/dashboardAiContentService.js';
import { validateAiContentListQuery, validateAiContentDetailQuery } from '../filters/schemas.js';
import { buildDashboardSuccessResponse, buildDashboardValidationError, buildDashboardNotFoundError } from '../contracts.js';

const router = Router();

/**
 * GET /internal/dashboard/ai-contents
 * Get paginated list of AI content
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  // Validate query
  const validation = validateAiContentListQuery(req.query);

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
    model,
    promptVersion,
    hasProduct,
    search,
  } = validation.data;

  const result = await aiContentService.getDashboardAiContents({
    page,
    pageSize,
    sortField: sort?.field,
    sortDirection: sort?.direction,
    status,
    model,
    promptVersion,
    hasProduct,
    search,
  });

  res.json(buildDashboardSuccessResponse(result));
}));

/**
 * GET /internal/dashboard/ai-contents/:contentId
 * Get AI content detail
 */
router.get('/:contentId', asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;

  // Validate ID format
  const validation = validateAiContentDetailQuery({ contentId });

  if (!validation.success) {
    res.status(400).json(buildDashboardValidationError(
      validation.error.errors[0]?.message || 'Invalid content ID',
      validation.error.errors,
      'contentId'
    ));
    return;
  }

  const result = await aiContentService.getDashboardAiContentDetail(contentId);

  if (!result) {
    res.status(404).json(buildDashboardNotFoundError('AI Content', contentId));
    return;
  }

  res.json(buildDashboardSuccessResponse(result));
}));

export default router;
