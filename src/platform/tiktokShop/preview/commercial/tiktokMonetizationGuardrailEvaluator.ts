/**
 * TikTok Shop Monetization Guardrail Evaluator
 *
 * Evaluates guardrails for monetization enablement decisions.
 */

import { MONETIZATION_GUARDRAIL_THRESHOLDS } from '../constants.js';
import type {
  TikTokShopMonetizationGuardrailResult,
  TikTokShopMonetizationGuardrailDecision,
  TikTokShopPreviewWarning,
  TikTokShopCommercialReadinessResult,
  TikTokShopPreviewUsefulnessResult,
  TikTokShopPreviewStabilityResult,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Evaluate monetization guardrails
 */
export async function evaluateTikTokMonetizationGuardrails(
  params: {
    usefulnessResult?: TikTokShopPreviewUsefulnessResult;
    stabilityResult?: TikTokShopPreviewStabilityResult;
    commercialReadinessResult?: TikTokShopCommercialReadinessResult;
    lineageConfidence?: number;
    unsupportedRate?: number;
  }
): Promise<TikTokShopMonetizationGuardrailResult> {
  logger.info({ msg: 'Evaluating TikTok monetization guardrails' });

  // Run all guardrail checks
  const guardrailChecks = runGuardrailChecks(params);

  // Count blockers and warnings
  const blockers = guardrailChecks.filter((g) => g.severity === 'critical' || g.severity === 'high');
  const warnings = guardrailChecks.filter((g) => g.severity === 'medium' || g.severity === 'low');

  // Calculate overall score
  const overallScore = calculateGuardrailScore(guardrailChecks);

  // Determine decision
  const decision = determineGuardrailDecision(blockers, warnings, overallScore);

  const result: TikTokShopMonetizationGuardrailResult = {
    decision,
    overallScore,
    blockers: blockers as TikTokShopPreviewWarning[],
    warnings: warnings as TikTokShopPreviewWarning[],
    guardrailChecks: guardrailChecks.reduce((acc, g) => ({ ...acc, [g.code]: g.passed }), {} as Record<string, boolean>),
  };

  logger.info({
    msg: 'TikTok monetization guardrails evaluated',
    decision,
    overallScore,
    blockerCount: blockers.length,
    warningCount: warnings.length,
  });

  return result;
}

/**
 * Run all guardrail checks
 */
function runGuardrailChecks(
  params: {
    usefulnessResult?: TikTokShopPreviewUsefulnessResult;
    stabilityResult?: TikTokShopPreviewStabilityResult;
    commercialReadinessResult?: TikTokShopCommercialReadinessResult;
    lineageConfidence?: number;
    unsupportedRate?: number;
  }
): Array<{ code: string; passed: boolean; severity: string; message: string }> {
  const checks: Array<{ code: string; passed: boolean; severity: string; message: string }> = [];

  // 1. Preview Quality Check
  const qualityPassed = (params.usefulnessResult?.overallScore || 0) >= MONETIZATION_GUARDRAIL_THRESHOLDS.MIN_QUALITY_FOR_MONETIZATION;
  checks.push({
    code: 'preview_quality',
    passed: qualityPassed,
    severity: qualityPassed ? 'low' : 'critical',
    message: qualityPassed
      ? 'Preview quality meets threshold'
      : `Preview quality (${params.usefulnessResult?.overallScore || 0}) below threshold (${MONETIZATION_GUARDRAIL_THRESHOLDS.MIN_QUALITY_FOR_MONETIZATION})`,
  });

  // 2. Unsupported Rate Check
  const unsupportedRate = params.unsupportedRate || 0;
  const unsupportedPassed = unsupportedRate <= MONETIZATION_GUARDRAIL_THRESHOLDS.MAX_UNSUPPORTED_FOR_MONETIZATION;
  checks.push({
    code: 'unsupported_rate',
    passed: unsupportedPassed,
    severity: unsupportedPassed ? 'low' : 'high',
    message: unsupportedPassed
      ? 'Unsupported rate acceptable'
      : `Unsupported rate (${(unsupportedRate * 100).toFixed(1)}%) exceeds threshold`,
  });

  // 3. Usefulness Check
  const usefulnessPassed = (params.usefulnessResult?.overallScore || 0) >= MONETIZATION_GUARDRAIL_THRESHOLDS.MIN_USEFULNESS_FOR_MONETIZATION;
  checks.push({
    code: 'preview_usefulness',
    passed: usefulnessPassed,
    severity: usefulnessPassed ? 'low' : 'critical',
    message: usefulnessPassed
      ? 'Preview usefulness meets threshold'
      : `Preview usefulness (${params.usefulnessResult?.overallScore || 0}) below threshold`,
  });

  // 4. Stability Check
  const stabilityPassed = (params.stabilityResult?.overallScore || 0) >= MONETIZATION_GUARDRAIL_THRESHOLDS.MIN_STABILITY_FOR_MONETIZATION;
  checks.push({
    code: 'preview_stability',
    passed: stabilityPassed,
    severity: stabilityPassed ? 'low' : 'high',
    message: stabilityPassed
      ? 'Preview stability meets threshold'
      : `Preview stability (${params.stabilityResult?.overallScore || 0}) below threshold`,
  });

  // 5. Lineage Confidence Check
  const lineageConfidence = params.lineageConfidence || 0;
  const lineagePassed = lineageConfidence >= MONETIZATION_GUARDRAIL_THRESHOLDS.MIN_LINEAGE_CONFIDENCE;
  checks.push({
    code: 'lineage_confidence',
    passed: lineagePassed,
    severity: lineagePassed ? 'low' : 'high',
    message: lineagePassed
      ? 'Lineage confidence meets threshold'
      : `Lineage confidence (${(lineageConfidence * 100).toFixed(1)}%) below threshold`,
  });

  // 6. Governance Check
  const governanceScore = params.commercialReadinessResult?.dimensions.governanceReadiness || 0;
  const governancePassed = governanceScore >= MONETIZATION_GUARDRAIL_THRESHOLDS.MIN_GOVERNANCE_SCORE;
  checks.push({
    code: 'governance_ready',
    passed: governancePassed,
    severity: governancePassed ? 'low' : 'high',
    message: governancePassed
      ? 'Governance meets threshold'
      : `Governance score (${governanceScore}) below threshold`,
  });

  // 7. Honest Representation Check
  const honestRepScore = params.usefulnessResult?.dimensions.honestRepresentation || 0;
  const honestRepPassed = honestRepScore >= 60;
  checks.push({
    code: 'honest_representation',
    passed: honestRepPassed,
    severity: honestRepPassed ? 'low' : 'critical',
    message: honestRepPassed
      ? 'Honest representation verified'
      : `Honest representation score (${honestRepScore}) below threshold`,
  });

  // 8. No Deceptive Patterns Check
  const noDeceptivePassed = !hasDeceptivePatterns(params.usefulnessResult);
  checks.push({
    code: 'no_deceptive_patterns',
    passed: noDeceptivePassed,
    severity: noDeceptivePassed ? 'low' : 'critical',
    message: noDeceptivePassed
      ? 'No deceptive patterns detected'
      : 'Deceptive patterns detected in preview UX',
  });

  return checks;
}

/**
 * Check for deceptive patterns
 */
function hasDeceptivePatterns(usefulnessResult?: TikTokShopPreviewUsefulnessResult): boolean {
  if (!usefulnessResult) return false;

  // Check for low honest representation but high overall (suspicious)
  if (usefulnessResult.overallScore > 60 && usefulnessResult.dimensions.honestRepresentation < 40) {
    return true;
  }

  // Check for warnings about misleading states
  return usefulnessResult.warnings.some(
    (w) => w.code.toLowerCase().includes('misleading') || w.code.toLowerCase().includes('honest')
  );
}

/**
 * Calculate guardrail score
 */
function calculateGuardrailScore(
  checks: Array<{ code: string; passed: boolean; severity: string; message: string }>
): number {
  if (checks.length === 0) return 0;

  // Weight by severity
  const severityWeights: Record<string, number> = {
    critical: 20,
    high: 15,
    medium: 10,
    low: 5,
  };

  let totalWeight = 0;
  let passedWeight = 0;

  for (const check of checks) {
    const weight = severityWeights[check.severity] || 5;
    totalWeight += weight;
    if (check.passed) {
      passedWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
}

/**
 * Determine guardrail decision
 */
function determineGuardrailDecision(
  blockers: Array<{ code: string; severity: string; message: string }>,
  warnings: Array<{ code: string; severity: string; message: string }>,
  overallScore: number
): TikTokShopMonetizationGuardrailDecision {
  // Critical blockers = hold
  if (blockers.some((b) => b.severity === 'critical')) {
    return 'hold';
  }

  // High blockers without override = hold
  if (blockers.some((b) => b.severity === 'high')) {
    if (overallScore >= 60) {
      return 'proceed_cautiously';
    }
    return 'hold';
  }

  // Medium warnings = proceed cautiously
  if (warnings.length > 3) {
    return 'proceed_cautiously';
  }

  // Good score = proceed
  if (overallScore >= 80) {
    return 'proceed';
  }

  // Default = proceed cautiously
  if (overallScore >= 50) {
    return 'proceed_cautiously';
  }

  return 'hold';
}

/**
 * Detect monetization risks
 */
export function detectTikTokMonetizationRisks(
  params: {
    usefulnessResult?: TikTokShopPreviewUsefulnessResult;
    stabilityResult?: TikTokShopPreviewStabilityResult;
  }
): TikTokShopPreviewWarning[] {
  const warnings: TikTokShopPreviewWarning[] = [];

  // Risk 1: High unavailable rate
  if ((params.stabilityResult?.errorRate || 0) < 40) {
    warnings.push({
      code: 'HIGH_UNAVAILABLE_RATE',
      message: 'High unavailable rate may cause user frustration',
      severity: 'high',
      category: 'quality_issue',
    });
  }

  // Risk 2: Low honest representation
  if ((params.usefulnessResult?.dimensions.honestRepresentation || 0) < 50) {
    warnings.push({
      code: 'LOW_HONEST_REPRESENTATION',
      message: 'Low honest representation may mislead users',
      severity: 'critical',
      category: 'quality_issue',
    });
  }

  // Risk 3: Poor stability
  if ((params.stabilityResult?.overallScore || 0) < 50) {
    warnings.push({
      code: 'POOR_STABILITY',
      message: 'Poor stability may cause inconsistent user experience',
      severity: 'high',
      category: 'stability_issue',
    });
  }

  // Risk 4: Weak usefulness
  if ((params.usefulnessResult?.overallScore || 0) < 40) {
    warnings.push({
      code: 'WEAK_USEFULNESS',
      message: 'Weak usefulness may not justify monetization',
      severity: 'high',
      category: 'quality_issue',
    });
  }

  return warnings;
}

/**
 * Build guardrail decision summary
 */
export function buildTikTokMonetizationGuardrailDecision(
  result: TikTokShopMonetizationGuardrailResult
): Record<string, unknown> {
  return {
    decision: result.decision,
    overallScore: result.overallScore,
    blockerCount: result.blockers.length,
    warningCount: result.warnings.length,
    passedChecks: Object.values(result.guardrailChecks).filter((p) => p).length,
    failedChecks: Object.values(result.guardrailChecks).filter((p) => !p).length,
    guardrailChecks: result.guardrailChecks,
    blockers: result.blockers.map((b) => b.code),
    warnings: result.warnings.map((w) => w.code),
    generatedAt: new Date().toISOString(),
  };
}
