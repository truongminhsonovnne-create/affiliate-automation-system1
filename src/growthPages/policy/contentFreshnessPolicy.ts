/**
 * Content Freshness Policy
 *
 * Freshness/staleness policy for growth pages
 * - Determine when content needs refresh
 * - Build freshness meta tags
 * - Support cache invalidation
 */

import type { GrowthSurfaceMetadata, GrowthSurfaceType } from '../types/index.js';
import { STALE_THRESHOLDS, CACHE_TTL } from '../constants/index.js';

// ============================================================================
// Freshness Evaluation
// ============================================================================

/**
 * Evaluate freshness of a growth surface
 */
export function evaluateGrowthSurfaceFreshness(
  metadata: GrowthSurfaceMetadata
): {
  isFresh: boolean;
  isStale: boolean;
  needsRefresh: boolean;
  age: number;
  staleFor: number;
} {
  const now = Date.now();
  const age = now - metadata.lastUpdated;
  const staleThreshold = metadata.staleAfter;

  const isFresh = age < staleThreshold;
  const isStale = age > staleThreshold;
  const needsRefresh = isStale;

  return {
    isFresh,
    isStale,
    needsRefresh,
    age,
    staleFor: isStale ? age - staleThreshold : 0,
  };
}

/**
 * Check if a surface should be refreshed
 */
export function shouldRefreshGrowthSurface(
  surfaceType: GrowthSurfaceType,
  metadata: GrowthSurfaceMetadata
): boolean {
  const freshness = evaluateGrowthSurfaceFreshness(metadata);

  // Always refresh if stale
  if (freshness.isStale) {
    return true;
  }

  // Check based on surface type
  const staleThreshold = getStaleThresholdForType(surfaceType);
  const timeSinceLastUpdate = Date.now() - metadata.lastUpdated;

  // Refresh if approaching staleness
  return timeSinceLastUpdate > staleThreshold * 0.9;
}

// ============================================================================
// Freshness Meta Tags
// ============================================================================

/**
 * Build freshness meta tags for a surface
 */
export function buildGrowthFreshnessMeta(
  surfaceType: GrowthSurfaceType,
  metadata: GrowthSurfaceMetadata
): Record<string, string> {
  const freshness = evaluateGrowthSurfaceFreshness(metadata);

  return {
    'cache-control': buildCacheControlHeader(freshness),
    'last-modified': new Date(metadata.lastUpdated).toUTCString(),
    'expires': new Date(metadata.staleAfter).toUTCString(),
    'x-content-age': freshness.age.toString(),
  };
}

/**
 * Build cache-control header
 */
function buildCacheControlHeader(freshness: ReturnType<typeof evaluateGrowthSurfaceFreshness>): string {
  const directives: string[] = [];

  if (freshness.isFresh) {
    directives.push('public');
    directives.push(`max-age=${Math.floor((freshness.age) / 1000)}`);
  } else {
    directives.push('public');
    directives.push('max-age=0');
    directives.push('must-revalidate');
  }

  return directives.join(', ');
}

// ============================================================================
// Stale Threshold Helpers
// ============================================================================

/**
 * Get stale threshold for surface type
 */
function getStaleThresholdForType(surfaceType: GrowthSurfaceType): number {
  switch (surfaceType) {
    case GrowthSurfaceType.SHOP:
      return STALE_THRESHOLDS.SHOP_DATA * 1000;
    case GrowthSurfaceType.CATEGORY:
      return STALE_THRESHOLDS.CATEGORY_DATA * 1000;
    case GrowthSurfaceType.TOOL_EXPLAINER:
      return STALE_THRESHOLDS.TOOL_CONTENT * 1000;
    default:
      return STALE_THRESHOLDS.SHOP_DATA * 1000;
  }
}

// ============================================================================
// Cache TTL Helpers
// ============================================================================

/**
 * Get recommended cache TTL for surface type
 */
export function getRecommendedCacheTtl(surfaceType: GrowthSurfaceType): number {
  switch (surfaceType) {
    case GrowthSurfaceType.SHOP:
      return CACHE_TTL.SHOP_LANDING_SHORT;
    case GrowthSurfaceType.CATEGORY:
      return CACHE_TTL.CATEGORY_LANDING_SHORT;
    case GrowthSurfaceType.TOOL_EXPLAINER:
      return CACHE_TTL.TOOL_EXPLAINER;
    default:
      return CACHE_TTL.STATIC_CONTENT;
  }
}

// ============================================================================
// Freshness Status
// ============================================================================

/**
 * Freshness status for UI display
 */
export type FreshnessStatus = 'fresh' | 'aging' | 'stale';

/**
 * Get freshness status for display
 */
export function getFreshnessStatus(
  surfaceType: GrowthSurfaceType,
  metadata: GrowthSurfaceMetadata
): FreshnessStatus {
  const freshness = evaluateGrowthSurfaceFreshness(metadata);
  const staleThreshold = getStaleThresholdForType(surfaceType);

  const ageRatio = freshness.age / staleThreshold;

  if (ageRatio < 0.7) {
    return 'fresh';
  } else if (ageRatio < 1.0) {
    return 'aging';
  } else {
    return 'stale';
  }
}

/**
 * Get human-readable freshness message
 */
export function getFreshnessMessage(
  status: FreshnessStatus
): string {
  switch (status) {
    case 'fresh':
      return 'Nội dung mới';
    case 'aging':
      return 'Nội dung có thể cần cập nhật';
    case 'stale':
      return 'Nội dung đã cũ';
    default:
      return '';
  }
}

// ============================================================================
// Refresh Planning
// ============================================================================

/**
 * Schedule refresh for a surface
 */
export interface RefreshSchedule {
  surfaceType: GrowthSurfaceType;
  slug: string;
  priority: 'high' | 'medium' | 'low';
  scheduledFor: number;
  reason: string;
}

/**
 * Plan refresh schedule for multiple surfaces
 */
export function planRefreshSchedule(
  surfaces: Array<{
    surfaceType: GrowthSurfaceType;
    slug: string;
    metadata: GrowthSurfaceMetadata;
  }>
): RefreshSchedule[] {
  const schedules: RefreshSchedule[] = [];

  for (const surface of surfaces) {
    const freshness = evaluateGrowthSurfaceFreshness(surface.metadata);
    const staleThreshold = getStaleThresholdForType(surface.surfaceType);

    if (freshness.isStale) {
      schedules.push({
        surfaceType: surface.surfaceType,
        slug: surface.slug,
        priority: 'high',
        scheduledFor: Date.now(),
        reason: 'Content is stale',
      });
    } else if (freshness.age / staleThreshold > 0.8) {
      schedules.push({
        surfaceType: surface.surfaceType,
        slug: surface.slug,
        priority: 'medium',
        scheduledFor: Date.now() + 3600000, // 1 hour from now
        reason: 'Content approaching staleness',
      });
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  schedules.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return schedules;
}
