/**
 * Crawl Routes
 *
 * Internal API routes for crawl operations.
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuthentication } from '../middleware/authGuard.js';
import { triggerManualFlashSaleCrawl, triggerManualSearchCrawl, getCrawlJobs, getCrawlJobDetail } from '../../services/crawlOperationsService.js';
import { validateManualCrawlRequest, validateManualSearchCrawlRequest, validateCrawlJobQueryFilters } from '../../validation/schemas.js';

const router = Router();

// Apply authentication to all routes in this router
router.use(requireAuthentication);

/**
 * POST /internal/crawl/flash-sale/run
 * Trigger manual flash sale crawl
 */
router.post('/flash-sale/run', asyncHandler(async (req: Request, res: Response) => {
  const parsed = validateManualCrawlRequest(req.body);

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

  const result = await triggerManualFlashSaleCrawl(parsed.data, req.cpContext!);

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
 * POST /internal/crawl/search/run
 * Trigger manual search crawl
 */
router.post('/search/run', asyncHandler(async (req: Request, res: Response) => {
  const parsed = validateManualSearchCrawlRequest(req.body);

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

  const result = await triggerManualSearchCrawl(parsed.data, req.cpContext!);

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
 * GET /internal/crawl/jobs
 * Get crawl jobs with filters
 */
router.get('/jobs', asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    page: parseInt(req.query.page as string) || 1,
    pageSize: parseInt(req.query.pageSize as string) || 20,
    type: req.query.type as any,
    status: req.query.status as any,
    shopId: req.query.shopId as string,
    since: req.query.since as string,
    until: req.query.until as string,
  };

  const result = await getCrawlJobs(filters, req.cpContext!);

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
 * GET /internal/crawl/jobs/:jobId
 * Get crawl job detail
 */
router.get('/jobs/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const result = await getCrawlJobDetail(jobId, req.cpContext!);

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

export default router;
