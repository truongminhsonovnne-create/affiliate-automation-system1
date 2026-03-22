/**
 * Publishing Routes
 *
 * Internal API routes for publishing operations.
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuthentication } from '../middleware/authGuard.js';
import {
  preparePublishingForProducts,
  runPublisherOnce,
  getPublishJobs,
  getPublishJobDetail,
  retryPublishJob,
  cancelPublishJob,
  unlockStalePublishJob,
} from '../../services/publishingOperationsService.js';
import {
  validateManualPublishPreparationRequest,
  validateManualPublisherRunRequest,
  validateRetryPublishJobRequest,
  validateCancelPublishJobRequest,
  validateUnlockStalePublishJobRequest,
} from '../../validation/schemas.js';

const router = Router();

// Apply authentication to all routes in this router
router.use(requireAuthentication);

/**
 * POST /internal/publishing/prepare
 * Prepare publishing for products
 */
router.post('/prepare', asyncHandler(async (req: Request, res: Response) => {
  const parsed = validateManualPublishPreparationRequest(req.body);

  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message || 'Invalid request',
        details: parsed.error.errors,
      },
      correlationId: req.cpContext?.correlationId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = await preparePublishingForProducts(parsed.data, req.cpContext!);

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
 * POST /internal/publishing/run
 * Run publisher once
 */
router.post('/run', asyncHandler(async (req: Request, res: Response) => {
  const parsed = validateManualPublisherRunRequest(req.body);

  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message || 'Invalid request',
        details: parsed.error.errors,
      },
      correlationId: req.cpContext?.correlationId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = await runPublisherOnce(parsed.data, req.cpContext!);

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
 * GET /internal/publishing/jobs
 * Get publish jobs
 */
router.get('/jobs', asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    page: parseInt(req.query.page as string) || 1,
    pageSize: parseInt(req.query.pageSize as string) || 20,
    status: req.query.status as any,
    channel: req.query.channel as any,
    priority: req.query.priority ? parseInt(req.query.priority as string) : undefined,
    claimedBy: req.query.claimedBy as string,
    since: req.query.since as string,
    until: req.query.until as string,
  };

  const result = await getPublishJobs(filters, req.cpContext!);

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
 * GET /internal/publishing/jobs/:jobId
 * Get publish job detail
 */
router.get('/jobs/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const result = await getPublishJobDetail(jobId, req.cpContext!);

  if (!result.success) {
    res.status(404).json({
      ok: false,
      status: 'error',
      error: result.error,
      correlationId: result.correlationId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    ok: true,
    status: 'success',
    data: result.data,
    correlationId: result.correlationId,
    timestamp: new Date().toISOString(),
  });
}));

/**
 * POST /internal/publishing/jobs/:jobId/retry
 * Retry publish job
 */
router.post('/jobs/:jobId/retry', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const parsed = validateRetryPublishJobRequest({ ...req.body, jobId });

  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message || 'Invalid request',
        details: parsed.error.errors,
      },
      correlationId: req.cpContext?.correlationId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = await retryPublishJob(parsed.data, req.cpContext!);

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
 * POST /internal/publishing/jobs/:jobId/cancel
 * Cancel publish job
 */
router.post('/jobs/:jobId/cancel', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const parsed = validateCancelPublishJobRequest({ ...req.body, jobId });

  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message || 'Invalid request',
        details: parsed.error.errors,
      },
      correlationId: req.cpContext?.correlationId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = await cancelPublishJob(parsed.data, req.cpContext!);

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
 * POST /internal/publishing/jobs/:jobId/unlock
 * Unlock stale publish job
 */
router.post('/jobs/:jobId/unlock', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const parsed = validateUnlockStalePublishJobRequest({ ...req.body, jobId });

  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message || 'Invalid request',
        details: parsed.error.errors,
      },
      correlationId: req.cpContext?.correlationId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = await unlockStalePublishJob(parsed.data, req.cpContext!);

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
