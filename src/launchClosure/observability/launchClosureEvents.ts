/**
 * Launch Closure Events
 */

export type LaunchClosureEventType = 'REVIEW_CREATED' | 'REVIEW_COMPLETED' | 'REVIEW_FINALIZED' | 'GO_DECISION' | 'NO_GO_DECISION' | 'WATCH_PLAN_CREATED';

export interface LaunchClosureEvent {
  eventType: LaunchClosureEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export function emitEvent(event: LaunchClosureEvent) {
  console.log(`[LAUNCH_CLOSURE_EVENT] ${event.eventType}`, event.payload);
}

export function emitReviewCreated(launchKey: string) {
  emitEvent({ eventType: 'REVIEW_CREATED', timestamp: new Date().toISOString(), payload: { launchKey } });
}

export function emitGoDecision(launchKey: string, decidedBy?: string) {
  emitEvent({ eventType: 'GO_DECISION', timestamp: new Date().toISOString(), payload: { launchKey, decidedBy } });
}

export function emitNoGoDecision(launchKey: string, reason: string) {
  emitEvent({ eventType: 'NO_GO_DECISION', timestamp: new Date().toISOString(), payload: { launchKey, reason } });
}
