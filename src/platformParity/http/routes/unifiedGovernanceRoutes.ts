/**
 * Unified Governance HTTP Routes
 * Internal/admin APIs for unified governance surfaces
 */

import { Router, Request, Response } from 'express';

import * as service from '../../service/platformParityHardeningService.js';
import * as serializers from '../../api/serializers.js';

const router = Router();

/**
 * GET /internal/unified-governance/overview
 * Get unified governance overview
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const result = await service.buildUnifiedGovernanceSurfacePack({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    res.json({
      governance: {
        surfaceKey: result.governance.surfaceKey,
        surfaceType: result.governance.surfaceType,
        governanceMetrics: result.governance.governanceMetrics,
        generatedAt: result.governance.generatedAt,
      },
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('GOVERNANCE_ERROR', String(error))
    );
  }
});

/**
 * GET /internal/unified-governance/release-readiness
 * Get unified release readiness surface
 */
router.get('/release-readiness', async (req: Request, res: Response) => {
  try {
    const result = await service.buildUnifiedGovernanceSurfacePack({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    res.json({
      releaseReadiness: result.governance.releaseReadinessData,
      governanceMetrics: result.governance.governanceMetrics,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('RELEASE_READINESS_ERROR', String(error))
    );
  }
});

/**
 * GET /internal/unified-governance/enablement-risks
 * Get unified enablement risk surface
 */
router.get('/enablement-risks', async (req: Request, res: Response) => {
  try {
    const result = await service.buildUnifiedGovernanceSurfacePack({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    res.json({
      enablementRisks: result.governance.enablementRiskData,
      governanceMetrics: result.governance.governanceMetrics,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('ENABLEMENT_RISK_ERROR', String(error))
    );
  }
});

/**
 * GET /internal/unified-governance/backlog-pressure
 * Get unified backlog pressure surface
 */
router.get('/backlog-pressure', async (req: Request, res: Response) => {
  try {
    const result = await service.buildUnifiedGovernanceSurfacePack({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    res.json({
      backlogPressure: result.governance.backlogPressureData,
      governanceMetrics: result.governance.governanceMetrics,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('BACKLOG_PRESSURE_ERROR', String(error))
    );
  }
});

export default router;
