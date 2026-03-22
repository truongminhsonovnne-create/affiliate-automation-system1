/**
 * Public API Routes for Platform Resolution
 *
 * Public-facing API for platform resolution with gating.
 * Routes based on platform support state.
 */

import { Router } from 'express';
import { multiPlatformPublicFlowService } from '../../platform/shared/resolution/service/multiPlatformPublicFlowService.js';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /public/platforms/:platform/support
 * Get platform support status
 */
router.get('/platforms/:platform/support', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;

    const status = await multiPlatformPublicFlowService.getPlatformSupportStatus(platform);

    res.json({
      platform: status.platform,
      supported: status.representation.isSupported,
      inSandbox: status.representation.isInSandbox,
      gated: status.representation.isGated,
      supportLevel: status.supportState,
      phase: status.enablementPhase,
      features: status.representation.featureAvailability,
      limitations: status.representation.limitations,
      nextSteps: status.representation.nextSteps,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get platform support status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /public/platforms/support
 * Get all platform support statuses
 */
router.get('/platforms/support', async (req: Request, res: Response) => {
  try {
    const statuses = await multiPlatformPublicFlowService.getAllPlatformSupportStatuses();

    const result = Object.entries(statuses).map(([platform, status]) => ({
      platform,
      supported: status.representation.isSupported,
      inSandbox: status.representation.isInSandbox,
      gated: status.representation.isGated,
      supportLevel: status.supportState,
      phase: status.enablementPhase,
      features: status.representation.featureAvailability,
    }));

    res.json({ platforms: result });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get platform support statuses',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /public/resolve
 * Resolve platform promotion/product
 */
router.post('/resolve', async (req: Request, res: Response) => {
  try {
    const { platform, inputType, inputValue, resolutionType } = req.body;

    if (!platform || !inputType || !inputValue || !resolutionType) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['platform', 'inputType', 'inputValue', 'resolutionType'],
      });
      return;
    }

    const userAgent = req.headers['user-agent'];
    const requestId = req.headers['x-request-id'] as string | undefined;

    const response = await multiPlatformPublicFlowService.processPublicFlowRequest({
      platform,
      inputType,
      inputValue,
      resolutionType,
      userAgent,
      requestId,
    });

    // Build public-safe response
    res.json({
      requestId: response.requestId,
      platform: response.platform,
      inputType: response.inputType,
      inputValue: response.inputValue,
      status: response.resolutionStatus,
      supportLevel: response.supportState,
      route: response.routeDecision,
      data: response.resolvedData,
      quality: response.qualityScore,
      representation: {
        isSupported: response.representation.isSupported,
        isInSandbox: response.representation.isInSandbox,
        isGated: response.representation.isGated,
        isLimited: response.representation.isLimited,
        supportLevelText: response.representation.supportLevelText,
        featureAvailability: response.representation.featureAvailability,
        limitations: response.representation.limitations,
        nextSteps: response.representation.nextSteps,
      },
      message: response.userFacingMessage,
      docsUrl: response.docsUrl,
      statusPageUrl: response.statusPageUrl,
      processedAt: response.resolvedAt,
      durationMs: response.resolutionDurationMs,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Resolution failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /public/health
 * Public health check
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
