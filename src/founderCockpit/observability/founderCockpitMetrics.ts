/**
 * Founder Cockpit Observability - Metrics
 */

import { logger } from '../../../utils/logger.js';

export interface FounderCockpitMetrics {
  // Build metrics
  cockpitBuildDuration: number;
  cockpitBuildSuccess: boolean;
  weeklyReviewBuildDuration: number;
  weeklyReviewBuildSuccess: boolean;
  strategicPackBuildDuration: number;
  strategicPackBuildSuccess: boolean;

  // Data metrics
  snapshotsCreated: number;
  reviewsCreated: number;
  decisionsCreated: number;
  followupsCreated: number;

  // Health metrics
  overallHealthScore: number;
  growthHealth: string;
  qualityHealth: string;
  commercialHealth: string;
  releaseHealth: string;
}

const metrics: FounderCockpitMetrics = {
  cockpitBuildDuration: 0,
  cockpitBuildSuccess: false,
  weeklyReviewBuildDuration: 0,
  weeklyReviewBuildSuccess: false,
  strategicPackBuildDuration: 0,
  strategicPackBuildSuccess: false,
  snapshotsCreated: 0,
  reviewsCreated: 0,
  decisionsCreated: 0,
  followupsCreated: 0,
  overallHealthScore: 0,
  growthHealth: 'unknown',
  qualityHealth: 'unknown',
  commercialHealth: 'unknown',
  releaseHealth: 'unknown',
};

export function recordCockpitBuild(duration: number, success: boolean): void {
  metrics.cockpitBuildDuration = duration;
  metrics.cockpitBuildSuccess = success;
  logger.info({
    msg: 'Founder Cockpit Build',
    duration,
    success,
  });
}

export function recordWeeklyReviewBuild(duration: number, success: boolean): void {
  metrics.weeklyReviewBuildDuration = duration;
  metrics.weeklyReviewBuildSuccess = success;
  logger.info({
    msg: 'Weekly Review Build',
    duration,
    success,
  });
}

export function recordStrategicPackBuild(duration: number, success: boolean): void {
  metrics.strategicPackBuildDuration = duration;
  metrics.strategicPackBuildSuccess = success;
  logger.info({
    msg: 'Strategic Pack Build',
    duration,
    success,
  });
}

export function recordSnapshotCreated(): void {
  metrics.snapshotsCreated++;
}

export function recordReviewCreated(): void {
  metrics.reviewsCreated++;
}

export function recordDecisionCreated(): void {
  metrics.decisionsCreated++;
}

export function recordFollowupCreated(): void {
  metrics.followupsCreated++;
}

export function updateHealthMetrics(health: {
  overallScore: number;
  growth: string;
  quality: string;
  commercial: string;
  release: string;
}): void {
  metrics.overallHealthScore = health.overallScore;
  metrics.growthHealth = health.growth;
  metrics.qualityHealth = health.quality;
  metrics.commercialHealth = health.commercial;
  metrics.releaseHealth = health.release;
}

export function getFounderCockpitMetrics(): FounderCockpitMetrics {
  return { ...metrics };
}

export function resetFounderCockpitMetrics(): void {
  Object.assign(metrics, {
    cockpitBuildDuration: 0,
    cockpitBuildSuccess: false,
    weeklyReviewBuildDuration: 0,
    weeklyReviewBuildSuccess: false,
    strategicPackBuildDuration: 0,
    strategicPackBuildSuccess: false,
    snapshotsCreated: 0,
    reviewsCreated: 0,
    decisionsCreated: 0,
    followupsCreated: 0,
    overallHealthScore: 0,
    growthHealth: 'unknown',
    qualityHealth: 'unknown',
    commercialHealth: 'unknown',
    releaseHealth: 'unknown',
  });
}
