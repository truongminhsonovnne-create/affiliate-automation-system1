// =============================================================================
// Public API Server Integration
// Production-grade integration of public API routes into the app
// =============================================================================

import { Router } from 'express';
import publicVoucherRoutes from './routes/publicVoucherRoutes.js';
import { handlePublicApiError, handlePublicApiNotFound } from './middleware/publicErrorHandler.js';

/**
 * Create public API router with all routes
 */
export function createPublicApiRouter(): Router {
  const router = Router();

  // Mount routes
  router.use('/api/public', publicVoucherRoutes);

  // Error handling
  router.use(handlePublicApiError);
  router.use(handlePublicApiNotFound);

  return router;
}

/**
 * Default export for integration
 */
export default createPublicApiRouter;
