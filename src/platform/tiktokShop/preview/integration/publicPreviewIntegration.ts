/**
 * Public Preview Integration
 *
 * Integrates limited public preview with intelligence layer.
 */

import { tiktokPreviewEventRecorder } from '../events/tiktokPreviewEventRecorder.js';
import { tiktokPreviewSessionRepository } from '../repositories/tiktokPreviewSessionRepository.js';
import type {
  TikTokPublicPreviewEvidenceBundle,
  TikTokShopPreviewSupportState,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Record public preview flow
 */
export async function recordTikTokPublicPreviewFlow(
  params: {
    sessionKey: string;
    surface: string;
    supportState: TikTokShopPreviewSupportState;
    inputValue?: string;
    resolutionOutcome?: 'supported' | 'partial' | 'unavailable';
    resolutionRunId?: string;
  }
): Promise<void> {
  logger.info({
    msg: 'Recording TikTok public preview flow',
    sessionKey: params.sessionKey,
    supportState: params.supportState,
  });

  // Get or create session
  let session = await tiktokPreviewSessionRepository.getSessionByKey(params.sessionKey);

  if (!session) {
    session = await tiktokPreviewSessionRepository.createSession({
      sessionKey: params.sessionKey,
      previewStage: 'limited_public_preview',
      supportState: params.supportState,
      previewEntrySurface: params.surface,
    });
  }

  // Record surface viewed
  await tiktokPreviewEventRecorder.recordSurfaceViewed(
    params.sessionKey,
    params.surface,
    params.supportState
  );

  // Record input if provided
  if (params.inputValue) {
    await tiktokPreviewEventRecorder.recordInputSubmitted(
      params.sessionKey,
      'url',
      params.supportState
    );
  }

  // Record resolution outcome if provided
  if (params.resolutionOutcome && params.resolutionRunId) {
    await tiktokPreviewEventRecorder.recordResolutionOutcome(
      params.sessionKey,
      params.resolutionRunId,
      params.resolutionOutcome
    );
  }
}

/**
 * Build public preview evidence bundle
 */
export async function buildTikTokPublicPreviewEvidenceBundle(): Promise<TikTokPublicPreviewEvidenceBundle> {
  logger.info({ msg: 'Building TikTok public preview evidence bundle' });

  // Get session count
  const totalSessions = await tiktokPreviewSessionRepository.countSessions({
    stage: 'limited_public_preview',
  });

  // Get event counts
  const eventCounts = await tiktokPreviewSessionRepository.getEventCountsByType();

  // Get support state distribution
  const sessionStats = await tiktokPreviewSessionRepository.getSessionStats();

  // Build funnel summary (simplified)
  const funnelSummary = {
    totalSessions,
    totalEvents: Object.values(eventCounts).reduce((a, b) => a + b, 0),
    surfaceViews: eventCounts['preview_surface_viewed'] || 0,
    inputSubmissions: eventCounts['preview_input_submitted'] || 0,
    resolutionAttempts: eventCounts['preview_resolution_attempted'] || 0,
    supportedResolutions: eventCounts['preview_resolution_supported'] || 0,
    partialResolutions: eventCounts['preview_resolution_partial'] || 0,
    unavailableResolutions: eventCounts['preview_resolution_unavailable'] || 0,
    supportStateDistribution: sessionStats.bySupportState as Record<TikTokShopPreviewSupportState, number>,
  } as unknown as TikPublicPreviewEvidenceBundle['funnelSummary'];

  return {
    sessionCount: totalSessions,
    eventCount: funnelSummary.totalEvents,
    funnelSummary,
    qualityReview: null, // Would fetch from quality review repository
    stabilityReview: null, // Would calculate from events
    supportSummary: sessionStats.bySupportState as Record<TikTokShopPreviewSupportState, number>,
  };
}

/**
 * Build public preview support summary
 */
export function buildTikTokPublicPreviewSupportSummary(
  supportStates: Record<string, number>
): Record<string, unknown> {
  const total = Object.values(supportStates).reduce((a, b) => a + b, 0);

  const summary = {
    total,
    byState: supportStates,
    percentage: Object.entries(supportStates).reduce((acc, [state, count]) => {
      acc[state] = total > 0 ? (count / total) * 100 : 0;
      return acc;
    }, {} as Record<string, number>),
  };

  return summary;
}

/**
 * Get preview flow status
 */
export async function getTikTokPreviewFlowStatus(): Promise<{
  active: boolean;
  stage: string;
  sessionCount: number;
  lastActivity: Date | null;
}> {
  const sessions = await tiktokPreviewSessionRepository.getSessionsByStage('limited_public_preview', 1);
  const latestSession = sessions[0];

  return {
    active: latestSession !== undefined,
    stage: 'limited_public_preview',
    sessionCount: await tiktokPreviewSessionRepository.countSessions({
      stage: 'limited_public_preview',
    }),
    lastActivity: latestSession?.lastSeenAt || null,
  };
}

// Type fix for internal use
type TikPublicPreviewEvidenceBundle = {
  sessionCount: number;
  eventCount: number;
  funnelSummary: {
    totalSessions: number;
    totalEvents: number;
    surfaceViews: number;
    inputSubmissions: number;
    resolutionAttempts: number;
    supportedResolutions: number;
    partialResolutions: number;
    unavailableResolutions: number;
    supportStateDistribution: Record<string, number>;
  };
  qualityReview: null;
  stabilityReview: null;
  supportSummary: Record<string, number>;
};
