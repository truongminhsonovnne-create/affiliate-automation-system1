/**
 * Platform Resolution Gates Internal API Routes
 */

import { Router } from 'express';
import { platformResolutionGateRepository } from '../../platform/shared/resolution/repository/platformResolutionGateRepository.js';
import { platformGateEvaluationService } from '../../platform/shared/resolution/service/platformGateEvaluationService.js';
import { multiPlatformPublicFlowService } from '../../platform/shared/resolution/service/multiPlatformPublicFlowService.js';
import { platformEnablementGovernanceService } from '../../platform/shared/resolution/service/platformEnablementGovernanceService.js';
import type { Request, Response } from 'express';

const router = Router();

// === Gate Management ===

/**
 * GET /internal/platforms/gates
 * Get all platform resolution gates
 */
router.get('/gates', async (req: Request, res: Response) => {
  try {
    const gates = await platformResolutionGateRepository.getAllGates();
    res.json({ gates });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get gates',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/platforms/gates/:platform
 * Get platform resolution gate
 */
router.get('/gates/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const gate = await platformResolutionGateRepository.getGate(platform);

    if (!gate) {
      res.status(404).json({ error: 'Gate not found', platform });
      return;
    }

    res.json({ gate });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get gate',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /internal/platforms/gates/:platform/evaluate
 * Evaluate platform gates
 */
router.post('/gates/:platform/evaluate', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const evaluation = await platformGateEvaluationService.evaluatePlatformGates(platform);

    // Update gate in database
    await platformResolutionGateRepository.upsertGate({
      platform,
      supportState: evaluation.supportState,
      enablementPhase: evaluation.enablementPhase,
      domainReady: evaluation.domainReady,
      dataFoundationReady: evaluation.dataFoundationReady,
      acquisitionReady: evaluation.acquisitionReady,
      resolutionReady: evaluation.resolutionReady,
      governanceApproved: evaluation.governanceApproved,
      gateConfig: evaluation.gateConfig,
      evaluatedAt: evaluation.evaluatedAt,
    });

    res.json({ evaluation });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to evaluate gate',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /internal/platforms/gates/:platform/update
 * Update platform gate configuration
 */
router.post('/gates/:platform/update', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const updates = req.body;

    const gate = await platformResolutionGateRepository.upsertGate({
      platform,
      ...updates,
    });

    // Create snapshot
    await platformResolutionGateRepository.createSupportStateSnapshot({
      platform,
      supportState: gate.supportState,
      enablementPhase: gate.enablementPhase,
      domainReady: gate.domainReady,
      dataFoundationReady: gate.dataFoundationReady,
      acquisitionReady: gate.acquisitionReady,
      resolutionReady: gate.resolutionReady,
      governanceApproved: gate.governanceApproved,
      snapshotReason: 'manual_update',
    });

    res.json({ gate });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update gate',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// === Support State ===

/**
 * GET /internal/platforms/support-state/:platform
 * Get current support state for platform
 */
router.get('/support-state/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const status = await multiPlatformPublicFlowService.getPlatformSupportStatus(platform);
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get support state',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/platforms/support-states
 * Get all platform support states
 */
router.get('/support-states', async (req: Request, res: Response) => {
  try {
    const statuses = await multiPlatformPublicFlowService.getAllPlatformSupportStatuses();
    res.json({ statuses });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get support states',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// === Sandbox ===

/**
 * POST /internal/platforms/sandbox/resolve
 * Resolve in sandbox mode
 */
router.post('/sandbox/resolve', async (req: Request, res: Response) => {
  try {
    const { platform, inputType, inputValue, resolutionType, inputMetadata } = req.body;

    if (!platform || !inputType || !inputValue || !resolutionType) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['platform', 'inputType', 'inputValue', 'resolutionType'],
      });
      return;
    }

    // Import and use sandbox service
    const { tiktokShopSandboxResolutionService } = await import(
      '../../platform/tiktokShop/resolution/service/tiktokShopSandboxResolutionService.js'
    );

    let result;
    if (resolutionType === 'promotion') {
      result = await tiktokShopSandboxResolutionService.resolvePromotion({
        platform,
        inputType,
        inputValue,
        resolutionType,
        inputMetadata,
      });
    } else if (resolutionType === 'product') {
      result = await tiktokShopSandboxResolutionService.resolveProduct({
        platform,
        inputType,
        inputValue,
        resolutionType,
        inputMetadata,
      });
    } else {
      res.status(400).json({ error: 'Unsupported resolution type for sandbox' });
      return;
    }

    res.json({ result });
  } catch (error) {
    res.status(500).json({
      error: 'Sandbox resolution failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/platforms/sandbox/usage/:platform
 * Get sandbox usage for platform
 */
router.get('/sandbox/usage/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const { period = 'hourly' } = req.query;

    const quota = await platformResolutionGateRepository.getSandboxUsageQuota(
      platform,
      period as 'hourly' | 'daily' | 'monthly'
    );

    if (!quota) {
      res.json({
        platform,
        period,
        usage: 0,
        limit: 0,
        remaining: 0,
        throttled: false,
      });
      return;
    }

    res.json({
      platform,
      period,
      usage: quota.requestsUsed,
      limit: quota.requestsLimit,
      remaining: Math.max(0, quota.requestsLimit - quota.requestsUsed),
      throttled: !!quota.throttledUntil && new Date() < quota.throttledUntil,
      throttledUntil: quota.throttledUntil,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get sandbox usage',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// === Governance ===

/**
 * POST /internal/platforms/governance/reviews
 * Request enablement review
 */
router.post('/governance/reviews', async (req: Request, res: Response) => {
  try {
    const { platform, targetPhase, requestedBy } = req.body;

    if (!platform || !targetPhase || !requestedBy) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['platform', 'targetPhase', 'requestedBy'],
      });
      return;
    }

    const review = await platformEnablementGovernanceService.requestEnablementReview(
      platform,
      targetPhase,
      requestedBy
    );

    res.json({ review });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to request review',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/platforms/governance/reviews
 * Get pending reviews
 */
router.get('/governance/reviews', async (req: Request, res: Response) => {
  try {
    const { platform } = req.query;
    const reviews = await platformEnablementGovernanceService.getPendingReviews(
      platform as string | undefined
    );

    res.json({ reviews });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get reviews',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /internal/platforms/governance/reviews/:reviewId/approve
 * Approve enablement review
 */
router.post('/governance/reviews/:reviewId/approve', async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { approvedBy, conditions } = req.body;

    if (!approvedBy) {
      res.status(400).json({ error: 'Missing required field: approvedBy' });
      return;
    }

    const review = await platformEnablementGovernanceService.approveReview(
      reviewId,
      approvedBy,
      conditions
    );

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    res.json({ review });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to approve review',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /internal/platforms/governance/reviews/:reviewId/reject
 * Reject enablement review
 */
router.post('/governance/reviews/:reviewId/reject', async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { rejectedBy, reason } = req.body;

    if (!rejectedBy || !reason) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['rejectedBy', 'reason'],
      });
      return;
    }

    const review = await platformEnablementGovernanceService.rejectReview(
      reviewId,
      rejectedBy,
      reason
    );

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    res.json({ review });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reject review',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/platforms/governance/readiness/:platform
 * Get readiness checks for platform
 */
router.get('/governance/readiness/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const checks = await platformEnablementGovernanceService.runReadinessChecks(platform);

    const passed = checks.filter((c) => c.status === 'pass').length;
    const warnings = checks.filter((c) => c.status === 'warning').length;
    const failed = checks.filter((c) => c.status === 'fail').length;
    const score = Math.round(checks.reduce((sum, c) => sum + c.score, 0) / checks.length);

    res.json({
      platform,
      checks,
      summary: {
        total: checks.length,
        passed,
        warnings,
        failed,
        score,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get readiness checks',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// === Audits ===

/**
 * GET /internal/platforms/audits
 * Get public flow audits
 */
router.get('/audits', async (req: Request, res: Response) => {
  try {
    const { platform, limit = 100 } = req.query;
    const audits = await platformResolutionGateRepository.getPublicFlowAudits(
      platform as string | undefined,
      Number(limit)
    );

    res.json({ audits });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get audits',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
