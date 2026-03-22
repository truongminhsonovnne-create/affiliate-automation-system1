// =============================================================================
// Public Voucher Routes
// Production-grade HTTP routes for public voucher resolution API
// =============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { resolveVoucherForPublicInput } from '../../service/publicVoucherResolutionService.js';
import { validateResolveVoucherRequest, extractClientInfo } from '../middleware/publicRequestValidation.js';
import { publicRateLimitMiddleware } from '../middleware/publicRateLimitMiddleware.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/public/v1/resolve
 * Resolve vouchers for a Shopee product URL
 */
router.post(
  '/v1/resolve',
  publicRateLimitMiddleware,
  validateResolveVoucherRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { input, limit, requestId } = req.body;
      const clientInfo = extractClientInfo(req);

      // Resolve vouchers
      // NOTE: skipRateLimit=true because publicRateLimitMiddleware already checked the
      // rate limit above. Double-checking would cause the counter to be incremented twice
      // per request (once by middleware, once by service), making limits half as effective.
      const result = await resolveVoucherForPublicInput(
        {
          input,
          limit,
          requestId: requestId || uuidv4(),
          clientInfo,
        },
        {
          skipRateLimit: true, // authoritative check is in the middleware
          clientInfo: {
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            platform: clientInfo.platform,
          },
        }
      );

      // Return response
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/public/v1/resolve/health
 * Health check for resolution service
 */
router.get('/v1/resolve/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: 'v1',
  });
});

/**
 * GET /api/public/v1/resolve/:requestId
 * Get resolution result by request ID (if implemented with async processing)
 */
router.get('/v1/resolve/:requestId', (req: Request, res: Response) => {
  // This endpoint would be useful if we implement async processing
  // For now, return not implemented
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Request ID lookup not yet implemented',
    },
  });
});

export default router;
