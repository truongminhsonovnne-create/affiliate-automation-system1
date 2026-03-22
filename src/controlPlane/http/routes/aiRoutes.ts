/**
 * AI Routes
 *
 * Internal API routes for AI enrichment operations.
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuthentication } from '../middleware/authGuard.js';
import { triggerAiEnrichmentForProduct, triggerAiEnrichmentBatch, getAiContentStatus } from '../../services/aiOperationsService.js';
import { validateManualAiEnrichmentRequest, validateBatchAiEnrichmentRequest } from '../../validation/schemas.js';

const router = Router();

// Apply authentication to all routes in this router
router.use(requireAuthentication);

/**
 * POST /internal/ai/enrich/product
 * Trigger AI enrichment for a product
 */
router.post('/enrich/product', asyncHandler(async (req: Request, res: Response) => {
  const parsed = validateManualAiEnrichmentRequest(req.body);

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

  const result = await triggerAiEnrichmentForProduct(parsed.data, req.cpContext!);

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
 * POST /internal/ai/enrich/batch
 * Trigger batch AI enrichment
 */
router.post('/enrich/batch', asyncHandler(async (req: Request, res: Response) => {
  const parsed = validateBatchAiEnrichmentRequest(req.body);

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

  const result = await triggerAiEnrichmentBatch(parsed.data, req.cpContext!);

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
 * GET /internal/ai/content-status
 * Get AI content status
 */
router.get('/content-status', asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    productIds: req.query.productIds ? (req.query.productIds as string).split(',') : undefined,
    status: req.query.status as string,
    page: parseInt(req.query.page as string) || 1,
    pageSize: parseInt(req.query.pageSize as string) || 20,
  };

  const result = await getAiContentStatus(filters, req.cpContext!);

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
