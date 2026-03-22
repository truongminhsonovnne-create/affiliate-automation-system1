/**
 * Dashboard Operations Routes
 *
 * HTTP routes for dashboard dead letters and workers.
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../controlPlane/http/middleware/errorHandler.js';
import * as operationsService from '../services/dashboardOperationsService.js';
import { validateDeadLetterListQuery, validateWorkerListQuery } from '../filters/schemas.js';
import { buildDashboardSuccessResponse, buildDashboardValidationError, buildDashboardNotFoundError } from '../contracts.js';

const router = Router();

// =============================================================================
// DEAD LETTER ROUTES
// =============================================================================

/**
 * GET /internal/dashboard/dead-letters
 * Get paginated list of dead letters
 */
router.get('/dead-letters', asyncHandler(async (req: Request, res: Response) => {
  // Validate query
  const validation = validateDeadLetterListQuery(req.query);

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
    jobType,
    operation,
    errorCategory,
    search,
  } = validation.data;

  const result = await operationsService.getDashboardDeadLetters({
    page,
    pageSize,
    sortField: sort?.field,
    sortDirection: sort?.direction,
    status,
    jobType,
    operation,
    errorCategory,
    search,
  });

  res.json(buildDashboardSuccessResponse(result));
}));

/**
 * GET /internal/dashboard/dead-letters/:id
 * Get dead letter detail
 */
router.get('/dead-letters/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await operationsService.getDashboardDeadLetters({
    page: 1,
    pageSize: 100,
  });

  // Find the specific dead letter
  const found = result.items.find(item => item.id === id);

  if (!found) {
    res.status(404).json(buildDashboardNotFoundError('Dead Letter', id));
    return;
  }

  res.json(buildDashboardSuccessResponse(found));
}));

// =============================================================================
// WORKER ROUTES
// =============================================================================

/**
 * GET /internal/dashboard/workers
 * Get paginated list of workers
 */
router.get('/workers', asyncHandler(async (req: Request, res: Response) => {
  // Validate query
  const validation = validateWorkerListQuery(req.query);

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
  } = validation.data;

  const result = await operationsService.getDashboardWorkers({
    page,
    pageSize,
    sortField: sort?.field,
    sortDirection: sort?.direction,
    status,
    type,
  });

  res.json(buildDashboardSuccessResponse(result));
}));

/**
 * GET /internal/dashboard/workers/:workerIdentity
 * Get worker detail
 */
router.get('/workers/:workerIdentity', asyncHandler(async (req: Request, res: Response) => {
  const { workerIdentity } = req.params;

  const result = await operationsService.getDashboardWorkerDetail(workerIdentity);

  if (!result) {
    res.status(404).json(buildDashboardNotFoundError('Worker', workerIdentity));
    return;
  }

  res.json(buildDashboardSuccessResponse(result));
}));

export default router;
