/**
 * Founder Cockpit Server Integration
 */

import { Router } from 'express';
import founderCockpitRoutes from './routes/founderCockpitRoutes.js';
import weeklyReviewRoutes from './routes/weeklyReviewRoutes.js';
import strategicReviewRoutes from './routes/strategicReviewRoutes.js';
import {
  founderCockpitRequestId,
  founderCockpitAuditLog,
  founderCockpitRateLimit,
} from './middleware/founderCockpitMiddleware.js';
import {
  validateDateRangeQuery,
  validatePagination,
  sanitizeQueryParams,
  logRequestSummary,
} from './middleware/founderValidation.js';
import { founderCockpitErrorHandler, founderCockpitNotFoundHandler } from './middleware/founderErrorHandler.js';

export interface FounderCockpitServerConfig {
  basePath?: string;
  rateLimitEnabled?: boolean;
  auditLogEnabled?: boolean;
  enableInternalRoutes?: boolean;
}

/**
 * Create the founder cockpit router with all sub-routes
 */
export function createFounderCockpitRouter(config: FounderCockpitServerConfig = {}): Router {
  const {
    basePath = '/api/founder-cockpit',
    rateLimitEnabled = true,
    auditLogEnabled = true,
    enableInternalRoutes = true,
  } = config;

  const router = Router();

  // Global middleware
  router.use(founderCockpitRequestId);
  router.use(sanitizeQueryParams);
  router.use(logRequestSummary);

  if (auditLogEnabled) {
    router.use(founderCockpitAuditLog);
  }
  if (rateLimitEnabled) {
    router.use(founderCockpitRateLimit);
  }

  // Public API routes (founder-facing)
  router.use(basePath, founderCockpitRoutes);

  // Internal admin routes
  if (enableInternalRoutes) {
    // Weekly review routes
    router.use('/internal/founder/reviews/weekly', validateDateRangeQuery, validatePagination, weeklyReviewRoutes);

    // Strategic review routes
    router.use('/internal/founder/reviews/strategic', validateDateRangeQuery, validatePagination, strategicReviewRoutes);
  }

  // Error handlers (must be last)
  router.use(founderCockpitNotFoundHandler);
  router.use(founderCockpitErrorHandler);

  return router;
}

/**
 * Get route manifest for documentation
 */
export function getFounderCockpitRoutes(): Array<{
  path: string;
  method: string;
  description: string;
}> {
  return [
    // Public API
    { path: '/api/founder-cockpit/current', method: 'GET', description: 'Get current founder cockpit' },
    { path: '/api/founder-cockpit/snapshots', method: 'GET', description: 'List cockpit snapshots' },
    { path: '/api/founder-cockpit/snapshots/:id', method: 'GET', description: 'Get specific snapshot' },
    { path: '/api/founder-cockpit/weekly-reviews', method: 'GET', description: 'List weekly reviews' },
    { path: '/api/founder-cockpit/weekly-reviews/current', method: 'GET', description: 'Get current week review' },
    { path: '/api/founder-cockpit/strategic-packs', method: 'GET', description: 'List strategic packs' },
    { path: '/api/founder-cockpit/strategic-packs', method: 'POST', description: 'Create strategic pack' },
    { path: '/api/founder-cockpit/decisions', method: 'GET', description: 'Get decision queue' },
    { path: '/api/founder-cockpit/decisions/:id/resolve', method: 'POST', description: 'Resolve decision' },
    { path: '/api/founder-cockpit/cycle/run', method: 'POST', description: 'Run operating cycle' },
    { path: '/api/founder-cockpit/health', method: 'GET', description: 'Health check' },

    // Internal Routes
    { path: '/internal/founder/reviews/weekly', method: 'GET', description: 'List weekly reviews (admin)' },
    { path: '/internal/founder/reviews/weekly/current', method: 'GET', description: 'Get current week (admin)' },
    { path: '/internal/founder/reviews/weekly/:reviewKey', method: 'GET', description: 'Get specific review (admin)' },
    { path: '/internal/founder/reviews/weekly/run', method: 'POST', description: 'Run weekly review (admin)' },
    { path: '/internal/founder/reviews/weekly/:reviewKey/status', method: 'PUT', description: 'Update review status (admin)' },
    { path: '/internal/founder/reviews/weekly/:reviewKey', method: 'DELETE', description: 'Delete review (admin)' },

    { path: '/internal/founder/reviews/strategic', method: 'GET', description: 'List strategic packs (admin)' },
    { path: '/internal/founder/reviews/strategic/:id', method: 'GET', description: 'Get specific pack (admin)' },
    { path: '/internal/founder/reviews/strategic/run', method: 'POST', description: 'Run strategic review (admin)' },
    { path: '/internal/founder/reviews/strategic/meta/types', method: 'GET', description: 'Get review types (admin)' },
    { path: '/internal/founder/reviews/strategic/:id/status', method: 'PUT', description: 'Update pack status (admin)' },
    { path: '/internal/founder/reviews/strategic/:id', method: 'DELETE', description: 'Delete pack (admin)' },
  ];
}

export default createFounderCockpitRouter;
