/**
 * Platform Readiness Evaluator
 *
 * Evaluates overall platform readiness for expansion.
 */

import type {
  PlatformReadinessScore,
  PlatformReadinessStatus,
  PlatformBlocker,
  PlatformWarning,
  PlatformCapabilityDescriptor,
} from '../types.js';
import { READINESS_THRESHOLDS, READINESS_WEIGHTS, BLOCKER_THRESHOLDS, WARNING_THRESHOLDS } from '../constants.js';
import { evaluatePlatformCapabilitySet, buildPlatformCapabilitySnapshot } from '../capabilities/platformCapabilityEvaluator.js';
import { buildPlatformCapabilityModel } from '../capabilities/platformCapabilityModel.js';
import { logger } from '../../utils/logger.js';

/**
 * Evaluate overall platform readiness
 */
export async function evaluatePlatformReadiness(
  platformKey: string,
  evidenceByArea: Partial<Record<string, Record<string, unknown>>>
): Promise<{
  status: PlatformReadinessStatus;
  score: PlatformReadinessScore;
  blockers: PlatformBlocker[];
  warnings: PlatformWarning[];
}> {
  // Evaluate capabilities
  const capabilities = evaluatePlatformCapabilitySet(platformKey, evidenceByArea as any);

  // Calculate readiness score
  const score = calculateReadinessScore(capabilities);

  // Identify blockers and warnings
  const blockers = identifyBlockers(capabilities);
  const warnings = identifyWarnings(capabilities);

  // Determine overall status
  const status = determineReadinessStatus(score, blockers, warnings);

  // Persist capability snapshots
  try {
    await buildPlatformCapabilitySnapshot(platformKey, capabilities);
  } catch (e) {
    logger.warn({ msg: 'Failed to persist capability snapshots', error: e });
  }

  logger.info({
    msg: 'Platform readiness evaluated',
    platformKey,
    status,
    score: score.overall,
    blockers: blockers.length,
    warnings: warnings.length,
  });

  return { status, score, blockers, warnings };
}

/**
 * Evaluate TikTok Shop readiness specifically
 */
export async function evaluateTikTokShopReadiness(): Promise<{
  status: PlatformReadinessStatus;
  score: PlatformReadinessScore;
  blockers: PlatformBlocker[];
  warnings: PlatformWarning[];
  summary: string;
}> {
  const platformKey = 'tiktok_shop';

  // Get evidence for each capability area
  const evidenceByArea = {
    product_reference_parsing: await getProductReferenceEvidence(platformKey),
    product_context_resolution: await getProductContextEvidence(platformKey),
    promotion_rule_modeling: await getPromotionRuleEvidence(platformKey),
    public_flow_support: await getPublicFlowEvidence(platformKey),
    commercial_attribution: await getCommercialAttributionEvidence(platformKey),
    growth_surface_support: await getGrowthSurfaceEvidence(platformKey),
    ops_governance_support: await getOpsGovernanceEvidence(platformKey),
    bi_readiness_support: await getBiReadinessEvidence(platformKey),
  };

  const result = await evaluatePlatformReadiness(platformKey, evidenceByArea);

  // Generate summary
  const summary = generateReadinessSummary(result.status, result.score, result.blockers);

  return {
    ...result,
    summary,
  };
}

/**
 * Build platform readiness summary
 */
export function buildPlatformReadinessSummary(
  score: PlatformReadinessScore,
  blockers: PlatformBlocker[],
  warnings: PlatformWarning[]
): {
  overall: string;
  domainModel: string;
  operational: string;
  userExperience: string;
  recommendations: string[];
} {
  return {
    overall: score.overall >= READINESS_THRESHOLDS.READY_MIN ? 'READY' :
      score.overall >= READINESS_THRESHOLDS.PROCEED_CAUTIOUSLY_MIN ? 'PROCEED WITH CAUTION' :
        score.overall >= READINESS_THRESHOLDS.HOLD_MIN ? 'HOLD' : 'NOT READY',
    domainModel: score.domainModel >= 0.8 ? 'Good' : score.domainModel >= 0.5 ? 'Needs Work' : 'Poor',
    operational: score.commercialAttribution >= 0.8 ? 'Good' : score.commercialAttribution >= 0.5 ? 'Needs Work' : 'Poor',
    userExperience: score.publicFlow >= 0.8 ? 'Good' : score.publicFlow >= 0.5 ? 'Needs Work' : 'Poor',
    recommendations: generateRecommendations(blockers, warnings),
  };
}

/**
 * Classify blockers and warnings by severity
 */
export function classifyPlatformBlockersAndWarnings(
  capabilities: PlatformCapabilityDescriptor[]
): {
  critical: PlatformBlocker[];
  high: PlatformBlocker[];
  medium: PlatformBlocker[];
  low: PlatformWarning[];
} {
  return {
    critical: capabilities
      .filter(c => c.status === 'not_started' && c.dependencies.length === 0)
      .map(c => ({
        id: c.area,
        category: c.area,
        severity: 'critical' as const,
        title: `Missing: ${c.description}`,
        description: `Capability ${c.area} is not started and blocks dependent capabilities`,
        blockingCapabilities: c.dependencies,
      })),
    high: capabilities
      .filter(c => c.status === 'not_started' && c.dependencies.length > 0)
      .map(c => ({
        id: c.area,
        category: c.area,
        severity: 'high' as const,
        title: `Not Started: ${c.description}`,
        description: `Capability ${c.area} requires dependencies to be completed first`,
        blockingCapabilities: c.dependencies,
      })),
    medium: capabilities
      .filter(c => c.status === 'partial')
      .map(c => ({
        id: c.area,
        category: c.area,
        severity: 'medium' as const,
        title: `Partial: ${c.description}`,
        description: `Capability ${c.area} is partially implemented`,
        blockingCapabilities: [],
      })),
    low: capabilities
      .filter(c => c.warnings.length > 0)
      .flatMap(c => c.warnings.map(w => ({
        id: `${c.area}-${w}`,
        category: c.area,
        severity: 'low' as const,
        title: w,
        description: w,
        affectedAreas: [c.area],
      }))),
  };
}

// ============================================================
// Helper Functions
// ============================================================

function calculateReadinessScore(capabilities: PlatformCapabilityDescriptor[]): PlatformReadinessScore {
  const findScore = (area: string): number => {
    const cap = capabilities.find(c => c.area === area);
    return cap?.score ?? 0;
  };

  return {
    overall: 0, // Calculated below
    domainModel: findScore('product_reference_parsing') * 0.5 + findScore('product_context_resolution') * 0.5,
    parserReference: findScore('product_reference_parsing'),
    productContext: findScore('product_context_resolution'),
    promotionRules: findScore('promotion_rule_modeling'),
    publicFlow: findScore('public_flow_support'),
    commercialAttribution: findScore('commercial_attribution'),
    governance: findScore('ops_governance_support') * 0.5 + findScore('bi_readiness_support') * 0.5,
  };
}

function determineReadinessStatus(
  score: PlatformReadinessScore,
  blockers: PlatformBlocker[],
  warnings: PlatformWarning[]
): PlatformReadinessStatus {
  // Calculate weighted overall score
  score.overall =
    score.domainModel * READINESS_WEIGHTS.DOMAIN_MODEL +
    score.parserReference * READINESS_WEIGHTS.PARSER_REFERENCE +
    score.productContext * READINESS_WEIGHTS.PRODUCT_CONTEXT +
    score.promotionRules * READINESS_WEIGHTS.PROMOTION_RULES +
    score.publicFlow * READINESS_WEIGHTS.PUBLIC_FLOW +
    score.commercialAttribution * READINESS_WEIGHTS.COMMERCIAL_ATTRIBUTION +
    score.governance * READINESS_WEIGHTS.GOVERNANCE;

  // Determine status based on score and blockers/warnings
  const criticalBlockers = blockers.filter(b => b.severity === 'critical').length;
  const highBlockers = blockers.filter(b => b.severity === 'high').length;

  if (criticalBlockers > 0 || score.overall < READINESS_THRESHOLDS.HOLD_MIN) {
    return 'not_ready';
  }

  if (highBlockers > 3 || score.overall < READINESS_THRESHOLDS.PROCEED_CAUTIOUSLY_MIN) {
    return 'hold';
  }

  if (score.overall < READINESS_THRESHOLDS.READY_MIN) {
    return 'proceed_cautiously';
  }

  return 'ready';
}

function identifyBlockers(capabilities: PlatformCapabilityDescriptor[]): PlatformBlocker[] {
  return capabilities
    .filter(cap => cap.status === 'not_started' || cap.blockers.length > 0)
    .map(cap => ({
      id: cap.area,
      category: cap.area,
      severity: cap.status === 'not_started' ? 'critical' as const : 'high' as const,
      title: `Capability Gap: ${cap.area}`,
      description: cap.blockers.length > 0 ? cap.blockers.join('; ') : `${cap.area} is not ready`,
      blockingCapabilities: cap.dependencies,
    }));
}

function identifyWarnings(capabilities: PlatformCapabilityDescriptor[]): PlatformWarning[] {
  return capabilities
    .filter(cap => cap.status === 'partial' || cap.warnings.length > 0)
    .flatMap(cap => {
      const warnings: PlatformWarning[] = [];

      if (cap.status === 'partial') {
        warnings.push({
          id: `${cap.area}-partial`,
          category: cap.area,
          severity: 'medium',
          title: `Partial Implementation: ${cap.area}`,
          description: `${cap.area} is partially implemented`,
          affectedAreas: [cap.area],
        });
      }

      for (const w of cap.warnings) {
        warnings.push({
          id: `${cap.area}-${w}`,
          category: cap.area,
          severity: 'low',
          title: w,
          description: w,
          affectedAreas: [cap.area],
        });
      }

      return warnings;
    });
}

function generateReadinessSummary(
  status: PlatformReadinessStatus,
  score: PlatformReadinessScore,
  blockers: PlatformBlocker[]
): string {
  switch (status) {
    case 'ready':
      return `Platform is ready with overall score ${(score.overall * 100).toFixed(0)}%. All critical capabilities are in place.`;
    case 'proceed_cautiously':
      return `Platform shows promise with overall score ${(score.overall * 100).toFixed(0)}%. Review warnings before proceeding.`;
    case 'hold':
      return `Platform needs more preparation. Overall score: ${(score.overall * 100).toFixed(0)}%. ${blockers.length} blockers identified.`;
    case 'not_ready':
      return `Platform is not ready for expansion. Overall score: ${(score.overall * 100).toFixed(0)}%. Critical blockers must be resolved first.`;
    default:
      return 'Platform readiness is unknown.';
  }
}

function generateRecommendations(blockers: PlatformBlocker[], warnings: PlatformWarning[]): string[] {
  const recommendations: string[] = [];

  if (blockers.length > 0) {
    recommendations.push(`Address ${blockers.length} blockers before expansion`);
  }

  if (warnings.length > 0) {
    recommendations.push(`Review ${warnings.length} warnings`);
  }

  if (blockers.some(b => b.category === 'product_reference_parsing')) {
    recommendations.push('Implement product reference parsing first');
  }

  if (blockers.some(b => b.category === 'product_context_resolution')) {
    recommendations.push('Build product context resolution capability');
  }

  if (blockers.some(b => b.category === 'promotion_rule_modeling')) {
    recommendations.push('Develop promotion rule modeling');
  }

  return recommendations;
}

// Evidence gathering stubs (would connect to real systems in production)
async function getProductReferenceEvidence(platformKey: string): Promise<Record<string, unknown>> {
  return { hasImplementation: platformKey === 'shopee', completionPercent: platformKey === 'shopee' ? 100 : 0 };
}

async function getProductContextEvidence(platformKey: string): Promise<Record<string, unknown>> {
  return { hasImplementation: platformKey === 'shopee', completionPercent: platformKey === 'shopee' ? 100 : 0 };
}

async function getPromotionRuleEvidence(platformKey: string): Promise<Record<string, unknown>> {
  return { hasImplementation: platformKey === 'shopee', completionPercent: platformKey === 'shopee' ? 100 : 0 };
}

async function getPublicFlowEvidence(platformKey: string): Promise<Record<string, unknown>> {
  return { hasImplementation: platformKey === 'shopee', completionPercent: platformKey === 'shopee' ? 100 : 0 };
}

async function getCommercialAttributionEvidence(platformKey: string): Promise<Record<string, unknown>> {
  return { hasImplementation: platformKey === 'shopee', completionPercent: platformKey === 'shopee' ? 100 : 0 };
}

async function getGrowthSurfaceEvidence(platformKey: string): Promise<Record<string, unknown>> {
  return { hasImplementation: platformKey === 'shopee', completionPercent: platformKey === 'shopee' ? 100 : 0 };
}

async function getOpsGovernanceEvidence(platformKey: string): Promise<Record<string, unknown>> {
  return { hasImplementation: platformKey === 'shopee', completionPercent: platformKey === 'shopee' ? 100 : 0 };
}

async function getBiReadinessEvidence(platformKey: string): Promise<Record<string, unknown>> {
  return { hasImplementation: platformKey === 'shopee', completionPercent: platformKey === 'shopee' ? 100 : 0 };
}
