/**
 * Platform HTTP Server Integration
 */

import { Router } from 'express';
import platformRegistryRoutes from './routes/platformRegistryRoutes.js';
import platformReadinessRoutes from './routes/platformReadinessRoutes.js';
import platformBacklogRoutes from './routes/platformBacklogRoutes.js';
import { platformErrorHandler, platformNotFoundHandler } from './middleware/platformErrorHandler.js';

export interface PlatformServerConfig {
  basePath?: string;
  enableInternalRoutes?: boolean;
}

/**
 * Create the platform router with all sub-routes
 */
export function createPlatformRouter(config: PlatformServerConfig = {}): Router {
  const { basePath = '/internal/platforms', enableInternalRoutes = true } = config;

  const router = Router();

  // Mount routes
  router.use(basePath, platformRegistryRoutes);

  if (enableInternalRoutes) {
    router.use(basePath, platformReadinessRoutes);
    router.use(basePath, platformBacklogRoutes);
  }

  // Error handlers
  router.use(platformNotFoundHandler);
  router.use(platformErrorHandler);

  return router;
}

/**
 * Get route manifest for documentation
 */
export function getPlatformRoutes(): Array<{
  path: string;
  method: string;
  description: string;
}> {
  return [
    // Registry Routes
    { path: '/internal/platforms', method: 'GET', description: 'List all platforms' },
    { path: '/internal/platforms', method: 'POST', description: 'Register new platform' },
    { path: '/internal/platforms/:platformKey', method: 'GET', description: 'Get platform by key' },
    { path: '/internal/platforms/:platformKey/capabilities', method: 'GET', description: 'Get platform capabilities' },
    { path: '/internal/platforms/:platformKey/status', method: 'PUT', description: 'Update platform status' },

    // Readiness Routes
    { path: '/internal/platforms/:platformKey/readiness', method: 'GET', description: 'Get platform readiness' },
    { path: '/internal/platforms/:platformKey/readiness/run', method: 'POST', description: 'Run readiness review' },
    { path: '/internal/platforms/tiktok-shop/readiness', method: 'GET', description: 'Get TikTok Shop readiness' },
    { path: '/internal/platforms/tiktok-shop/readiness/run', method: 'POST', description: 'Run TikTok Shop readiness review' },

    // Backlog Routes
    { path: '/internal/platforms/:platformKey/backlog', method: 'GET', description: 'Get platform backlog' },
    { path: '/internal/platforms/:platformKey/backlog/:id/complete', method: 'POST', description: 'Complete backlog item' },
  ];
}

export default createPlatformRouter;
