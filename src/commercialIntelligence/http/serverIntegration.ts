/**
 * Commercial Intelligence Server Integration
 *
 * Mounts routes into the control plane/internal server.
 */

import { Router } from 'express';
import commercialSummaryRoutes from './routes/commercialSummaryRoutes.js';
import attributionRoutes from './routes/attributionRoutes.js';
import governanceRoutes from './routes/governanceRoutes.js';
import { commercialErrorHandler, commercialNotFoundHandler } from './middleware/commercialErrorHandler.js';

/**
 * Create Commercial Intelligence Router
 */
export function createCommercialIntelligenceRouter(): Router {
  const router = Router();

  // Mount routes
  router.use('/commercial', commercialSummaryRoutes);
  router.use('/commercial', attributionRoutes);
  router.use('/commercial', governanceRoutes);

  // Error handlers
  router.use(commercialErrorHandler);
  router.use(commercialNotFoundHandler);

  return router;
}

/**
 * Mount Commercial Intelligence routes into existing Express app
 */
export function mountCommercialIntelligenceRoutes(
  app: Router,
  basePath: string = '/internal'
): void {
  const ciRouter = createCommercialIntelligenceRouter();
  app.use(basePath, ciRouter);
}

/**
 * Health check for Commercial Intelligence
 */
export function createCommercialIntelligenceHealthCheck(): Router {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'commercial-intelligence',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

export default createCommercialIntelligenceRouter;
