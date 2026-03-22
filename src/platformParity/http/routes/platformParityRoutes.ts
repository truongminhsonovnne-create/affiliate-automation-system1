/**
 * Platform Parity HTTP Routes
 * Internal/admin APIs for platform parity management
 */

import { Router, Request, Response } from 'express';

import * as service from '../../service/platformParityHardeningService.js';
import * as gapRepo from '../../repositories/platformParityGapRepository.js';
import * as serializers from '../../api/serializers.js';
import { validateRequest } from '../middleware/platformParityValidation.js';

const router = Router();

/**
 * GET /internal/platform-parity/summary
 * Get platform parity summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const result = await service.runPlatformParityHardeningCycle({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    const summary = serializers.serializeDecisionSupport(result.decisionSupport);

    res.json({
      overallParityLevel: result.parityModel.overallParityLevel,
      riskSummary: result.decisionSupport.riskSummary,
      recommendationsCount: result.decisionSupport.recommendations.length,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('PARITY_SUMMARY_ERROR', String(error))
    );
  }
});

/**
 * GET /internal/platform-parity/gaps
 * Get platform parity gaps
 */
router.get('/gaps', async (req: Request, res: Response) => {
  try {
    const platformKey = req.query.platformKey as string | undefined;
    const gapStatus = req.query.status as string | undefined;
    const severity = req.query.severity as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const gaps = await gapRepo.getPlatformParityGaps({
      platformKey: platformKey as any,
      gapStatus: gapStatus as any,
      severity: severity as any,
      limit,
      offset,
    });

    const total = gaps.length; // Would need proper count query in production

    res.json(serializers.serializeGaps(gaps, total, limit, offset));
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('GAPS_GET_ERROR', String(error))
    );
  }
});

/**
 * GET /internal/platform-parity/comparisons
 * Get cross-platform comparisons
 */
router.get('/comparisons', async (req: Request, res: Response) => {
  try {
    const scope = req.query.scope as string || 'operational';

    const result = await service.runPlatformParityHardeningCycle({
      shopeeMetrics: {},
      tiktokMetrics: {},
    });

    // Would build comparison here with actual metrics
    res.json({
      comparisonScope: scope,
      overallParityLevel: result.parityModel.overallParityLevel,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('COMPARISON_ERROR', String(error))
    );
  }
});

/**
 * POST /internal/platform-parity/hardening/run
 * Run platform parity hardening cycle
 */
router.post('/hardening/run', async (req: Request, res: Response) => {
  try {
    const { shopeeMetrics, tiktokMetrics } = req.body;

    const result = await service.runPlatformParityHardeningCycle({
      shopeeMetrics: shopeeMetrics || {},
      tiktokMetrics: tiktokMetrics || {},
    });

    res.json({
      parityModel: {
        modelId: result.parityModel.modelId,
        overallParityLevel: result.parityModel.overallParityLevel,
        generatedAt: result.parityModel.generatedAt,
      },
      decisionSupport: serializers.serializeDecisionSupport(result.decisionSupport),
      snapshotId: result.snapshotId,
      gapsDetected: result.gapsDetected,
      backlogCreated: result.backlogCreated,
    });
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('HARDENING_CYCLE_ERROR', String(error))
    );
  }
});

/**
 * PATCH /internal/platform-parity/gaps/:id/status
 * Update gap status
 */
router.patch('/gaps/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json(
        serializers.serializeError('INVALID_STATUS', 'Status is required')
      );
      return;
    }

    const updated = await gapRepo.updateGapStatus(id, status);

    if (!updated) {
      res.status(404).json(
        serializers.serializeError('GAP_NOT_FOUND', `Gap ${id} not found`)
      );
      return;
    }

    res.json(serializers.serializeGap(updated));
  } catch (error) {
    res.status(500).json(
      serializers.serializeError('GAP_UPDATE_ERROR', String(error))
    );
  }
});

export default router;
