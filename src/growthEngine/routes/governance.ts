/**
 * Growth Governance Routes
 *
 * HTTP routes for governance management.
 */

import { Router, Request, Response } from 'express';
import {
  GrowthGovernanceActionType,
  GrowthGovernanceActionStatus,
} from '../types';
import { runGovernanceCheck, batchGovernanceCheck, checkScalingReadiness, determineGovernanceAction } from '../governance/growthGovernanceService';
import { evaluateSeoGovernance, shouldIndexSurface, getRobotsConfiguration } from '../seo/seoGovernanceService';
import { evaluateContentDensity, assessThinContentRisk, assessClutterRisk } from '../governance/contentDensityPolicy';
import { evaluateToolAlignment, assessNavigationWanderRisk } from '../governance/toolAlignmentPolicy';

const router = Router();

// ============================================================================
// Governance Check Routes
// ============================================================================

/**
 * POST /api/growth/governance/check
 * Run governance check on a surface
 */
router.post('/governance/check', async (req: Request, res: Response) => {
  try {
    const { surface, context } = req.body;

    if (!surface) {
      return res.status(400).json({
        success: false,
        error: 'Surface is required',
      });
    }

    const result = runGovernanceCheck(surface, context);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/growth/governance/batch-check
 * Run governance check on multiple surfaces
 */
router.post('/governance/batch-check', async (req: Request, res: Response) => {
  try {
    const { surfaces, contextMap } = req.body;

    if (!surfaces || !Array.isArray(surfaces)) {
      return res.status(400).json({
        success: false,
        error: 'Surfaces array is required',
      });
    }

    const contextMapObj = contextMap
      ? new Map(Object.entries(contextMap))
      : undefined;

    const result = batchGovernanceCheck(surfaces, contextMapObj);

    res.json({
      success: true,
      data: {
        totalChecked: surfaces.length,
        passed: result.passed.length,
        failed: result.failed.length,
        actions: result.actions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/growth/governance/scaling-check
 * Check if scaling is ready
 */
router.post('/governance/scaling-check', async (req: Request, res: Response) => {
  try {
    const { surfaces } = req.body;

    if (!surfaces || !Array.isArray(surfaces)) {
      return res.status(400).json({
        success: false,
        error: 'Surfaces array is required',
      });
    }

    const result = checkScalingReadiness(surfaces);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// SEO Governance Routes
// ============================================================================

/**
 * POST /api/growth/seo/check
 * Check SEO governance for a surface
 */
router.post('/seo/check', async (req: Request, res: Response) => {
  try {
    const { surface, context } = req.body;

    if (!surface) {
      return res.status(400).json({
        success: false,
        error: 'Surface is required',
      });
    }

    const result = evaluateSeoGovernance(surface, context);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/growth/seo/should-index/:id
 * Check if surface should be indexed
 */
router.get('/seo/should-index/:id', async (req: Request, res: Response) => {
  try {
    // Would fetch surface from DB in production
    const { id } = req.params;
    const context = req.query;

    // Placeholder - would need actual surface data
    const surface = null;

    if (!surface) {
      return res.status(404).json({
        success: false,
        error: 'Surface not found',
      });
    }

    const shouldIndex = shouldIndexSurface(surface, context as Record<string, unknown>);

    res.json({
      success: true,
      data: { shouldIndex, surfaceId: id },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/growth/seo/robots/:id
 * Get robots configuration for a surface
 */
router.get('/seo/robots/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const context = req.query;

    // Placeholder - would fetch from DB
    const surface = null;

    if (!surface) {
      return res.status(404).json({
        success: false,
        error: 'Surface not found',
      });
    }

    const robots = getRobotsConfiguration(surface, context as Record<string, unknown>);

    res.json({
      success: true,
      data: robots,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// Content Policy Routes
// ============================================================================

/**
 * POST /api/growth/policy/content-density
 * Evaluate content density
 */
router.post('/policy/content-density', async (req: Request, res: Response) => {
  try {
    const { surface, context } = req.body;

    if (!surface) {
      return res.status(400).json({
        success: false,
        error: 'Surface is required',
      });
    }

    const result = evaluateContentDensity(surface, context);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/growth/policy/thin-content-risk
 * Assess thin content risk
 */
router.post('/policy/thin-content-risk', async (req: Request, res: Response) => {
  try {
    const { surface, context } = req.body;

    if (!surface) {
      return res.status(400).json({
        success: false,
        error: 'Surface is required',
      });
    }

    const result = assessThinContentRisk(surface, context);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/growth/policy/clutter-risk
 * Assess clutter risk
 */
router.post('/policy/clutter-risk', async (req: Request, res: Response) => {
  try {
    const { surface, context } = req.body;

    if (!surface) {
      return res.status(400).json({
        success: false,
        error: 'Surface is required',
      });
    }

    const result = assessClutterRisk(surface, context);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// Tool Alignment Routes
// ============================================================================

/**
 * POST /api/growth/policy/tool-alignment
 * Evaluate tool alignment
 */
router.post('/policy/tool-alignment', async (req: Request, res: Response) => {
  try {
    const { surface, context } = req.body;

    if (!surface) {
      return res.status(400).json({
        success: false,
        error: 'Surface is required',
      });
    }

    const result = evaluateToolAlignment(surface, context);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/growth/policy/wander-risk
 * Assess navigation wander risk
 */
router.post('/policy/wander-risk', async (req: Request, res: Response) => {
  try {
    const { surface, context } = req.body;

    if (!surface) {
      return res.status(400).json({
        success: false,
        error: 'Surface is required',
      });
    }

    const result = assessNavigationWanderRisk(surface, context);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
