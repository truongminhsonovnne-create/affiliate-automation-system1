/**
 * Platform Observability - Events
 */

import { logger } from '../../utils/logger.js';

export type PlatformEventType =
  | 'platform.registered'
  | 'platform.status_changed'
  | 'platform.capability_updated'
  | 'readiness.review.started'
  | 'readiness.review.completed'
  | 'readiness.review.failed'
  | 'readiness.status_changed'
  | 'backlog.item.created'
  | 'backlog.item.completed'
  | 'backlog.item.overdue'
  | 'decision.support.generated'
  | 'expansion.approved'
  | 'expansion.rejected'
  | 'expansion.holded';

export interface PlatformEvent {
  type: PlatformEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export function emitPlatformEvent(type: PlatformEventType, payload: Record<string, unknown> = {}): void {
  const event: PlatformEvent = {
    type,
    timestamp: new Date().toISOString(),
    payload,
  };

  logger.info({ msg: 'Platform Event', ...event });
}

export function emitPlatformRegistered(platformKey: string, platformName: string): void {
  emitPlatformEvent('platform.registered', { platformKey, platformName });
}

export function emitPlatformStatusChanged(platformKey: string, previousStatus: string, newStatus: string): void {
  emitPlatformEvent('platform.status_changed', { platformKey, previousStatus, newStatus });
}

export function emitPlatformCapabilityUpdated(platformKey: string, capabilityArea: string): void {
  emitPlatformEvent('platform.capability_updated', { platformKey, capabilityArea });
}

export function emitReadinessReviewStarted(platformKey: string, reviewType: string): void {
  emitPlatformEvent('readiness.review.started', { platformKey, reviewType });
}

export function emitReadinessReviewCompleted(
  platformKey: string,
  reviewType: string,
  status: string,
  score: number
): void {
  emitPlatformEvent('readiness.review.completed', { platformKey, reviewType, status, score });
}

export function emitReadinessReviewFailed(platformKey: string, reviewType: string, error: string): void {
  emitPlatformEvent('readiness.review.failed', { platformKey, reviewType, error });
}

export function emitReadinessStatusChanged(platformKey: string, previousStatus: string, newStatus: string): void {
  emitPlatformEvent('readiness.status_changed', { platformKey, previousStatus, newStatus });
}

export function emitBacklogItemCreated(platformKey: string, itemId: string, title: string): void {
  emitPlatformEvent('backlog.item.created', { platformKey, itemId, title });
}

export function emitBacklogItemCompleted(platformKey: string, itemId: string): void {
  emitPlatformEvent('backlog.item.completed', { platformKey, itemId });
}

export function emitBacklogItemOverdue(platformKey: string, itemId: string, title: string): void {
  emitPlatformEvent('backlog.item.overdue', { platformKey, itemId, title });
}

export function emitDecisionSupportGenerated(platformKey: string, recommendation: string, confidence: number): void {
  emitPlatformEvent('decision.support.generated', { platformKey, recommendation, confidence });
}

export function emitExpansionApproved(platformKey: string, rationale: string): void {
  emitPlatformEvent('expansion.approved', { platformKey, rationale });
}

export function emitExpansionRejected(platformKey: string, rationale: string): void {
  emitPlatformEvent('expansion.rejected', { platformKey, rationale });
}

export function emitExpansionHolded(platformKey: string, rationale: string): void {
  emitPlatformEvent('expansion.holded', { platformKey, rationale });
}
