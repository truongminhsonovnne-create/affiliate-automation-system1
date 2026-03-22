/**
 * Surface Eligibility Evaluator
 *
 * Evaluates whether a surface/page is eligible for generation and indexing.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceType,
  GrowthSurfaceEligibilityDecision,
  GrowthSurfaceGenerationDecision,
} from '../types';
import {
  QUALITY_SCORE_CONFIG,
  USEFULNESS_SCORE_CONFIG,
  THIN_CONTENT_CONFIG,
  DUPLICATE_CONTENT_CONFIG,
  TOOL_ALIGNMENT_CONFIG,
} from '../constants';

export interface EligibilityContext {
  sourceEntityData?: Record<string, unknown>;
  existingSurfaces?: GrowthSurfaceInventoryRecord[];
  contentData?: {
    characterCount?: number;
    wordCount?: number;
    hasCta?: boolean;
    ctaCount?: number;
    hasValuableContent?: boolean;
  };
}

/**
 * Evaluate growth surface eligibility
 */
export function evaluateGrowthSurfaceEligibility(
  surface: GrowthSurfaceInventoryRecord,
  context?: EligibilityContext
): GrowthSurfaceEligibilityDecision {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const conditions: string[] = [];

  // Check data sufficiency
  if (!surface.sourceEntityId || !surface.sourceEntityType) {
    reasons.push('Surface lacks source entity reference');
  }

  // Check content sufficiency
  if (context?.contentData) {
    const { characterCount = 0, wordCount = 0, hasValuableContent = false } = context.contentData;

    if (characterCount < THIN_CONTENT_CONFIG.MIN_CHARS_FOR_INDEXABLE) {
      reasons.push(`Content too thin: ${characterCount} chars (min: ${THIN_CONTENT_CONFIG.MIN_CHARS_FOR_INDEXABLE})`);
    }

    if (!hasValuableContent) {
      warnings.push('Content may not provide sufficient value');
    }

    if (wordCount < THIN_CONTENT_CONFIG.MIN_WORDS_FOR_INDEXABLE) {
      conditions.push('Add more substantive content');
    }
  }

  // Check duplication risk
  if (context?.existingSurfaces) {
    const similarSurfaces = findSimilarSurfaces(surface, context.existingSurfaces);
    if (similarSurfaces.length > 0) {
      warnings.push(`Found ${similarSurfaces.length} potentially duplicate surfaces`);
      conditions.push('Ensure unique value proposition');
    }
  }

  const eligible = reasons.length === 0;

  return {
    eligible,
    reasons,
    warnings,
    conditions: conditions.length > 0 ? conditions : undefined,
  };
}

/**
 * Check if surface is eligible for generation
 */
export function isGrowthSurfaceEligibleForGeneration(
  surface: GrowthSurfaceInventoryRecord,
  context?: EligibilityContext
): boolean {
  const decision = evaluateGrowthSurfaceEligibility(surface, context);
  return decision.eligible;
}

/**
 * Check if surface is eligible for indexing
 */
export function isGrowthSurfaceEligibleForIndexing(
  surface: GrowthSurfaceInventoryRecord,
  context?: EligibilityContext
): boolean {
  // Must be active
  if (surface.pageStatus !== 'active') {
    return false;
  }

  // Check quality score
  if (surface.qualityScore !== null && surface.qualityScore < QUALITY_SCORE_CONFIG.ACCEPTABLE_THRESHOLD) {
    return false;
  }

  // Check usefulness score
  if (surface.usefulnessScore !== null && surface.usefulnessScore < USEFULNESS_SCORE_CONFIG.MEDIUM_USE_THRESHOLD) {
    return false;
  }

  // Check content data if provided
  if (context?.contentData) {
    const { characterCount = 0 } = context.contentData;

    if (characterCount < THIN_CONTENT_CONFIG.MIN_CHARS_FOR_INDEXABLE) {
      return false;
    }
  }

  return true;
}

/**
 * Build growth surface eligibility decision
 */
export function buildGrowthSurfaceEligibilityDecision(
  surface: GrowthSurfaceInventoryRecord,
  context?: EligibilityContext
): GrowthSurfaceEligibilityDecision {
  return evaluateGrowthSurfaceEligibility(surface, context);
}

/**
 * Evaluate generation decision for a surface
 */
export function evaluateGrowthSurfaceGenerationDecision(
  surface: GrowthSurfaceInventoryRecord,
  context?: EligibilityContext
): GrowthSurfaceGenerationDecision {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const batchPriority = calculateBatchPriority(surface);

  // Check if surface is blocked
  if (surface.pageStatus === 'blocked' || surface.pageStatus === 'deindexed') {
    return {
      canGenerate: false,
      strategy: surface.generationStrategy,
      reasons: ['Surface is blocked or deindexed'],
      warnings,
    };
  }

  // Check if surface is already active and fresh
  if (surface.pageStatus === 'active' && surface.freshnessStatus === 'fresh') {
    return {
      canGenerate: false,
      strategy: surface.generationStrategy,
      reasons: ['Surface is already active and fresh'],
      warnings: ['Consider refresh schedule'],
      batchPriority,
    };
  }

  // Check eligibility
  const eligibility = evaluateGrowthSurfaceEligibility(surface, context);

  if (!eligibility.eligible) {
    return {
      canGenerate: false,
      strategy: surface.generationStrategy,
      reasons: eligibility.reasons,
      warnings: eligibility.warnings,
    };
  }

  // Determine if can generate
  const canGenerate = surface.pageStatus !== 'generating';

  if (canGenerate) {
    reasons.push('Surface is eligible for generation');
  }

  return {
    canGenerate,
    strategy: surface.generationStrategy,
    reasons,
    warnings: [...warnings, ...eligibility.warnings],
    batchPriority,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function findSimilarSurfaces(
  surface: GrowthSurfaceInventoryRecord,
  existingSurfaces: GrowthSurfaceInventoryRecord[]
): GrowthSurfaceInventoryRecord[] {
  // Simple similarity check - in production would use more sophisticated matching
  return existingSurfaces.filter(existing => {
    if (existing.id === surface.id) return false;
    if (existing.surfaceType !== surface.surfaceType) return false;
    // Check for similar slugs
    return existing.slug.includes(surface.slug) || surface.slug.includes(existing.slug);
  });
}

function calculateBatchPriority(surface: GrowthSurfaceInventoryRecord): number {
  let priority = 50; // Default priority

  // Higher priority for stale surfaces
  if (surface.freshnessStatus === 'stale') {
    priority += 30;
  } else if (surface.freshnessStatus === 'needs_refresh') {
    priority += 20;
  }

  // Higher priority for pending surfaces
  if (surface.pageStatus === 'pending') {
    priority += 20;
  }

  // Higher priority for higher quality surfaces
  if (surface.qualityScore !== null) {
    priority += Math.floor(surface.qualityScore / 10);
  }

  return Math.min(100, priority);
}
