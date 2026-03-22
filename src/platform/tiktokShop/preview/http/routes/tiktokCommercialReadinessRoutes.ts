/**
 * TikTok Shop Commercial Readiness API Routes
 */

import { Router } from 'express';
import { runTikTokCommercialReadinessReview } from '../service/tiktokPreviewIntelligenceService.js';
import { tiktokPreviewClickLineageRepository } from '../repositories/tiktokPreviewClickLineageRepository.js';
import { buildTikTokPreviewClickLineage, getLineageByKey } from '../commercial/tiktokPreviewClickLineageService.js';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /internal/platforms/tiktok-shop/commercial-readiness
 * Get commercial readiness status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await runTikTokCommercialReadinessReview();

    res.json({
      readiness: result.commercialReadinessResult,
      guardrails: result.guardrailResult,
      governance: result.governanceSummary,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get commercial readiness',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /internal/platforms/tiktok-shop/commercial-readiness/review
 * Run commercial readiness review
 */
router.post('/review', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to as string) : new Date();

    const result = await runTikTokCommercialReadinessReview({ from: fromDate, to: toDate });

    res.json({
      readiness: result.commercialReadinessResult,
      guardrails: result.guardrailResult,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to run commercial readiness review',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/platforms/tiktok-shop/preview/click-lineage
 * Get click lineage records
 */
router.get('/click-lineage', async (req: Request, res: Response) => {
  try {
    const { limit = '100' } = req.query;

    const lineages = await tiktokPreviewClickLineageRepository.getLineagesBySupportState(
      'sandbox_only',
      parseInt(limit as string)
    );

    res.json({ lineages });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get click lineage',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /internal/platforms/tiktok-shop/preview/click-lineage
 * Create click lineage record
 */
router.post('/click-lineage', async (req: Request, res: Response) => {
  try {
    const { previewSessionId, supportState, platformStage, resolutionContext } = req.body;

    if (!supportState || !platformStage) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['supportState', 'platformStage'],
      });
      return;
    }

    const lineage = await buildTikTokPreviewClickLineage(
      previewSessionId,
      supportState,
      platformStage,
      resolutionContext
    );

    res.json({ lineage });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create click lineage',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/platforms/tiktok-shop/preview/click-lineage/:lineageKey
 * Get click lineage by key
 */
router.get('/click-lineage/:lineageKey', async (req: Request, res: Response) => {
  try {
    const { lineageKey } = req.params;

    const lineage = await getLineageByKey(lineageKey);

    if (!lineage) {
      res.status(404).json({ error: 'Lineage not found' });
      return;
    }

    res.json({ lineage });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get click lineage',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
