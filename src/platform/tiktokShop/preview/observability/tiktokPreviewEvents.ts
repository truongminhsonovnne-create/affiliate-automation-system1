/**
 * TikTok Shop Preview Operational Events
 *
 * Operational events for preview intelligence layer.
 */

import logger from '../../../../utils/logger.js';

/**
 * Preview intelligence cycle started
 */
export function logPreviewIntelligenceCycleStarted(from: Date, to: Date): void {
  logger.info({
    msg: 'TikTok preview intelligence cycle started',
    from: from.toISOString(),
    to: to.toISOString(),
    event: 'preview_intelligence_cycle_started',
  });
}

/**
 * Preview intelligence cycle completed
 */
export function logPreviewIntelligenceCycleCompleted(
  sessionCount: number,
  usefulnessScore: number,
  stabilityScore: number
): void {
  logger.info({
    msg: 'TikTok preview intelligence cycle completed',
    sessionCount,
    usefulnessScore,
    stabilityScore,
    event: 'preview_intelligence_cycle_completed',
  });
}

/**
 * Commercial readiness review started
 */
export function logCommercialReadinessReviewStarted(): void {
  logger.info({
    msg: 'TikTok commercial readiness review started',
    event: 'commercial_readiness_review_started',
  });
}

/**
 * Commercial readiness review completed
 */
export function logCommercialReadinessReviewCompleted(
  readinessScore: number,
  status: string
): void {
  logger.info({
    msg: 'TikTok commercial readiness review completed',
    readinessScore,
    status,
    event: 'commercial_readiness_review_completed',
  });
}

/**
 * Monetization governance action created
 */
export function logMonetizationGovernanceAction(
  actionType: string,
  actionStatus: string,
  actorId?: string
): void {
  logger.info({
    msg: 'TikTok monetization governance action',
    actionType,
    actionStatus,
    actorId,
    event: 'monetization_governance_action',
  });
}

/**
 * Monetization stage changed
 */
export function logMonetizationStageChanged(
  fromStage: string,
  toStage: string,
  actorId?: string
): void {
  logger.info({
    msg: 'TikTok monetization stage changed',
    fromStage,
    toStage,
    actorId,
    event: 'monetization_stage_changed',
  });
}

/**
 * Preview funnel anomaly detected
 */
export function logPreviewFunnelAnomaly(
  anomalyType: string,
  details: Record<string, unknown>
): void {
  logger.warn({
    msg: 'TikTok preview funnel anomaly detected',
    anomalyType,
    details,
    event: 'preview_funnel_anomaly',
  });
}

/**
 * Preview quality issue detected
 */
export function logPreviewQualityIssue(
  issueType: string,
  score: number,
  threshold: number
): void {
  logger.warn({
    msg: 'TikTok preview quality issue detected',
    issueType,
    score,
    threshold,
    event: 'preview_quality_issue',
  });
}

/**
 * Preview stability issue detected
 */
export function logPreviewStabilityIssue(
  issueType: string,
  score: number,
  threshold: number
): void {
  logger.warn({
    msg: 'TikTok preview stability issue detected',
    issueType,
    score,
    threshold,
    event: 'preview_stability_issue',
  });
}

/**
 * Preview event recorded
 */
export function logPreviewEventRecorded(
  eventType: string,
  sessionId?: string
): void {
  logger.debug({
    msg: 'TikTok preview event recorded',
    eventType,
    sessionId,
    event: 'preview_event_recorded',
  });
}

/**
 * Preview session created
 */
export function logPreviewSessionCreated(
  sessionKey: string,
  stage: string,
  supportState: string
): void {
  logger.info({
    msg: 'TikTok preview session created',
    sessionKey,
    stage,
    supportState,
    event: 'preview_session_created',
  });
}

/**
 * Error during preview processing
 */
export function logPreviewProcessingError(
  error: string,
  context: Record<string, unknown>
): void {
  logger.error({
    msg: 'TikTok preview processing error',
    error,
    context,
    event: 'preview_processing_error',
  });
}
