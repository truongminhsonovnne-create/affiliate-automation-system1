/**
 * Security Diagnostics Routes
 * 
 * Internal security status and diagnostics endpoints.
 * These are internal-only and should not be exposed publicly.
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuthentication } from '../middleware/authGuard.js';
import { runSecurityPostureChecks } from '../../../security/posture/index.js';
import { getRateLimitStats } from '../../../publicApi/rateLimit/store.js';

const router = Router();

// Apply authentication to all security routes
router.use(requireAuthentication);

/**
 * GET /internal/security/posture
 * Get security posture status
 */
router.get('/posture', asyncHandler(async (req: Request, res: Response) => {
  const posture = runSecurityPostureChecks();
  
  res.json({
    ok: true,
    status: 'success',
    data: {
      level: posture.level,
      environment: posture.environment,
      summary: posture.summary,
      checks: posture.checks.map(c => ({
        name: c.name,
        level: c.level,
        message: c.message,
      })),
    },
    timestamp: new Date().toISOString(),
  });
}));

/**
 * GET /internal/security/rate-limit-status
 * Get rate limiter status
 */
router.get('/rate-limit-status', asyncHandler(async (req: Request, res: Response) => {
  // getRateLimitStats() is now async (it awaits store.isHealthy())
  const stats = await getRateLimitStats();

  res.json({
    ok: true,
    status: 'success',
    data: {
      storeType: stats.storeType,
      isHealthy: stats.isHealthy,
    },
    timestamp: new Date().toISOString(),
  });
}));

export default router;
