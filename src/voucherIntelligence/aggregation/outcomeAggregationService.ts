/**
 * Outcome Aggregation Service
 *
 * Aggregates raw signals into usable aggregates for analysis
 */

import {
  VoucherOutcomeSignal,
  VoucherOutcomeAggregate,
  TimeWindow,
  Platform,
  VoucherOutcomeEventType,
} from '../types/index.js';
import { RANKING_THRESHOLDS, CONVERSION_THRESHOLDS } from '../constants/index.js';

// ============================================================================
// Types
// ============================================================================

export interface AggregateOptions {
  platform?: Platform;
  voucherIds?: string[];
  timeWindow: TimeWindow;
  minSampleSize?: number;
}

export interface AggregateResult {
  aggregates: VoucherOutcomeAggregate[];
  summary: AggregateSummary;
}

export interface AggregateSummary {
  totalVouchers: number;
  totalResolutions: number;
  avgCopySuccessRate: number;
  avgOpenShopeeClickRate: number;
  avgBestSelectionRate: number;
  noMatchRate: number;
}

// ============================================================================
// Main Aggregation Functions
// ============================================================================

/**
 * Aggregate voucher outcome signals for a time window
 */
export async function aggregateVoucherOutcomeSignals(
  signals: VoucherOutcomeSignal[],
  options: AggregateOptions
): Promise<AggregateResult> {
  const { platform, voucherIds, timeWindow, minSampleSize = RANKING_THRESHOLDS.MIN_SAMPLE_SIZE } = options;

  // Filter signals by platform and time window
  const filteredSignals = signals.filter(s => {
    // Time window filter
    const signalTime = new Date(s.createdAt).getTime();
    const windowStart = timeWindow.start.getTime();
    const windowEnd = timeWindow.end.getTime();

    if (signalTime < windowStart || signalTime > windowEnd) {
      return false;
    }

    return true;
  });

  // Group signals by voucher
  const voucherSignalMap = groupSignalsByVoucher(filteredSignals);

  // Build aggregates
  const aggregates: VoucherOutcomeAggregate[] = [];

  for (const [voucherId, voucherSignals] of Object.entries(voucherSignalMap)) {
    // Skip if filtering by voucher IDs and this one isn't included
    if (voucherIds && voucherIds.length > 0 && !voucherIds.includes(voucherId)) {
      continue;
    }

    const aggregate = buildVoucherOutcomeAggregate(
      voucherId,
      platform || Platform.SHOPEE,
      timeWindow,
      voucherSignals,
      minSampleSize
    );

    if (aggregate) {
      aggregates.push(aggregate);
    }
  }

  // Build summary
  const summary = buildAggregateSummary(aggregates);

  return { aggregates, summary };
}

/**
 * Aggregate signals for a specific window
 */
export async function aggregateVoucherSignalsForWindow(
  signals: VoucherOutcomeSignal[],
  windowStart: Date,
  windowEnd: Date
): Promise<VoucherOutcomeAggregate[]> {
  const result = await aggregateVoucherOutcomeSignals(
    signals,
    { timeWindow: { start: windowStart, end: windowEnd } }
  );
  return result.aggregates;
}

// ============================================================================
// Aggregation Builders
// ============================================================================

/**
 * Build voucher outcome aggregate from signals
 */
function buildVoucherOutcomeAggregate(
  voucherId: string,
  platform: Platform,
  timeWindow: TimeWindow,
  signals: VoucherOutcomeSignal[],
  minSampleSize: number
): VoucherOutcomeAggregate | null {
  const totalSignals = signals.length;

  if (totalSignals < minSampleSize) {
    return null;
  }

  // Count events by type
  const eventCounts = countEventsByType(signals);

  // Calculate metrics
  const viewCount = eventCounts[VoucherOutcomeEventType.RESOLUTION_VIEWED] || 0;
  const bestVoucherShownCount = eventCounts[VoucherOutcomeEventType.BEST_VOUCHER_VIEWED] || 0;
  const candidateViewCount = eventCounts[VoucherOutcomeEventType.CANDIDATE_VIEWED] || 0;
  const copyCount = eventCounts[VoucherOutcomeEventType.VOUCHER_COPIED] || 0;
  const copyFailureCount = eventCounts[VoucherOutcomeEventType.VOUCHER_COPY_FAILED] || 0;
  const openShopeeClickCount = eventCounts[VoucherOutcomeEventType.OPEN_SHOPEE_CLICKED] || 0;
  const noMatchViewedCount = eventCounts[VoucherOutcomeEventType.NO_MATCH_VIEWED] || 0;
  const fallbackClickedCount = eventCounts[VoucherOutcomeEventType.FALLBACK_CLICKED] || 0;

  // Calculate rates
  const totalCopyAttempts = copyCount + copyFailureCount;
  const copySuccessRate = totalCopyAttempts > 0 ? copyCount / totalCopyAttempts : 0;
  const openShopeeClickRate = viewCount > 0 ? openShopeeClickCount / viewCount : 0;
  const fallbackClickRate = noMatchViewedCount > 0 ? fallbackClickedCount / noMatchViewedCount : 0;

  // Best vs candidate selection
  // For simplicity, we consider copy as selection
  const totalSelections = copyCount;
  const bestSelectedCount = 0; // Would need to track which voucher was selected
  const candidateSelectedCount = totalSelections - bestSelectedCount;
  const bestVsCandidateDivergence = totalSelections > 0
    ? Math.abs(bestSelectedCount - candidateSelectedCount) / totalSelections
    : 0;

  return {
    voucherId,
    platform,
    timeWindow,
    viewCount,
    bestVoucherShownCount,
    candidateShownCount: candidateViewCount,
    copyCount,
    copySuccessCount: copyCount,
    copyFailureCount,
    copySuccessRate,
    openShopeeClickCount,
    openShopeeClickRate,
    bestSelectedCount,
    candidateSelectedCount,
    bestVsCandidateDivergence,
    noMatchViewedCount,
    fallbackClickedCount,
    fallbackClickRate,
  };
}

/**
 * Build aggregate summary
 */
function buildAggregateSummary(aggregates: VoucherOutcomeAggregate[]): AggregateSummary {
  if (aggregates.length === 0) {
    return {
      totalVouchers: 0,
      totalResolutions: 0,
      avgCopySuccessRate: 0,
      avgOpenShopeeClickRate: 0,
      avgBestSelectionRate: 0,
      noMatchRate: 0,
    };
  }

  const totalResolutions = aggregates.reduce((sum, a) => sum + a.viewCount, 0);
  const avgCopySuccessRate = aggregates.reduce((sum, a) => sum + a.copySuccessRate, 0) / aggregates.length;
  const avgOpenShopeeClickRate = aggregates.reduce((sum, a) => sum + a.openShopeeClickRate, 0) / aggregates.length;
  const avgBestSelectionRate = aggregates.length > 0
    ? aggregates.reduce((sum, a) => sum + (a.bestSelectedCount / (a.copyCount || 1)), 0) / aggregates.length
    : 0;
  const noMatchRate = aggregates.length > 0
    ? aggregates.reduce((sum, a) => sum + a.noMatchViewedCount, 0) / totalResolutions
    : 0;

  return {
    totalVouchers: aggregates.length,
    totalResolutions,
    avgCopySuccessRate,
    avgOpenShopeeClickRate,
    avgBestSelectionRate,
    noMatchRate,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Group signals by voucher
 */
function groupSignalsByVoucher(signals: VoucherOutcomeSignal[]): Record<string, VoucherOutcomeSignal[]> {
  const grouped: Record<string, VoucherOutcomeSignal[]> = {};

  for (const signal of signals) {
    const voucherId = signal.voucherId || 'no_voucher';

    if (!grouped[voucherId]) {
      grouped[voucherId] = [];
    }

    grouped[voucherId].push(signal);
  }

  return grouped;
}

/**
 * Count events by type
 */
function countEventsByType(signals: VoucherOutcomeSignal[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const signal of signals) {
    const eventType = signal.eventType;
    counts[eventType] = (counts[eventType] || 0) + 1;
  }

  return counts;
}

// ============================================================================
// Specialized Aggregations
// ============================================================================

/**
 * Calculate growth surface attribution quality
 */
export function calculateGrowthSurfaceAttributionQuality(
  signals: VoucherOutcomeSignal[],
  _timeWindow: TimeWindow
): Record<string, number> {
  const attributionMap: Record<string, { total: number; converted: number }> = {};

  // Group by growth surface
  for (const signal of signals) {
    const payload = signal.eventPayload as Record<string, unknown> | undefined;
    const surfaceType = payload?.growthSurfaceType as string | undefined;

    if (!surfaceType) continue;

    if (!attributionMap[surfaceType]) {
      attributionMap[surfaceType] = { total: 0, converted: 0 };
    }

    attributionMap[surfaceType].total++;

    // Consider copy or open as conversion
    if (signal.eventType === VoucherOutcomeEventType.VOUCHER_COPIED ||
        signal.eventType === VoucherOutcomeEventType.OPEN_SHOPEE_CLICKED) {
      attributionMap[surfaceType].converted++;
    }
  }

  // Calculate conversion rate per surface
  const quality: Record<string, number> = {};
  for (const [surface, data] of Object.entries(attributionMap)) {
    quality[surface] = data.total > 0 ? data.converted / data.total : 0;
  }

  return quality;
}

/**
 * Calculate best vs candidate divergence
 */
export function calculateBestVsCandidateDivergence(
  aggregates: VoucherOutcomeAggregate[]
): Array<{ voucherId: string; divergence: number }> {
  return aggregates
    .filter(a => a.bestVsCandidateDivergence > RANKING_THRESHOLDS.BEST_VS_CANDIDATE_DIVERGENCE)
    .map(a => ({
      voucherId: a.voucherId,
      divergence: a.bestVsCandidateDivergence,
    }))
    .sort((a, b) => b.divergence - a.divergence);
}

/**
 * Identify underperforming best vouchers
 */
export function identifyUnderperformingBestVouchers(
  aggregates: VoucherOutcomeAggregate[]
): VoucherOutcomeAggregate[] {
  return aggregates.filter(a =>
    a.bestSelectedCount > 0 &&
    a.copyCount > 0 &&
    (a.bestSelectedCount / a.copyCount) < RANKING_THRESHOLDS.BEST_VOUCHER_UNDERPERFORMANCE
  );
}

/**
 * Calculate no-match metrics
 */
export function calculateNoMatchMetrics(
  signals: VoucherOutcomeSignal[],
  _timeWindow: TimeWindow
): {
  noMatchCount: number;
  fallbackClickCount: number;
  fallbackClickRate: number;
} {
  const noMatchSignals = signals.filter(
    s => s.eventType === VoucherOutcomeEventType.NO_MATCH_VIEWED
  );

  const fallbackSignals = signals.filter(
    s => s.eventType === VoucherOutcomeEventType.FALLBACK_CLICKED
  );

  const noMatchCount = noMatchSignals.length;
  const fallbackClickCount = fallbackSignals.length;
  const fallbackClickRate = noMatchCount > 0 ? fallbackClickCount / noMatchCount : 0;

  return { noMatchCount, fallbackClickCount, fallbackClickRate };
}
