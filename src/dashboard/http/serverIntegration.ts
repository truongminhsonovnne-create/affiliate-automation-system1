/**
 * Dashboard Server Integration - HARDENED VERSION
 *
 * Integrates dashboard routes into the control plane server.
 * Requires authentication for all dashboard routes.
 */

import { Router } from 'express';
import dashboardRouter from './router.js';
import { dashboardErrorHandler, dashboardNotFoundHandler } from './middleware/dashboardErrorHandler.js';
import { requestContextMiddleware } from '../../controlPlane/http/middleware/requestContext.js';

/**
 * Create dashboard router with middleware
 */
export function createDashboardRouter() {
  const router = Router();

  // CRITICAL: Request context middleware must run FIRST
  // This extracts authentication info and sets cpContext
  router.use(requestContextMiddleware);

  // Mount dashboard routes (auth enforced at router level)
  router.use('/dashboard', dashboardRouter);

  // Error handling
  router.use(dashboardNotFoundHandler);
  router.use(dashboardErrorHandler);

  return router;
}

/**
 * Integrate dashboard routes into existing Express app
 */
export function integrateDashboardRoutes(app: any) {
  const dashboardRouter = createDashboardRouter();

  // Mount under /internal
  app.use('/internal', dashboardRouter);

  return dashboardRouter;
}

/**
 * Get dashboard route paths for documentation
 */
export function getDashboardRoutePaths() {
  return [
    // Overview
    { method: 'GET', path: '/internal/dashboard/overview', description: 'Dashboard overview with cards, health, and queue summary' },
    { method: 'GET', path: '/internal/dashboard/activity', description: 'Unified activity feed' },
    { method: 'GET', path: '/internal/dashboard/failure-insights', description: 'Failure hotspots and top reasons' },
    { method: 'GET', path: '/internal/dashboard/trends', description: 'Trend data for charts' },

    // Products
    { method: 'GET', path: '/internal/dashboard/products', description: 'List products with pagination and filters' },
    { method: 'GET', path: '/internal/dashboard/products/:productId', description: 'Get product detail' },

    // Crawl Jobs
    { method: 'GET', path: '/internal/dashboard/crawl-jobs', description: 'List crawl jobs with pagination and filters' },
    { method: 'GET', path: '/internal/dashboard/crawl-jobs/:jobId', description: 'Get crawl job detail' },

    // Publish Jobs
    { method: 'GET', path: '/internal/dashboard/publish-jobs', description: 'List publish jobs with pagination and filters' },
    { method: 'GET', path: '/internal/dashboard/publish-jobs/:jobId', description: 'Get publish job detail' },

    // AI Content
    { method: 'GET', path: '/internal/dashboard/ai-contents', description: 'List AI content with pagination and filters' },
    { method: 'GET', path: '/internal/dashboard/ai-contents/:contentId', description: 'Get AI content detail' },

    // Dead Letters
    { method: 'GET', path: '/internal/dashboard/dead-letters', description: 'List dead letters with pagination and filters' },
    { method: 'GET', path: '/internal/dashboard/dead-letters/:id', description: 'Get dead letter detail' },

    // Workers
    { method: 'GET', path: '/internal/dashboard/workers', description: 'List workers with pagination and filters' },
    { method: 'GET', path: '/internal/dashboard/workers/:workerIdentity', description: 'Get worker detail' },
  ];
}

export default {
  createDashboardRouter,
  integrateDashboardRoutes,
  getDashboardRoutePaths,
};
