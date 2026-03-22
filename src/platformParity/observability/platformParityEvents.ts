/**
 * Platform Parity Events
 * Operational events for platform parity hardening
 */

import { createLogger } from '../../utils/logger.js';

const logger = createLogger('platform-parity-events');

// =============================================================================
// Event Types
// =============================================================================

export type ParityEventType =
  | 'SNAPSHOT_CREATED'
  | 'SNAPSHOT_FAILED'
  | 'GAP_DETECTED'
  | 'GAP_RESOLVED'
  | 'GAP_UPDATED'
  | 'EXCEPTION_REGISTERED'
  | 'EXCEPTION_RESOLVED'
  | 'COMPARISON_BUILT'
  | 'SURFACE_BUILT'
  | 'DECISION_SUPPORT_GENERATED'
  | 'BACKLOG_ITEM_CREATED'
  | 'HARDENING_CYCLE_STARTED'
  | 'HARDENING_CYCLE_COMPLETED'
  | 'HARDENING_CYCLE_FAILED';

// =============================================================================
// Event Payloads
// =============================================================================

export interface BaseEvent {
  eventType: ParityEventType;
  timestamp: string;
  correlationId?: string;
}

export interface SnapshotCreatedEvent extends BaseEvent {
  eventType: 'SNAPSHOT_CREATED';
  payload: {
    snapshotId: string;
    parityScope: string;
    windowStart: string;
    windowEnd: string;
  };
}

export interface SnapshotFailedEvent extends BaseEvent {
  eventType: 'SNAPSHOT_FAILED';
  payload: {
    error: string;
    parityScope?: string;
  };
}

export interface GapDetectedEvent extends BaseEvent {
  eventType: 'GAP_DETECTED';
  payload: {
    gapId: string;
    platformKey: string;
    gapArea: string;
    severity: string;
  };
}

export interface GapResolvedEvent extends BaseEvent {
  eventType: 'GAP_RESOLVED';
  payload: {
    gapId: string;
    resolutionTime: number; // ms
  };
}

export interface GapUpdatedEvent extends BaseEvent {
  eventType: 'GAP_UPDATED';
  payload: {
    gapId: string;
    previousStatus: string;
    newStatus: string;
  };
}

export interface ExceptionRegisteredEvent extends BaseEvent {
  eventType: 'EXCEPTION_REGISTERED';
  payload: {
    exceptionId: string;
    platformKey: string;
    exceptionArea: string;
    rationale?: string;
  };
}

export interface ExceptionResolvedEvent extends BaseEvent {
  eventType: 'EXCEPTION_RESOLVED';
  payload: {
    exceptionId: string;
  };
}

export interface ComparisonBuiltEvent extends BaseEvent {
  eventType: 'COMPARISON_BUILT';
  payload: {
    comparisonId: string;
    comparisonScope: string;
    metricCount: number;
    driftingMetricCount: number;
  };
}

export interface SurfaceBuiltEvent extends BaseEvent {
  eventType: 'SURFACE_BUILT';
  payload: {
    surfaceKey: string;
    surfaceType: string;
    buildTime: number; // ms
  };
}

export interface DecisionSupportGeneratedEvent extends BaseEvent {
  eventType: 'DECISION_SUPPORT_GENERATED';
  payload: {
    reportId: string;
    recommendationCount: number;
    criticalGapCount: number;
  };
}

export interface BacklogItemCreatedEvent extends BaseEvent {
  eventType: 'BACKLOG_ITEM_CREATED';
  payload: {
    backlogItemId: string;
    gapId?: string;
    priorityScore: number;
  };
}

export interface HardeningCycleStartedEvent extends BaseEvent {
  eventType: 'HARDENING_CYCLE_STARTED';
  payload: {
    windowStart: string;
    windowEnd: string;
  };
}

export interface HardeningCycleCompletedEvent extends BaseEvent {
  eventType: 'HARDENING_CYCLE_COMPLETED';
  payload: {
    duration: number; // ms
    gapsDetected: number;
    gapsResolved: number;
    backlogItemsCreated: number;
  };
}

export interface HardeningCycleFailedEvent extends BaseEvent {
  eventType: 'HARDENING_CYCLE_FAILED';
  payload: {
    error: string;
    duration: number; // ms
  };
}

export type ParityEvent =
  | SnapshotCreatedEvent
  | SnapshotFailedEvent
  | GapDetectedEvent
  | GapResolvedEvent
  | GapUpdatedEvent
  | ExceptionRegisteredEvent
  | ExceptionResolvedEvent
  | ComparisonBuiltEvent
  | SurfaceBuiltEvent
  | DecisionSupportGeneratedEvent
  | BacklogItemCreatedEvent
  | HardeningCycleStartedEvent
  | HardeningCycleCompletedEvent
  | HardeningCycleFailedEvent;

// =============================================================================
// Event Emitters
// =============================================================================

/**
 * Emit a parity event
 */
export function emitEvent(event: ParityEvent): void {
  logger.info(`[PARITY_EVENT] ${event.eventType}`, {
    timestamp: event.timestamp,
    correlationId: event.correlationId,
    payload: event.payload,
  });

  // In production, this would also emit to external systems
  // e.g., CloudWatch, DataDog, custom event bus
}

/**
 * Emit snapshot created event
 */
export function emitSnapshotCreated(
  snapshotId: string,
  parityScope: string,
  windowStart: Date,
  windowEnd: Date,
  correlationId?: string
): void {
  emitEvent({
    eventType: 'SNAPSHOT_CREATED',
    timestamp: new Date().toISOString(),
    correlationId,
    payload: {
      snapshotId,
      parityScope,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    },
  });
}

/**
 * Emit snapshot failed event
 */
export function emitSnapshotFailed(
  error: string,
  parityScope?: string,
  correlationId?: string
): void {
  emitEvent({
    eventType: 'SNAPSHOT_FAILED',
    timestamp: new Date().toISOString(),
    correlationId,
    payload: {
      error,
      parityScope,
    },
  });
}

/**
 * Emit gap detected event
 */
export function emitGapDetected(
  gapId: string,
  platformKey: string,
  gapArea: string,
  severity: string,
  correlationId?: string
): void {
  emitEvent({
    eventType: 'GAP_DETECTED',
    timestamp: new Date().toISOString(),
    correlationId,
    payload: {
      gapId,
      platformKey,
      gapArea,
      severity,
    },
  });
}

/**
 * Emit gap resolved event
 */
export function emitGapResolved(
  gapId: string,
  resolutionTime: number,
  correlationId?: string
): void {
  emitEvent({
    eventType: 'GAP_RESOLVED',
    timestamp: new Date().toISOString(),
    correlationId,
    payload: {
      gapId,
      resolutionTime,
    },
  });
}

/**
 * Emit exception registered event
 */
export function emitExceptionRegistered(
  exceptionId: string,
  platformKey: string,
  exceptionArea: string,
  rationale?: string,
  correlationId?: string
): void {
  emitEvent({
    eventType: 'EXCEPTION_REGISTERED',
    timestamp: new Date().toISOString(),
    correlationId,
    payload: {
      exceptionId,
      platformKey,
      exceptionArea,
      rationale,
    },
  });
}

/**
 * Emit hardening cycle started event
 */
export function emitHardeningCycleStarted(
  windowStart: Date,
  windowEnd: Date,
  correlationId?: string
): void {
  emitEvent({
    eventType: 'HARDENING_CYCLE_STARTED',
    timestamp: new Date().toISOString(),
    correlationId,
    payload: {
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    },
  });
}

/**
 * Emit hardening cycle completed event
 */
export function emitHardeningCycleCompleted(
  duration: number,
  gapsDetected: number,
  gapsResolved: number,
  backlogItemsCreated: number,
  correlationId?: string
): void {
  emitEvent({
    eventType: 'HARDENING_CYCLE_COMPLETED',
    timestamp: new Date().toISOString(),
    correlationId,
    payload: {
      duration,
      gapsDetected,
      gapsResolved,
      backlogItemsCreated,
    },
  });
}

/**
 * Emit hardening cycle failed event
 */
export function emitHardeningCycleFailed(
  error: string,
  duration: number,
  correlationId?: string
): void {
  emitEvent({
    eventType: 'HARDENING_CYCLE_FAILED',
    timestamp: new Date().toISOString(),
    correlationId,
    payload: {
      error,
      duration,
    },
  });
}
