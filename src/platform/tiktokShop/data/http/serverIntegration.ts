/**
 * TikTok Shop Data Server Integration
 * Mounts TikTok Shop data routes into the control plane
 */

import { Router } from 'express';
import tiktokShopDataSourceRoutes from './routes/tiktokShopDataSourceRoutes.js';
import tiktokShopContextRoutes from './routes/tiktokShopContextRoutes.js';
import tiktokShopPromotionSourceRoutes from './routes/tiktokShopPromotionSourceRoutes.js';
import tiktokShopDataBacklogRoutes from './routes/tiktokShopDataBacklogRoutes.js';
import { handleTikTokDataError, createNotFoundHandler } from './middleware/tiktokDataErrorHandler.js';

/**
 * Create TikTok Shop data router
 */
export function createTikTokShopDataRouter(): Router {
  const router = Router();

  // Mount routes
  router.use(tiktokShopDataSourceRoutes);
  router.use(tiktokShopContextRoutes);
  router.use(tiktokShopPromotionSourceRoutes);
  router.use(tiktokShopDataBacklogRoutes);

  // Error handling
  router.use(handleTikTokDataError);
  router.use(createNotFoundHandler());

  return router;
}

/**
 * Get TikTok Shop data routes for server mounting
 */
export function getTikTokShopDataRoutes() {
  return createTikTokShopDataRouter();
}

/**
 * Mount TikTok Shop data routes to existing Express app
 */
export function mountTikTokShopDataRoutes(app: Router | any, basePath: string = '/internal/platforms/tiktok-shop') {
  const router = createTikTokShopDataRouter();
  app.use(basePath, router);

  console.log(`[TikTokShopData] Mounted routes at ${basePath}`);
}
