/**
 * Voucher Engine Server Integration
 *
 * Mounts voucher engine routes into the main app server.
 */

import { Router, Application } from 'express';
import voucherResolutionRoutes from './routes/voucherResolutionRoutes';
import { voucherErrorHandler, voucherNotFoundHandler } from './middleware/voucherErrorHandler';

/**
 * Voucher engine router
 */
export function createVoucherEngineRouter(): Router {
  const router = Router();

  // Mount routes
  router.use('/voucher', voucherResolutionRoutes);

  // Error handling
  router.use(voucherErrorHandler);
  router.use(voucherNotFoundHandler);

  return router;
}

/**
 * Integrate voucher engine into existing Express app
 */
export function integrateVoucherEngine(app: Application, basePath = '/api/v1'): void {
  const voucherRouter = createVoucherEngineRouter();

  app.use(basePath, voucherRouter);

  console.log(`Voucher Engine mounted at ${basePath}`);
}

/**
 * Create standalone voucher engine express app
 */
export function createVoucherEngineApp(): Application {
  const express = require('express');
  const app = express();

  // Parse JSON
  app.use(express.json());

  // Mount voucher engine
  integrateVoucherEngine(app);

  return app;
}
