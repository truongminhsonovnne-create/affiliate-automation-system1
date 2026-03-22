/**
 * Control Plane Router - HARDENED VERSION
 *
 * Combines all internal API routes.
 * All routes require authentication EXCEPT health check.
 */

import { Router } from 'express';
import { requestContextMiddleware } from './middleware/requestContext.js';
import { skipAuth } from './middleware/authGuard.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import systemRoutes from './routes/systemRoutes.js';
import crawlRoutes from './routes/crawlRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import publishingRoutes from './routes/publishingRoutes.js';
import deadLetterRoutes from './routes/deadLetterRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import accesstradeRoutes from './routes/accesstradeRoutes.js';
import masofferRoutes from './routes/masofferRoutes.js';

const router = Router();

// Apply request context middleware to all routes
// This runs first to extract authentication info
router.use(requestContextMiddleware);

// Health check (no auth required - but explicitly marked)
router.get('/health', skipAuth, (req, res) => {
  res.json({
    ok: true,
    status: 'success',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });
});

// Mount route groups - each has requireAuthentication middleware internally
router.use('/system', systemRoutes);
router.use('/crawl', crawlRoutes);
router.use('/ai', aiRoutes);
router.use('/publishing', publishingRoutes);
router.use('/dead-letter', deadLetterRoutes);
router.use('/admin', adminRoutes);
router.use('/security', securityRoutes);
router.use('/integrations/accesstrade', accesstradeRoutes);
router.use('/integrations/masoffer', masofferRoutes);

// Error handling
router.use(notFoundHandler);
router.use(errorHandler);

export default router;
