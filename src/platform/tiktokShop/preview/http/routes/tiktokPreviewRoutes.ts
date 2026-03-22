/**
 * TikTok Shop Preview Intelligence API Routes
 */

import { Router } from 'express';
import {
  runTikTokPreviewIntelligenceCycle,
  buildTikTokPreviewPerformanceReport,
  buildTikTokPreviewDecisionSupportReport,
  buildTikTokPreviewBacklogReport,
} from '../service/tiktokPreviewIntelligenceService.js';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /internal/platforms/tiktok-shop/preview/summary
 * Get preview funnel summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to as string) : new Date();

    const result = await runTikTokPreviewIntelligenceCycle({ from: fromDate, to: toDate });

    res.json({
      funnel: result.funnelSummary,
      usefulness: result.usefulnessResult,
      stability: result.stabilityResult,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get preview summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/platforms/tiktok-shop/preview/performance
 * Get preview performance report
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    const fromDate = from ? new Date(from as string) : undefined;
    const toDate = to ? new Date(to as string) : undefined;

    const report = await buildTikTokPreviewPerformanceReport({
      from: fromDate,
      to: toDate,
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get preview performance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/platforms/tiktok-shop/preview/quality
 * Get preview quality review
 */
router.get('/quality', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to as string) : new Date();

    const result = await runTikTokPreviewIntelligenceCycle({ from: fromDate, to: toDate });

    res.json({
      usefulness: result.usefulnessResult,
      stability: result.stabilityResult,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get preview quality',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/platforms/tiktok-shop/preview/decision-support
 * Get decision support report
 */
router.get('/decision-support', async (req: Request, res: Response) => {
  try {
    const report = await buildTikTokPreviewDecisionSupportReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get decision support',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/platforms/tiktok-shop/preview/backlog
 * Get preview backlog report
 */
router.get('/backlog', async (req: Request, res: Response) => {
  try {
    const report = await buildTikTokPreviewBacklogReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get backlog',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
