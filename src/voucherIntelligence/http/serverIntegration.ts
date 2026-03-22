/**
 * Voucher Intelligence Server Integration
 */

import express, { Express } from 'express';
import voucherIntelligenceRoutes from './api/routes/voucherIntelligenceRoutes.js';
import { voucherIntelligenceErrorHandler } from './api/middleware/voucherIntelligenceErrorHandler.js';
import { validateQueryParams } from './api/middleware/voucherIntelligenceValidation.js';

/**
 * Mount voucher intelligence routes on an Express app
 */
export function mountVoucherIntelligenceRoutes(app: Express): void {
  // Create router
  const router = express.Router();

  // Apply validation middleware
  router.use(validateQueryParams);

  // Mount routes
  router.use('/voucher-intelligence', voucherIntelligenceRoutes);

  // Mount on /internal path
  app.use('/internal', router);

  // Apply error handler
  app.use(voucherIntelligenceErrorHandler);

  console.log('[VoucherIntelligence] Routes mounted at /internal');
}

/**
 * Create standalone voucher intelligence server
 */
export function createVoucherIntelligenceServer(): Express {
  const app = express();

  // Middleware
  app.use(express.json());

  // Mount routes
  mountVoucherIntelligenceRoutes(app);

  return app;
}

/**
 * Start voucher intelligence service
 */
export async function startVoucherIntelligenceService(port: number = 3001): Promise<void> {
  const app = createVoucherIntelligenceServer();

  app.listen(port, () => {
    console.log(`[VoucherIntelligence] Service running on port ${port}`);
  });
}
