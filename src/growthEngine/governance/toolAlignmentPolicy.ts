/**
 * Tool Alignment Policy
 *
 * Ensures surfaces maintain tool-first UX with proper CTA discipline.
 * Prevents drift to coupon farm/spam while preserving core value proposition.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceToolAlignmentDecision,
  GrowthSurfaceType,
} from '../types';
import { TOOL_ALIGNMENT_CONFIG, LINK_CONFIG } from '../constants';

export interface ToolAlignmentContext {
  hasCta: boolean;
  ctaCount: number;
  ctaText?: string;
  ctaUrl?: string;
  toolEmphasis?: number;
  navigationLinks?: number;
  navigationDepth?: number;
  outboundLinks?: number;
}

export interface WanderRiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: string[];
  recommendations: string[];
}

/**
 * Evaluate tool alignment for a surface
 */
export function evaluateToolAlignment(
  surface: GrowthSurfaceInventoryRecord,
  context?: ToolAlignmentContext
): GrowthSurfaceToolAlignmentDecision {
  const ctx = buildContext(surface, context);

  // Check CTA presence
  const ctaPreserved = ctx.ctaCount >= TOOL_ALIGNMENT_CONFIG.MIN_CTA_COUNT &&
    ctx.ctaCount <= TOOL_ALIGNMENT_CONFIG.MAX_CTA_COUNT;

  // Calculate tool emphasis score
  const toolEmphasis = calculateToolEmphasis(ctx);

  // Assess wander risk
  const wanderRisk = assessWanderRisk(ctx);

  // Generate recommendations
  const recommendations = generateToolRecommendations(ctx, ctaPreserved, wanderRisk);

  // Determine alignment
  const aligned = ctaPreserved &&
    toolEmphasis >= TOOL_ALIGNMENT_CONFIG.MIN_TOOL_EMPHASIS &&
    wanderRisk.level !== 'critical' &&
    wanderRisk.level !== 'high';

  return {
    aligned,
    ctaPreserved,
    toolEmphasis,
    wanderRisk: wanderRisk.score,
    recommendations,
  };
}

/**
 * Validate CTA configuration for a surface
 */
export function validateCtaConfiguration(
  surface: GrowthSurfaceInventoryRecord,
  context?: ToolAlignmentContext
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ctaCount = context?.ctaCount ?? surface.metadata?.ctaCount as number ?? 0;

  // Check CTA count
  if (ctaCount < TOOL_ALIGNMENT_CONFIG.MIN_CTA_COUNT) {
    errors.push(`Insufficient CTAs: ${ctaCount} (min: ${TOOL_ALIGNMENT_CONFIG.MIN_CTA_COUNT})`);
  } else if (ctaCount > TOOL_ALIGNMENT_CONFIG.MAX_CTA_COUNT) {
    errors.push(`Too many CTAs: ${ctaCount} (max: ${TOOL_ALIGNMENT_CONFIG.MAX_CTA_COUNT})`);
  }

  // Check CTA text quality
  if (context?.ctaText) {
    const textLength = context.ctaText.length;
    if (textLength < 2) {
      errors.push('CTA text too short');
    } else if (textLength > 50) {
      warnings.push('CTA text may be too long');
    }

    // Check for suspicious patterns
    if (isSuspiciousCtaText(context.ctaText)) {
      warnings.push('CTA text contains potentially spammy patterns');
    }
  }

  // Check CTA URL
  if (context?.ctaUrl && !isValidCtaUrl(context.ctaUrl)) {
    errors.push('CTA URL is invalid');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Assess navigation wander risk (users getting lost from tool flow)
 */
export function assessNavigationWanderRisk(
  surface: GrowthSurfaceInventoryRecord,
  context?: ToolAlignmentContext
): WanderRiskAssessment {
  const ctx = buildContext(surface, context);

  let riskScore = 0;
  const factors: string[] = [];
  const recommendations: string[] = [];

  // Check navigation depth
  if (ctx.navigationDepth !== undefined) {
    if (ctx.navigationDepth > TOOL_ALIGNMENT_CONFIG.MAX_NAVIGATION_DEPTH) {
      riskScore += 0.3;
      factors.push(`Deep navigation: ${ctx.navigationDepth} levels (max: ${TOOL_ALIGNMENT_CONFIG.MAX_NAVIGATION_DEPTH})`);
      recommendations.push('Reduce navigation depth to keep users focused on tool');
    }
  }

  // Check navigation link count
  if (ctx.navigationLinks !== undefined) {
    const maxNavLinks = LINK_CONFIG.MAX_NAVIGATION_LINKS;
    if (ctx.navigationLinks > maxNavLinks) {
      riskScore += 0.25;
      factors.push(`Excessive navigation links: ${ctx.navigationLinks} (max: ${maxNavLinks})`);
      recommendations.push('Limit navigation links to essential paths');
    }
  }

  // Check outbound links
  if (ctx.outboundLinks !== undefined) {
    if (ctx.outboundLinks > 3) {
      riskScore += 0.2;
      factors.push(`High outbound links: ${ctx.outboundLinks} (risk of user leakage)`);
      recommendations.push('Minimize outbound links that could distract from tool usage');
    }
  }

  // Check tool emphasis
  const toolEmphasis = calculateToolEmphasis(ctx);
  if (toolEmphasis < 0.3) {
    riskScore += 0.25;
    factors.push(`Low tool emphasis: ${(toolEmphasis * 100).toFixed(0)}% (tools should be central)`);
    recommendations.push('Increase prominence of tool interface');
  }

  // Determine level
  let level: 'low' | 'medium' | 'high' | 'critical';
  if (riskScore >= 0.7) level = 'critical';
  else if (riskScore >= 0.5) level = 'high';
  else if (riskScore >= 0.3) level = 'medium';
  else level = 'low';

  return {
    level,
    score: Math.min(1, riskScore),
    factors,
    recommendations: recommendations.length > 0 ? recommendations : ['Navigation appears optimized'],
  };
}

/**
 * Check if surface maintains tool-first UX
 */
export function isToolFirstUx(surface: GrowthSurfaceInventoryRecord): boolean {
  // Tool entries are inherently tool-first
  if (surface.surfaceType === GrowthSurfaceType.TOOL_ENTRY) {
    return true;
  }

  // For other types, check metadata
  const isToolFirst = surface.metadata?.toolFirstUx as boolean ?? false;
  return isToolFirst;
}

/**
 * Get tool alignment requirements by surface type
 */
export function getToolAlignmentRequirements(
  surfaceType: GrowthSurfaceType
): {
  requiresCta: boolean;
  minCtaCount: number;
  maxCtaCount: number;
  minToolEmphasis: number;
  maxNavigationDepth: number;
  allowsNavigation: boolean;
} {
  const requirements: Record<GrowthSurfaceType, {
    requiresCta: boolean;
    minCtaCount: number;
    maxCtaCount: number;
    minToolEmphasis: number;
    maxNavigationDepth: number;
    allowsNavigation: boolean;
  }> = {
    [GrowthSurfaceType.SHOP_PAGE]: {
      requiresCta: true,
      minCtaCount: 1,
      maxCtaCount: 2,
      minToolEmphasis: 0.3,
      maxNavigationDepth: 2,
      allowsNavigation: true,
    },
    [GrowthSurfaceType.CATEGORY_PAGE]: {
      requiresCta: true,
      minCtaCount: 1,
      maxCtaCount: 2,
      minToolEmphasis: 0.25,
      maxNavigationDepth: 2,
      allowsNavigation: true,
    },
    [GrowthSurfaceType.INTENT_PAGE]: {
      requiresCta: true,
      minCtaCount: 1,
      maxCtaCount: 2,
      minToolEmphasis: 0.35,
      maxNavigationDepth: 2,
      allowsNavigation: true,
    },
    [GrowthSurfaceType.TOOL_ENTRY]: {
      requiresCta: false,
      minCtaCount: 0,
      maxCtaCount: 1,
      minToolEmphasis: 0.6,
      maxNavigationDepth: 1,
      allowsNavigation: false,
    },
    [GrowthSurfaceType.DISCOVERY_PAGE]: {
      requiresCta: true,
      minCtaCount: 1,
      maxCtaCount: 2,
      minToolEmphasis: 0.2,
      maxNavigationDepth: 3,
      allowsNavigation: true,
    },
    [GrowthSurfaceType.RANKING_PAGE]: {
      requiresCta: true,
      minCtaCount: 1,
      maxCtaCount: 2,
      minToolEmphasis: 0.3,
      maxNavigationDepth: 2,
      allowsNavigation: true,
    },
    [GrowthSurfaceType.GUIDE_PAGE]: {
      requiresCta: true,
      minCtaCount: 1,
      maxCtaCount: 2,
      minToolEmphasis: 0.25,
      maxNavigationDepth: 2,
      allowsNavigation: true,
    },
  };

  return requirements[surfaceType] ?? {
    requiresCta: true,
    minCtaCount: 1,
    maxCtaCount: 2,
    minToolEmphasis: 0.3,
    maxNavigationDepth: 2,
    allowsNavigation: true,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildContext(
  surface: GrowthSurfaceInventoryRecord,
  context?: ToolAlignmentContext
): ToolAlignmentContext {
  return {
    hasCta: context?.hasCta ?? surface.metadata?.hasCta as boolean ?? false,
    ctaCount: context?.ctaCount ?? surface.metadata?.ctaCount as number ?? 0,
    ctaText: context?.ctaText ?? surface.metadata?.ctaText as string,
    ctaUrl: context?.ctaUrl ?? surface.metadata?.ctaUrl as string,
    toolEmphasis: context?.toolEmphasis ?? surface.metadata?.toolEmphasis as number,
    navigationLinks: context?.navigationLinks ?? surface.metadata?.navigationLinks as number,
    navigationDepth: context?.navigationDepth ?? surface.metadata?.navigationDepth as number,
    outboundLinks: context?.outboundLinks ?? surface.metadata?.outboundLinks as number,
  };
}

function calculateToolEmphasis(ctx: ToolAlignmentContext): number {
  let score = 0;

  // CTA presence (0-0.4)
  if (ctx.ctaCount > 0) {
    score += Math.min(0.4, ctx.ctaCount * 0.2);
  }

  // Explicit tool emphasis (0-0.4)
  if (ctx.toolEmphasis !== undefined) {
    score += ctx.toolEmphasis * 0.4;
  }

  // Penalize excessive navigation (0-0.2)
  if (ctx.navigationLinks !== undefined && ctx.navigationLinks > LINK_CONFIG.MAX_NAVIGATION_LINKS) {
    score -= 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

function isSuspiciousCtaText(text: string): boolean {
  const suspiciousPatterns = [
    /click\s*here/i,
    /buy\s*now/i,
    /limited\s*time/i,
    /act\s*now/i,
    /best\s*price/i,
    /free\s*gift/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(text));
}

function isValidCtaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    // Allow relative URLs
    return url.startsWith('/') || url.startsWith('.');
  }
}

function generateToolRecommendations(
  ctx: ToolAlignmentContext,
  ctaPreserved: boolean,
  wanderRisk: WanderRiskAssessment
): string[] {
  const recommendations: string[] = [];

  if (!ctaPreserved) {
    if (ctx.ctaCount < TOOL_ALIGNMENT_CONFIG.MIN_CTA_COUNT) {
      recommendations.push(`Add at least ${TOOL_ALIGNMENT_CONFIG.MIN_CTA_COUNT - ctx.ctaCount} more CTA(s)`);
    } else {
      recommendations.push(`Reduce CTAs to ${TOOL_ALIGNMENT_CONFIG.MAX_CTA_COUNT} or fewer`);
    }
  }

  if (wanderRisk.level === 'high' || wanderRisk.level === 'critical') {
    recommendations.push('High wander risk - review navigation structure');
    recommendations.push(...wanderRisk.recommendations);
  }

  if (ctx.toolEmphasis !== undefined && ctx.toolEmphasis < TOOL_ALIGNMENT_CONFIG.MIN_TOOL_EMPHASIS) {
    recommendations.push('Increase tool prominence in page layout');
  }

  if (recommendations.length === 0) {
    recommendations.push('Tool alignment is optimal');
  }

  return recommendations;
}
