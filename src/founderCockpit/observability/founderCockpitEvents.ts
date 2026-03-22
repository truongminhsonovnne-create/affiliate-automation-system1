/**
 * Founder Cockpit Observability - Events
 */

import { logger } from '../../../utils/logger.js';

export type FounderCockpitEventType =
  | 'cockpit.build.started'
  | 'cockpit.build.completed'
  | 'cockpit.build.failed'
  | 'weekly_review.build.started'
  | 'weekly_review.build.completed'
  | 'weekly_review.build.failed'
  | 'strategic_pack.build.started'
  | 'strategic_pack.build.completed'
  | 'strategic_pack.build.failed'
  | 'decision.created'
  | 'decision.resolved'
  | 'followup.created'
  | 'followup.completed'
  | 'health.status.changed';

export interface FounderCockpitEvent {
  type: FounderCockpitEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export function emitFounderCockpitEvent(type: FounderCockpitEventType, payload: Record<string, unknown> = {}): void {
  const event: FounderCockpitEvent = {
    type,
    timestamp: new Date().toISOString(),
    payload,
  };

  logger.info({
    msg: 'Founder Cockpit Event',
    ...event,
  });
}

export function emitCockpitBuildStarted(startDate: string, endDate: string): void {
  emitFounderCockpitEvent('cockpit.build.started', { startDate, endDate });
}

export function emitCockpitBuildCompleted(startDate: string, endDate: string, healthScore: number): void {
  emitFounderCockpitEvent('cockpit.build.completed', { startDate, endDate, healthScore });
}

export function emitCockpitBuildFailed(startDate: string, endDate: string, error: string): void {
  emitFounderCockpitEvent('cockpit.build.failed', { startDate, endDate, error });
}

export function emitWeeklyReviewBuildStarted(startDate: string, endDate: string): void {
  emitFounderCockpitEvent('weekly_review.build.started', { startDate, endDate });
}

export function emitWeeklyReviewBuildCompleted(startDate: string, endDate: string, overallHealth: string): void {
  emitFounderCockpitEvent('weekly_review.build.completed', { startDate, endDate, overallHealth });
}

export function emitWeeklyReviewBuildFailed(startDate: string, endDate: string, error: string): void {
  emitFounderCockpitEvent('weekly_review.build.failed', { startDate, endDate, error });
}

export function emitStrategicPackBuildStarted(type: string, startDate: string, endDate: string): void {
  emitFounderCockpitEvent('strategic_pack.build.started', { type, startDate, endDate });
}

export function emitStrategicPackBuildCompleted(type: string, packId: string): void {
  emitFounderCockpitEvent('strategic_pack.build.completed', { type, packId });
}

export function emitStrategicPackBuildFailed(type: string, error: string): void {
  emitFounderCockpitEvent('strategic_pack.build.failed', { type, error });
}

export function emitDecisionCreated(decisionId: string, title: string, priority: string): void {
  emitFounderCockpitEvent('decision.created', { decisionId, title, priority });
}

export function emitDecisionResolved(decisionId: string, resolution: string): void {
  emitFounderCockpitEvent('decision.resolved', { decisionId, resolution });
}

export function emitFollowupCreated(followupId: string, sourceType: string): void {
  emitFounderCockpitEvent('followup.created', { followupId, sourceType });
}

export function emitFollowupCompleted(followupId: string): void {
  emitFounderCockpitEvent('followup.completed', { followupId });
}

export function emitHealthStatusChanged(
  previousStatus: string,
  currentStatus: string,
  affectedAreas: string[]
): void {
  emitFounderCockpitEvent('health.status.changed', { previousStatus, currentStatus, affectedAreas });
}
