/**
 * TikTok Shop Readiness Framework
 *
 * Specialized framework for evaluating TikTok Shop readiness.
 */

import type {
  PlatformCapabilityDescriptor,
  PlatformReadinessStatus,
  PlatformBlocker,
  PlatformWarning,
  TikTokShopReadinessFramework,
} from '../types.js';
import { TIKTOK_SHOP_KEY, TIKTOK_SHOP_CORE_CAPABILITIES, TIKTOK_SHOP_OPERATIONAL_CAPABILITIES, TIKTOK_SHOP_UX_CAPABILITIES, READINESS_THRESHOLDS } from '../constants.js';
import { evaluatePlatformCapability } from '../capabilities/platformCapabilityEvaluator.js';
import { logger } from '../../utils/logger.js';

/**
 * Build TikTok Shop readiness framework
 */
export function buildTikTokShopReadinessFramework(
  capabilities: PlatformCapabilityDescriptor[]
): TikTokShopReadinessFramework {
  return {
    core: {
      productReference: findCapability(capabilities, 'product_reference_parsing'),
      productContext: findCapability(capabilities, 'product_context_resolution'),
      promotionRules: findCapability(capabilities, 'promotion_rule_modeling'),
    },
    operational: {
      commercialAttribution: findCapability(capabilities, 'commercial_attribution'),
      opsGovernance: findCapability(capabilities, 'ops_governance_support'),
    },
    userExperience: {
      publicFlow: findCapability(capabilities, 'public_flow_support'),
      growthSurface: findCapability(capabilities, 'growth_surface_support'),
    },
    overall: determineOverallStatus(capabilities),
  };
}

/**
 * Evaluate TikTok Shop core prerequisites
 */
export function evaluateTikTokShopCorePrerequisites(): {
  status: 'met' | 'partial' | 'unmet';
  blockers: PlatformBlocker[];
  warnings: PlatformWarning[];
  score: number;
} {
  const results: { status: 'met' | 'partial' | 'unmet'; blockers: PlatformBlocker[]; warnings: PlatformWarning[]; score: number } = {
    status: 'unmet',
    blockers: [],
    warnings: [],
    score: 0,
  };

  // Check each core capability
  const capabilities = ['product_reference_parsing', 'product_context_resolution', 'promotion_rule_modeling'];
  let metCount = 0;

  for (const cap of capabilities) {
    const evidence = getCapabilityEvidenceForTikTokShop(cap);
    const evaluated = evaluatePlatformCapability(cap as any, evidence);

    if (evaluated.score >= 0.9) {
      metCount++;
    } else if (evaluated.score > 0) {
      results.warnings.push({
        id: cap,
        category: cap as any,
        severity: 'medium',
        title: `Partial: ${cap}`,
        description: `${cap} is partially implemented`,
        affectedAreas: [cap as any],
      });
    } else {
      results.blockers.push({
        id: cap,
        category: cap as any,
        severity: 'critical',
        title: `Missing: ${cap}`,
        description: `${cap} is not implemented for TikTok Shop`,
        blockingCapabilities: [],
      });
    }
  }

  results.score = metCount / capabilities.length;

  if (metCount === capabilities.length) {
    results.status = 'met';
  } else if (metCount > 0) {
    results.status = 'partial';
  }

  return results;
}

/**
 * Evaluate TikTok Shop operational prerequisites
 */
export function evaluateTikTokShopOperationalPrerequisites(): {
  status: 'met' | 'partial' | 'unmet';
  blockers: PlatformBlocker[];
  warnings: PlatformWarning[];
  score: number;
} {
  const results: { status: 'met' | 'partial' | 'unmet'; blockers: PlatformBlocker[]; warnings: PlatformWarning[]; score: number } = {
    status: 'unmet',
    blockers: [],
    warnings: [],
    score: 0,
  };

  const capabilities = ['commercial_attribution', 'ops_governance_support'];
  let metCount = 0;

  for (const cap of capabilities) {
    const evidence = getCapabilityEvidenceForTikTokShop(cap);
    const evaluated = evaluatePlatformCapability(cap as any, evidence);

    if (evaluated.score >= 0.9) {
      metCount++;
    } else if (evaluated.score > 0) {
      results.warnings.push({
        id: cap,
        category: cap as any,
        severity: 'medium',
        title: `Partial: ${cap}`,
        description: `${cap} is partially implemented`,
        affectedAreas: [cap as any],
      });
    } else {
      results.blockers.push({
        id: cap,
        category: cap as any,
        severity: 'high',
        title: `Missing: ${cap}`,
        description: `${cap} is not implemented for TikTok Shop`,
        blockingCapabilities: [],
      });
    }
  }

  results.score = metCount / capabilities.length;

  if (metCount === capabilities.length) {
    results.status = 'met';
  } else if (metCount > 0) {
    results.status = 'partial';
  }

  return results;
}

/**
 * Evaluate TikTok Shop commercial prerequisites
 */
export function evaluateTikTokShopCommercialPrerequisites(): {
  status: 'met' | 'partial' | 'unmet';
  blockers: PlatformBlocker[];
  warnings: PlatformWarning[];
  score: number;
} {
  const results: { status: 'met' | 'partial' | 'unmet'; blockers: PlatformBlocker[]; warnings: PlatformWarning[]; score: number } = {
    status: 'unmet',
    blockers: [],
    warnings: [],
    score: 0,
  };

  // Commercial requires product context + promotion rules + attribution
  const core = evaluateTikTokShopCorePrerequisites();
  const operational = evaluateTikTokShopOperationalPrerequisites();

  const totalScore = (core.score + operational.score) / 2;

  results.score = totalScore;
  results.blockers = [...core.blockers, ...operational.blockers];
  results.warnings = [...core.warnings, ...operational.warnings];

  if (totalScore >= 0.9) {
    results.status = 'met';
  } else if (totalScore > 0) {
    results.status = 'partial';
  }

  return results;
}

/**
 * Evaluate TikTok Shop user experience prerequisites
 */
export function evaluateTikTokShopUserExperiencePrerequisites(): {
  status: 'met' | 'partial' | 'unmet';
  blockers: PlatformBlocker[];
  warnings: PlatformWarning[];
  score: number;
} {
  const results: { status: 'met' | 'partial' | 'unmet'; blockers: PlatformBlocker[]; warnings: PlatformWarning[]; score: number } = {
    status: 'unmet',
    blockers: [],
    warnings: [],
    score: 0,
  };

  const capabilities = ['public_flow_support', 'growth_surface_support'];
  let metCount = 0;

  for (const cap of capabilities) {
    const evidence = getCapabilityEvidenceForTikTokShop(cap);
    const evaluated = evaluatePlatformCapability(cap as any, evidence);

    if (evaluated.score >= 0.9) {
      metCount++;
    } else if (evaluated.score > 0) {
      results.warnings.push({
        id: cap,
        category: cap as any,
        severity: 'medium',
        title: `Partial: ${cap}`,
        description: `${cap} is partially implemented`,
        affectedAreas: [cap as any],
      });
    } else {
      results.blockers.push({
        id: cap,
        category: cap as any,
        severity: 'high',
        title: `Missing: ${cap}`,
        description: `${cap} is not implemented for TikTok Shop`,
        blockingCapabilities: [],
      });
    }
  }

  results.score = metCount / capabilities.length;

  if (metCount === capabilities.length) {
    results.status = 'met';
  } else if (metCount > 0) {
    results.status = 'partial';
  }

  return results;
}

/**
 * Get TikTok Shop readiness decision
 */
export function getTikTokShopReadinessDecision(): {
  recommendation: 'proceed' | 'hold' | 'not_ready';
  reasoning: string;
  corePrerequisites: ReturnType<typeof evaluateTikTokShopCorePrerequisites>;
  operationalPrerequisites: ReturnType<typeof evaluateTikTokShopOperationalPrerequisites>;
  userExperiencePrerequisites: ReturnType<typeof evaluateTikTokShopUserExperiencePrerequisites>;
} {
  const core = evaluateTikTokShopCorePrerequisites();
  const operational = evaluateTikTokShopOperationalPrerequisites();
  const ux = evaluateTikTokShopUserExperiencePrerequisites();

  const overallScore = (core.score + operational.score + ux.score) / 3;

  let recommendation: 'proceed' | 'hold' | 'not_ready';
  let reasoning: string;

  // Critical blockers from any area
  const hasCriticalBlockers =
    core.blockers.some(b => b.severity === 'critical') ||
    operational.blockers.some(b => b.severity === 'critical') ||
    ux.blockers.some(b => b.severity === 'critical');

  if (hasCriticalBlockers || overallScore < READINESS_THRESHOLDS.HOLD_MIN) {
    recommendation = 'not_ready';
    reasoning = `TikTok Shop has critical blockers or insufficient readiness score (${(overallScore * 100).toFixed(0)}%). Core capabilities must be implemented first.`;
  } else if (overallScore < READINESS_THRESHOLDS.PROCEED_CAUTIOUSLY_MIN) {
    recommendation = 'hold';
    reasoning = `TikTok Shop readiness score is ${(overallScore * 100).toFixed(0)}%. More work needed before proceeding.`;
  } else if (overallScore < READINESS_THRESHOLDS.READY_MIN) {
    recommendation = 'hold';
    reasoning = `TikTok Shop readiness score is ${(overallScore * 100).toFixed(0)}%. Can proceed with caution but some capabilities are incomplete.`;
  } else {
    recommendation = 'proceed';
    reasoning = `TikTok Shop readiness score is ${(overallScore * 100).toFixed(0)}%. Prerequisites are met for expansion.`;
  }

  logger.info({
    msg: 'TikTok Shop readiness decision',
    recommendation,
    reasoning,
    scores: { core: core.score, operational: operational.score, ux: ux.score, overall: overallScore },
  });

  return {
    recommendation,
    reasoning,
    corePrerequisites: core,
    operationalPrerequisites: operational,
    userExperiencePrerequisites: ux,
  };
}

// ============================================================
// Helper Functions
// ============================================================

function findCapability(capabilities: PlatformCapabilityDescriptor[], area: string): PlatformCapabilityDescriptor {
  return capabilities.find(c => c.area === area) || {
    area: area as any,
    status: 'not_started',
    score: 0,
    description: '',
    blockers: [],
    warnings: [],
    dependencies: [],
  };
}

function determineOverallStatus(capabilities: PlatformCapabilityDescriptor[]): PlatformReadinessStatus {
  const score = capabilities.reduce((sum, c) => sum + c.score, 0) / capabilities.length;

  if (score >= READINESS_THRESHOLDS.READY_MIN) return 'ready';
  if (score >= READINESS_THRESHOLDS.PROCEED_CAUTIOUSLY_MIN) return 'proceed_cautiously';
  if (score >= READINESS_THRESHOLDS.HOLD_MIN) return 'hold';
  return 'not_ready';
}

function getCapabilityEvidenceForTikTokShop(capabilityArea: string): Record<string, unknown> {
  // In production, this would check actual implementation status
  // For now, return placeholder that indicates TikTok Shop is not ready
  return {
    hasImplementation: false,
    completionPercent: 0,
    status: 'not_started',
    note: 'TikTok Shop capability not yet implemented',
  };
}
