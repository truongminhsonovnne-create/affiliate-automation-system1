/**
 * Voucher Ranking Engine
 *
 * Ranks voucher candidates based on multiple factors.
 */

import {
  VoucherCatalogRecord,
  ProductContext,
  VoucherCandidate,
  VoucherEligibilityResult,
  VoucherRankingTrace,
  ScoreBreakdown,
  VoucherMatchType,
} from '../types';
import {
  WEIGHT_APPLICABILITY,
  WEIGHT_VALUE,
  WEIGHT_FRESHNESS,
  WEIGHT_PRIORITY,
  MAX_RANKING_SCORE,
  MIN_RANKING_SCORE_THRESHOLD,
  VOUCHER_FRESH_DAYS,
  VOUCHER_STALE_DAYS,
} from '../constants';

/**
 * Ranking engine options
 */
export interface RankingEngineOptions {
  includeTrace?: boolean;
  maxCandidates?: number;
  minScoreThreshold?: number;
}

/**
 * Rank voucher candidates
 */
export function rankVoucherCandidates(
  eligibleResults: VoucherEligibilityResult[],
  context: ProductContext,
  options?: RankingEngineOptions
): VoucherCandidate[] {
  const opts = {
    includeTrace: options?.includeTrace ?? true,
    maxCandidates: options?.maxCandidates ?? 5,
    minScoreThreshold: options?.minScoreThreshold ?? MIN_RANKING_SCORE_THRESHOLD,
  };

  // Score each candidate
  const candidates = eligibleResults
    .filter((result) => result.isEligible)
    .map((result) => scoreVoucherCandidate(result, context))
    .filter((candidate) => candidate.rankingScore >= opts.minScoreThreshold)
    .sort((a, b) => b.rankingScore - a.rankingScore);

  // Limit to max candidates
  return candidates.slice(0, opts.maxCandidates);
}

/**
 * Score a single voucher candidate
 */
export function scoreVoucherCandidate(
  eligibilityResult: VoucherEligibilityResult,
  context: ProductContext
): VoucherCandidate {
  const { voucher, matchType, eligibilityScore } = eligibilityResult;

  // Calculate component scores
  const applicabilityScore = calculateApplicabilityScore(eligibilityResult, context);
  const valueScore = calculateValueScore(voucher, context);
  const freshnessScore = calculateFreshnessScore(voucher);
  const priorityScore = calculatePriorityScore(voucher);

  // Calculate scope precision
  const scopePrecision = calculateScopePrecision(matchType);

  // Apply weights
  const weightedApplicability = applicabilityScore * WEIGHT_APPLICABILITY;
  const weightedValue = valueScore * WEIGHT_VALUE;
  const weightedFreshness = freshnessScore * WEIGHT_FRESHNESS;
  const weightedPriority = priorityScore * WEIGHT_PRIORITY;

  // Calculate final ranking score
  const rankingScore = Math.min(
    MAX_RANKING_SCORE,
    weightedApplicability + weightedValue + weightedFreshness + weightedPriority
  );

  // Calculate expected discount value
  const expectedDiscountValue = calculateExpectedDiscountValue(voucher, context);

  return {
    voucher,
    eligibilityResult,
    rankingScore,
    expectedDiscountValue,
    matchType,
    scopePrecision,
    applicabilityScore,
    valueScore,
    freshnessScore,
    priorityScore,
    rankedAt: new Date(),
  };
}

/**
 * Build ranking trace for debugging
 */
export function buildVoucherRankingTrace(
  candidates: VoucherCandidate[],
  options?: { includeTradeoffs?: boolean }
): VoucherRankingTrace[] {
  return candidates.map((candidate) => {
    const tradeoffs: string[] = [];

    // Identify tradeoffs
    if (candidate.applicabilityScore < 0.5) {
      tradeoffs.push('Low applicability confidence');
    }
    if (candidate.valueScore < candidate.applicabilityScore) {
      tradeoffs.push('Value score lower than applicability - may have better alternatives');
    }
    if (candidate.freshnessScore < 0.5) {
      tradeoffs.push('Voucher may be nearing expiration');
    }
    if (candidate.matchType === 'platform') {
      tradeoffs.push('Using platform-wide voucher, shop-specific may be better');
    }

    return {
      candidateId: candidate.voucher.id,
      voucherId: candidate.voucher.id,
      finalScore: candidate.rankingScore,
      scoreBreakdown: {
        applicabilityScore: candidate.applicabilityScore,
        valueScore: candidate.valueScore,
        freshnessScore: candidate.freshnessScore,
        priorityScore: candidate.priorityScore,
        totalWeight: WEIGHT_APPLICABILITY + WEIGHT_VALUE + WEIGHT_FRESHNESS + WEIGHT_PRIORITY,
      },
      decisionFactors: [
        `Match type: ${candidate.matchType}`,
        `Scope precision: ${(candidate.scopePrecision * 100).toFixed(0)}%`,
        `Expected discount: ${candidate.expectedDiscountValue}`,
      ],
      tradeoffs: options?.includeTradeoffs ? tradeoffs : [],
    };
  });
}

// =============================================================================
// Private Scoring Functions
// =============================================================================

/**
 * Calculate applicability score
 */
function calculateApplicabilityScore(
  result: VoucherEligibilityResult,
  context: ProductContext
): number {
  let score = result.eligibilityScore;

  // Boost for exact match types
  switch (result.matchType) {
    case 'exact':
      score *= 1.2; // 20% boost
      break;
    case 'category':
      score *= 1.1; // 10% boost
      break;
    case 'shop':
      score *= 1.15;
      break;
    case 'platform':
      // No boost
      break;
    case 'fallback':
      score *= 0.8; // Penalty
      break;
  }

  // Boost for high context confidence
  if (context.confidence > 0.8) {
    score *= 1.1;
  }

  // Apply certainty penalty
  if (result.applicabilityCertainty < 0.7) {
    score *= result.applicabilityCertainty;
  }

  return Math.min(1, score);
}

/**
 * Calculate value score
 */
function calculateValueScore(voucher: VoucherCatalogRecord, context: ProductContext): number {
  const { discountType, discountValue, maxDiscountValue, minimumSpend } = voucher;

  // Base score on discount value
  let baseValueScore = 0;

  if (discountType === 'percentage' && discountValue !== null) {
    // Percentage discount
    baseValueScore = discountValue / 100;
  } else if (discountType === 'fixed_amount' && discountValue !== null) {
    // Fixed amount - scale based on typical prices
    if (context.price) {
      baseValueScore = Math.min(1, discountValue / context.price);
    } else {
      baseValueScore = Math.min(1, discountValue / 200000); // Assume 200k average
    }
  } else if (discountType === 'free_shipping') {
    // Free shipping - value depends on typical shipping cost
    baseValueScore = 0.2; // Assume 20k shipping
  }

  // Factor in max discount cap
  if (maxDiscountValue !== null && discountType === 'percentage') {
    const theoreticalMax = (context.price || 500000) * (discountValue! / 100);
    if (theoreticalMax > maxDiscountValue) {
      baseValueScore = Math.min(baseValueScore, maxDiscountValue / (context.price || 500000));
    }
  }

  // Factor in minimum spend proximity
  if (minimumSpend && minimumSpend > 0 && context.price) {
    const spendRatio = context.price / minimumSpend;
    if (spendRatio < 1) {
      // Below minimum - reduce score
      baseValueScore *= spendRatio;
    } else if (spendRatio < 1.5) {
      // Just above minimum - small boost
      baseValueScore *= 1.1;
    }
  }

  return Math.min(1, baseValueScore);
}

/**
 * Calculate freshness score
 */
function calculateFreshnessScore(voucher: VoucherCatalogRecord): number {
  const now = new Date();

  // No end date = always fresh
  if (!voucher.endsAt) {
    return 1;
  }

  const daysUntilExpiry = (voucher.endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntilExpiry <= 0) {
    return 0; // Expired
  }

  if (daysUntilExpiry <= VOUCHER_FRESH_DAYS) {
    return 1; // Very fresh
  }

  if (daysUntilExpiry >= VOUCHER_STALE_DAYS) {
    return 0.3; // Getting stale
  }

  // Linear decay between fresh and stale
  const freshness = 1 - ((daysUntilExpiry - VOUCHER_FRESH_DAYS) / (VOUCHER_STALE_DAYS - VOUCHER_FRESH_DAYS));
  return Math.max(0.3, Math.min(1, freshness));
}

/**
 * Calculate priority score
 */
function calculatePriorityScore(voucher: VoucherCatalogRecord): number {
  // Normalize priority (assuming 0-100 range)
  const normalizedPriority = Math.min(1, voucher.priority / 100);

  // Boost for verified vouchers
  let verificationBoost = 1;
  if (voucher.verificationStatus === 'verified') {
    verificationBoost = 1.2;
  } else if (voucher.verificationStatus === 'expired' || voucher.verificationStatus === 'invalid') {
    verificationBoost = 0.5;
  }

  // Boost for trusted sources
  let sourceBoost = 1;
  if (voucher.source === 'crawled' || voucher.source === 'partner') {
    sourceBoost = 1.1;
  } else if (voucher.source === 'manual') {
    sourceBoost = 0.9;
  }

  return Math.min(1, normalizedPriority * verificationBoost * sourceBoost);
}

/**
 * Calculate scope precision
 */
function calculateScopePrecision(matchType: VoucherMatchType): number {
  switch (matchType) {
    case 'exact':
      return 0.95;
    case 'shop':
      return 0.85;
    case 'category':
      return 0.7;
    case 'platform':
      return 0.5;
    case 'fallback':
      return 0.3;
    default:
      return 0;
  }
}

/**
 * Calculate expected discount value
 */
function calculateExpectedDiscountValue(
  voucher: VoucherCatalogRecord,
  context: ProductContext
): number {
  const { discountType, discountValue, maxDiscountValue, minimumSpend } = voucher;

  const price = context.price || 200000; // Default assumption

  if (discountType === 'percentage' && discountValue !== null) {
    let discount = price * (discountValue / 100);
    if (maxDiscountValue) {
      discount = Math.min(discount, maxDiscountValue);
    }
    return Math.round(discount);
  }

  if (discountType === 'fixed_amount' && discountValue !== null) {
    return discountValue;
  }

  if (discountType === 'free_shipping') {
    return 25000; // Assume average shipping cost
  }

  return 0;
}

/**
 * Get top candidates by match type
 */
export function getTopCandidatesByMatchType(
  candidates: VoucherCandidate[],
  matchType: VoucherMatchType
): VoucherCandidate[] {
  return candidates.filter((c) => c.matchType === matchType);
}

/**
 * Check if there's an exact match
 */
export function hasExactMatch(candidates: VoucherCandidate[]): boolean {
  return candidates.some((c) => c.matchType === 'exact' || c.matchType === 'shop');
}
