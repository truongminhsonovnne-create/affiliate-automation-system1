/**
 * Growth Governance Service
 *
 * Central orchestration for all governance decisions and actions.
 * Implements clean scaling without drift to coupon farm/spam.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceGovernanceAction,
  GrowthGovernanceActionType,
  GrowthGovernanceActionStatus,
  GrowthSurfaceStatus,
  GrowthSurfaceIndexabilityStatus,
  GrowthSurfaceType,
} from '../types';
import {
  GOVERNANCE_CONFIG,
  QUALITY_SCORE_CONFIG,
  USEFULNESS_SCORE_CONFIG,
} from '../constants';
import { evaluateSeoGovernance, SeoGovernanceContext } from '../seo/seoGovernanceService';
import { evaluateContentDensity } from '../governance/contentDensityPolicy';
import { evaluateToolAlignment } from '../governance/toolAlignmentPolicy';
import { evaluateSurfaceQuality, QualityEvaluationContext } from '../quality/surfaceQualityEvaluator';
import { analyzeSurfaceUsefulness } from '../quality/usefulnessAnalyzer';
import { assessFreshness } from '../freshness/freshnessService';

export interface GovernanceCheck {
  passed: boolean;
  actions: GovernanceAction[];
  warnings: GovernanceWarning[];
  metadata: GovernanceMetadata;
}

export interface GovernanceAction {
  type: GrowthGovernanceActionType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  surfaceId?: string;
}

export interface GovernanceWarning {
  type: 'thin_content' | 'duplicate_content' | 'low_quality' | 'low_usefulness' | 'stale' | 'clutter';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  surfaceId?: string;
}

export interface GovernanceMetadata {
  checkedAt: Date;
  surfaceCount: number;
  governanceVersion: string;
}

/**
 * Run full governance check on a surface
 */
export function runGovernanceCheck(
  surface: GrowthSurfaceInventoryRecord,
  context?: {
    content?: {
      characterCount?: number;
      wordCount?: number;
      sectionCount?: number;
      hasValuableContent?: boolean;
      ctaCount?: number;
      hasCta?: boolean;
    };
    metrics?: {
      pageViews?: number;
      toolCtaClicks?: number;
      toolEntryConversions?: number;
    };
  }
): GovernanceCheck {
  const actions: GovernanceAction[] = [];
  const warnings: GovernanceWarning[] = [];

  // 1. Quality Check
  const qualityContext: QualityEvaluationContext = {
    characterCount: context?.content?.characterCount,
    wordCount: context?.content?.wordCount,
    sectionCount: context?.content?.sectionCount,
    hasValuableContent: context?.content?.hasValuableContent,
    ctaCount: context?.content?.ctaCount,
    hasCta: context?.content?.hasCta,
  };

  const qualityResult = evaluateSurfaceQuality(surface, qualityContext);

  if (qualityResult.score.overall < GOVERNANCE_CONFIG.REVIEW_QUALITY_THRESHOLD) {
    actions.push({
      type: GrowthGovernanceActionType.MARK_REVIEW,
      priority: 'high',
      reason: `Quality score ${qualityResult.score.overall} below threshold ${GOVERNANCE_CONFIG.REVIEW_QUALITY_THRESHOLD}`,
      surfaceId: surface.id,
    });
  }

  if (qualityResult.review.reviewStatus === 'rejected') {
    actions.push({
      type: GrowthGovernanceActionType.BLOCK,
      priority: 'critical',
      reason: 'Quality review rejected',
      surfaceId: surface.id,
    });
  }

  // 2. Usefulness Check
  const usefulnessResult = analyzeSurfaceUsefulness(surface, undefined, context?.metrics);

  if (usefulnessResult.score.overall < GOVERNANCE_CONFIG.REVIEW_USE_THRESHOLD) {
    warnings.push({
      type: 'low_usefulness',
      severity: 'high',
      message: `Usefulness score ${usefulnessResult.score.overall} below threshold`,
      surfaceId: surface.id,
    });

    if (GOVERNANCE_CONFIG.CRITICAL_LOW_USE_AUTOBLOCK) {
      actions.push({
        type: GrowthGovernanceActionType.MARK_REVIEW,
        priority: 'medium',
        reason: `Usefulness score ${usefulnessResult.score.overall} below threshold`,
        surfaceId: surface.id,
      });
    }
  }

  // 3. Content Density Check
  const densityResult = evaluateContentDensity(surface, qualityContext);

  if (densityResult.isTooThin) {
    warnings.push({
      type: 'thin_content',
      severity: 'high',
      message: 'Content is too thin',
      surfaceId: surface.id,
    });

    if (GOVERNANCE_CONFIG.CRITICAL_THIN_CONTENT_AUTOBLOCK) {
      // Check if critically thin
      const charCount = context?.content?.characterCount ?? 0;
      if (charCount < 100) {
        actions.push({
          type: GrowthGovernanceActionType.BLOCK,
          priority: 'critical',
          reason: 'Critical thin content detected',
          surfaceId: surface.id,
        });
      }
    }
  }

  if (densityResult.isTooCluttered) {
    warnings.push({
      type: 'clutter',
      severity: 'medium',
      message: 'Content is too cluttered',
      surfaceId: surface.id,
    });
  }

  // 4. Tool Alignment Check
  const toolAlignmentResult = evaluateToolAlignment(surface, {
    hasCta: context?.content?.hasCta ?? false,
    ctaCount: context?.content?.ctaCount ?? 0,
  });

  if (!toolAlignmentResult.aligned) {
    warnings.push({
      type: 'low_quality',
      severity: 'medium',
      message: 'Tool alignment issues detected',
      surfaceId: surface.id,
    });
  }

  // 5. Freshness Check
  const freshnessResult = assessFreshness(surface);

  if (freshnessResult.status === 'stale') {
    warnings.push({
      type: 'stale',
      severity: 'high',
      message: 'Content is stale',
      surfaceId: surface.id,
    });

    actions.push({
      type: GrowthGovernanceActionType.REFRESH,
      priority: 'medium',
      reason: 'Content is stale and needs refresh',
      surfaceId: surface.id,
    });
  }

  // 6. SEO Governance Check
  const seoContext: SeoGovernanceContext = {
    characterCount: context?.content?.characterCount,
    wordCount: context?.content?.wordCount,
    hasValuableContent: context?.content?.hasValuableContent,
  };

  const seoResult = evaluateSeoGovernance(surface, seoContext);

  if (!seoResult.decision.indexable) {
    if (!seoResult.decision.noindexReasons.includes('Surface explicitly marked as noindex')) {
      actions.push({
        type: GrowthGovernanceActionType.BLOCK,
        priority: 'high',
        reason: `SEO issues: ${seoResult.decision.noindexReasons.join('; ')}`,
        surfaceId: surface.id,
      });
    }
  }

  const passed = actions.filter(a => a.type === GrowthGovernanceActionType.BLOCK).length === 0;

  return {
    passed,
    actions,
    warnings,
    metadata: {
      checkedAt: new Date(),
      surfaceCount: 1,
      governanceVersion: '1.0.0',
    },
  };
}

/**
 * Determine appropriate governance action based on check results
 */
export function determineGovernanceAction(
  check: GovernanceCheck,
  surface: GrowthSurfaceInventoryRecord
): GrowthSurfaceGovernanceAction | null {
  // Priority: Block > Deindex > Refresh > Mark Review

  const blockAction = check.actions.find(a => a.type === GrowthGovernanceActionType.BLOCK);
  if (blockAction) {
    return createGovernanceAction(surface, GrowthGovernanceActionType.BLOCK, {
      reason: blockAction.reason,
      priority: blockAction.priority,
    });
  }

  const deindexAction = check.actions.find(a => a.type === GrowthGovernanceActionType.DEINDEX);
  if (deindexAction) {
    return createGovernanceAction(surface, GrowthGovernanceActionType.DEINDEX, {
      reason: deindexAction.reason,
      priority: deindexAction.priority,
    });
  }

  const refreshAction = check.actions.find(a => a.type === GrowthGovernanceActionType.REFRESH);
  if (refreshAction) {
    return createGovernanceAction(surface, GrowthGovernanceActionType.REFRESH, {
      reason: refreshAction.reason,
      priority: refreshAction.priority,
    });
  }

  const reviewAction = check.actions.find(a => a.type === GrowthGovernanceActionType.MARK_REVIEW);
  if (reviewAction) {
    return createGovernanceAction(surface, GrowthGovernanceActionType.MARK_REVIEW, {
      reason: reviewAction.reason,
      priority: reviewAction.priority,
    });
  }

  return null;
}

/**
 * Batch governance check for multiple surfaces
 */
export function batchGovernanceCheck(
  surfaces: GrowthSurfaceInventoryRecord[],
  contextMap?: Map<string, {
    content?: {
      characterCount?: number;
      wordCount?: number;
      sectionCount?: number;
      hasValuableContent?: boolean;
      ctaCount?: number;
      hasCta?: boolean;
    };
    metrics?: {
      pageViews?: number;
      toolCtaClicks?: number;
      toolEntryConversions?: number;
    };
  }>
): {
  passed: GovernanceCheck[];
  failed: GovernanceCheck[];
  actions: GovernanceAction[];
} {
  const passed: GovernanceCheck[] = [];
  const failed: GovernanceCheck[] = [];
  const allActions: GovernanceAction[] = [];

  for (const surface of surfaces) {
    const context = contextMap?.get(surface.id);
    const check = runGovernanceCheck(surface, context);

    if (check.passed) {
      passed.push(check);
    } else {
      failed.push(check);
    }

    allActions.push(...check.actions);
  }

  return { passed, failed, actions: allActions };
}

/**
 * Check if scaling should be approved
 */
export function checkScalingReadiness(
  surfaces: GrowthSurfaceInventoryRecord[]
): {
  ready: boolean;
  blockers: string[];
  warnings: string[];
} {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Count by status
  const blockedCount = surfaces.filter(s => s.pageStatus === GrowthSurfaceStatus.BLOCKED).length;
  const deindexedCount = surfaces.filter(s => s.pageStatus === 'deindexed').length;
  const staleCount = surfaces.filter(s => s.pageStatus === 'stale').length;
  const activeCount = surfaces.filter(s => s.pageStatus === 'active').length;

  const total = surfaces.length;

  if (total === 0) {
    blockers.push('No surfaces to scale');
    return { ready: false, blockers, warnings };
  }

  // Check blocked ratio
  if (total > 0) {
    const blockedRatio = blockedCount / total;
    if (blockedRatio > 0.2) {
      blockers.push(`High blocked ratio: ${(blockedRatio * 100).toFixed(1)}%`);
    } else if (blockedRatio > 0.1) {
      warnings.push(`Blocked ratio: ${(blockedRatio * 100).toFixed(1)}%`);
    }
  }

  // Check stale ratio
  if (total > 0) {
    const staleRatio = staleCount / total;
    if (staleRatio > 0.3) {
      blockers.push(`High stale ratio: ${(staleRatio * 100).toFixed(1)}%`);
    } else if (staleRatio > 0.2) {
      warnings.push(`Stale ratio: ${(staleRatio * 100).toFixed(1)}%`);
    }
  }

  // Check quality scores
  const lowQualityCount = surfaces.filter(
    s => s.qualityScore !== null && s.qualityScore < GOVERNANCE_CONFIG.REVIEW_QUALITY_THRESHOLD
  ).length;

  if (total > 0) {
    const lowQualityRatio = lowQualityCount / total;
    if (lowQualityRatio > 0.2) {
      blockers.push(`High low-quality ratio: ${(lowQualityRatio * 100).toFixed(1)}%`);
    } else if (lowQualityRatio > 0.1) {
      warnings.push(`Low-quality ratio: ${(lowQualityRatio * 100).toFixed(1)}%`);
    }
  }

  const ready = blockers.length === 0;

  return { ready, blockers, warnings };
}

// ============================================================================
// Helper Functions
// ============================================================================

function createGovernanceAction(
  surface: GrowthSurfaceInventoryRecord,
  actionType: GrowthGovernanceActionType,
  options: {
    reason: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }
): GrowthSurfaceGovernanceAction {
  return {
    id: crypto.randomUUID(),
    surfaceInventoryId: surface.id,
    actionType,
    actionStatus: GrowthGovernanceActionStatus.PENDING,
    actionPayload: {
      priority: options.priority,
      surfaceType: surface.surfaceType,
    },
    actorId: null,
    actorRole: 'system',
    rationale: options.reason,
    createdAt: new Date(),
    executedAt: null,
  };
}
