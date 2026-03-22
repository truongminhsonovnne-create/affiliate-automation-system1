/**
 * Dashboard Router - HARDENED VERSION
 *
 * Combines all dashboard routes.
 * All routes require authentication - FAIL-CLOSED by default.
 * All routes are mounted under /internal/dashboard prefix.
 */

import { Router } from 'express';
import overviewRoutes from './routes/overviewRoutes.js';
import productsRoutes from './routes/productsRoutes.js';
import crawlJobsRoutes from './routes/crawlJobsRoutes.js';
import publishJobsRoutes from './routes/publishJobsRoutes.js';
import aiContentRoutes from './routes/aiContentRoutes.js';
import operationsRoutes from './routes/operationsRoutes.js';
import { requireAuthentication } from '../../controlPlane/http/middleware/requestContext.js';

const router = Router();

// ============================================================================
// AUTHENTICATION - FAIL CLOSED
// ============================================================================
// All dashboard routes require authentication by default
// The requestContextMiddleware must be mounted at parent router level
// This ensures no dashboard routes are accessible without auth

router.use(requireAuthentication);

// Mount route groups at correct paths
// All routes will be under /internal/dashboard
router.use('/overview', overviewRoutes);
router.use('/activity', overviewRoutes);
router.use('/failure-insights', overviewRoutes);
router.use('/trends', overviewRoutes);
router.use('/products', productsRoutes);
router.use('/crawl-jobs', crawlJobsRoutes);
router.use('/publish-jobs', publishJobsRoutes);
router.use('/ai-contents', aiContentRoutes);

// Dead letters and workers are in operationsRoutes
router.use('/dead-letters', operationsRoutes);
router.use('/workers', operationsRoutes);

export default router;
