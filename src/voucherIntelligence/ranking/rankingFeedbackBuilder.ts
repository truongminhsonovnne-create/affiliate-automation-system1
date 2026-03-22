/**
 * Ranking Feedback Builder
 *
 * Converts outcome signals into ranking feedback
 */

import {
  VoucherOutcomeAggregate,
  VoucherRankingFeedbackRecord,
  RankingWeights,
  VoucherFeedbackQualityResult,
  FeedbackType,
  FeedbackSource,
  Platform,
} from '../types/index.js';
import { RANKING_THRESHOLDS, QUALITY_SCORING } from '../constants/index.js';

// ============================================================================
// Types
// ============================================================================

export interface BuildFeedbackOptions {
  platform?: Platform;
  source?: FeedbackSource;
}

export interface QualitySignal {
  type: string;
  weight: number;
  value: number;
  contribution: number;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Build ranking feedback from outcome aggregates
 */
export function buildRankingFeedbackFromOutcome(
  aggregates: VoucherOutcomeAggregate[],
  options: BuildFeedbackOptions = {}
): VoucherRankingFeedbackRecord[] {
  const { platform, source = FeedbackSource.USER_BEHAVIOR } = options;
  const feedbackRecords: VoucherRankingFeedbackRecord[] = [];

  for (const aggregate of aggregates) {
    const qualityResult = scoreVoucherOutcomeQuality(aggregate);

    // Only create feedback if we have enough confidence
    if (qualityResult.confidence !== 'low') {
      const feedbackRecord = buildVoucherFeedbackRecord(
        aggregate,
        qualityResult,
        platform || aggregate.platform,
        source
      );

      feedbackRecords.push(feedbackRecord);
    }
  }

  return feedbackRecords;
}

/**
 * Build individual feedback records
 */
export function buildVoucherFeedbackRecords(
  aggregates: VoucherOutcomeAggregate[],
  options: BuildFeedbackOptions = {}
): VoucherRankingFeedbackRecord[] {
  const records: VoucherRankingFeedbackRecord[] = [];

  for (const aggregate of aggregates) {
    // Build copy success feedback
    if (aggregate.copySuccessRate > 0) {
      records.push({
        id: crypto.randomUUID(),
        platform: aggregate.platform,
        voucherId: aggregate.voucherId,
        feedbackType: aggregate.copySuccessRate > QUALITY_SCORING.GOOD_QUALITY_THRESHOLD
          ? FeedbackType.POSITIVE
          : FeedbackType.NEGATIVE,
        feedbackScore: aggregate.copySuccessRate,
        feedbackContext: {
          copySuccessRate: aggregate.copySuccessRate,
          copyCount: aggregate.copyCount,
        },
        source: options.source || FeedbackSource.USER_BEHAVIOR,
        createdAt: new Date(),
      });
    }

    // Build open click feedback
    if (aggregate.openShopeeClickRate > 0) {
      records.push({
        id: crypto.randomUUID(),
        platform: aggregate.platform,
        voucherId: aggregate.voucherId,
        feedbackType: aggregate.openShopeeClickRate > 0.3
          ? FeedbackType.POSITIVE
          : FeedbackType.NEUTRAL,
        feedbackScore: aggregate.openShopeeClickRate,
        feedbackContext: {
          openShopeeClickRate: aggregate.openShopeeClickRate,
          openCount: aggregate.openShopeeClickCount,
        },
        source: options.source || FeedbackSource.USER_BEHAVIOR,
        createdAt: new Date(),
      });
    }

    // Build divergence feedback
    if (aggregate.bestVsCandidateDivergence > RANKING_THRESHOLDS.BEST_VS_CANDIDATE_DIVERGENCE) {
      records.push({
        id: crypto.randomUUID(),
        platform: aggregate.platform,
        voucherId: aggregate.voucherId,
        feedbackType: FeedbackType.NEGATIVE,
        feedbackScore: 1 - aggregate.bestVsCandidateDivergence,
        feedbackContext: {
          divergence: aggregate.bestVsCandidateDivergence,
          bestSelected: aggregate.bestSelectedCount,
          candidateSelected: aggregate.candidateSelectedCount,
        },
        source: options.source || FeedbackSource.USER_BEHAVIOR,
        createdAt: new Date(),
      });
    }
  }

  return records;
}

/**
 * Score voucher outcome quality
 */
export function scoreVoucherOutcomeQuality(
  aggregate: VoucherOutcomeAggregate
): VoucherFeedbackQualityResult {
  const signals: QualitySignal[] = [];
  let totalWeight = 0;
  let totalContribution = 0;

  // Copy success weight
  const copyWeight = QUALITY_SCORING.COPY_SUCCESS_WEIGHT;
  const copyContribution = aggregate.copySuccessRate * copyWeight;
  signals.push({
    type: 'copy_success_rate',
    weight: copyWeight,
    value: aggregate.copySuccessRate,
    contribution: copyContribution,
  });
  totalWeight += copyWeight;
  totalContribution += copyContribution;

  // Open click weight
  const openWeight = QUALITY_SCORING.OPEN_CLICK_WEIGHT;
  const openContribution = aggregate.openShopeeClickRate * openWeight;
  signals.push({
    type: 'open_shopee_click_rate',
    weight: openWeight,
    value: aggregate.openShopeeClickRate,
    contribution: openContribution,
  });
  totalWeight += openWeight;
  totalContribution += openContribution;

  // Best selection weight
  const bestSelectionWeight = QUALITY_SCORING.BEST_SELECTION_WEIGHT;
  const bestSelectionRate = aggregate.copyCount > 0
    ? aggregate.bestSelectedCount / aggregate.copyCount
    : 0;
  const bestSelectionContribution = bestSelectionRate * bestSelectionWeight;
  signals.push({
    type: 'best_selection_rate',
    weight: bestSelectionWeight,
    value: bestSelectionRate,
    contribution: bestSelectionContribution,
  });
  totalWeight += bestSelectionWeight;
  totalContribution += bestSelectionContribution;

  // No fallback needed weight
  const fallbackWeight = QUALITY_SCORING.NO_FALLBACK_NEEDED_WEIGHT;
  const noFallbackRate = 1 - aggregate.fallbackClickRate;
  const fallbackContribution = noFallbackRate * fallbackWeight;
  signals.push({
    type: 'no_fallback_needed',
    weight: fallbackWeight,
    value: noFallbackRate,
    contribution: fallbackContribution,
  });
  totalWeight += fallbackWeight;
  totalContribution += fallbackContribution;

  // Calculate overall quality score
  const qualityScore = totalWeight > 0 ? totalContribution / totalWeight : 0;

  // Determine confidence based on sample size
  const sampleSize = aggregate.viewCount;
  let confidence: 'high' | 'medium' | 'low';

  if (sampleSize >= 100) {
    confidence = 'high';
  } else if (sampleSize >= 30) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Check for warnings
  const warnings: string[] = [];
  if (aggregate.copySuccessRate < QUALITY_SCORING.NEEDS_IMPROVEMENT_THRESHOLD) {
    warnings.push('Low copy success rate');
  }
  if (aggregate.bestVsCandidateDivergence > RANKING_THRESHOLDS.HIGH_DIVERGENCE) {
    warnings.push('High best vs candidate divergence');
  }
  if (aggregate.copyFailureCount > aggregate.copyCount * 0.3) {
    warnings.push('High copy failure count');
  }

  return {
    voucherId: aggregate.voucherId,
    qualityScore,
    confidence,
    signals,
    warnings,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build a single feedback record
 */
function buildVoucherFeedbackRecord(
  aggregate: VoucherOutcomeAggregate,
  qualityResult: VoucherFeedbackQualityResult,
  platform: Platform,
  source: FeedbackSource
): VoucherRankingFeedbackRecord {
  let feedbackType: FeedbackType;

  if (qualityResult.qualityScore >= QUALITY_SCORING.GOOD_QUALITY_THRESHOLD) {
    feedbackType = FeedbackType.POSITIVE;
  } else if (qualityResult.qualityScore <= QUALITY_SCORING.NEEDS_IMPROVEMENT_THRESHOLD) {
    feedbackType = FeedbackType.NEGATIVE;
  } else {
    feedbackType = FeedbackType.NEUTRAL;
  }

  return {
    id: crypto.randomUUID(),
    platform,
    voucherId: aggregate.voucherId,
    feedbackType,
    feedbackScore: qualityResult.qualityScore,
    feedbackContext: {
      qualityScore: qualityResult.qualityScore,
      confidence: qualityResult.confidence,
      signals: qualityResult.signals.map(s => ({ type: s.type, contribution: s.contribution })),
      warnings: qualityResult.warnings,
    },
    source,
    createdAt: new Date(),
  };
}

/**
 * Aggregate feedback scores by voucher
 */
export function aggregateFeedbackByVoucher(
  feedback: VoucherRankingFeedbackRecord[]
): Map<string, { avgScore: number; count: number; types: Record<FeedbackType, number> }> {
  const voucherFeedback = new Map<string, { scores: number[]; types: Record<FeedbackType, number> }>();

  for (const record of feedback) {
    if (!record.voucherId) continue;

    if (!voucherFeedback.has(record.voucherId)) {
      voucherFeedback.set(record.voucherId, {
        scores: [],
        types: { positive: 0, negative: 0, neutral: 0 },
      });
    }

    const data = voucherFeedback.get(record.voucherId)!;

    if (record.feedbackScore !== undefined) {
      data.scores.push(record.feedbackScore);
    }

    data.types[record.feedbackType]++;
  }

  // Calculate averages
  const result = new Map<string, { avgScore: number; count: number; types: Record<FeedbackType, number> }>();

  for (const [voucherId, data] of voucherFeedback.entries()) {
    const avgScore = data.scores.length > 0
      ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      : 0;

    result.set(voucherId, {
      avgScore,
      count: data.scores.length,
      types: data.types,
    });
  }

  return result;
}
