/**
 * Content Density Policy
 *
 * Evaluates content density to prevent thin content while avoiding clutter.
 * Part of the Clean Scaling governance layer.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceContentDensityDecision,
  GrowthSurfaceType,
} from '../types';
import {
  THIN_CONTENT_CONFIG,
  CLUTTER_CONFIG,
  DUPLICATE_CONTENT_CONFIG,
} from '../constants';

export interface ContentDensityContext {
  characterCount: number;
  wordCount: number;
  sectionCount: number;
  paragraphCount: number;
  imageCount: number;
  linkCount: number;
  ctaCount: number;
  headingCount: number;
  hasValuableContent: boolean;
}

export interface DensityRisk {
  type: 'thin' | 'cluttered' | 'duplicate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  details: string;
}

/**
 * Evaluate content density for a surface
 */
export function evaluateContentDensity(
  surface: GrowthSurfaceInventoryRecord,
  context?: Partial<ContentDensityContext>
): GrowthSurfaceContentDensityDecision {
  const ctx = buildContext(surface, context);

  // Calculate density score
  const densityScore = calculateDensityScore(ctx);

  // Check for thin content
  const isTooThin = checkThinContent(ctx);

  // Check for cluttered content
  const isTooCluttered = checkClutteredContent(ctx);

  // Generate recommendations
  const recommendations = generateDensityRecommendations(ctx, isTooThin, isTooCluttered);

  return {
    isTooThin,
    isTooCluttered,
    densityScore,
    recommendations,
  };
}

/**
 * Assess thin content risk
 */
export function assessThinContentRisk(
  surface: GrowthSurfaceInventoryRecord,
  context?: Partial<ContentDensityContext>
): DensityRisk {
  const ctx = buildContext(surface, context);

  // Calculate thin content risk
  let riskScore = 0;
  const details: string[] = [];

  // Character count risk
  if (ctx.characterCount < THIN_CONTENT_CONFIG.CRITICAL_THIN_CHARS) {
    riskScore += 0.4;
    details.push(`Critical character count: ${ctx.characterCount} (min: ${THIN_CONTENT_CONFIG.CRITICAL_THIN_CHARS})`);
  } else if (ctx.characterCount < THIN_CONTENT_CONFIG.HIGH_THIN_CHARS) {
    riskScore += 0.25;
    details.push(`High character count risk: ${ctx.characterCount} chars`);
  } else if (ctx.characterCount < THIN_CONTENT_CONFIG.MEDIUM_THIN_CHARS) {
    riskScore += 0.1;
    details.push(`Medium character count risk: ${ctx.characterCount} chars`);
  }

  // Word count risk
  if (ctx.wordCount < THIN_CONTENT_CONFIG.MIN_WORDS_FOR_INDEXABLE) {
    riskScore += 0.3;
    details.push(`Critical word count: ${ctx.wordCount} (min: ${THIN_CONTENT_CONFIG.MIN_WORDS_FOR_INDEXABLE})`);
  }

  // Section count risk
  if (ctx.sectionCount < THIN_CONTENT_CONFIG.MIN_SECTIONS) {
    riskScore += 0.2;
    details.push(`Insufficient sections: ${ctx.sectionCount} (min: ${THIN_CONTENT_CONFIG.MIN_SECTIONS})`);
  }

  // Valuable content check
  if (!ctx.hasValuableContent) {
    riskScore += 0.15;
    details.push('No valuable content detected');
  }

  // Determine severity
  const severity = getRiskSeverity(riskScore);

  return {
    type: 'thin',
    severity,
    score: Math.min(1, riskScore),
    details: details.join('; ') || 'Content appears adequate',
  };
}

/**
 * Assess cluttered content risk
 */
export function assessClutterRisk(
  surface: GrowthSurfaceInventoryRecord,
  context?: Partial<ContentDensityContext>
): DensityRisk {
  const ctx = buildContext(surface, context);

  let riskScore = 0;
  const details: string[] = [];

  // Section count
  if (ctx.sectionCount > CLUTTER_CONFIG.MAX_SECTIONS) {
    riskScore += 0.3;
    details.push(`Too many sections: ${ctx.sectionCount} (max: ${CLUTTER_CONFIG.MAX_SECTIONS})`);
  }

  // CTA count
  if (ctx.ctaCount > CLUTTER_CONFIG.MAX_CTA_COUNT) {
    riskScore += 0.25;
    details.push(`Too many CTAs: ${ctx.ctaCount} (max: ${CLUTTER_CONFIG.MAX_CTA_COUNT})`);
  }

  // Link count
  if (ctx.linkCount > CLUTTER_CONFIG.MAX_INTERNAL_LINKS) {
    riskScore += 0.2;
    details.push(`Too many links: ${ctx.linkCount} (max: ${CLUTTER_CONFIG.MAX_INTERNAL_LINKS})`);
  }

  // Image count (if too many images)
  if (ctx.imageCount > 10) {
    riskScore += 0.15;
    details.push(`High image count: ${ctx.imageCount}`);
  }

  // Heading to paragraph ratio
  if (ctx.headingCount > 0 && ctx.paragraphCount > 0) {
    const ratio = ctx.headingCount / ctx.paragraphCount;
    if (ratio > 0.5) {
      riskScore += 0.1;
      details.push(`High heading density: ${ratio.toFixed(2)} ratio`);
    }
  }

  const severity = getRiskSeverity(riskScore);

  return {
    type: 'cluttered',
    severity,
    score: Math.min(1, riskScore),
    details: details.join('; ') || 'Content density appears balanced',
  };
}

/**
 * Get content recommendations based on surface type
 */
export function getContentRecommendationsByType(
  surfaceType: GrowthSurfaceType
): {
  minChars: number;
  recommendedChars: number;
  minWords: number;
  recommendedWords: number;
  minSections: number;
  maxSections: number;
} {
  const configs: Record<GrowthSurfaceType, {
    minChars: number;
    recommendedChars: number;
    minWords: number;
    recommendedWords: number;
    minSections: number;
    maxSections: number;
  }> = {
    [GrowthSurfaceType.SHOP_PAGE]: {
      minChars: 500,
      recommendedChars: 1500,
      minWords: 80,
      recommendedWords: 250,
      minSections: 3,
      maxSections: 6,
    },
    [GrowthSurfaceType.CATEGORY_PAGE]: {
      minChars: 400,
      recommendedChars: 1200,
      minWords: 60,
      recommendedWords: 200,
      minSections: 2,
      maxSections: 5,
    },
    [GrowthSurfaceType.INTENT_PAGE]: {
      minChars: 600,
      recommendedChars: 1800,
      minWords: 100,
      recommendedWords: 300,
      minSections: 3,
      maxSections: 7,
    },
    [GrowthSurfaceType.TOOL_ENTRY]: {
      minChars: 150,
      recommendedChars: 400,
      minWords: 25,
      recommendedWords: 60,
      minSections: 1,
      maxSections: 3,
    },
    [GrowthSurfaceType.DISCOVERY_PAGE]: {
      minChars: 300,
      recommendedChars: 1000,
      minWords: 50,
      recommendedWords: 150,
      minSections: 2,
      maxSections: 5,
    },
    [GrowthSurfaceType.RANKING_PAGE]: {
      minChars: 800,
      recommendedChars: 2500,
      minWords: 150,
      recommendedWords: 400,
      minSections: 4,
      maxSections: 8,
    },
    [GrowthSurfaceType.GUIDE_PAGE]: {
      minChars: 1500,
      recommendedChars: 4000,
      minWords: 300,
      recommendedWords: 700,
      minSections: 5,
      maxSections: 10,
    },
  };

  return configs[surfaceType] ?? {
    minChars: THIN_CONTENT_CONFIG.MIN_CHARS_FOR_INDEXABLE,
    recommendedChars: THIN_CONTENT_CONFIG.RECOMMENDED_CHARS,
    minWords: THIN_CONTENT_CONFIG.MIN_WORDS_FOR_INDEXABLE,
    recommendedWords: THIN_CONTENT_CONFIG.RECOMMENDED_WORDS,
    minSections: THIN_CONTENT_CONFIG.MIN_SECTIONS,
    maxSections: CLUTTER_CONFIG.MAX_SECTIONS,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildContext(
  surface: GrowthSurfaceInventoryRecord,
  context?: Partial<ContentDensityContext>
): ContentDensityContext {
  return {
    characterCount: context?.characterCount ?? surface.metadata?.characterCount as number ?? 0,
    wordCount: context?.wordCount ?? surface.metadata?.wordCount as number ?? 0,
    sectionCount: context?.sectionCount ?? surface.metadata?.sectionCount as number ?? 0,
    paragraphCount: context?.paragraphCount ?? surface.metadata?.paragraphCount as number ?? 0,
    imageCount: context?.imageCount ?? surface.metadata?.imageCount as number ?? 0,
    linkCount: context?.linkCount ?? surface.metadata?.linkCount as number ?? 0,
    ctaCount: context?.ctaCount ?? surface.metadata?.ctaCount as number ?? 0,
    headingCount: context?.headingCount ?? surface.metadata?.headingCount as number ?? 0,
    hasValuableContent: context?.hasValuableContent ?? surface.metadata?.hasValuableContent as boolean ?? false,
  };
}

function calculateDensityScore(ctx: ContentDensityContext): number {
  let score = 50; // Start neutral

  // Character count scoring (0-20)
  const charScore = Math.min(20, (ctx.characterCount / THIN_CONTENT_CONFIG.RECOMMENDED_CHARS) * 20);
  score += charScore;

  // Word count scoring (0-15)
  const wordScore = Math.min(15, (ctx.wordCount / THIN_CONTENT_CONFIG.RECOMMENDED_WORDS) * 15);
  score += wordScore;

  // Section scoring (0-10)
  const idealSections = 5;
  const sectionDiff = Math.abs(ctx.sectionCount - idealSections);
  const sectionScore = Math.max(0, 10 - sectionDiff * 2);
  score += sectionScore;

  // Valuable content bonus (0-5)
  if (ctx.hasValuableContent) {
    score += 5;
  }

  // Penalty for excessive elements
  if (ctx.ctaCount > CLUTTER_CONFIG.MAX_CTA_COUNT) {
    score -= 5;
  }
  if (ctx.linkCount > CLUTTER_CONFIG.MAX_INTERNAL_LINKS) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function checkThinContent(ctx: ContentDensityContext): boolean {
  return (
    ctx.characterCount < THIN_CONTENT_CONFIG.MIN_CHARS_FOR_INDEXABLE ||
    ctx.wordCount < THIN_CONTENT_CONFIG.MIN_WORDS_FOR_INDEXABLE ||
    ctx.sectionCount < THIN_CONTENT_CONFIG.MIN_SECTIONS ||
    !ctx.hasValuableContent
  );
}

function checkClutteredContent(ctx: ContentDensityContext): boolean {
  return (
    ctx.sectionCount > CLUTTER_CONFIG.MAX_SECTIONS ||
    ctx.ctaCount > CLUTTER_CONFIG.MAX_CTA_COUNT ||
    ctx.linkCount > CLUTTER_CONFIG.MAX_INTERNAL_LINKS
  );
}

function generateDensityRecommendations(
  ctx: ContentDensityContext,
  isTooThin: boolean,
  isTooCluttered: boolean
): string[] {
  const recommendations: string[] = [];

  if (isTooThin) {
    if (ctx.characterCount < THIN_CONTENT_CONFIG.MIN_CHARS_FOR_INDEXABLE) {
      recommendations.push(`Add ${THIN_CONTENT_CONFIG.MIN_CHARS_FOR_INDEXABLE - ctx.characterCount} more characters`);
    }
    if (ctx.wordCount < THIN_CONTENT_CONFIG.MIN_WORDS_FOR_INDEXABLE) {
      recommendations.push(`Add ${THIN_CONTENT_CONFIG.MIN_WORDS_FOR_INDEXABLE - ctx.wordCount} more words`);
    }
    if (ctx.sectionCount < THIN_CONTENT_CONFIG.MIN_SECTIONS) {
      recommendations.push('Add more content sections');
    }
    if (!ctx.hasValuableContent) {
      recommendations.push('Include valuable, unique content');
    }
  }

  if (isTooCluttered) {
    if (ctx.sectionCount > CLUTTER_CONFIG.MAX_SECTIONS) {
      recommendations.push(`Reduce sections to ${CLUTTER_CONFIG.MAX_SECTIONS} or fewer`);
    }
    if (ctx.ctaCount > CLUTTER_CONFIG.MAX_CTA_COUNT) {
      recommendations.push(`Limit CTAs to ${CLUTTER_CONFIG.MAX_CTA_COUNT} or fewer`);
    }
    if (ctx.linkCount > CLUTTER_CONFIG.MAX_INTERNAL_LINKS) {
      recommendations.push(`Reduce internal links to ${CLUTTER_CONFIG.MAX_INTERNAL_LINKS} or fewer`);
    }
  }

  if (!isTooThin && !isTooCluttered) {
    recommendations.push('Content density is optimal');
  }

  return recommendations;
}

function getRiskSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 0.7) return 'critical';
  if (score >= 0.5) return 'high';
  if (score >= 0.3) return 'medium';
  return 'low';
}
