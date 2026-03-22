/**
 * Voucher Resolution Routes
 *
 * HTTP routes for voucher resolution API.
 *
 * Endpoints:
 *  POST /api/v1/voucher/resolve        – synchronous resolution
 *  GET  /api/v1/voucher/resolve/:id    – lookup by requestId (with persistence)
 *  GET  /api/v1/voucher/health
 *  GET  /api/v1/voucher/stats
 */

import { Router, Request, Response } from 'express';
import {
  resolveBestVoucherForShopeeUrl,
  getVoucherResolutionResultByRequestId,
} from '../../service/voucherResolutionService';
import {
  serializeVoucherResolutionResult,
  serializeError,
  serializeResolutionStatus,
} from '../api/serializers';
import {
  validateResolveVoucherRequest,
  validateRequestIdParam,
} from '../middleware/voucherRequestValidation';
import { asyncHandler } from '../middleware/voucherErrorHandler';

const router = Router();

/**
 * POST /api/v1/voucher/resolve
 * Resolve best voucher for product URL
 */
router.post(
  '/resolve',
  validateResolveVoucherRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { url, platform, force_refresh, include_fallback, max_candidates } = req.body;

    const result = await resolveBestVoucherForShopeeUrl(
      {
        url,
        platform,
        forceRefresh: force_refresh,
        includeFallback: include_fallback,
        maxCandidates: max_candidates,
      },
      {
        skipCache: force_refresh,
      }
    );

    const response = serializeVoucherResolutionResult(result);
    res.json(response);
  })
);

/**
 * GET /api/v1/voucher/resolve/:requestId
 * Retrieve a previously completed (or in-flight) resolution by its requestId.
 *
 * Persistence read path:
 *  1. Redis  – full result JSON (TTL = 30 min)
 *  2. Supabase – metadata + result summary (TTL = 7–30 days)
 *
 * Status codes:
 *  200 – result found (succeeded / failed / no_match / cached)
 *  202 – request exists but is still pending/processing
 *  404 – request not found or TTL expired
 *  400 – invalid requestId format
 */
router.get(
  '/resolve/:requestId',
  validateRequestIdParam,
  asyncHandler(async (req: Request, res: Response) => {
    const { requestId } = req.params;

    const result = await getVoucherResolutionResultByRequestId(requestId);

    // Request is still being processed
    if (!result) {
      // Attempt to get the metadata to distinguish 404 vs 202
      const { getVoucherResolutionRequest } = await import('../../persistence/voucherResolutionPersistence');
      const request = await getVoucherResolutionRequest(requestId);

      if (!request) {
        res.status(404).json(
          serializeError(
            'REQUEST_NOT_FOUND',
            `No resolution request found for id '${requestId}'. It may have expired or never existed.`,
            { requestId },
            false
          )
        );
        return;
      }

      // Request exists but not yet complete – return 202 Accepted
      res.status(202).json(serializeResolutionStatus(requestId, request));
      return;
    }

    res.status(200).json(serializeVoucherResolutionResult(result));
  })
);

/**
 * GET /api/v1/voucher/health
 * Health check for voucher engine
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'voucher-engine',
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/v1/voucher/stats
 * Get voucher engine statistics (from persistence layer)
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const days = req.query.days ? parseInt(String(req.query.days), 10) : undefined;

    const { getResolutionStatistics } = await import('../../persistence/voucherResolutionPersistence');

    const stats = await getResolutionStatistics({
      platform,
      days: days && days > 0 ? days : undefined,
    });

    res.json({
      total_resolutions: stats.totalRequests,
      completed_resolutions: stats.completedRequests,
      failed_resolutions: stats.failedRequests,
      no_match_resolutions: stats.noMatchRequests,
      cache_hit_rate: Math.round(stats.cacheHitRate * 100) / 100,
      avg_resolution_time_ms: stats.avgDurationMs,
      platform_filter: platform ?? 'all',
      days_filter: days ?? 'all',
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
