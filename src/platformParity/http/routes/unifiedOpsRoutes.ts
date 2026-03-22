/**
 * Unified Ops HTTP Routes
 * Internal/admin APIs for unified operations surfaces
 */

import { Router, Request, Response } from 'express';

import * as service from '../../service/platformParityHardeningService.js';
import * as serializers from '../../api/serializers.js';

const router = Router();

/**
 * GET /internal/unified-ops/overview
 * Get unified platform ops overview
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const result = await service.buildUnifiedOpsSurfacePack({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    res.json({
      overview: result.overview.data,
      summary: result.overview.summary,
      healthStatus: result.overview.healthStatus,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('UNIFIED_OPS_ERROR', String(error))
    );
  }
});

/**
 * GET /internal/unified-ops/product
 * Get unified product ops view
 */
router.get('/product', async (req: Request, res: Response) => {
  try {
    const result = await service.buildUnifiedOpsSurfacePack({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    res.json({
      productOps: result.productOps.data,
      summary: result.productOps.summary,
      healthStatus: result.productOps.healthStatus,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('PRODUCT_OPS_ERROR', String(error))
    );
  }
});

/**
 * GET /internal/unified-ops/commercial
 * Get unified commercial ops view
 */
router.get('/commercial', async (req: Request, res: Response) => {
  try {
    const result = await service.buildUnifiedOpsSurfacePack({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    res.json({
      commercialOps: result.commercialOps.data,
      summary: result.commercialOps.summary,
      healthStatus: result.commercialOps.healthStatus,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('COMMERCIAL_OPS_ERROR', String(error))
    );
  }
});

/**
 * GET /internal/unified-ops/release
 * Get unified release ops view
 */
router.get('/release', async (req: Request, res: Response) => {
  try {
    const result = await service.buildUnifiedOpsSurfacePack({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    res.json({
      releaseOps: result.releaseOps.data,
      summary: result.releaseOps.summary,
      healthStatus: result.releaseOps.healthStatus,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('RELEASE_OPS_ERROR', String(error))
    );
  }
});

/**
 * GET /internal/unified-ops/growth
 * Get unified growth ops view
 */
router.get('/growth', async (req: Request, res: Response) => {
  try {
    const result = await service.buildUnifiedOpsSurfacePack({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    res.json({
      growthOps: result.growthOps.data,
      summary: result.growthOps.summary,
      healthStatus: result.growthOps.healthStatus,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('GROWTH_OPS_ERROR', String(error))
    );
  }
});

export default router;
