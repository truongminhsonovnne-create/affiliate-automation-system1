/**
 * TikTok Shop Preview Funnel Aggregator
 *
 * Aggregates preview funnel metrics and detects dropoff points.
 */

import { tiktokPreviewSessionRepository } from '../repositories/tiktokPreviewSessionRepository.js';
import { PREVIEW_FUNNEL_THRESHOLDS, PREVIEW_EVENT_TYPES } from '../constants.js';
import type {
  TikTokShopPreviewFunnelSummary,
  TikTokShopPreviewSupportState,
  TikTokShopPreviewEventType,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Aggregate preview funnel
 */
export async function aggregateTikTokPreviewFunnel(
  from: Date,
  to: Date
): Promise<TikTokShopPreviewFunnelSummary> {
  logger.info({ msg: 'Aggregating TikTok preview funnel', from, to });

  // Get event counts by type
  const eventCounts = await tiktokPreviewSessionRepository.getEventCountsByType(from, to);

  // Get session stats
  const sessionStats = await tiktokPreviewSessionRepository.getSessionStats(from, to);

  // Build funnel summary
  const summary: TikTokShopPreviewFunnelSummary = {
    periodStart: from,
    periodEnd: to,
    totalSessions: sessionStats.total,
    totalEvents: Object.values(eventCounts).reduce((sum, count) => sum + count, 0),

    // Funnel stages
    surfaceViews: eventCounts[PREVIEW_EVENT_TYPES.SURFACE_VIEWED] || 0,
    inputSubmissions: eventCounts[PREVIEW_EVENT_TYPES.INPUT_SUBMITTED] || 0,
    resolutionAttempts: eventCounts[PREVIEW_EVENT_TYPES.RESOLUTION_ATTEMPTED] || 0,

    // Outcomes
    supportedResolutions: eventCounts[PREVIEW_EVENT_TYPES.RESOLUTION_SUPPORTED] || 0,
    partialResolutions: eventCounts[PREVIEW_EVENT_TYPES.RESOLUTION_PARTIAL] || 0,
    unavailableResolutions: eventCounts[PREVIEW_EVENT_TYPES.RESOLUTION_UNAVAILABLE] || 0,
    gateBlockedEvents: eventCounts[PREVIEW_EVENT_TYPES.BLOCKED_BY_GATE] || 0,

    // Interactions
    candidateViews: eventCounts[PREVIEW_EVENT_TYPES.CANDIDATE_VIEWED] || 0,
    copyAttempts: eventCounts[PREVIEW_EVENT_TYPES.COPY_ATTEMPTED] || 0,
    openAttempts: eventCounts[PREVIEW_EVENT_TYPES.OPEN_ATTEMPTED] || 0,

    // Dropoff
    abandonmentHints: eventCounts[PREVIEW_EVENT_TYPES.ABANDONED] || 0,
    noMatchPatterns: 0, // Calculated from unavailable + no input

    // Support states
    supportStateDistribution: sessionStats.bySupportState as Record<TikTokShopPreviewSupportState, number>,
  };

  // Calculate no-match patterns
  summary.noMatchPatterns = summary.unavailableResolutions;

  // Detect dropoff points
  const dropoffs = detectTikTokPreviewDropoffPoints(summary);

  logger.info({
    msg: 'TikTok preview funnel aggregated',
    totalSessions: summary.totalSessions,
    totalEvents: summary.totalEvents,
    supportedResolutions: summary.supportedResolutions,
    unavailableResolutions: summary.unavailableResolutions,
    dropoffs,
  });

  return summary;
}

/**
 * Build preview funnel summary
 */
export function buildTikTokPreviewFunnelSummary(
  periodStart: Date,
  periodEnd: Date,
  eventCounts: Record<string, number>,
  sessionStats: { total: number; bySupportState: Record<string, number> }
): TikTokShopPreviewFunnelSummary {
  const summary: TikTokShopPreviewFunnelSummary = {
    periodStart,
    periodEnd,
    totalSessions: sessionStats.total,
    totalEvents: Object.values(eventCounts).reduce((sum, count) => sum + count, 0),

    // Funnel stages
    surfaceViews: eventCounts[PREVIEW_EVENT_TYPES.SURFACE_VIEWED] || 0,
    inputSubmissions: eventCounts[PREVIEW_EVENT_TYPES.INPUT_SUBMITTED] || 0,
    resolutionAttempts: eventCounts[PREVIEW_EVENT_TYPES.RESOLUTION_ATTEMPTED] || 0,

    // Outcomes
    supportedResolutions: eventCounts[PREVIEW_EVENT_TYPES.RESOLUTION_SUPPORTED] || 0,
    partialResolutions: eventCounts[PREVIEW_EVENT_TYPES.RESOLUTION_PARTIAL] || 0,
    unavailableResolutions: eventCounts[PREVIEW_EVENT_TYPES.RESOLUTION_UNAVAILABLE] || 0,
    gateBlockedEvents: eventCounts[PREVIEW_EVENT_TYPES.BLOCKED_BY_GATE] || 0,

    // Interactions
    candidateViews: eventCounts[PREVIEW_EVENT_TYPES.CANDIDATE_VIEWED] || 0,
    copyAttempts: eventCounts[PREVIEW_EVENT_TYPES.COPY_ATTEMPTED] || 0,
    openAttempts: eventCounts[PREVIEW_EVENT_TYPES.OPEN_ATTEMPTED] || 0,

    // Dropoff
    abandonmentHints: eventCounts[PREVIEW_EVENT_TYPES.ABANDONED] || 0,
    noMatchPatterns: eventCounts[PREVIEW_EVENT_TYPES.RESOLUTION_UNAVAILABLE] || 0,

    // Support states
    supportStateDistribution: sessionStats.bySupportState as Record<TikTokShopPreviewSupportState, number>,
  };

  return summary;
}

/**
 * Detect dropoff points in the funnel
 */
export function detectTikTokPreviewDropoffPoints(
  summary: TikTokShopPreviewFunnelSummary
): Record<string, number> {
  const dropoffs: Record<string, number> = {};

  // Surface to input dropoff
  if (summary.surfaceViews > 0) {
    dropoffs.surface_to_input = 1 - (summary.inputSubmissions / summary.surfaceViews);
  }

  // Input to resolution dropoff
  if (summary.inputSubmissions > 0) {
    dropoffs.input_to_resolution = 1 - (summary.resolutionAttempts / summary.inputSubmissions);
  }

  // Resolution to supported dropoff
  if (summary.resolutionAttempts > 0) {
    dropoffs.resolution_to_supported = 1 - (summary.supportedResolutions / summary.resolutionAttempts);
  }

  // Overall dropoff
  if (summary.surfaceViews > 0) {
    dropoffs.overall = 1 - (summary.supportedResolutions / summary.surfaceViews);
  }

  // Check against thresholds
  const issues: string[] = [];

  if (dropoffs.surface_to_input && dropoffs.surface_to_input > PREVIEW_FUNNEL_THRESHOLDS.MAX_DROPOFF_RATE) {
    issues.push('high_surface_to_input_dropoff');
  }

  if (dropoffs.input_to_resolution && dropoffs.input_to_resolution > PREVIEW_FUNNEL_THRESHOLDS.MAX_DROPOFF_RATE) {
    issues.push('high_input_to_resolution_dropoff');
  }

  if (dropoffs.resolution_to_supported && dropoffs.resolution_to_supported > PREVIEW_FUNNEL_THRESHOLDS.MAX_UNSUPPORTED_RATE) {
    issues.push('high_unsupported_rate');
  }

  if (summary.totalSessions > 0 && summary.gateBlockedEvents / summary.totalSessions > PREVIEW_FUNNEL_THRESHOLDS.MAX_GATE_BLOCK_RATE) {
    issues.push('high_gate_block_rate');
  }

  return dropoffs;
}

/**
 * Calculate funnel conversion rates
 */
export function calculateFunnelRates(summary: TikTokShopPreviewFunnelSummary): Record<string, number> {
  const rates: Record<string, number> = {};

  // Surface to input rate
  if (summary.surfaceViews > 0) {
    rates.input_rate = summary.inputSubmissions / summary.surfaceViews;
  }

  // Input to resolution rate
  if (summary.inputSubmissions > 0) {
    rates.resolution_rate = summary.resolutionAttempts / summary.inputSubmissions;
  }

  // Resolution success rate
  if (summary.resolutionAttempts > 0) {
    rates.supported_rate = summary.supportedResolutions / summary.resolutionAttempts;
    rates.partial_rate = summary.partialResolutions / summary.resolutionAttempts;
    rates.unavailable_rate = summary.unavailableResolutions / summary.resolutionAttempts;
  }

  // Interaction rates
  if (summary.resolutionAttempts > 0) {
    rates.candidate_view_rate = summary.candidateViews / summary.resolutionAttempts;
    rates.copy_rate = summary.copyAttempts / summary.resolutionAttempts;
    rates.open_rate = summary.openAttempts / summary.resolutionAttempts;
  }

  // Overall conversion
  if (summary.surfaceViews > 0) {
    rates.overall_conversion = summary.supportedResolutions / summary.surfaceViews;
  }

  return rates;
}

/**
 * Check if funnel meets quality thresholds
 */
export function isFunnelHealthy(
  summary: TikTokShopPreviewFunnelSummary
): { healthy: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check minimum activity
  if (summary.surfaceViews < PREVIEW_FUNNEL_THRESHOLDS.MIN_SURFACE_VIEWS_FOR_ANALYSIS) {
    issues.push('insufficient_surface_views');
  }

  // Check resolution attempt rate
  const resolutionRate = summary.inputSubmissions > 0
    ? summary.resolutionAttempts / summary.inputSubmissions
    : 0;

  if (resolutionRate < PREVIEW_FUNNEL_THRESHOLDS.MIN_RESOLUTION_ATTEMPT_RATE) {
    issues.push('low_resolution_attempt_rate');
  }

  // Check unsupported rate
  const unsupportedRate = summary.resolutionAttempts > 0
    ? summary.unavailableResolutions / summary.resolutionAttempts
    : 0;

  if (unsupportedRate > PREVIEW_FUNNEL_THRESHOLDS.MAX_UNSUPPORTED_RATE) {
    issues.push('high_unsupported_rate');
  }

  // Check gate block rate
  const gateBlockRate = summary.totalSessions > 0
    ? summary.gateBlockedEvents / summary.totalSessions
    : 0;

  if (gateBlockRate > PREVIEW_FUNNEL_THRESHOLDS.MAX_GATE_BLOCK_RATE) {
    issues.push('high_gate_block_rate');
  }

  return {
    healthy: issues.length === 0,
    issues,
  };
}
