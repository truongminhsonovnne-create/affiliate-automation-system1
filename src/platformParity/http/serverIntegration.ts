/**
 * Platform Parity HTTP Server Integration
 * Mounts routes onto the control plane/internal server
 */

import { Express, Router } from 'express';

import platformParityRoutes from './routes/platformParityRoutes.js';
import unifiedOpsRoutes from './routes/unifiedOpsRoutes.js';
import unifiedBiRoutes from './routes/unifiedBiRoutes.js';
import unifiedGovernanceRoutes from './routes/unifiedGovernanceRoutes.js';
import { platformParityErrorHandler, notFoundHandler } from './middleware/platformParityErrorHandler.js';

export interface PlatformParityRouterConfig {
  mountPath?: string;
  enableAuth?: boolean;
}

const DEFAULT_MOUNT_PATH = '/internal';

/**
 * Mount all platform parity routes onto an Express app
 */
export function mountPlatformParityRoutes(
  app: Express,
  config: PlatformParityRouterConfig = {}
): void {
  const mountPath = config.mountPath || DEFAULT_MOUNT_PATH;

  // Create main router
  const router = Router();

  // Mount sub-routes
  router.use('/platform-parity', platformParityRoutes);
  router.use('/unified-ops', unifiedOpsRoutes);
  router.use('/unified-bi', unifiedBiRoutes);
  router.use('/unified-governance', unifiedGovernanceRoutes);

  // Mount onto app
  app.use(mountPath, router);

  // Add error handlers at the end
  app.use(notFoundHandler);
  app.use(platformParityErrorHandler);

  console.log(`[PlatformParity] Routes mounted at ${mountPath}`);
}

/**
 * Get route list for documentation
 */
export function getPlatformParityRoutes(): string[] {
  return [
    // Platform Parity Routes
    'GET /internal/platform-parity/summary',
    'GET /internal/platform-parity/gaps',
    'GET /internal/platform-parity/comparisons',
    'POST /internal/platform-parity/hardening/run',
    'PATCH /internal/platform-parity/gaps/:id/status',

    // Unified Ops Routes
    'GET /internal/unified-ops/overview',
    'GET /internal/unified-ops/product',
    'GET /internal/unified-ops/commercial',
    'GET /internal/unified-ops/release',
    'GET /internal/unified-ops/growth',

    // Unified BI Routes
    'GET /internal/unified-bi/executive',
    'GET /internal/unified-bi/operator',
    'GET /internal/unified-bi/founder',
    'GET /internal/unified-bi/comparison',

    // Unified Governance Routes
    'GET /internal/unified-governance/overview',
    'GET /internal/unified-governance/release-readiness',
    'GET /internal/unified-governance/enablement-risks',
    'GET /internal/unified-governance/backlog-pressure',
  ];
}
