/**
 * TikTok Shop Acquisition Server Integration
 */

import { Router } from 'express';
import discoveryRoutes from './routes/tiktokShopDiscoveryRoutes.js';
import detailRoutes from './routes/tiktokShopDetailRoutes.js';
import healthRoutes from './routes/tiktokShopAcquisitionHealthRoutes.js';
import { handleAcquisitionError } from './middleware/tiktokAcquisitionErrorHandler.js';

export function createTikTokShopAcquisitionRouter(): Router {
  const router = Router();
  router.use(discoveryRoutes);
  router.use(detailRoutes);
  router.use(healthRoutes);
  router.use(handleAcquisitionError);
  return router;
}

export function mountTikTokShopAcquisitionRoutes(app: Router | any, basePath: string = '/internal/platforms/tiktok-shop') {
  const router = createTikTokShopAcquisitionRouter();
  app.use(basePath, router);
  console.log(`[TikTokShopAcquisition] Mounted routes at ${basePath}`);
}
