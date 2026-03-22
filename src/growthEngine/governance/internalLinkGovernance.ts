/**
 * Internal Link Governance
 *
 * Manages controlled internal linking between surfaces with priority weights
 * and link limits to maintain clean site architecture.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceLinkGraph,
  GrowthSurfaceLinkDecision,
  GrowthSurfaceLinkType,
} from '../types';
import { LINK_CONFIG } from '../constants';

export interface LinkCandidate {
  targetSurfaceId: string;
  targetRouteKey: string;
  targetSurfaceType: string;
  relevanceScore: number;
  suggestedLinkType: GrowthSurfaceLinkType;
}

export interface LinkValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LinkGraphAnalysis {
  totalLinks: number;
  inboundLinks: Map<string, number>;
  outboundLinks: Map<string, number>;
  orphanedSurfaces: string[];
  hubSurfaces: string[];
  linkDistribution: {
    byType: Record<GrowthSurfaceLinkType, number>;
    total: number;
  };
}

/**
 * Evaluate link decision for a surface
 */
export function evaluateLinkDecision(
  surface: GrowthSurfaceInventoryRecord,
  existingLinks: GrowthSurfaceLinkGraph[],
  candidates?: LinkCandidate[]
): GrowthSurfaceLinkDecision {
  const warnings: string[] = [];

  // Get existing links for this surface
  const outboundFromSurface = existingLinks.filter(
    link => link.fromSurfaceId === surface.id && link.isActive
  );
  const inboundToSurface = existingLinks.filter(
    link => link.toSurfaceId === surface.id && link.isActive
  );

  // Check link limits
  const totalLinks = outboundFromSurface.length;
  const limitReached = totalLinks >= LINK_CONFIG.MAX_LINKS_PER_SURFACE;

  if (limitReached) {
    warnings.push(`Link limit reached: ${totalLinks} links (max: ${LINK_CONFIG.MAX_LINKS_PER_SURFACE})`);
  }

  // Check link type distribution
  const linkTypeCounts = new Map<GrowthSurfaceLinkType, number>();
  for (const link of outboundFromSurface) {
    const count = linkTypeCounts.get(link.linkType) ?? 0;
    linkTypeCounts.set(link.linkType, count + 1);
  }

  // Warn on excessive link types
  const contextualCount = linkTypeCounts.get(GrowthSurfaceLinkType.CONTEXTUAL) ?? 0;
  if (contextualCount > LINK_CONFIG.MAX_CONTEXTUAL_LINKS) {
    warnings.push(`Too many contextual links: ${contextualCount} (max: ${LINK_CONFIG.MAX_CONTEXTUAL_LINKS})`);
  }

  const navigationCount = linkTypeCounts.get(GrowthSurfaceLinkType.NAVIGATION) ?? 0;
  if (navigationCount > LINK_CONFIG.MAX_NAVIGATION_LINKS) {
    warnings.push(`Too many navigation links: ${navigationCount} (max: ${LINK_CONFIG.MAX_NAVIGATION_LINKS})`);
  }

  const ctaCount = linkTypeCounts.get(GrowthSurfaceLinkType.CTA) ?? 0;
  if (ctaCount > LINK_CONFIG.MAX_CTA_LINKS) {
    warnings.push(`Too many CTA links: ${ctaCount} (max: ${LINK_CONFIG.MAX_CTA_LINKS})`);
  }

  const relatedCount = linkTypeCounts.get(GrowthSurfaceLinkType.RELATED) ?? 0;
  if (relatedCount > LINK_CONFIG.MAX_RELATED_LINKS) {
    warnings.push(`Too many related links: ${relatedCount} (max: ${LINK_CONFIG.MAX_RELATED_LINKS})`);
  }

  return {
    links: outboundFromSurface,
    warnings,
    limitReached,
  };
}

/**
 * Generate link recommendations for a surface
 */
export function generateLinkRecommendations(
  surface: GrowthSurfaceInventoryRecord,
  allSurfaces: GrowthSurfaceInventoryRecord[],
  existingLinks: GrowthSurfaceLinkGraph[],
  maxRecommendations?: number
): LinkCandidate[] {
  const recommendations: LinkCandidate[] = [];

  // Get existing outbound links
  const existingOutbound = new Set(
    existingLinks
      .filter(link => link.fromSurfaceId === surface.id)
      .map(link => link.toSurfaceId)
  );

  // Score potential targets
  for (const target of allSurfaces) {
    // Skip self
    if (target.id === surface.id) continue;

    // Skip if already linked
    if (existingOutbound.has(target.id)) continue;

    // Skip if target is not active
    if (target.pageStatus !== 'active') continue;

    // Calculate relevance
    const relevanceScore = calculateLinkRelevance(surface, target);

    // Determine best link type
    const suggestedLinkType = determineLinkType(surface, target);

    recommendations.push({
      targetSurfaceId: target.id,
      targetRouteKey: target.routeKey,
      targetSurfaceType: target.surfaceType,
      relevanceScore,
      suggestedLinkType,
    });
  }

  // Sort by relevance
  recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return recommendations.slice(0, maxRecommendations ?? 5);
}

/**
 * Validate a single link
 */
export function validateLink(
  fromSurface: GrowthSurfaceInventoryRecord,
  toSurface: GrowthSurfaceInventoryRecord,
  linkType: GrowthSurfaceLinkType
): LinkValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate link type limits
  const typeLimit = getLinkTypeLimit(linkType);
  if (typeLimit === 0) {
    errors.push(`Link type ${linkType} is not allowed`);
  }

  // Check for self-link
  if (fromSurface.id === toSurface.id) {
    errors.push('Cannot link to self');
  }

  // Check for duplicate surface types (potential spam signal)
  if (fromSurface.surfaceType === toSurface.surfaceType && fromSurface.slug === toSurface.slug) {
    warnings.push('Linking to very similar surface - may indicate low-value content');
  }

  // Check target status
  if (toSurface.pageStatus !== 'active') {
    warnings.push(`Target surface is ${toSurface.pageStatus} - link may not be valuable`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Analyze link graph for the entire portfolio
 */
export function analyzeLinkGraph(
  surfaces: GrowthSurfaceInventoryRecord[],
  links: GrowthSurfaceLinkGraph[]
): LinkGraphAnalysis {
  const inboundLinks = new Map<string, number>();
  const outboundLinks = new Map<string, number>();
  const byType: Record<GrowthSurfaceLinkType, number> = {
    [GrowthSurfaceLinkType.CONTEXTUAL]: 0,
    [GrowthSurfaceLinkType.NAVIGATION]: 0,
    [GrowthSurfaceLinkType.CTA]: 0,
    [GrowthSurfaceLinkType.RELATED]: 0,
    [GrowthSurfaceLinkType.BREADCRUMB]: 0,
  };

  // Count inbound links
  for (const link of links) {
    if (link.isActive) {
      const count = inboundLinks.get(link.toSurfaceId) ?? 0;
      inboundLinks.set(link.toSurfaceId, count + 1);

      byType[link.linkType]++;
    }
  }

  // Count outbound links
  for (const link of links) {
    if (link.isActive) {
      const count = outboundLinks.get(link.fromSurfaceId) ?? 0;
      outboundLinks.set(link.fromSurfaceId, count + 1);
    }
  }

  // Find orphaned surfaces (no inbound links)
  const orphanedSurfaces: string[] = [];
  for (const surface of surfaces) {
    if (!inboundLinks.has(surface.id) && surface.pageStatus === 'active') {
      orphanedSurfaces.push(surface.id);
    }
  }

  // Find hub surfaces (high outbound links)
  const hubSurfaces: string[] = [];
  const avgOutbound = links.length / surfaces.length;
  for (const [surfaceId, count] of outboundLinks) {
    if (count > avgOutbound * 2) {
      hubSurfaces.push(surfaceId);
    }
  }

  return {
    totalLinks: links.length,
    inboundLinks,
    outboundLinks,
    orphanedSurfaces,
    hubSurfaces,
    linkDistribution: {
      byType,
      total: links.length,
    },
  };
}

/**
 * Get link priority weight for a link type
 */
export function getLinkPriority(linkType: GrowthSurfaceLinkType): number {
  switch (linkType) {
    case GrowthSurfaceLinkType.CTA:
      return LINK_CONFIG.CTA_PRIORITY;
    case GrowthSurfaceLinkType.NAVIGATION:
      return LINK_CONFIG.NAVIGATION_PRIORITY;
    case GrowthSurfaceLinkType.BREADCRUMB:
      return LINK_CONFIG.BREADCRUMB_PRIORITY;
    case GrowthSurfaceLinkType.CONTEXTUAL:
      return LINK_CONFIG.CONTEXTUAL_PRIORITY;
    case GrowthSurfaceLinkType.RELATED:
      return LINK_CONFIG.RELATED_PRIORITY;
    default:
      return 0;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getLinkTypeLimit(linkType: GrowthSurfaceLinkType): number {
  switch (linkType) {
    case GrowthSurfaceLinkType.CONTEXTUAL:
      return LINK_CONFIG.MAX_CONTEXTUAL_LINKS;
    case GrowthSurfaceLinkType.NAVIGATION:
      return LINK_CONFIG.MAX_NAVIGATION_LINKS;
    case GrowthSurfaceLinkType.CTA:
      return LINK_CONFIG.MAX_CTA_LINKS;
    case GrowthSurfaceLinkType.RELATED:
      return LINK_CONFIG.MAX_RELATED_LINKS;
    case GrowthSurfaceLinkType.BREADCRUMB:
      return 1; // Breadcrumbs should only have one
    default:
      return 0;
  }
}

function calculateLinkRelevance(
  fromSurface: GrowthSurfaceInventoryRecord,
  toSurface: GrowthSurfaceInventoryRecord
): number {
  let score = 0;

  // Same category/surface type bonus
  if (fromSurface.surfaceType === toSurface.surfaceType) {
    score += 0.3;
  }

  // Related surface types bonus
  const relatedTypes = getRelatedSurfaceTypes(fromSurface.surfaceType);
  if (relatedTypes.includes(toSurface.surfaceType)) {
    score += 0.4;
  }

  // Quality score bonus
  if (toSurface.qualityScore !== null) {
    score += toSurface.qualityScore / 100 * 0.3;
  }

  return Math.min(1, score);
}

function determineLinkType(
  fromSurface: GrowthSurfaceInventoryRecord,
  toSurface: GrowthSurfaceInventoryRecord
): GrowthSurfaceLinkType {
  // Tool entry should link via CTA
  if (toSurface.surfaceType === 'tool_entry') {
    return GrowthSurfaceLinkType.CTA;
  }

  // Same surface type gets related
  if (fromSurface.surfaceType === toSurface.surfaceType) {
    return GrowthSurfaceLinkType.RELATED;
  }

  // Different but related types get contextual
  return GrowthSurfaceLinkType.CONTEXTUAL;
}

function getRelatedSurfaceTypes(surfaceType: string): string[] {
  const relations: Record<string, string[]> = {
    shop_page: ['category_page', 'tool_entry', 'ranking_page'],
    category_page: ['shop_page', 'intent_page', 'discovery_page'],
    intent_page: ['category_page', 'tool_entry', 'guide_page'],
    tool_entry: ['shop_page', 'ranking_page', 'intent_page'],
    discovery_page: ['category_page', 'guide_page'],
    ranking_page: ['shop_page', 'tool_entry', 'guide_page'],
    guide_page: ['intent_page', 'ranking_page', 'tool_entry'],
  };

  return relations[surfaceType] ?? [];
}
