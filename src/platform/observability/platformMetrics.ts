/**
 * Platform Observability - Metrics
 */

import { logger } from '../../utils/logger.js';

export interface PlatformMetrics {
  // Readiness review metrics
  readinessReviewsRun: number;
  readinessReviewsByStatus: Record<string, number>;

  // Capability metrics
  capabilityGapsIdentified: number;
  capabilitiesCompleted: number;

  // Platform status metrics
  platformsReady: number;
  platformsNotReady: number;
  platformsHold: number;

  // Backlog metrics
  backlogTotal: number;
  backlogPending: number;
  backlogCompleted: number;

  // TikTok Shop specific
  tiktokShopReadinessScore: number;
  tiktokShopBlockers: number;
  tiktokShopWarnings: number;
}

const metrics: PlatformMetrics = {
  readinessReviewsRun: 0,
  readinessReviewsByStatus: {},
  capabilityGapsIdentified: 0,
  capabilitiesCompleted: 0,
  platformsReady: 0,
  platformsNotReady: 0,
  platformsHold: 0,
  backlogTotal: 0,
  backlogPending: 0,
  backlogCompleted: 0,
  tiktokShopReadinessScore: 0,
  tiktokShopBlockers: 0,
  tiktokShopWarnings: 0,
};

export function recordReadinessReviewRun(status: string): void {
  metrics.readinessReviewsRun++;
  metrics.readinessReviewsByStatus[status] = (metrics.readinessReviewsByStatus[status] || 0) + 1;
  logger.info({ msg: 'Readiness review run', status });
}

export function recordCapabilityGapIdentified(): void {
  metrics.capabilityGapsIdentified++;
}

export function recordCapabilityCompleted(): void {
  metrics.capabilitiesCompleted++;
}

export function recordPlatformReady(): void {
  metrics.platformsReady++;
}

export function recordPlatformNotReady(): void {
  metrics.platformsNotReady++;
}

export function recordPlatformHold(): void {
  metrics.platformsHold++;
}

export function recordBacklogCreated(): void {
  metrics.backlogTotal++;
  metrics.backlogPending++;
}

export function recordBacklogCompleted(): void {
  metrics.backlogPending--;
  metrics.backlogCompleted++;
}

export function updateTikTokShopMetrics(score: number, blockers: number, warnings: number): void {
  metrics.tiktokShopReadinessScore = score;
  metrics.tiktokShopBlockers = blockers;
  metrics.tiktokShopWarnings = warnings;
}

export function getPlatformMetrics(): PlatformMetrics {
  return { ...metrics };
}

export function resetPlatformMetrics(): void {
  Object.assign(metrics, {
    readinessReviewsRun: 0,
    readinessReviewsByStatus: {},
    capabilityGapsIdentified: 0,
    capabilitiesCompleted: 0,
    platformsReady: 0,
    platformsNotReady: 0,
    platformsHold: 0,
    backlogTotal: 0,
    backlogPending: 0,
    backlogCompleted: 0,
    tiktokShopReadinessScore: 0,
    tiktokShopBlockers: 0,
    tiktokShopWarnings: 0,
  });
}
