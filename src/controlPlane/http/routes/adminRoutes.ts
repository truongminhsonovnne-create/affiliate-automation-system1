/**
 * Admin Routes - HARDENED VERSION
 *
 * Internal API routes for admin operations and dashboard queries.
 * All routes require authentication.
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuthentication } from '../middleware/authGuard.js';
import { getDashboardOverview, getRecentOperationalEvents, getRecentAdminActions, getJobQueueOverview } from '../../services/adminQueryService.js';

const router = Router();

// Apply authentication to all routes in this router
router.use(requireAuthentication);

/**
 * GET /internal/admin/dashboard-overview
 * Get dashboard overview - requires auth
 */
router.get('/dashboard-overview', asyncHandler(async (req: Request, res: Response) => {
  const result = await getDashboardOverview(req.cpContext!);

  res.json({
    ok: result.success,
    status: result.success ? 'success' : 'error',
    data: result.data,
    error: result.error,
    correlationId: result.correlationId,
    timestamp: new Date().toISOString(),
  });
}));

/**
 * GET /internal/admin/events
 * Get recent operational events - requires auth
 */
router.get('/events', asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    limit: parseInt(req.query.limit as string) || 50,
    since: req.query.since as string,
  };

  const result = await getRecentOperationalEvents(req.cpContext!, filters);

  res.json({
    ok: result.success,
    status: result.success ? 'success' : 'error',
    data: result.data,
    error: result.error,
    correlationId: result.correlationId,
    timestamp: new Date().toISOString(),
  });
}));

/**
 * GET /internal/admin/actions
 * Get recent admin actions - requires auth
 */
router.get('/actions', asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    limit: parseInt(req.query.limit as string) || 20,
    actionType: req.query.actionType as string,
    actorId: req.query.actorId as string,
  };

  const result = await getRecentAdminActions(req.cpContext!, filters);

  res.json({
    ok: result.success,
    status: result.success ? 'success' : 'error',
    data: result.data,
    error: result.error,
    correlationId: result.correlationId,
    timestamp: new Date().toISOString(),
  });
}));

/**
 * GET /internal/admin/job-queue-overview
 * Get job queue overview - requires auth
 */
router.get('/job-queue-overview', asyncHandler(async (req: Request, res: Response) => {
  const result = await getJobQueueOverview(req.cpContext!);

  res.json({
    ok: result.success,
    status: result.success ? 'success' : 'error',
    data: result.data,
    error: result.error,
    correlationId: result.correlationId,
    timestamp: new Date().toISOString(),
  });
}));

export default router;
