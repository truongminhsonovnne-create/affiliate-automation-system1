/**
 * Surface Generation Planner
 *
 * Plans and orchestrates surface generation batches with governance guardrails.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceGenerationDecision,
  GrowthSurfaceType,
  GrowthSurfaceStatus,
  GrowthSurfaceFreshnessStatus,
  GrowthScalingReadinessReport,
} from '../types';
import {
  SURFACE_GENERATION_CONFIG,
  GENERATION_BATCH_CONFIG,
} from '../constants';
import { evaluateGrowthSurfaceGenerationDecision } from '../eligibility/surfaceEligibilityEvaluator';

export interface GenerationBatchPlan {
  batchId: string;
  surfaces: PlannedSurface[];
  totalCount: number;
  priority: number;
  estimatedDuration: number;
  governanceCheckPassed: boolean;
  governanceWarnings: string[];
}

export interface PlannedSurface {
  surfaceId: string;
  routeKey: string;
  surfaceType: GrowthSurfaceType;
  priority: number;
  reason: string;
  generationStrategy: string;
}

export interface ScalingReadinessInput {
  targetSurfaceCount: number;
  surfaceType?: GrowthSurfaceType;
  existingSurfaces: GrowthSurfaceInventoryRecord[];
}

/**
 * Plan a generation batch for surfaces
 */
export function planGenerationBatch(
  surfaces: GrowthSurfaceInventoryRecord[],
  options?: {
    maxBatchSize?: number;
    surfaceTypes?: GrowthSurfaceType[];
    priorityOnly?: boolean;
  }
): GenerationBatchPlan {
  const maxBatchSize = options?.maxBatchSize ?? GENERATION_BATCH_CONFIG.DEFAULT_BATCH_SIZE;
  const targetTypes = options?.surfaceTypes;
  const priorityOnly = options?.priorityOnly ?? false;

  // Evaluate each surface for generation eligibility
  const evaluatedSurfaces: Array<{
    surface: GrowthSurfaceInventoryRecord;
    decision: GrowthSurfaceGenerationDecision;
    priority: number;
  }> = [];

  for (const surface of surfaces) {
    // Filter by surface type if specified
    if (targetTypes && !targetTypes.includes(surface.surfaceType)) {
      continue;
    }

    const decision = evaluateGrowthSurfaceGenerationDecision(surface);
    const priority = decision.batchPriority ?? 50;

    // Skip if not eligible and we want priority only
    if (priorityOnly && !decision.canGenerate) {
      continue;
    }

    evaluatedSurfaces.push({ surface, decision, priority });
  }

  // Sort by priority (highest first)
  evaluatedSurfaces.sort((a, b) => b.priority - a.priority);

  // Take top surfaces up to max batch size
  const batchSurfaces = evaluatedSurfaces.slice(0, maxBatchSize);

  // Build planned surfaces
  const planned: PlannedSurface[] = batchSurfaces.map(({ surface, decision }) => ({
    surfaceId: surface.id,
    routeKey: surface.routeKey,
    surfaceType: surface.surfaceType,
    priority: decision.batchPriority ?? 50,
    reason: decision.reasons[0] ?? 'Eligible for generation',
    generationStrategy: decision.strategy,
  }));

  // Calculate estimated duration
  const estimatedDuration = calculateBatchDuration(planned.length);

  // Check governance
  const governanceWarnings: string[] = [];
  const governanceCheckPassed = validateBatchGovernance(planned, surfaces.length, governanceWarnings);

  return {
    batchId: crypto.randomUUID(),
    surfaces: planned,
    totalCount: planned.length,
    priority: planned.length > 0 ? planned[0].priority : 0,
    estimatedDuration,
    governanceCheckPassed,
    governanceWarnings,
  };
}

/**
 * Assess scaling readiness for the portfolio
 */
export function assessScalingReadiness(
  input: ScalingReadinessInput
): GrowthScalingReadinessReport {
  const { targetSurfaceCount, surfaceType, existingSurfaces } = input;

  const risks: string[] = [];
  const recommendations: string[] = [];

  // Filter by surface type if specified
  const relevantSurfaces = surfaceType
    ? existingSurfaces.filter(s => s.surfaceType === surfaceType)
    : existingSurfaces;

  // Count by status
  const blockedSurfaces = relevantSurfaces.filter(s => s.pageStatus === GrowthSurfaceStatus.BLOCKED).length;
  const activeSurfaces = relevantSurfaces.filter(s => s.pageStatus === GrowthSurfaceStatus.ACTIVE).length;
  const staleSurfaces = relevantSurfaces.filter(s => s.pageStatus === GrowthSurfaceStatus.STALE);

  // Quality issues
  const qualityIssues = relevantSurfaces.filter(s =>
    s.qualityScore !== null && s.qualityScore < 50
  ).length;

  // Low value surfaces (low usefulness)
  const lowValueSurfaces = relevantSurfaces.filter(s =>
    s.usefulnessScore !== null && s.usefulnessScore < 30
  ).length;

  // Check against limits
  const maxAllowed = getSurfaceTypeLimit(surfaceType);
  if (targetSurfaceCount > maxAllowed) {
    risks.push(`Target count ${targetSurfaceCount} exceeds max allowed ${maxAllowed} for ${surfaceType ?? 'all surfaces'}`);
    recommendations.push(`Reduce target to ${maxAllowed} or below`);
  }

  // Check blocked percentage
  if (relevantSurfaces.length > 0) {
    const blockedRatio = blockedSurfaces / relevantSurfaces.length;
    if (blockedRatio > 0.2) {
      risks.push(`High blocked ratio: ${(blockedRatio * 100).toFixed(1)}%`);
      recommendations.push('Investigate blocking causes before scaling');
    }
  }

  // Check stale surfaces
  if (staleSurfaces.length > relevantSurfaces.length * 0.3) {
    risks.push(`High stale ratio: ${(staleSurfaces.length / relevantSurfaces.length * 100).toFixed(1)}%`);
    recommendations.push('Refresh stale surfaces before generating new ones');
  }

  // Check quality issues
  if (qualityIssues > relevantSurfaces.length * 0.2) {
    risks.push(`High quality issue ratio: ${(qualityIssues / relevantSurfaces.length * 100).toFixed(1)}%`);
    recommendations.push('Address quality issues before scaling');
  }

  // Check low value surfaces
  if (lowValueSurfaces > relevantSurfaces.length * 0.15) {
    risks.push(`High low-value ratio: ${(lowValueSurfaces / relevantSurfaces.length * 100).toFixed(1)}%`);
    recommendations.push('Improve low-value surfaces to maintain quality standards');
  }

  // Determine readiness
  const ready = risks.length === 0 &&
    blockedSurfaces < relevantSurfaces.length * 0.1 &&
    qualityIssues < relevantSurfaces.length * 0.1;

  if (ready) {
    recommendations.push('Portfolio is ready for scaling');
    recommendations.push('Consider programmatic generation for efficient scaling');
  }

  return {
    ready,
    risks,
    recommendations,
    blockedSurfaces,
    lowValueSurfaces,
    staleSurfaces: staleSurfaces.length,
    qualityIssues,
  };
}

/**
 * Get surfaces ready for priority generation
 */
export function getPriorityGenerationSurfaces(
  surfaces: GrowthSurfaceInventoryRecord[],
  limit?: number
): GrowthSurfaceInventoryRecord[] {
  // Score each surface
  const scored = surfaces.map(surface => {
    let score = 0;

    // Freshness scoring
    switch (surface.freshnessStatus) {
      case GrowthSurfaceFreshnessStatus.STALE:
        score += 30;
        break;
      case GrowthSurfaceFreshnessStatus.NEEDS_REFRESH:
        score += 20;
        break;
      default:
        score += 5;
    }

    // Status scoring
    if (surface.pageStatus === GrowthSurfaceStatus.PENDING) {
      score += 20;
    }

    // Quality scoring (lower quality = higher priority for improvement)
    if (surface.qualityScore !== null) {
      score += Math.floor((100 - surface.qualityScore) / 10);
    }

    // Usefulness scoring
    if (surface.usefulnessScore !== null && surface.usefulnessScore < 30) {
      score += 15;
    }

    return { surface, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top surfaces
  const result = scored.slice(0, limit ?? GENERATION_BATCH_CONFIG.DEFAULT_BATCH_SIZE);
  return result.map(s => s.surface);
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateBatchDuration(surfaceCount: number): number {
  // Estimate: ~1.5s per surface in batch, with some parallelism
  const baseTime = surfaceCount * 1500;
  const parallelismFactor = Math.max(1, Math.floor(surfaceCount / GENERATION_BATCH_CONFIG.MAX_PARALLEL_GENERATIONS));
  return Math.floor(baseTime / parallelismFactor);
}

function validateBatchGovernance(
  planned: PlannedSurface[],
  totalAvailable: number,
  warnings: string[]
): boolean {
  // Check batch size limits
  if (planned.length > SURFACE_GENERATION_CONFIG.MAX_BATCH_SIZE) {
    warnings.push(`Batch size ${planned.length} exceeds max ${SURFACE_GENERATION_CONFIG.MAX_BATCH_SIZE}`);
    return false;
  }

  // Warn if batch is large relative to available
  if (totalAvailable > 0 && planned.length / totalAvailable > 0.5) {
    warnings.push('Batch covers >50% of available surfaces - consider smaller batches');
  }

  // Check surface type distribution
  const typeCounts = new Map<GrowthSurfaceType, number>();
  for (const surface of planned) {
    const count = typeCounts.get(surface.surfaceType) ?? 0;
    typeCounts.set(surface.surfaceType, count + 1);
  }

  // Warn if too many of one type
  for (const [type, count] of typeCounts) {
    const maxAllowed = getSurfaceTypeLimit(type) * 0.1; // 10% of max
    if (count > maxAllowed) {
      warnings.push(`${type} count ${count} in batch may exceed healthy distribution`);
    }
  }

  return warnings.filter(w => w.startsWith('Batch size')).length === 0;
}

function getSurfaceTypeLimit(surfaceType?: GrowthSurfaceType): number {
  if (!surfaceType) {
    return SURFACE_GENERATION_CONFIG.MAX_DAILY_GENERATIONS;
  }

  switch (surfaceType) {
    case GrowthSurfaceType.SHOP_PAGE:
      return SURFACE_GENERATION_CONFIG.MAX_SHOP_PAGES;
    case GrowthSurfaceType.CATEGORY_PAGE:
      return SURFACE_GENERATION_CONFIG.MAX_CATEGORY_PAGES;
    case GrowthSurfaceType.INTENT_PAGE:
      return SURFACE_GENERATION_CONFIG.MAX_INTENT_PAGES;
    case GrowthSurfaceType.DISCOVERY_PAGE:
      return SURFACE_GENERATION_CONFIG.MAX_DISCOVERY_PAGES;
    case GrowthSurfaceType.RANKING_PAGE:
      return SURFACE_GENERATION_CONFIG.MAX_RANKING_PAGES;
    case GrowthSurfaceType.GUIDE_PAGE:
      return SURFACE_GENERATION_CONFIG.MAX_GUIDE_PAGES;
    default:
      return 1000;
  }
}
