// =============================================================================
// Voucher Data Server Integration
// Production-grade integration of voucher data routes into the control plane
// =============================================================================

import { Router } from 'express';
import voucherCatalogRoutes from './routes/voucherCatalogRoutes.js';
import voucherRuleRoutes from './routes/voucherRuleRoutes.js';
import voucherEvaluationRoutes from './routes/voucherEvaluationRoutes.js';
import { handleVoucherDataError, handleNotFound } from './middleware/voucherDataErrorHandler.js';

/**
 * Create voucher data router with all routes
 */
export function createVoucherDataRouter(): Router {
  const router = Router();

  // Mount routes
  router.use('/vouchers', voucherCatalogRoutes);
  router.use('/vouchers', voucherRuleRoutes);
  router.use('/vouchers', voucherEvaluationRoutes);

  // Error handling
  router.use(handleVoucherDataError);
  router.use(handleNotFound);

  return router;
}

/**
 * Default export for integration
 */
export default createVoucherDataRouter;
