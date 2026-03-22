/**
 * Growth Surfaces Routes
 *
 * HTTP routes for growth surface management.
 */

import { Router, Request, Response } from 'express';
import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceType,
  GrowthSurfaceStatus,
  GrowthSurfaceIndexabilityStatus,
  GrowthSurfaceFreshnessStatus,
  GrowthSurfaceGenerationStrategy,
} from '../types';
import { listGrowthSurfaces, registerGrowthSurface, updateGrowthSurfaceInventory, getGrowthSurfaceInventory } from '../inventory/surfaceInventoryService';
import { evaluateGrowthSurfaceEligibility, isGrowthSurfaceEligibleForGeneration, isGrowthSurfaceEligibleForIndexing } from '../eligibility/surfaceEligibilityEvaluator';
import { planGenerationBatch, assessScalingReadiness, getPriorityGenerationSurfaces } from '../generation/surfaceGenerationPlanner';

const router = Router();

// ============================================================================
// Surface Inventory Routes
// ============================================================================

/**
 * GET /api/growth/surfaces
 * List all growth surfaces with filters
 */
router.get('/surfaces', async (req: Request, res: Response) => {
  try {
    const {
      surfaceType,
      pageStatus,
      indexabilityStatus,
      freshnessStatus,
      sourceEntityType,
      sourceEntityId,
      minQualityScore,
      maxQualityScore,
      limit = '20',
      offset = '0',
      orderBy = 'createdAt',
      orderDirection = 'desc',
    } = req.query;

    const filters: Record<string, unknown> = {};

    if (surfaceType) filters.surfaceType = (surfaceType as string).split(',');
    if (pageStatus) filters.pageStatus = (pageStatus as string).split(',');
    if (indexabilityStatus) filters.indexabilityStatus = (indexabilityStatus as string).split(',');
    if (freshnessStatus) filters.freshnessStatus = (freshnessStatus as string).split(',');
    if (sourceEntityType) filters.sourceEntityType = sourceEntityType;
    if (sourceEntityId) filters.sourceEntityId = sourceEntityId;
    if (minQualityScore) filters.minQualityScore = Number(minQualityScore);
    if (maxQualityScore) filters.maxQualityScore = Number(maxQualityScore);

    const result = await listGrowthSurfaces(filters, {
      limit: Number(limit),
      offset: Number(offset),
      orderBy: orderBy as 'createdAt' | 'updatedAt' | 'qualityScore' | 'usefulnessScore',
      orderDirection: orderDirection as 'asc' | 'desc',
    });

    res.json({
      success: true,
      data: result.surfaces,
      pagination: {
        total: result.total,
        limit: Number(limit),
        offset: Number(offset),
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
 * GET /api/growth/surfaces/:id
 * Get surface by ID
 */
router.get('/surfaces/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const surface = await getGrowthSurfaceInventory(id);

    if (!surface) {
      return res.status(404).json({
        success: false,
        error: 'Surface not found',
      });
    }

    res.json({
      success: true,
      data: surface,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/growth/surfaces
 * Register a new growth surface
 */
router.post('/surfaces', async (req: Request, res: Response) => {
  try {
    const {
      surfaceType,
      routeKey,
      routePath,
      slug,
      platform,
      sourceEntityType,
      sourceEntityId,
      generationStrategy,
      metadata,
    } = req.body;

    // Validate required fields
    if (!surfaceType || !routeKey || !routePath || !slug) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: surfaceType, routeKey, routePath, slug',
      });
    }

    const surface = await registerGrowthSurface({
      surfaceType,
      routeKey,
      routePath,
      slug,
      platform,
      sourceEntityType,
      sourceEntityId,
      generationStrategy: generationStrategy || GrowthSurfaceGenerationStrategy.MANUAL,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: surface,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/growth/surfaces/:id
 * Update surface inventory
 */
router.patch('/surfaces/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const surface = await updateGrowthSurfaceInventory(id, updates);

    if (!surface) {
      return res.status(404).json({
        success: false,
        error: 'Surface not found',
      });
    }

    res.json({
      success: true,
      data: surface,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// Eligibility Routes
// ============================================================================

/**
 * POST /api/growth/surfaces/:id/eligibility
 * Check surface eligibility for generation/indexing
 */
router.post('/surfaces/:id/eligibility', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const context = req.body.context;

    const surface = await getGrowthSurfaceInventory(id);

    if (!surface) {
      return res.status(404).json({
        success: false,
        error: 'Surface not found',
      });
    }

    const eligibility = evaluateGrowthSurfaceEligibility(surface, context);
    const canGenerate = isGrowthSurfaceEligibleForGeneration(surface, context);
    const canIndex = isGrowthSurfaceEligibleForIndexing(surface, context);

    res.json({
      success: true,
      data: {
        eligible: eligibility.eligible,
        canGenerate,
        canIndex,
        reasons: eligibility.reasons,
        warnings: eligibility.warnings,
        conditions: eligibility.conditions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// Generation Routes
// ============================================================================

/**
 * POST /api/growth/generation/plan
 * Plan a generation batch
 */
router.post('/generation/plan', async (req: Request, res: Response) => {
  try {
    const { surfaceIds, maxBatchSize, surfaceTypes, priorityOnly } = req.body;

    // Get surfaces (would fetch from DB in production)
    const surfaces: GrowthSurfaceInventoryRecord[] = [];

    const plan = planGenerationBatch(surfaces, {
      maxBatchSize,
      surfaceTypes,
      priorityOnly,
    });

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/growth/generation/priority
 * Get priority surfaces for generation
 */
router.get('/generation/priority', async (req: Request, res: Response) => {
  try {
    const { limit = '20' } = req.query;

    // Would fetch from DB in production
    const surfaces: GrowthSurfaceInventoryRecord[] = [];
    const prioritySurfaces = getPriorityGenerationSurfaces(surfaces, Number(limit));

    res.json({
      success: true,
      data: prioritySurfaces,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// Scaling Readiness Routes
// ============================================================================

/**
 * POST /api/growth/scaling/readiness
 * Assess scaling readiness
 */
router.post('/scaling/readiness', async (req: Request, res: Response) => {
  try {
    const { targetSurfaceCount, surfaceType, existingSurfaces } = req.body;

    const report = assessScalingReadiness({
      targetSurfaceCount,
      surfaceType,
      existingSurfaces,
    });

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
