/**
 * System Routes - HARDENED VERSION
 *
 * Internal API routes for system health, snapshots, metrics, and workers.
 * All routes require authentication.
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuthentication } from '../middleware/authGuard.js';
import { getSystemHealthSummary, getOperationalSnapshotSummary, getMetricsSummary, getWorkerStatusSummary } from '../../services/systemStatusService.js';

const router = Router();

// Apply authentication to all routes in this router
router.use(requireAuthentication);

/**
 * GET /internal/system/health
 * Get system health status - requires auth
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const result = await getSystemHealthSummary(req.cpContext!);

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
 * GET /internal/system/snapshot
 * Get operational snapshot - requires auth
 */
router.get('/snapshot', asyncHandler(async (req: Request, res: Response) => {
  const result = await getOperationalSnapshotSummary(req.cpContext!);

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
 * GET /internal/system/metrics
 * Get metrics summary - requires auth
 */
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  const result = getMetricsSummary(req.cpContext!);

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
 * GET /internal/system/workers
 * Get worker status - requires auth
 */
router.get('/workers', asyncHandler(async (req: Request, res: Response) => {
  const result = await getWorkerStatusSummary(req.cpContext!);

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
