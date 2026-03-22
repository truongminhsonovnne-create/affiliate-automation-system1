/**
 * TikTok Shop Preview Stability Evaluator
 *
 * Evaluates the stability of TikTok Shop preview layer.
 */

import { PREVIEW_STABILITY_THRESHOLDS } from '../constants.js';
import type {
  TikTokShopPreviewFunnelSummary,
  TikTokShopPreviewStabilityResult,
  TikTokShopPreviewWarning,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Evaluate preview stability
 */
export async function evaluateTikTokPreviewStability(
  funnelSummary: TikTokShopPreviewFunnelSummary
): Promise<TikTokShopPreviewStabilityResult> {
  logger.info({ msg: 'Evaluating TikTok preview stability', totalSessions: funnelSummary.totalSessions });

  // Evaluate dimensions
  const supportStateStability = evaluateSupportStateStability(funnelSummary);
  const outcomeConsistency = evaluateOutcomeConsistency(funnelSummary);
  const errorRate = evaluateErrorRate(funnelSummary);
  const driftRisk = evaluateDriftRisk(funnelSummary);

  // Calculate overall score
  const overallScore = calculateOverallStabilityScore({
    supportStateStability,
    outcomeConsistency,
    errorRate,
    driftRisk,
  });

  // Identify risks and warnings
  const { risks, warnings } = identifyStabilityRisks({
    supportStateStability,
    outcomeConsistency,
    errorRate,
    driftRisk,
    funnelSummary,
  });

  const result: TikTokShopPreviewStabilityResult = {
    overallScore,
    supportStateStability,
    outcomeConsistency,
    errorRate,
    driftRisk,
    risks,
    warnings,
  };

  logger.info({
    msg: 'TikTok preview stability evaluated',
    overallScore,
    supportStateStability,
    outcomeConsistency,
    errorRate,
  });

  return result;
}

/**
 * Evaluate support state stability
 */
function evaluateSupportStateStability(funnelSummary: TikTokShopPreviewFunnelSummary): number {
  let score = 60; // Base score

  const supportStates = funnelSummary.supportStateDistribution;
  const total = funnelSummary.totalSessions || 1;

  // Calculate distribution
  const states = Object.values(supportStates);
  const dominantStateCount = Math.max(...states);
  const dominanceRatio = dominantStateCount / total;

  // High dominance suggests stability
  if (dominanceRatio > 0.8) {
    score += 30;
  } else if (dominanceRatio > 0.6) {
    score += 15;
  } else if (dominanceRatio < 0.4) {
    score -= 20;
    // Mixed states suggest instability
  }

  // Check for erratic transitions (not applicable for current schema, placeholder)
  // In production, would check state change frequency over time

  return Math.max(0, Math.min(100, score));
}

/**
 * Evaluate outcome consistency
 */
function evaluateOutcomeConsistency(funnelSummary: TikTokShopPreviewFunnelSummary): number {
  let score = 60; // Base score

  if (funnelSummary.resolutionAttempts === 0) {
    return 50; // No data to evaluate
  }

  const total = funnelSummary.resolutionAttempts;
  const supported = funnelSummary.supportedResolutions;
  const partial = funnelSummary.partialResolutions;
  const unavailable = funnelSummary.unavailableResolutions;

  // Calculate outcome distribution
  const supportedRate = supported / total;
  const partialRate = partial / total;
  const unavailableRate = unavailable / total;

  // Check consistency over time would require historical data
  // For now, check current distribution balance

  // Balanced distribution suggests consistency
  if (supportedRate > 0.2 && partialRate > 0.1 && unavailableRate < 0.5) {
    score += 20;
  }

  // Check for extreme distributions
  if (unavailableRate > 0.8) {
    score -= 30;
  } else if (unavailableRate > 0.6) {
    score -= 15;
  }

  // Check for no supported outcomes
  if (supportedRate < 0.05) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Evaluate error rate
 */
function evaluateErrorRate(funnelSummary: TikTokShopPreviewFunnelSummary): number {
  let score = 80; // Start with high score, penalize for errors

  const total = funnelSummary.totalEvents || 1;

  // Count error-related events
  // In production, would count actual error events
  // For now, use unavailable resolutions as proxy for "failed" outcomes

  const failureRate = funnelSummary.unavailableResolutions / Math.max(1, funnelSummary.resolutionAttempts);

  // Penalize high failure rate
  if (failureRate > PREVIEW_STABILITY_THRESHOLDS.MAX_ERROR_RATE) {
    score -= 40;
  } else if (failureRate > PREVIEW_STABILITY_THRESHOLDS.MAX_ERROR_RATE * 0.5) {
    score -= 20;
  }

  // Penalize gate blocks
  const gateBlockRate = funnelSummary.totalSessions > 0
    ? funnelSummary.gateBlockedEvents / funnelSummary.totalSessions
    : 0;

  if (gateBlockRate > 0.3) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Evaluate drift risk
 */
function evaluateDriftRisk(funnelSummary: TikTokShopPreviewFunnelSummary): number {
  let score = 70; // Base score

  // Drift risk indicators:

  // 1. High unavailable rate suggests data/pipeline issues
  const unavailableRate = funnelSummary.resolutionAttempts > 0
    ? funnelSummary.unavailableResolutions / funnelSummary.resolutionAttempts
    : 0;

  if (unavailableRate > 0.5) {
    score -= 25;
  } else if (unavailableRate > 0.3) {
    score -= 10;
  }

  // 2. High partial rate suggests evolving support
  const partialRate = funnelSummary.resolutionAttempts > 0
    ? funnelSummary.partialResolutions / funnelSummary.resolutionAttempts
    : 0;

  if (partialRate > 0.4) {
    score -= 10; // High partial rate indicates changing support
  }

  // 3. Low session count suggests unstable usage
  if (funnelSummary.totalSessions < 10) {
    score -= 15;
  }

  // 4. High dropoff suggests quality issues
  const dropoffRate = funnelSummary.surfaceViews > 0
    ? 1 - (funnelSummary.inputSubmissions / funnelSummary.surfaceViews)
    : 0;

  if (dropoffRate > 0.8) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate overall stability score
 */
function calculateOverallStabilityScore(dimensions: {
  supportStateStability: number;
  outcomeConsistency: number;
  errorRate: number;
  driftRisk: number;
}): number {
  // Weight dimensions
  const weights = {
    supportStateStability: 0.30,
    outcomeConsistency: 0.25,
    errorRate: 0.25,
    driftRisk: 0.20,
  };

  return Math.round(
    dimensions.supportStateStability * weights.supportStateStability +
    dimensions.outcomeConsistency * weights.outcomeConsistency +
    dimensions.errorRate * weights.errorRate +
    (100 - dimensions.driftRisk) * weights.driftRisk // Invert drift risk (lower is worse)
  );
}

/**
 * Identify stability risks and warnings
 */
function identifyStabilityRisks(dimensions: {
  supportStateStability: number;
  outcomeConsistency: number;
  errorRate: number;
  driftRisk: number;
  funnelSummary: TikTokShopPreviewFunnelSummary;
}): { risks: string[]; warnings: string[] } {
  const risks: string[] = [];
  const warnings: string[] = [];

  // Check support state stability
  if (dimensions.supportStateStability < PREVIEW_STABILITY_THRESHOLDS.MIN_SUPPORT_STATE_STABILITY * 100) {
    risks.push('Support states are unstable or inconsistent');
  } else if (dimensions.supportStateStability < 50) {
    warnings.push('Support state consistency is declining');
  }

  // Check outcome consistency
  if (dimensions.outcomeConsistency < PREVIEW_STABILITY_THRESHOLDS.MIN_OUTCOME_CONSISTENCY * 100) {
    risks.push('Resolution outcomes are highly inconsistent');
  } else if (dimensions.outcomeConsistency < 50) {
    warnings.push('Outcome consistency needs attention');
  }

  // Check error rate
  if (dimensions.errorRate < (1 - PREVIEW_STABILITY_THRESHOLDS.MAX_ERROR_RATE) * 100) {
    risks.push('High error rate detected');
  } else if (dimensions.errorRate < 60) {
    warnings.push('Error rate is elevated');
  }

  // Check drift risk
  if (dimensions.driftRisk > PREVIEW_STABILITY_THRESHOLDS.MAX_DRIFT_RISK * 100) {
    risks.push('High drift risk - preview support may be changing');
  } else if (dimensions.driftRisk > 50) {
    warnings.push('Drift risk is elevated');
  }

  // Specific funnel checks
  const funnelSummary = dimensions.funnelSummary;

  if (funnelSummary.unavailableResolutions > funnelSummary.resolutionAttempts * 0.7) {
    risks.push('Majority of resolutions return unavailable');
  }

  if (funnelSummary.gateBlockedEvents > funnelSummary.totalSessions * 0.3) {
    warnings.push('Gate blocking rate is high');
  }

  if (funnelSummary.totalSessions < 20) {
    warnings.push('Low session volume - stability metrics may be unreliable');
  }

  return { risks, warnings };
}

/**
 * Detect stability risks
 */
export function detectTikTokPreviewStabilityRisks(
  funnelSummary: TikTokShopPreviewFunnelSummary
): TikTokShopPreviewWarning[] {
  const warnings: TikTokShopPreviewWarning[] = [];

  // Check session count
  if (funnelSummary.totalSessions < 10) {
    warnings.push({
      code: 'LOW_SESSION_VOLUME',
      message: 'Session volume too low for reliable stability assessment',
      severity: 'medium',
      category: 'stability_issue',
      details: { sessionCount: funnelSummary.totalSessions },
    });
  }

  // Check error rate
  const errorRate = funnelSummary.resolutionAttempts > 0
    ? funnelSummary.unavailableResolutions / funnelSummary.resolutionAttempts
    : 0;

  if (errorRate > PREVIEW_STABILITY_THRESHOLDS.MAX_ERROR_RATE) {
    warnings.push({
      code: 'HIGH_ERROR_RATE',
      message: `Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold`,
      severity: 'high',
      category: 'stability_issue',
      details: { errorRate },
    });
  }

  // Check support state diversity
  const stateCount = Object.keys(funnelSummary.supportStateDistribution).length;
  if (stateCount > 4) {
    warnings.push({
      code: 'HIGH_STATE_DIVERSITY',
      message: `High number of support states (${stateCount}) may indicate instability`,
      severity: 'medium',
      category: 'stability_issue',
      details: { stateCount, distribution: funnelSummary.supportStateDistribution },
    });
  }

  return warnings;
}

/**
 * Build stability summary
 */
export function buildTikTokPreviewStabilitySummary(
  result: TikTokShopPreviewStabilityResult
): Record<string, unknown> {
  return {
    overallScore: result.overallScore,
    classification: result.overallScore >= PREVIEW_STABILITY_THRESHOLDS.MIN_STABLE_SCORE
      ? 'stable'
      : result.overallScore >= PREVIEW_STABILITY_THRESHOLDS.UNSTABLE_SCORE
        ? 'unstable'
        : 'critical',
    dimensions: {
      supportStateStability: result.supportStateStability,
      outcomeConsistency: result.outcomeConsistency,
      errorRate: result.errorRate,
      driftRisk: result.driftRisk,
    },
    risks: result.risks,
    warnings: result.warnings,
  };
}
