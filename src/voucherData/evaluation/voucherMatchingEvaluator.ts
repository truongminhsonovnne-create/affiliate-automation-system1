// =============================================================================
// Voucher Matching Evaluator
// Production-grade evaluator for voucher matching quality
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  VoucherMatchEvaluationInput,
  VoucherMatchEvaluationResult,
  VoucherEvaluationStatus,
  VoucherQualityMetrics,
  VoucherRankingTrace,
  VoucherRankingCandidate,
} from '../types.js';
import { EVALUATION_SCORE } from '../constants.js';
import { voucherMatchEvaluationRepository } from '../repositories/voucherMatchEvaluationRepository.js';
import { recordVoucherEvaluationCompleted } from '../observability/voucherDataEvents.js';
import { logger } from '../../utils/logger.js';

export interface EvaluateVoucherResolutionOptions {
  resolvedVoucherIds: string[];
  bestVoucherId?: string;
  rankingScores?: Record<string, number>;
  rankingTrace?: VoucherRankingTrace;
}

/**
 * Evaluate voucher resolution against expectation
 */
export async function evaluateVoucherResolutionAgainstExpectation(
  input: VoucherMatchEvaluationInput,
  options: EvaluateVoucherResolutionOptions
): Promise<VoucherMatchEvaluationResult> {
  const startTime = Date.now();

  const evaluation: VoucherMatchEvaluationResult = {
    id: uuidv4(),
    platform: input.platform,
    requestInput: input.requestInput,
    expectedVoucherIds: input.expectedVoucherIds,
    resolvedVoucherIds: options.resolvedVoucherIds,
    bestResolvedVoucherId: options.bestVoucherId || options.resolvedVoucherIds[0] || null,
    evaluationStatus: 'pending',
    qualityScore: null,
    qualityMetrics: null,
    errorSummary: null,
    rankingTrace: options.rankingTrace || null,
    createdAt: new Date(),
  };

  try {
    // Calculate quality metrics
    const qualityMetrics = calculateQualityMetrics(
      input.expectedVoucherIds,
      options.resolvedVoucherIds,
      options.bestVoucherId,
      options.rankingScores
    );

    evaluation.qualityMetrics = qualityMetrics;

    // Determine evaluation status
    if (!input.expectedVoucherIds || input.expectedVoucherIds.length === 0) {
      evaluation.evaluationStatus = 'no_expectation';
      evaluation.qualityScore = null;
    } else if (qualityMetrics.bestMatchAccuracy >= EVALUATION_SCORE.MIN_ACCURACY_FOR_SUCCESS) {
      evaluation.evaluationStatus = 'success';
      evaluation.qualityScore = qualityMetrics.bestMatchAccuracy;
    } else if (qualityMetrics.bestMatchAccuracy >= EVALUATION_SCORE.POOR_THRESHOLD) {
      evaluation.evaluationStatus = 'partial';
      evaluation.qualityScore = qualityMetrics.bestMatchAccuracy;
    } else {
      evaluation.evaluationStatus = 'failed';
      evaluation.qualityScore = qualityMetrics.bestMatchAccuracy;
    }

    // Save evaluation
    const saved = await voucherMatchEvaluationRepository.create(evaluation);

    const duration = Date.now() - startTime;
    recordVoucherEvaluationCompleted(input.platform, saved.id, evaluation.evaluationStatus, evaluation.qualityScore);

    logger.info(
      {
        evaluationId: saved.id,
        status: evaluation.evaluationStatus,
        qualityScore: evaluation.qualityScore,
        duration,
      },
      'Voucher resolution evaluation completed'
    );

    return saved;
  } catch (error) {
    evaluation.evaluationStatus = 'failed';
    evaluation.errorSummary = error instanceof Error ? error.message : 'Unknown error';

    logger.error({ error }, 'Failed to evaluate voucher resolution');

    return evaluation;
  }
}

/**
 * Evaluate a batch of voucher resolutions
 */
export async function evaluateVoucherResolutionBatch(
  inputs: VoucherMatchEvaluationInput[],
  resolutionProvider: (input: VoucherMatchEvaluationInput) => Promise<EvaluateVoucherResolutionOptions>
): Promise<VoucherMatchEvaluationResult[]> {
  const results: VoucherMatchEvaluationResult[] = [];

  for (const input of inputs) {
    try {
      const resolution = await resolutionProvider(input);
      const result = await evaluateVoucherResolutionAgainstExpectation(input, resolution);
      results.push(result);
    } catch (error) {
      logger.error({ input, error }, 'Failed to evaluate voucher resolution in batch');
      results.push({
        id: uuidv4(),
        platform: input.platform,
        requestInput: input.requestInput,
        expectedVoucherIds: input.expectedVoucherIds,
        resolvedVoucherIds: [],
        bestResolvedVoucherId: null,
        evaluationStatus: 'failed',
        qualityScore: null,
        qualityMetrics: null,
        errorSummary: error instanceof Error ? error.message : 'Unknown error',
        rankingTrace: null,
        createdAt: new Date(),
      });
    }
  }

  return results;
}

/**
 * Score voucher matching quality
 */
export function scoreVoucherMatchingQuality(
  result: VoucherMatchEvaluationResult,
  options?: { weightRecall?: number; weightPrecision?: number }
): number {
  if (!result.qualityMetrics) {
    return 0;
  }

  const weightRecall = options?.weightRecall || 0.5;
  const weightPrecision = options?.weightPrecision || 0.5;

  const { bestMatchAccuracy, topKRecall, topKPrecision } = result.qualityMetrics;

  // Weighted combination
  const accuracyScore = bestMatchAccuracy;
  const recallScore = topKRecall;
  const precisionScore = topKPrecision;

  return accuracyScore * 0.4 + recallScore * weightRecall + precisionScore * weightPrecision;
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateQualityMetrics(
  expectedVoucherIds: string[] | null,
  resolvedVoucherIds: string[],
  bestVoucherId?: string,
  rankingScores?: Record<string, number>
): VoucherQualityMetrics {
  // Default metrics if no expectation
  if (!expectedVoucherIds || expectedVoucherIds.length === 0) {
    return {
      bestMatchAccuracy: 0,
      topKRecall: 0,
      topKPrecision: 0,
      rankingDiscount: 0,
      rankingCorrelation: 0,
      falsePositiveHints: [],
      falseNegativeHints: [],
      coverageScore: resolvedVoucherIds.length > 0 ? 1 : 0,
      confidenceScore: 0.5,
    };
  }

  const expectedSet = new Set(expectedVoucherIds);
  const resolvedSet = new Set(resolvedVoucherIds);

  // Best match accuracy
  const bestMatch = bestVoucherId || resolvedVoucherIds[0];
  const bestMatchAccuracy = bestMatch && expectedSet.has(bestMatch) ? 1 : 0;

  // Top-K recall and precision
  const topK = Math.min(5, resolvedVoucherIds.length);
  const resolvedTopK = resolvedVoucherIds.slice(0, topK);
  const expectedTopK = expectedVoucherIds.slice(0, topK);

  const resolvedTopKSet = new Set(resolvedTopK);
  const expectedTopKSet = new Set(expectedTopK);

  // Recall: how many expected vouchers were found
  let truePositives = 0;
  for (const voucherId of expectedTopK) {
    if (resolvedTopKSet.has(voucherId)) {
      truePositives++;
    }
  }
  const topKRecall = expectedTopK.length > 0 ? truePositives / expectedTopK.length : 0;

  // Precision: how many resolved vouchers were correct
  let correctResolutions = 0;
  for (const voucherId of resolvedTopK) {
    if (expectedTopKSet.has(voucherId)) {
      correctResolutions++;
    }
  }
  const topKPrecision = resolvedTopK.length > 0 ? correctResolutions / resolvedTopK.length : 0;

  // False positive hints
  const falsePositiveHints: string[] = [];
  for (const voucherId of resolvedTopK) {
    if (!expectedTopKSet.has(voucherId)) {
      falsePositiveHints.push(`Resolved voucher ${voucherId} was not expected in top ${topK}`);
    }
  }

  // False negative hints
  const falseNegativeHints: string[] = [];
  for (const voucherId of expectedTopK) {
    if (!resolvedTopKSet.has(voucherId)) {
      falseNegativeHints.push(`Expected voucher ${voucherId} was not in top ${topK} resolved`);
    }
  }

  // Ranking discount (how much the ranking differs from expected)
  const rankingDiscount = calculateRankingDiscount(expectedVoucherIds, resolvedVoucherIds);

  // Ranking correlation
  const rankingCorrelation = calculateRankingCorrelation(expectedVoucherIds, resolvedVoucherIds);

  // Coverage score
  const coverageScore = resolvedVoucherIds.length > 0 ? 1 : 0;

  // Confidence score based on resolution completeness
  const confidenceScore = resolvedVoucherIds.length > 0
    ? Math.min(1, resolvedVoucherIds.length / Math.max(expectedVoucherIds.length, 5))
    : 0;

  return {
    bestMatchAccuracy,
    topKRecall,
    topKPrecision,
    rankingDiscount,
    rankingCorrelation,
    falsePositiveHints,
    falseNegativeHints,
    coverageScore,
    confidenceScore,
  };
}

function calculateRankingDiscount(expected: string[], resolved: string[]): number {
  if (expected.length === 0 || resolved.length === 0) {
    return 1;
  }

  let totalDiscount = 0;
  let count = 0;

  for (let i = 0; i < Math.min(expected.length, resolved.length); i++) {
    const expectedRank = i;
    const resolvedIndex = resolved.indexOf(expected[i]);

    if (resolvedIndex === -1) {
      // Voucher not found - maximum penalty
      totalDiscount += 1;
    } else {
      // Rank difference normalized
      const rankDiff = Math.abs(expectedRank - resolvedIndex);
      totalDiscount += Math.min(1, rankDiff / 10);
    }
    count++;
  }

  return count > 0 ? totalDiscount / count : 1;
}

function calculateRankingCorrelation(expected: string[], resolved: string[]): number {
  if (expected.length <= 1 || resolved.length <= 1) {
    return 1;
  }

  // Simple correlation based on overlap at each position
  let matches = 0;
  const minLen = Math.min(expected.length, resolved.length);

  for (let i = 0; i < minLen; i++) {
    if (expected[i] === resolved[i]) {
      matches++;
    }
  }

  return matches / minLen;
}
