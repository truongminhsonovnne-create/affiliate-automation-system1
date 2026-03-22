/**
 * SEO Governance Service
 *
 * Manages indexability, canonical URLs, robots directives, and SEO quality gates.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceSeoDecision,
  GrowthSurfaceIndexabilityStatus,
  GrowthSurfaceType,
} from '../types';
import {
  INDEXABILITY_CONFIG,
  TOOL_ALIGNMENT_CONFIG,
  THIN_CONTENT_CONFIG,
  DUPLICATE_CONTENT_CONFIG,
} from '../constants';

export interface SeoGovernanceContext {
  characterCount?: number;
  wordCount?: number;
  hasValuableContent?: boolean;
  duplicationRisk?: number;
  thinContentRisk?: number;
  hasCanonical?: boolean;
  canonicalUrl?: string;
  hasRobotsDirectives?: boolean;
  noindexTag?: boolean;
}

export interface SeoGovernanceResult {
  decision: GrowthSurfaceSeoDecision;
  governanceActions: SeoGovernanceAction[];
  metadata: SeoGovernanceMetadata;
}

export interface SeoGovernanceAction {
  type: 'set_canonical' | 'add_noindex' | 'remove_noindex' | 'add_robots' | 'fix_canonical';
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SeoGovernanceMetadata {
  checkedAt: Date;
  indexabilityScore: number;
  canonicalValid: boolean;
  robotsDirectivesValid: boolean;
}

/**
 * Evaluate SEO governance for a surface
 */
export function evaluateSeoGovernance(
  surface: GrowthSurfaceInventoryRecord,
  context?: SeoGovernanceContext
): SeoGovernanceResult {
  const governanceActions: SeoGovernanceAction[] = [];
  const noindexReasons: string[] = [];

  // Check indexability status first
  if (surface.indexabilityStatus === GrowthSurfaceIndexabilityStatus.NOINDEX) {
    return {
      decision: {
        indexable: false,
        canonicalRequired: true,
        noindexReasons: ['Surface explicitly marked as noindex'],
        structuredDataAllowed: false,
      },
      governanceActions: [],
      metadata: {
        checkedAt: new Date(),
        indexabilityScore: 0,
        canonicalValid: true,
        robotsDirectivesValid: true,
      },
    };
  }

  // Check canonical URL
  let canonicalValid = true;
  if (context?.hasCanonical === false) {
    canonicalValid = false;
    governanceActions.push({
      type: 'set_canonical',
      reason: 'Surface missing canonical URL',
      priority: 'high',
    });
  }

  if (context?.canonicalUrl && !isValidCanonicalUrl(context.canonicalUrl)) {
    canonicalValid = false;
    governanceActions.push({
      type: 'fix_canonical',
      reason: 'Canonical URL is invalid or malformed',
      priority: 'high',
    });
  }

  // Check thin content risk
  if (context?.thinContentRisk && context.thinContentRisk >= INDEXABILITY_CONFIG.HIGH_THIN_RISK) {
    noindexReasons.push(`High thin content risk: ${(context.thinContentRisk * 100).toFixed(0)}%`);
    governanceActions.push({
      type: 'add_noindex',
      reason: 'Thin content risk exceeds threshold',
      priority: 'high',
    });
  }

  // Check character count minimum
  if (context?.characterCount !== undefined) {
    if (context.characterCount < INDEXABILITY_CONFIG.MIN_CONTENT_FOR_INDEX) {
      noindexReasons.push(`Content too thin: ${context.characterCount} chars (min: ${INDEXABILITY_CONFIG.MIN_CONTENT_FOR_INDEX})`);
    }
  }

  // Check duplication risk
  if (context?.duplicationRisk && context.duplicationRisk >= INDEXABILITY_CONFIG.HIGH_DUPLICATION_RISK) {
    noindexReasons.push(`High duplication risk: ${(context.duplicationRisk * 100).toFixed(0)}%`);
    governanceActions.push({
      type: 'add_noindex',
      reason: 'Duplicate content risk exceeds threshold',
      priority: 'medium',
    });
  }

  // Check robots directives
  let robotsDirectivesValid = true;
  if (context?.noindexTag) {
    noindexReasons.push('Page has noindex meta tag');
    robotsDirectivesValid = false;
  }

  // Determine indexability
  const indexable = noindexReasons.length === 0 &&
    canonicalValid &&
    robotsDirectivesValid &&
    surface.indexabilityStatus !== GrowthSurfaceIndexabilityStatus.CANONICAL_MISMATCH;

  // Calculate indexability score
  const indexabilityScore = calculateIndexabilityScore(
    surface,
    context,
    canonicalValid,
    robotsDirectivesValid,
    noindexReasons.length
  );

  return {
    decision: {
      indexable,
      canonicalRequired: true,
      noindexReasons,
      structuredDataAllowed: indexable,
    },
    governanceActions,
    metadata: {
      checkedAt: new Date(),
      indexabilityScore,
      canonicalValid,
      robotsDirectivesValid,
    },
  };
}

/**
 * Make SEO decision for a surface
 */
export function makeSeoIndexDecision(
  surface: GrowthSurfaceInventoryRecord,
  context?: SeoGovernanceContext
): GrowthSurfaceSeoDecision {
  const result = evaluateSeoGovernance(surface, context);
  return result.decision;
}

/**
 * Check if surface should be indexed
 */
export function shouldIndexSurface(
  surface: GrowthSurfaceInventoryRecord,
  context?: SeoGovernanceContext
): boolean {
  const decision = makeSeoIndexDecision(surface, context);
  return decision.indexable;
}

/**
 * Get robots meta tag configuration
 */
export function getRobotsConfiguration(
  surface: GrowthSurfaceInventoryRecord,
  context?: SeoGovernanceContext
): { robots: string; googlebot: string } {
  const decision = makeSeoIndexDecision(surface, context);

  if (!decision.indexable) {
    return {
      robots: 'noindex, nofollow',
      googlebot: 'noindex, nofollow',
    };
  }

  return {
    robots: 'index, follow',
    googlebot: 'index, follow',
  };
}

/**
 * Generate canonical URL for a surface
 */
export function generateCanonicalUrl(
  surface: GrowthSurfaceInventoryRecord,
  baseUrl: string
): string {
  // Clean the route path
  const cleanPath = surface.routePath.startsWith('/')
    ? surface.routePath
    : `/${surface.routePath}`;

  return `${baseUrl}${cleanPath}`;
}

/**
 * Validate canonical URL format
 */
export function isValidCanonicalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateIndexabilityScore(
  surface: GrowthSurfaceInventoryRecord,
  context: SeoGovernanceContext | undefined,
  canonicalValid: boolean,
  robotsValid: boolean,
  reasonCount: number
): number {
  let score = 100;

  // Canonical penalty
  if (!canonicalValid) score -= 30;

  // Robots penalty
  if (!robotsValid) score -= 30;

  // Noindex reasons penalty
  score -= reasonCount * 15;

  // Quality score bonus/penalty
  if (surface.qualityScore !== null) {
    if (surface.qualityScore >= 80) score += 5;
    else if (surface.qualityScore < 50) score -= 10;
  }

  // Usefulness score penalty
  if (surface.usefulnessScore !== null && surface.usefulnessScore < 30) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get surface type SEO configuration
 */
export function getSurfaceTypeSeoConfig(surfaceType: GrowthSurfaceType): {
  indexableByDefault: boolean;
  requiresCanonical: boolean;
  allowsStructuredData: boolean;
  minContentChars: number;
} {
  const configs: Record<GrowthSurfaceType, {
    indexableByDefault: boolean;
    requiresCanonical: boolean;
    allowsStructuredData: boolean;
    minContentChars: number;
  }> = {
    [GrowthSurfaceType.SHOP_PAGE]: {
      indexableByDefault: true,
      requiresCanonical: true,
      allowsStructuredData: true,
      minContentChars: 500,
    },
    [GrowthSurfaceType.CATEGORY_PAGE]: {
      indexableByDefault: true,
      requiresCanonical: true,
      allowsStructuredData: true,
      minContentChars: 300,
    },
    [GrowthSurfaceType.INTENT_PAGE]: {
      indexableByDefault: true,
      requiresCanonical: true,
      allowsStructuredData: true,
      minContentChars: 400,
    },
    [GrowthSurfaceType.TOOL_ENTRY]: {
      indexableByDefault: true,
      requiresCanonical: true,
      allowsStructuredData: true,
      minContentChars: 100,
    },
    [GrowthSurfaceType.DISCOVERY_PAGE]: {
      indexableByDefault: false,
      requiresCanonical: true,
      allowsStructuredData: false,
      minContentChars: 200,
    },
    [GrowthSurfaceType.RANKING_PAGE]: {
      indexableByDefault: true,
      requiresCanonical: true,
      allowsStructuredData: true,
      minContentChars: 500,
    },
    [GrowthSurfaceType.GUIDE_PAGE]: {
      indexableByDefault: true,
      requiresCanonical: true,
      allowsStructuredData: true,
      minContentChars: 1000,
    },
  };

  return configs[surfaceType] ?? {
    indexableByDefault: true,
    requiresCanonical: true,
    allowsStructuredData: true,
    minContentChars: 300,
  };
}
