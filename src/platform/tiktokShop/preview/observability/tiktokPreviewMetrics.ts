/**
 * TikTok Shop Preview Metrics
 *
 * Observability metrics for preview intelligence layer.
 */

import logger from '../../../../utils/logger.js';

// Metrics counters
const metrics = {
  previewSessions: 0,
  previewEvents: 0,
  qualityReviews: 0,
  commercialReviews: 0,
  governanceActions: 0,
  holdActions: 0,
  approveActions: 0,
  backlogItems: 0,
};

/**
 * Increment preview session count
 */
export function incrementPreviewSessions(): void {
  metrics.previewSessions++;
  logger.debug({ msg: 'Preview session count', count: metrics.previewSessions });
}

/**
 * Increment preview event count
 */
export function incrementPreviewEvents(): void {
  metrics.previewEvents++;
  logger.debug({ msg: 'Preview event count', count: metrics.previewEvents });
}

/**
 * Increment quality review count
 */
export function incrementQualityReviews(): void {
  metrics.qualityReviews++;
  logger.debug({ msg: 'Quality review count', count: metrics.qualityReviews });
}

/**
 * Increment commercial review count
 */
export function incrementCommercialReviews(): void {
  metrics.commercialReviews++;
  logger.debug({ msg: 'Commercial review count', count: metrics.commercialReviews });
}

/**
 * Increment governance action count
 */
export function incrementGovernanceActions(): void {
  metrics.governanceActions++;
  logger.debug({ msg: 'Governance action count', count: metrics.governanceActions });
}

/**
 * Increment hold action count
 */
export function incrementHoldActions(): void {
  metrics.holdActions++;
  logger.debug({ msg: 'Hold action count', count: metrics.holdActions });
}

/**
 * Increment approve action count
 */
export function incrementApproveActions(): void {
  metrics.approveActions++;
  logger.debug({ msg: 'Approve action count', count: metrics.approveActions });
}

/**
 * Increment backlog item count
 */
export function incrementBacklogItems(): void {
  metrics.backlogItems++;
  logger.debug({ msg: 'Backlog item count', count: metrics.backlogItems });
}

/**
 * Get current metrics
 */
export function getPreviewMetrics(): typeof metrics {
  return { ...metrics };
}

/**
 * Reset metrics
 */
export function resetPreviewMetrics(): void {
  Object.keys(metrics).forEach(key => {
    (metrics as Record<string, number>)[key] = 0;
  });
  logger.info({ msg: 'Preview metrics reset' });
}

/**
 * Log metrics summary
 */
export function logPreviewMetricsSummary(): void {
  logger.info({
    msg: 'TikTok Preview Metrics Summary',
    metrics: getPreviewMetrics(),
  });
}
