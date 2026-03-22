/**
 * Unified BI HTTP Routes
 * Internal/admin APIs for unified BI surfaces
 */

import { Router, Request, Response } from 'express';

import * as service from '../../service/platformParityHardeningService.js';
import * as serializers from '../../api/serializers.js';

const router = Router();

/**
 * GET /internal/unified-bi/executive
 * Get unified executive BI surface
 */
router.get('/executive', async (req: Request, res: Response) => {
  try {
    const result = await service.buildUnifiedBiSurfacePack({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    res.json({
      surfaceKey: result.executive.surfaceKey,
      surfaceType: result.executive.surfaceType,
      platformData: result.executive.platformData,
      generatedAt: result.executive.generatedAt,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('EXECUTIVE_BI_ERROR', String(error))
    );
  }
});

/**
 * GET /internal/unified-bi/operator
 * Get unified operator BI surface
 */
router.get('/operator', async (req: Request, res: Response) => {
  try {
    const result = await service.buildUnifiedBiSurfacePack({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    res.json({
      surfaceKey: result.operator.surfaceKey,
      surfaceType: result.operator.surfaceType,
      platformData: result.operator.platformData,
      generatedAt: result.operator.generatedAt,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('OPERATOR_BI_ERROR', String(error))
    );
  }
});

/**
 * GET /internal/unified-bi/founder
 * Get unified founder BI surface
 */
router.get('/founder', async (req: Request, res: Response) => {
  try {
    const result = await service.buildUnifiedBiSurfacePack({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    res.json({
      surfaceKey: result.founder.surfaceKey,
      surfaceType: result.founder.surfaceType,
      platformData: result.founder.platformData,
      generatedAt: result.founder.generatedAt,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('FOUNDER_BI_ERROR', String(error))
    );
  }
});

/**
 * GET /internal/unified-bi/comparison
 * Get cross-platform BI comparison surface
 */
router.get('/comparison', async (req: Request, res: Response) => {
  try {
    // Get comparison data
    const result = await service.buildUnifiedBiSurfacePack({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    res.json({
      comparisonType: 'cross_platform',
      surfaces: {
        executive: result.executive.surfaceKey,
        operator: result.operator.surfaceKey,
        founder: result.founder.surfaceKey,
      },
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('BI_COMPARISON_ERROR', String(error))
    );
  }
});

export default router;
