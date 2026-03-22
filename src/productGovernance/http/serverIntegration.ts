/**
 * Product Governance Server Integration
 *
 * Mounts governance routes onto the existing server.
 */

import { Router } from 'express';
import releaseReadinessRoutes from './routes/releaseReadinessRoutes';
import governanceSignalRoutes from './routes/governanceSignalRoutes';
import followupRoutes from './routes/followupRoutes';
import cadenceRoutes from './routes/cadenceRoutes';
import { governanceErrorHandler } from './middleware/productGovernanceErrorHandler';

const router = Router();

// Mount governance routes
router.use('/product-governance', [
  releaseReadinessRoutes,
  governanceSignalRoutes,
  followupRoutes,
  cadenceRoutes,
]);

// Health check
router.get('/product-governance/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handler
router.use(governanceErrorHandler);

export default router;

/**
 * Register governance routes with an existing Express app
 */
export function registerGovernanceRoutes(app: Router): void {
  app.use('/internal', router);
}
