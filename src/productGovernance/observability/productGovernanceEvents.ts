/**
 * Product Governance Events
 *
 * Operational events for governance layer.
 */

export enum GovernanceEventType {
  RELEASE_REVIEW_STARTED = 'governance.release.review.started',
  RELEASE_REVIEW_COMPLETED = 'governance.release.review.completed',
  RELEASE_DECISION_MADE = 'governance.release.decision.made',
  SIGNAL_INGESTED = 'governance.signal.ingested',
  FOLLOWUP_CREATED = 'governance.followup.created',
  FOLLOWUP_COMPLETED = 'governance.followup.completed',
  CADENCE_STARTED = 'governance.cadence.started',
  CADENCE_COMPLETED = 'governance.cadence.completed',
  GATE_BLOCKED = 'governance.gate.blocked',
  GATE_PASSED = 'governance.gate.passed',
}

export interface GovernanceEvent {
  type: GovernanceEventType;
  timestamp: Date;
  payload: Record<string, unknown>;
  actorId?: string;
}

/**
 * Emit a governance event
 */
export function emitGovernanceEvent(
  type: GovernanceEventType,
  payload: Record<string, unknown>,
  actorId?: string
): void {
  const event: GovernanceEvent = {
    type,
    timestamp: new Date(),
    payload,
    actorId,
  };

  // In real implementation, send to event bus/logger
  if (process.env.NODE_ENV === 'development') {
    console.log('[Governance Event]', JSON.stringify(event, null, 2));
  }
}

/**
 * Emit release review started event
 */
export function emitReleaseReviewStarted(releaseKey: string, environment: string): void {
  emitGovernanceEvent(GovernanceEventType.RELEASE_REVIEW_STARTED, {
    releaseKey,
    environment,
  });
}

/**
 * Emit release review completed event
 */
export function emitReleaseReviewCompleted(
  releaseKey: string,
  environment: string,
  status: string,
  score: number | null
): void {
  emitGovernanceEvent(GovernanceEventType.RELEASE_REVIEW_COMPLETED, {
    releaseKey,
    environment,
    status,
    score,
  });
}

/**
 * Emit release decision made event
 */
export function emitReleaseDecisionMade(
  releaseKey: string,
  environment: string,
  decision: string,
  actorId?: string
): void {
  emitGovernanceEvent(GovernanceEventType.RELEASE_DECISION_MADE, {
    releaseKey,
    environment,
    decision,
  }, actorId);
}

/**
 * Emit gate blocked event
 */
export function emitGateBlocked(releaseKey: string, environment: string, reason: string): void {
  emitGovernanceEvent(GovernanceEventType.GATE_BLOCKED, {
    releaseKey,
    environment,
    reason,
  });
}

/**
 * Emit gate passed event
 */
export function emitGatePassed(releaseKey: string, environment: string): void {
  emitGovernanceEvent(GovernanceEventType.GATE_PASSED, {
    releaseKey,
    environment,
  });
}
