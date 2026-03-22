/**
 * Freshness Service
 *
 * Manages content freshness tracking and refresh recommendations.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceFreshnessDecision,
  GrowthSurfaceFreshnessStatus,
  GrowthSurfaceType,
} from '../types';
import { FRESHNESS_CONFIG, STALE_SURFACE_CONFIG } from '../constants';

export interface FreshnessAssessment {
  status: GrowthSurfaceFreshnessStatus;
  daysSinceUpdate: number;
  needsRefresh: boolean;
  refreshRecommended: boolean;
  reasons: string[];
}

/**
 * Evaluate content freshness for a surface
 */
export function evaluateSurfaceFreshness(
  surface: GrowthSurfaceInventoryRecord,
  currentDate?: Date
): GrowthSurfaceFreshnessDecision {
  const now = currentDate ?? new Date();
  const daysSinceUpdate = calculateDaysSinceUpdate(surface, now);

  const { isFresh, needsRefresh } = determineFreshnessStatus(
    surface.surfaceType,
    daysSinceUpdate
  );

  return {
    isFresh,
    needsRefresh,
    daysSinceUpdate,
    refreshRecommended: needsRefresh || daysSinceUpdate >= FRESHNESS_CONFIG.AUTO_REFRESH_TRIGGER_DAYS,
  };
}

/**
 * Assess freshness for governance purposes
 */
export function assessFreshness(
  surface: GrowthSurfaceInventoryRecord,
  currentDate?: Date
): FreshnessAssessment {
  const decision = evaluateSurfaceFreshness(surface, currentDate);

  const reasons: string[] = [];

  if (decision.isFresh) {
    reasons.push(`Content is fresh (${decision.daysSinceUpdate} days since update)`);
  }

  if (decision.needsRefresh) {
    reasons.push(`Content needs refresh (${decision.daysSinceUpdate} days old)`);
  }

  if (decision.refreshRecommended) {
    reasons.push('Auto-refresh recommended based on trigger threshold');
  }

  // Check for stale status
  if (decision.daysSinceUpdate >= STALE_SURFACE_CONFIG.STALE_THRESHOLD_DAYS) {
    reasons.push(`Surface marked stale (${decision.daysSinceUpdate} days > ${STALE_SURFACE_CONFIG.STALE_THRESHOLD_DAYS} threshold)`);
  }

  // Check for orphan status
  if (decision.daysSinceUpdate >= STALE_SURFACE_CONFIG.ORPHAN_THRESHOLD_DAYS) {
    reasons.push(`Surface may be orphaned (${decision.daysSinceUpdate} days > ${STALE_SURFACE_CONFIG.ORPHAN_THRESHOLD_DAYS} threshold)`);
  }

  return {
    status: determineStatusFromDecision(decision),
    daysSinceUpdate: decision.daysSinceUpdate,
    needsRefresh: decision.needsRefresh,
    refreshRecommended: decision.refreshRecommended,
    reasons,
  };
}

/**
 * Get surfaces needing refresh
 */
export function getSurfacesNeedingRefresh(
  surfaces: GrowthSurfaceInventoryRecord[],
  currentDate?: Date
): {
  surface: GrowthSurfaceInventoryRecord;
  priority: number;
  reason: string;
}[] {
  const needingRefresh: {
    surface: GrowthSurfaceInventoryRecord;
    priority: number;
    reason: string;
  }[] = [];

  for (const surface of surfaces) {
    const assessment = assessFreshness(surface, currentDate);

    if (assessment.needsRefresh || assessment.refreshRecommended) {
      const priority = calculateRefreshPriority(surface, assessment);

      let reason = 'Needs refresh';
      if (assessment.status === GrowthSurfaceFreshnessStatus.STALE) {
        reason = 'Content is stale';
      } else if (assessment.status === GrowthSurfaceFreshnessStatus.NEEDS_REFRESH) {
        reason = 'Refresh recommended';
      }

      needingRefresh.push({ surface, priority, reason });
    }
  }

  // Sort by priority
  needingRefresh.sort((a, b) => b.priority - a.priority);

  return needingRefresh;
}

/**
 * Update freshness status for a surface
 */
export function updateSurfaceFreshness(
  surface: GrowthSurfaceInventoryRecord,
  currentDate?: Date
): GrowthSurfaceFreshnessStatus {
  const assessment = assessFreshness(surface, currentDate);
  return assessment.status;
}

/**
 * Get refresh cadence for surface type
 */
export function getRefreshCadence(surfaceType: GrowthSurfaceType): number {
  return FRESHNESS_CONFIG.REFRESH_CADENCE[surfaceType] ?? 14;
}

/**
 * Calculate next refresh date for a surface
 */
export function calculateNextRefreshDate(
  surface: GrowthSurfaceInventoryRecord,
  currentDate?: Date
): Date {
  const cadence = getRefreshCadence(surface.surfaceType);
  const lastGenerated = surface.lastGeneratedAt ?? surface.updatedAt;
  const nextDate = new Date(lastGenerated);
  nextDate.setDate(nextDate.getDate() + cadence);

  return nextDate;
}

/**
 * Check if surface is overdue for refresh
 */
export function isOverdueForRefresh(
  surface: GrowthSurfaceInventoryRecord,
  currentDate?: Date
): boolean {
  const nextRefresh = calculateNextRefreshDate(surface, currentDate);
  const now = currentDate ?? new Date();

  return now > nextRefresh;
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateDaysSinceUpdate(surface: GrowthSurfaceInventoryRecord, currentDate: Date): number {
  const lastUpdate = surface.lastGeneratedAt ?? surface.updatedAt;
  const diffTime = Math.abs(currentDate.getTime() - lastUpdate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function determineFreshnessStatus(
  surfaceType: GrowthSurfaceType,
  daysSinceUpdate: number
): { isFresh: boolean; needsRefresh: boolean } {
  const cadence = FRESHNESS_CONFIG.REFRESH_CADENCE[surfaceType] ?? 14;
  const freshWindow = FRESHNESS_CONFIG.FRESH_WINDOW_DAYS;
  const needsRefreshWindow = FRESHNESS_CONFIG.NEEDS_REFRESH_WINDOW_DAYS;

  const isFresh = daysSinceUpdate <= freshWindow;
  const needsRefresh = daysSinceUpdate >= needsRefreshWindow;

  return { isFresh, needsRefresh };
}

function determineStatusFromDecision(
  decision: GrowthSurfaceFreshnessDecision
): GrowthSurfaceFreshnessStatus {
  if (decision.daysSinceUpdate >= STALE_SURFACE_CONFIG.STALE_THRESHOLD_DAYS) {
    return GrowthSurfaceFreshnessStatus.STALE;
  }

  if (decision.needsRefresh) {
    return GrowthSurfaceFreshnessStatus.NEEDS_REFRESH;
  }

  return GrowthSurfaceFreshnessStatus.FRESH;
}

function calculateRefreshPriority(
  surface: GrowthSurfaceInventoryRecord,
  assessment: FreshnessAssessment
): number {
  let priority = 50;

  // Higher priority for stale surfaces
  if (assessment.status === GrowthSurfaceFreshnessStatus.STALE) {
    priority += 40;
  } else if (assessment.status === GrowthSurfaceFreshnessStatus.NEEDS_REFRESH) {
    priority += 25;
  }

  // Higher priority for older content
  if (assessment.daysSinceUpdate >= 60) {
    priority += 15;
  } else if (assessment.daysSinceUpdate >= 30) {
    priority += 10;
  }

  // Adjust based on surface type
  switch (surface.surfaceType) {
    case GrowthSurfaceType.RANKING_PAGE:
      priority += 10; // Rankings need frequent updates
      break;
    case GrowthSurfaceType.SHOP_PAGE:
      priority += 5;
      break;
    case GrowthSurfaceType.GUIDE_PAGE:
      priority -= 10; // Guides are more evergreen
      break;
  }

  // Lower priority for low quality surfaces (don't waste resources)
  if (surface.qualityScore !== null && surface.qualityScore < 40) {
    priority -= 20;
  }

  return Math.max(0, Math.min(100, priority));
}
