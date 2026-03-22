/**
 * Dead Letter Routes
 *
 * Internal API routes for dead letter operations.
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuthentication } from '../middleware/authGuard.js';
import { getDeadLetterRecords, getDeadLetterDetail, requeueDeadLetterRecord, markDeadLetterResolved } from '../../services/deadLetterService.js';
import { validateRequeueDeadLetterRequest, validateMarkDeadLetterResolvedRequest } from '../../validation/schemas.js';

const router = Router();

// Apply authentication to all routes in this router
router.use(requireAuthentication);

/**
 * GET /internal/dead-letter
 * Get dead letter records
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    page: parseInt(req.query.page as string) || 1,
    pageSize: parseInt(req.query.pageSize as string) || 20,
    status: req.query.status as any,
    operation: req.query.operation as string,
    errorCategory: req.query.errorCategory as string,
    since: req.query.since as string,
    until: req.query.until as string,
    search: req.query.search as string,
  };

  const result = await getDeadLetterRecords(filters, req.cpContext!);

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
 * GET /internal/dead-letter/:id
 * Get dead letter detail
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await getDeadLetterDetail(id, req.cpContext!);

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
 * POST /internal/dead-letter/:id/requeue
 * Requeue dead letter record
 */
router.post('/:id/requeue', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = validateRequeueDeadLetterRequest({ ...req.body, deadLetterId: id });

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

  const result = await requeueDeadLetterRecord(parsed.data, req.cpContext!);

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
 * POST /internal/dead-letter/:id/resolve
 * Mark dead letter resolved
 */
router.post('/:id/resolve', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = validateMarkDeadLetterResolvedRequest({ ...req.body, deadLetterId: id });

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

  const result = await markDeadLetterResolved(parsed.data, req.cpContext!);

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
