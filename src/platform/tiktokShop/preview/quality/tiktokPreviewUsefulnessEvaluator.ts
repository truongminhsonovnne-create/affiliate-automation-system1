/**
 * TikTok Shop Preview Usefulness Evaluator
 *
 * Evaluates the usefulness of TikTok Shop preview flow.
 */

import { PREVIEW_USEFULNESS_THRESHOLDS } from '../constants.js';
import type {
  TikTokShopPreviewFunnelSummary,
  TikTokShopPreviewUsefulnessResult,
  TikTokShopPreviewUsefulnessDimensions,
  TikTokShopPreviewWarning,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Evaluate preview usefulness
 */
export async function evaluateTikTokPreviewUsefulness(
  funnelSummary: TikTokShopPreviewFunnelSummary
): Promise<TikTokShopPreviewUsefulnessResult> {
  logger.info({ msg: 'Evaluating TikTok preview usefulness', totalSessions: funnelSummary.totalSessions });

  // Evaluate dimensions
  const dimensions = evaluateUsefulnessDimensions(funnelSummary);

  // Calculate overall score
  const overallScore = calculateOverallUsefulnessScore(dimensions);

  // Identify strengths and weaknesses
  const { strengths, weaknesses, warnings } = identifyUsefulnessFactors(dimensions, funnelSummary);

  const result: TikTokShopPreviewUsefulnessResult = {
    overallScore,
    dimensions,
    strengths,
    weaknesses,
    warnings,
  };

  logger.info({
    msg: 'TikTok preview usefulness evaluated',
    overallScore,
    clarity: dimensions.clarity,
    honestRepresentation: dimensions.honestRepresentation,
  });

  return result;
}

/**
 * Evaluate usefulness dimensions
 */
function evaluateUsefulnessDimensions(
  funnelSummary: TikTokShopPreviewFunnelSummary
): TikTokShopPreviewUsefulnessDimensions {
  // Clarity: How clear is the preview interface?
  const clarity = evaluateClarity(funnelSummary);

  // Honest Representation: Does preview honestly represent support state?
  const honestRepresentation = evaluateHonestRepresentation(funnelSummary);

  // Outcome Quality: Are resolution outcomes useful?
  const outcomeQuality = evaluateOutcomeQuality(funnelSummary);

  // User Actionability: Can users take meaningful actions?
  const userActionability = evaluateUserActionability(funnelSummary);

  return {
    clarity,
    honestRepresentation,
    outcomeQuality,
    userActionability,
  };
}

/**
 * Evaluate clarity dimension
 */
function evaluateClarity(funnelSummary: TikTokShopPreviewFunnelSummary): number {
  let score = 50; // Base score

  // High surface views with good input submission rate suggests clarity
  if (funnelSummary.surfaceViews > 0) {
    const inputRate = funnelSummary.inputSubmissions / funnelSummary.surfaceViews;
    if (inputRate > 0.5) score += 20;
    else if (inputRate > 0.3) score += 10;
    else if (inputRate < 0.1) score -= 10;
  }

  // Check for abandonment at surface level (suggests confusion)
  if (funnelSummary.totalSessions > 0) {
    const abandonmentRate = funnelSummary.abandonmentHints / funnelSummary.totalSessions;
    if (abandonmentRate > 0.3) score -= 15;
    else if (abandonmentRate > 0.1) score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Evaluate honest representation dimension
 */
function evaluateHonestRepresentation(funnelSummary: TikTokShopPreviewFunnelSummary): number {
  let score = 70; // Base score

  // Check support state distribution
  const supportStates = funnelSummary.supportStateDistribution;
  const total = funnelSummary.totalSessions || 1;

  // High unavailable rate suggests honest representation (not overpromising)
  const unavailableRate = (supportStates['unsupported'] || 0) / total;
  const notReadyRate = (supportStates['not_ready'] || 0) / total;

  if (unavailableRate + notReadyRate > 0.3) {
    // Users are seeing accurate "not available" states
    score += 15;
  } else if (unavailableRate + notReadyRate > 0.1) {
    score += 5;
  }

  // Check for misleading: high partial but not clear about limitations
  const partialRate = funnelSummary.totalEvents > 0
    ? funnelSummary.partialResolutions / funnelSummary.totalEvents
    : 0;

  if (partialRate > 0.3 && funnelSummary.gateBlockedEvents > 0) {
    // Good: gates are being used to block inappropriate access
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Evaluate outcome quality dimension
 */
function evaluateOutcomeQuality(funnelSummary: TikTokShopPreviewFunnelSummary): number {
  let score = 40; // Base score

  // Check resolution success
  if (funnelSummary.resolutionAttempts > 0) {
    const supportedRate = funnelSummary.supportedResolutions / funnelSummary.resolutionAttempts;
    const partialRate = funnelSummary.partialResolutions / funnelSummary.resolutionAttempts;
    const unavailableRate = funnelSummary.unavailableResolutions / funnelSummary.resolutionAttempts;

    // Balanced outcomes are useful
    if (supportedRate > 0.2 && partialRate > 0.1) {
      score += 25;
    } else if (supportedRate > 0.1) {
      score += 15;
    }

    // If too many unavailable, it's not useful
    if (unavailableRate > 0.7) {
      score -= 20;
    } else if (unavailableRate > 0.5) {
      score -= 10;
    }
  }

  // Check if candidates are being viewed (indicates useful results)
  if (funnelSummary.resolutionAttempts > 0) {
    const candidateViewRate = funnelSummary.candidateViews / funnelSummary.resolutionAttempts;
    if (candidateViewRate > 0.3) score += 15;
    else if (candidateViewRate > 0.1) score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Evaluate user actionability dimension
 */
function evaluateUserActionability(funnelSummary: TikTokShopPreviewFunnelSummary): number {
  let score = 40; // Base score

  // Check if users can copy or open (indicates actionability)
  if (funnelSummary.resolutionAttempts > 0) {
    const copyRate = funnelSummary.copyAttempts / funnelSummary.resolutionAttempts;
    const openRate = funnelSummary.openAttempts / funnelSummary.resolutionAttempts;

    if (copyRate + openRate > 0.2) {
      score += 30;
    } else if (copyRate + openRate > 0.1) {
      score += 15;
    } else if (copyRate + openRate > 0.05) {
      score += 5;
    }
  }

  // Candidate views indicate actionable content
  if (funnelSummary.candidateViews > 0) {
    score += 10;
  }

  // Check for abandonment after resolution (might indicate no actionable results)
  if (funnelSummary.resolutionAttempts > 0) {
    const abandonmentRate = funnelSummary.abandonmentHints / funnelSummary.resolutionAttempts;
    if (abandonmentRate > 0.5) score -= 20;
    else if (abandonmentRate > 0.3) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate overall usefulness score
 */
function calculateOverallUsefulnessScore(dimensions: TikTokShopPreviewUsefulnessDimensions): number {
  // Weighted average
  const weights = {
    clarity: 0.25,
    honestRepresentation: 0.30,
    outcomeQuality: 0.25,
    userActionability: 0.20,
  };

  return Math.round(
    dimensions.clarity * weights.clarity +
    dimensions.honestRepresentation * weights.honestRepresentation +
    dimensions.outcomeQuality * weights.outcomeQuality +
    dimensions.userActionability * weights.userActionability
  );
}

/**
 * Identify usefulness factors
 */
function identifyUsefulnessFactors(
  dimensions: TikTokShopPreviewUsefulnessDimensions,
  funnelSummary: TikTokShopPreviewFunnelSummary
): { strengths: string[]; weaknesses: string[]; warnings: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const warnings: string[] = [];

  // Clarity
  if (dimensions.clarity >= 60) {
    strengths.push('Preview interface is clear and understandable');
  } else if (dimensions.clarity < 40) {
    weaknesses.push('Preview interface lacks clarity');
    warnings.push('Consider improving preview UI/UX');
  }

  // Honest Representation
  if (dimensions.honestRepresentation >= 70) {
    strengths.push('Preview honestly represents support states');
  } else if (dimensions.honestRepresentation < 50) {
    weaknesses.push('Preview may mislead users about support');
    warnings.push('Review support state disclosure');
  }

  // Outcome Quality
  if (dimensions.outcomeQuality >= 60) {
    strengths.push('Resolution outcomes are generally useful');
  } else if (dimensions.outcomeQuality < 40) {
    weaknesses.push('Resolution outcomes lack quality');
    warnings.push('Improve data quality and context');
  }

  // User Actionability
  if (dimensions.userActionability >= 60) {
    strengths.push('Users can take meaningful actions');
  } else if (dimensions.userActionability < 40) {
    weaknesses.push('Users cannot act on preview results');
    warnings.push('Add copy/open capabilities');
  }

  // Specific checks
  if (funnelSummary.gateBlockedEvents > funnelSummary.surfaceViews * 0.3) {
    warnings.push('High gate blocking rate may indicate access issues');
  }

  if (funnelSummary.unavailableResolutions > funnelSummary.resolutionAttempts * 0.5) {
    warnings.push('High unavailable rate - review platform support');
  }

  return { strengths, weaknesses, warnings };
}

/**
 * Evaluate outcome usefulness specifically
 */
export function evaluateTikTokPreviewOutcomeUsefulness(
  outcomeType: 'supported' | 'partial' | 'unavailable',
  context: Record<string, unknown>
): { useful: boolean; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 50;

  switch (outcomeType) {
    case 'supported':
      score = 80;
      reasons.push('Full resolution available');
      break;

    case 'partial':
      score = 50;
      reasons.push('Partial resolution available');
      // Check what's missing
      if (!context['hasPrice']) reasons.push('Missing price information');
      if (!context['hasPromotion']) reasons.push('Missing promotion details');
      break;

    case 'unavailable':
      score = 20;
      reasons.push('Resolution not available');
      reasons.push('Support honestly indicated');
      break;
  }

  return {
    useful: score >= PREVIEW_USEFULNESS_THRESHOLDS.MIN_USEFUL_SCORE,
    score,
    reasons,
  };
}

/**
 * Build usefulness summary
 */
export function buildTikTokPreviewUsefulnessSummary(
  result: TikTokShopPreviewUsefulnessResult
): Record<string, unknown> {
  return {
    overallScore: result.overallScore,
    dimensions: result.dimensions,
    classification: result.overallScore >= PREVIEW_USEFULNESS_THRESHOLDS.MIN_USEFUL_SCORE
      ? 'useful'
      : result.overallScore >= PREVIEW_USEFULNESS_THRESHOLDS.NEEDS_IMPROVEMENT_SCORE
        ? 'needs_improvement'
        : 'poor',
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    warnings: result.warnings,
  };
}
