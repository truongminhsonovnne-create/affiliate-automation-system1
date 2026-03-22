/**
 * Indexability Policy
 *
 * Controls which growth surfaces should be indexed by search engines
 * - Avoid indexing thin/useless pages
 * - Clean index policy
 * - Not greedy
 */

import type { GrowthSurfaceType, GrowthSurfaceSeoModel } from '../types/index.js';
import { INDEXABILITY_POLICY, CONTENT_DENSITY_LIMITS } from '../constants/index.js';
import { isThinContent } from '../seo/seoModelBuilder.js';

// ============================================================================
// Indexability Decision
// ============================================================================

/**
 * Determine if a growth surface should be indexed
 */
export function shouldIndexGrowthSurface(
  surfaceType: GrowthSurfaceType,
  seo: GrowthSurfaceSeoModel,
  additionalChecks?: {
    hasEnoughContent?: boolean;
    hasValidCta?: boolean;
    isPopular?: boolean;
  }
): {
  shouldIndex: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Check if always indexed
  if (INDEXABILITY_POLICY.ALWAYS_INDEX.includes(surfaceType as typeof INDEXABILITY_POLICY.ALWAYS_INDEX[number])) {
    reasons.push('Tool explainer pages are always indexed');
    return { shouldIndex: true, reasons };
  }

  // Check if never indexed
  if (INDEXABILITY_POLICY.NEVER_INDEX.includes(surfaceType as typeof INDEXABILITY_POLICY.NEVER_INDEX[number])) {
    reasons.push('Discovery pages are never indexed');
    return { shouldIndex: false, reasons };
  }

  // For conditional index types (shop, category)
  if (INDEXABILITY_POLICY.CONDITIONAL_INDEX.includes(surfaceType as typeof INDEXABILITY_POLICY.CONDITIONAL_INDEX[number])) {
    // Check for thin content
    if (isThinContent(seo)) {
      reasons.push('Content is too thin for indexing');
      return { shouldIndex: false, reasons };
    }

    // Check content length requirements
    if (INDEXABILITY_POLICY.REQUIRES_DESCRIPTION && seo.description.length < CONTENT_DENSITY_LIMITS.MIN_DESCRIPTION_LENGTH) {
      reasons.push('Description too short');
      return { shouldIndex: false, reasons };
    }

    // Check additional requirements
    if (additionalChecks) {
      if (additionalChecks.hasEnoughContent === false) {
        reasons.push('Not enough unique content');
        return { shouldIndex: false, reasons };
      }

      if (additionalChecks.hasValidCta === false) {
        reasons.push('Missing valid CTA');
        return { shouldIndex: false, reasons };
      }

      // Only index popular surfaces (optional - prevents indexing low-quality pages)
      if (additionalChecks.isPopular === false && !additionalChecks.isPopular) {
        reasons.push('Surface not popular enough for indexing');
        return { shouldIndex: false, reasons };
      }
    }
  }

  reasons.push('Content quality met for indexing');
  return { shouldIndex: true, reasons };
}

/**
 * Build robots meta policy for a surface
 */
export function buildGrowthRobotsPolicy(
  shouldIndex: boolean,
  shouldFollow: boolean = true
): string {
  const directives: string[] = [];

  directives.push(shouldIndex ? 'index' : 'noindex');
  directives.push(shouldFollow ? 'follow' : 'nofollow');

  return directives.join(', ');
}

// ============================================================================
// Thin Content Detection
// ============================================================================

/**
 * Evaluate thin content risk for a surface
 */
export function evaluateThinContentRisk(params: {
  titleLength: number;
  descriptionLength: number;
  highlightCount: number;
  sectionCount: number;
}): {
  isThin: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
} {
  const reasons: string[] = [];
  let riskScore = 0;

  // Check title length
  if (params.titleLength < 10) {
    reasons.push('Title is too short');
    riskScore += 2;
  } else if (params.titleLength < 20) {
    reasons.push('Title could be longer');
    riskScore += 1;
  }

  // Check description length
  if (params.descriptionLength < CONTENT_DENSITY_LIMITS.MIN_DESCRIPTION_LENGTH) {
    reasons.push('Description is too short');
    riskScore += 3;
  } else if (params.descriptionLength < 100) {
    reasons.push('Description could be longer');
    riskScore += 1;
  }

  // Check highlights
  if (params.highlightCount === 0) {
    reasons.push('No highlights provided');
    riskScore += 1;
  }

  // Check sections
  if (params.sectionCount < INDEXABILITY_POLICY.MIN_UNIQUE_SECTIONS) {
    reasons.push('Not enough content sections');
    riskScore += 2;
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (riskScore >= 4) {
    riskLevel = 'high';
  } else if (riskScore >= 2) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return {
    isThin: riskScore >= 3,
    riskLevel,
    reasons,
  };
}

// ============================================================================
// Indexability Validation
// ============================================================================

/**
 * Validate if a surface meets indexability requirements
 */
export function validateIndexability(params: {
  surfaceType: GrowthSurfaceType;
  title: string;
  description: string;
  highlights: string[];
  hasCta: boolean;
}): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check title
  if (params.title.length < 10) {
    errors.push('Title too short for indexing');
  }

  // Check description
  if (params.description.length < CONTENT_DENSITY_LIMITS.MIN_DESCRIPTION_LENGTH) {
    errors.push('Description too short for indexing');
  }

  // Check CTA
  if (!params.hasCta) {
    errors.push('Missing CTA - required for indexing');
  }

  // Check highlights
  if (params.highlights.length === 0) {
    warnings.push('No highlights - content may be too thin');
  }

  // Tool pages are always valid
  if (params.surfaceType === GrowthSurfaceType.TOOL_EXPLAINER) {
    return { isValid: errors.length === 0, errors: [], warnings };
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Sitemap Generation Helpers
// ============================================================================

/**
 * Determine priority for sitemap
 */
export function getSurfacePriority(
  surfaceType: GrowthSurfaceType,
  isPopular?: boolean
): number {
  switch (surfaceType) {
    case GrowthSurfaceType.TOOL_EXPLAINER:
      return 1.0;
    case GrowthSurfaceType.SHOP:
      return isPopular ? 0.8 : 0.6;
    case GrowthSurfaceType.CATEGORY:
      return isPopular ? 0.8 : 0.6;
    case GrowthSurfaceType.DISCOVERY:
      return 0.4;
    default:
      return 0.5;
  }
}

/**
 * Determine change frequency for sitemap
 */
export function getSurfaceChangeFrequency(
  surfaceType: GrowthSurfaceType
): 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' {
  switch (surfaceType) {
    case GrowthSurfaceType.TOOL_EXPLAINER:
      return 'monthly';
    case GrowthSurfaceType.SHOP:
      return 'daily';
    case GrowthSurfaceType.CATEGORY:
      return 'weekly';
    case GrowthSurfaceType.DISCOVERY:
      return 'weekly';
    default:
      return 'weekly';
  }
}
