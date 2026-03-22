/**
 * Behavior Pattern Analyzer
 *
 * Detects patterns from user behavior data
 */

import {
  VoucherOutcomeAggregate,
  VoucherSelectionBehavior,
  NoMatchOutcomeSignal,
  NoMatchRootCause,
} from '../types/index.js';
import { RANKING_THRESHOLDS, DIVERGENCE_THRESHOLDS, NO_MATCH_THRESHOLDS } from '../constants/index.js';

// ============================================================================
// Types
// ============================================================================

export interface BehaviorAnalysisResult {
  underperformingBestVouchers: UnderperformingBestResult[];
  candidateOutperformingBest: CandidateOutperformingResult[];
  noMatchPatterns: NoMatchPatternResult[];
  behaviorAnomalies: BehaviorAnomaly[];
}

export interface UnderperformingBestResult {
  voucherId: string;
  selectionRate: number;
  copyRate: number;
  divergence: number;
  sampleSize: number;
}

export interface CandidateOutperformingResult {
  bestVoucherId: string;
  bestSelectionRate: number;
  candidates: Array<{
    voucherId: string;
    selectionRate: number;
    copyRate: number;
  }>;
}

export interface NoMatchPatternResult {
  urlPattern: string;
  rootCause: NoMatchRootCause;
  occurrenceCount: number;
  fallbackClickRate: number;
}

export interface BehaviorAnomaly {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedVouchers: string[];
}

// ============================================================================
// Main Analysis Functions
// ============================================================================

/**
 * Analyze voucher selection behavior
 */
export function analyzeVoucherSelectionBehavior(
  aggregates: VoucherOutcomeAggregate[]
): VoucherSelectionBehavior[] {
  const behaviors: VoucherSelectionBehavior[] = [];

  for (const aggregate of aggregates) {
    // Determine if best voucher is underperforming
    const bestSelectionRate = aggregate.bestSelectedCount / aggregate.copyCount || 0;
    const candidateSelectionRate = aggregate.candidateSelectedCount / aggregate.copyCount || 0;

    const behavior: VoucherSelectionBehavior = {
      platform: aggregate.platform,
      bestVoucherId: aggregate.voucherId,
      candidateVoucherIds: [], // Would need to track this separately
      selectedVoucherId: bestSelectionRate > candidateSelectionRate
        ? aggregate.voucherId
        : undefined,
      selectionReason: determineSelectionReason(bestSelectionRate, candidateSelectionRate),
      confidence: calculateBehaviorConfidence(aggregate),
    };

    behaviors.push(behavior);
  }

  return behaviors;
}

/**
 * Detect best voucher underperformance
 */
export function detectBestVoucherUnderperformance(
  aggregates: VoucherOutcomeAggregate[]
): UnderperformingBestResult[] {
  const results: UnderperformingBestResult[] = [];

  for (const aggregate of aggregates) {
    const totalSelections = aggregate.bestSelectedCount + aggregate.candidateSelectedCount;

    if (totalSelections < RANKING_THRESHOLDS.MIN_SAMPLE_SIZE) {
      continue;
    }

    const bestSelectionRate = aggregate.bestSelectedCount / totalSelections;

    // Check if best voucher is underperforming
    if (bestSelectionRate < RANKING_THRESHOLDS.BEST_VOUCHER_UNDERPERFORMANCE) {
      results.push({
        voucherId: aggregate.voucherId,
        selectionRate: bestSelectionRate,
        copyRate: aggregate.copyCount / aggregate.viewCount,
        divergence: aggregate.bestVsCandidateDivergence,
        sampleSize: totalSelections,
      });
    }
  }

  return results.sort((a, b) => a.selectionRate - b.selectionRate);
}

/**
 * Detect candidate outperforming best
 */
export function detectCandidateOutperformingBest(
  aggregates: VoucherOutcomeAggregate[]
): CandidateOutperformingResult[] {
  const results: CandidateOutperformingResult[] = [];

  // Group by best voucher
  const bestVoucherMap = new Map<string, VoucherOutcomeAggregate[]>();

  for (const aggregate of aggregates) {
    // This is simplified - in reality, you'd need to track which
    // candidates are shown with which best voucher
  }

  for (const aggregate of aggregates) {
    // Check for significant divergence
    if (aggregate.bestVsCandidateDivergence > DIVERGENCE_THRESHOLDS.SIGNIFICANT) {
      results.push({
        bestVoucherId: aggregate.voucherId,
        bestSelectionRate: aggregate.bestSelectedCount / aggregate.copyCount || 0,
        candidates: [
          {
            voucherId: aggregate.voucherId, // Simplified
            selectionRate: aggregate.candidateSelectedCount / aggregate.copyCount || 0,
            copyRate: aggregate.copyCount / aggregate.viewCount,
          },
        ],
      });
    }
  }

  return results;
}

/**
 * Detect no-match opportunity patterns
 */
export function detectNoMatchOpportunityPatterns(
  noMatchSignals: NoMatchOutcomeSignal[]
): NoMatchPatternResult[] {
  const patternMap = new Map<string, NoMatchPatternResult>();

  for (const signal of noMatchSignals) {
    // Extract URL pattern (simplified)
    const urlPattern = extractUrlPattern(signal.normalizedUrl);

    if (!patternMap.has(urlPattern)) {
      patternMap.set(urlPattern, {
        urlPattern,
        rootCause: signal.rootCause || NoMatchRootCause.UNKNOWN,
        occurrenceCount: 0,
        fallbackClickRate: 0,
      });
    }

    const pattern = patternMap.get(urlPattern)!;
    pattern.occurrenceCount++;

    if (signal.userClickedFallback) {
      // Track fallback clicks
    }
  }

  // Filter by minimum occurrences
  const results = Array.from(patternMap.values())
    .filter(p => p.occurrenceCount >= NO_MATCH_THRESHOLDS.MIN_OCCURRENCES);

  return results.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine selection reason
 */
function determineSelectionReason(
  bestRate: number,
  candidateRate: number
): string {
  if (bestRate > candidateRate) {
    return 'best_voucher_selected';
  } else if (candidateRate > bestRate) {
    return 'candidate_selected';
  } else {
    return 'equal_selection';
  }
}

/**
 * Calculate behavior confidence
 */
function calculateBehaviorConfidence(aggregate: VoucherOutcomeAggregate): number {
  const totalSignals = aggregate.viewCount;

  if (totalSignals < 10) return 0.3;
  if (totalSignals < 30) return 0.5;
  if (totalSignals < 100) return 0.7;
  return 0.9;
}

/**
 * Extract URL pattern (simplified)
 */
function extractUrlPattern(url: string): string {
  try {
    const parsed = new URL(url);
    // Extract path segments
    const segments = parsed.pathname.split('/').filter(s => s);
    if (segments.length > 0) {
      return `/${segments.slice(0, 2).join('/')}/*`;
    }
    return parsed.hostname;
  } catch {
    return 'unknown';
  }
}

// ============================================================================
// Anomaly Detection
// ============================================================================

/**
 * Detect behavior anomalies
 */
export function detectBehaviorAnomalies(
  aggregates: VoucherOutcomeAggregate[]
): BehaviorAnomaly[] {
  const anomalies: BehaviorAnomaly[] = [];

  // Check for very high copy failure rate
  for (const aggregate of aggregates) {
    if (aggregate.copyFailureCount > 0) {
      const failureRate = aggregate.copyFailureCount / (aggregate.copyCount + aggregate.copyFailureCount);

      if (failureRate > 0.5) {
        anomalies.push({
          type: 'high_copy_failure_rate',
          description: `Voucher ${aggregate.voucherId} has ${(failureRate * 100).toFixed(1)}% copy failure rate`,
          severity: 'high',
          affectedVouchers: [aggregate.voucherId],
        });
      }
    }

    // Check for very low open rate
    if (aggregate.openShopeeClickRate < 0.05 && aggregate.viewCount > 50) {
      anomalies.push({
        type: 'low_open_rate',
        description: `Voucher ${aggregate.voucherId} has very low open Shopee rate`,
        severity: 'medium',
        affectedVouchers: [aggregate.voucherId],
      });
    }
  }

  return anomalies;
}

/**
 * Calculate aggregate anomaly score
 */
export function calculateAggregateAnomalyScore(
  aggregate: VoucherOutcomeAggregate
): number {
  let score = 0;

  // High copy failure rate
  const copyFailureRate = aggregate.copyFailureCount / (aggregate.copyCount + aggregate.copyFailureCount + 1);
  if (copyFailureRate > 0.3) score += 0.4;
  else if (copyFailureRate > 0.1) score += 0.2;

  // Low open rate
  if (aggregate.openShopeeClickRate < 0.1) score += 0.2;

  // High divergence
  if (aggregate.bestVsCandidateDivergence > DIVERGENCE_THRESHOLDS.MAJOR) score += 0.3;

  // High no-match rate
  if (aggregate.noMatchViewedCount / aggregate.viewCount > 0.2) score += 0.1;

  return Math.min(score, 1.0);
}
