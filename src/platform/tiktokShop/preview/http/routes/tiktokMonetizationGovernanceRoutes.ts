/**
 * TikTok Shop Monetization Governance API Routes
 */

import { Router } from 'express';
import { runTikTokPreviewGovernanceReview, getTikTokPreviewGovernanceStatus } from '../governance/tiktokPreviewGovernanceService.js';
import {
  approveTikTokMonetizationStage,
  holdTikTokMonetizationStage,
  rollbackTikTokMonetizationStage,
  buildTikTokMonetizationDecisionSupport,
} from '../governance/tiktokMonetizationEnablementService.js';
import { runTikTokCommercialReadinessReview } from '../service/tiktokPreviewIntelligenceService.js';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /internal/platforms/tiktok-shop/monetization/governance
 * Get monetization governance status
 */
router.get('/governance', async (req: Request, res: Response) => {
  try {
    const status = await getTikTokPreviewGovernanceStatus();
    const review = await runTikTokPreviewGovernanceReview();

    res.json({
      status,
      review,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get governance status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /internal/platforms/tiktok-shop/monetization/approve
 * Approve monetization stage
 */
router.post('/approve', async (req: Request, res: Response) => {
  try {
    const { targetStage, actorId, rationale } = req.body;

    if (!targetStage) {
      res.status(400).json({ error: 'Missing required field: targetStage' });
      return;
    }

    const action = await approveTikTokMonetizationStage(
      targetStage,
      actorId || 'api',
      rationale
    );

    res.json({ action });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to approve monetization stage',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /internal/platforms/tiktok-shop/monetization/hold
 * Hold monetization
 */
router.post('/hold', async (req: Request, res: Response) => {
  try {
    const { reason, actorId } = req.body;

    if (!reason) {
      res.status(400).json({ error: 'Missing required field: reason' });
      return;
    }

    const action = await holdTikTokMonetizationStage(reason, actorId || 'api');

    res.json({ action });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to hold monetization',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /internal/platforms/tiktok-shop/monetization/rollback
 * Rollback monetization stage
 */
router.post('/rollback', async (req: Request, res: Response) => {
  try {
    const { targetStage, reason, actorId } = req.body;

    if (!targetStage || !reason) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['targetStage', 'reason'],
      });
      return;
    }

    const action = await rollbackTikTokMonetizationStage(
      targetStage,
      reason,
      actorId || 'api'
    );

    res.json({ action });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to rollback monetization',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/platforms/tiktok-shop/monetization/decision-support
 * Get monetization decision support
 */
router.get('/decision-support', async (req: Request, res: Response) => {
  try {
    const { commercialReadinessResult } = await runTikTokCommercialReadinessReview();

    // Get current stage
    const { getCurrentMonetizationStage } = await import('../governance/tiktokMonetizationEnablementService.js');
    const currentStage = await getCurrentMonetizationStage();

    const decisionSupport = await buildTikTokMonetizationDecisionSupport(
      commercialReadinessResult.overallScore,
      commercialReadinessResult.blockers.length,
      commercialReadinessResult.warnings.length,
      currentStage,
      commercialReadinessResult.dimensions.supportStateStability,
      commercialReadinessResult.dimensions.previewUsefulness,
      commercialReadinessResult.dimensions.clickLineageCompleteness / 100
    );

    res.json(decisionSupport);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get decision support',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
