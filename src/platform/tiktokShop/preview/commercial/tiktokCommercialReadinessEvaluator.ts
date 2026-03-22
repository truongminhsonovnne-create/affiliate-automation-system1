/**
 * TikTok Shop Commercial Readiness Evaluator
 *
 * Evaluates commercial attribution and monetization readiness.
 */

import { COMMERCIAL_READINESS_THRESHOLDS, ATTRIBUTION_CONFIDENCE_THRESHOLDS } from '../constants.js';
import type {
  TikTokShopCommercialReadinessResult,
  TikTokShopCommercialReadinessDimensions,
  TikTokShopCommercialReadinessStatus,
  TikTokShopPreviewWarning,
  TikTokShopPreviewUsefulnessResult,
  TikTokShopPreviewStabilityResult,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Evaluate commercial readiness
 */
export async function evaluateTikTokCommercialReadiness(
  params: {
    usefulnessResult?: TikTokShopPreviewUsefulnessResult;
    stabilityResult?: TikTokShopPreviewStabilityResult;
    lineageConfidence?: number;
    productContextScore?: number;
    governanceScore?: number;
    operatorScore?: number;
    biIntegrationScore?: number;
  }
): Promise<TikTokShopCommercialReadinessResult> {
  logger.info({ msg: 'Evaluating TikTok commercial readiness' });

  // Evaluate dimensions
  const dimensions = evaluateCommercialReadinessDimensions(params);

  // Calculate overall score
  const overallScore = calculateOverallCommercialScore(dimensions);

  // Determine status
  const status = determineReadinessStatus(overallScore, dimensions);

  // Identify blockers and warnings
  const { blockers, warnings } = identifyCommercialBlockersAndWarnings(dimensions);

  const result: TikTokShopCommercialReadinessResult = {
    overallScore,
    status,
    dimensions,
    blockers,
    warnings,
    readinessLevel: status,
  };

  logger.info({
    msg: 'TikTok commercial readiness evaluated',
    overallScore,
    status,
    blockerCount: blockers.length,
    warningCount: warnings.length,
  });

  return result;
}

/**
 * Evaluate commercial readiness dimensions
 */
function evaluateCommercialReadinessDimensions(
  params: {
    usefulnessResult?: TikTokShopPreviewUsefulnessResult;
    stabilityResult?: TikTokShopPreviewStabilityResult;
    lineageConfidence?: number;
    productContextScore?: number;
    governanceScore?: number;
    operatorScore?: number;
    biIntegrationScore?: number;
  }
): TikTokShopCommercialReadinessDimensions {
  return {
    // Support state stability from stability evaluation
    supportStateStability: params.stabilityResult?.overallScore || 0,

    // Preview usefulness
    previewUsefulness: params.usefulnessResult?.overallScore || 0,

    // Click lineage completeness
    clickLineageCompleteness: (params.lineageConfidence || 0) * 100,

    // Product context completeness
    productContextCompleteness: params.productContextScore || 0,

    // Governance readiness
    governanceReadiness: params.governanceScore || 0,

    // Operator readiness
    operatorReadiness: params.operatorScore || 0,

    // BI/commercial integration readiness
    biIntegrationReadiness: params.biIntegrationScore || 0,
  };
}

/**
 * Calculate overall commercial score
 */
function calculateOverallCommercialScore(dimensions: TikTokShopCommercialReadinessDimensions): number {
  const weights = {
    supportStateStability: 0.15,
    previewUsefulness: 0.20,
    clickLineageCompleteness: 0.20,
    productContextCompleteness: 0.15,
    governanceReadiness: 0.15,
    operatorReadiness: 0.10,
    biIntegrationReadiness: 0.05,
  };

  return Math.round(
    dimensions.supportStateStability * weights.supportStateStability +
    dimensions.previewUsefulness * weights.previewUsefulness +
    dimensions.clickLineageCompleteness * weights.clickLineageCompleteness +
    dimensions.productContextCompleteness * weights.productContextCompleteness +
    dimensions.governanceReadiness * weights.governanceReadiness +
    dimensions.operatorReadiness * weights.operatorReadiness +
    dimensions.biIntegrationReadiness * weights.biIntegrationReadiness
  );
}

/**
 * Determine readiness status
 */
function determineReadinessStatus(
  overallScore: number,
  dimensions: TikTokShopCommercialReadinessDimensions
): TikTokShopCommercialReadinessStatus {
  // Check for blockers first
  if (dimensions.supportStateStability < COMMERCIAL_READINESS_THRESHOLDS.MIN_GOVERNANCE_READINESS) {
    return 'not_ready';
  }

  if (dimensions.previewUsefulness < PREVIEW_USEFULNESS_THRESHOLDS.MIN_USEFUL_SCORE) {
    return 'insufficient_evidence';
  }

  if (dimensions.clickLineageCompleteness < COMMERCIAL_READINESS_THRESHOLDS.MIN_LINEAGE_COMPLETENESS * 100) {
    return 'insufficient_evidence';
  }

  // Determine based on score
  if (overallScore >= COMMERCIAL_READINESS_THRESHOLDS.PRODUCTION_MONETIZATION_SCORE) {
    return 'ready_for_production';
  }

  if (overallScore >= COMMERCIAL_READINESS_THRESHOLDS.PREVIEW_MONETIZATION_SCORE) {
    return 'ready_for_preview_monetization';
  }

  if (overallScore >= COMMERCIAL_READINESS_THRESHOLDS.PROCEED_CAUTIOUSLY_SCORE) {
    return 'proceed_cautiously';
  }

  return 'not_ready';
}

/**
 * Identify blockers and warnings
 */
function identifyCommercialBlockersAndWarnings(
  dimensions: TikTokShopCommercialReadinessDimensions
): { blockers: TikTokShopPreviewWarning[]; warnings: TikTokShopPreviewWarning[] } {
  const blockers: TikTokShopPreviewWarning[] = [];
  const warnings: TikTokShopPreviewWarning[] = [];

  // Support state stability
  if (dimensions.supportStateStability < 40) {
    blockers.push({
      code: 'UNSTABLE_SUPPORT_STATE',
      message: 'Support states are too unstable for commercial attribution',
      severity: 'critical',
      category: 'governance_gap',
      details: { score: dimensions.supportStateStability },
    });
  } else if (dimensions.supportStateStability < 60) {
    warnings.push({
      code: 'SUPPORT_STATE_INSTABILITY',
      message: 'Support state stability is below recommended threshold',
      severity: 'medium',
      category: 'stability_issue',
      details: { score: dimensions.supportStateStability },
    });
  }

  // Preview usefulness
  if (dimensions.previewUsefulness < PREVIEW_USEFULNESS_THRESHOLDS.POOR_SCORE) {
    blockers.push({
      code: 'POOR_PREVIEW_USEFULNESS',
      message: 'Preview usefulness is too low for monetization',
      severity: 'critical',
      category: 'quality_issue',
      details: { score: dimensions.previewUsefulness },
    });
  } else if (dimensions.previewUsefulness < PREVIEW_USEFULNESS_THRESHOLDS.NEEDS_IMPROVEMENT_SCORE) {
    warnings.push({
      code: 'LOW_PREVIEW_USEFULNESS',
      message: 'Preview usefulness needs improvement',
      severity: 'medium',
      category: 'quality_issue',
      details: { score: dimensions.previewUsefulness },
    });
  }

  // Click lineage
  if (dimensions.clickLineageCompleteness < COMMERCIAL_READINESS_THRESHOLDS.MIN_LINEAGE_COMPLETENESS * 100) {
    blockers.push({
      code: 'INCOMPLETE_LINEAGE',
      message: 'Click lineage is not complete enough for attribution',
      severity: 'critical',
      category: 'lineage_gap',
      details: { score: dimensions.clickLineageCompleteness },
    });
  } else if (dimensions.clickLineageCompleteness < 80) {
    warnings.push({
      code: 'PARTIAL_LINEAGE',
      message: 'Click lineage completeness could be improved',
      severity: 'medium',
      category: 'lineage_gap',
      details: { score: dimensions.clickLineageCompleteness },
    });
  }

  // Product context
  if (dimensions.productContextCompleteness < COMMERCIAL_READINESS_THRESHOLDS.MIN_PRODUCT_CONTEXT_COMPLETENESS * 100) {
    blockers.push({
      code: 'INCOMPLETE_PRODUCT_CONTEXT',
      message: 'Product context is not complete enough',
      severity: 'high',
      category: 'context_gap',
      details: { score: dimensions.productContextCompleteness },
    });
  }

  // Governance
  if (dimensions.governanceReadiness < COMMERCIAL_READINESS_THRESHOLDS.MIN_GOVERNANCE_READINESS) {
    blockers.push({
      code: 'INSUFFICIENT_GOVERNANCE',
      message: 'Governance is not ready for commercial operations',
      severity: 'high',
      category: 'governance_gap',
      details: { score: dimensions.governanceReadiness },
    });
  }

  // Operator
  if (dimensions.operatorReadiness < 40) {
    warnings.push({
      code: 'LOW_OPERATOR_READINESS',
      message: 'Operator readiness could be improved',
      severity: 'medium',
      category: 'ops_gap',
      details: { score: dimensions.operatorReadiness },
    });
  }

  // BI integration
  if (dimensions.biIntegrationReadiness < 30) {
    warnings.push({
      code: 'LOW_BI_INTEGRATION',
      message: 'BI/commercial integration needs improvement',
      severity: 'low',
      category: 'ops_gap',
      details: { score: dimensions.biIntegrationReadiness },
    });
  }

  return { blockers, warnings };
}

/**
 * Evaluate attribution lineage readiness
 */
export async function evaluateTikTokAttributionLineageReadiness(
  lineages: Array<{ completeness: number; supportState: string }>
): Promise<{
  ready: boolean;
  score: number;
  blockers: TikTokShopPreviewWarning[];
  warnings: TikTokShopPreviewWarning[];
}> {
  const blockers: TikTokShopPreviewWarning[] = [];
  const warnings: TikTokShopPreviewWarning[] = [];

  if (lineages.length === 0) {
    blockers.push({
      code: 'NO_LINEAGE_DATA',
      message: 'No click lineage data available',
      severity: 'critical',
      category: 'lineage_gap',
    });

    return { ready: false, score: 0, blockers, warnings };
  }

  // Calculate average completeness
  const avgCompleteness = lineages.reduce((sum, l) => sum + l.completeness, 0) / lineages.length;

  if (avgCompleteness < COMMERCIAL_READINESS_THRESHOLDS.MIN_LINEAGE_COMPLETENESS) {
    blockers.push({
      code: 'INCOMPLETE_LINEAGE_DATA',
      message: `Lineage completeness (${avgCompleteness.toFixed(1)}%) below threshold`,
      severity: 'critical',
      category: 'lineage_gap',
      details: { avgCompleteness },
    });
  }

  // Check support state distribution
  const supportedLineages = lineages.filter(
    (l) => l.supportState === 'supported' || l.supportState === 'production_enabled'
  );
  const supportedRatio = supportedLineages.length / lineages.length;

  if (supportedRatio < 0.2) {
    warnings.push({
      code: 'LOW_SUPPORTED_LINEAGE',
      message: `Only ${(supportedRatio * 100).toFixed(1)}% of lineages are from supported state`,
      severity: 'medium',
      category: 'lineage_gap',
      details: { supportedRatio },
    });
  }

  const ready = blockers.length === 0;
  const score = ready ? avgCompleteness : 0;

  return { ready, score, blockers, warnings };
}

/**
 * Evaluate preview monetization safety
 */
export async function evaluateTikTokPreviewMonetizationSafety(
  usefulnessResult: TikTokShopPreviewUsefulnessResult,
  stabilityResult: TikTokShopPreviewStabilityResult
): Promise<{
  safe: boolean;
  score: number;
  reasons: string[];
}> {
  const reasons: string[] = [];
  let score = 100;

  // Check usefulness
  if (usefulnessResult.overallScore < PREVIEW_USEFULNESS_THRESHOLDS.MIN_USEFUL_SCORE) {
    score -= 40;
    reasons.push('Usefulness below safe threshold');
  }

  // Check stability
  if (stabilityResult.overallScore < 60) {
    score -= 30;
    reasons.push('Stability below safe threshold');
  }

  // Check honest representation
  if (usefulnessResult.dimensions.honestRepresentation < 50) {
    score -= 20;
    reasons.push('Honest representation concerns');
  }

  // Check error rate
  if (stabilityResult.errorRate < 50) {
    score -= 10;
    reasons.push('High error rate');
  }

  return {
    safe: score >= 50,
    score: Math.max(0, score),
    reasons,
  };
}

/**
 * Build commercial readiness summary
 */
export function buildTikTokCommercialReadinessSummary(
  result: TikTokShopCommercialReadinessResult
): Record<string, unknown> {
  return {
    overallScore: result.overallScore,
    status: result.status,
    dimensions: result.dimensions,
    blockerCount: result.blockers.length,
    warningCount: result.warnings.length,
    blockers: result.blockers.map((b) => b.code),
    warnings: result.warnings.map((w) => w.code),
    readyForProduction: result.status === 'ready_for_production',
    readyForPreviewMonetization: result.status === 'ready_for_preview_monetization',
    canProceedCautiously: result.status === 'proceed_cautiously',
    generatedAt: new Date().toISOString(),
  };
}
