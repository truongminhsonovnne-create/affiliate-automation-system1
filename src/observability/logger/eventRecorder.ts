/**
 * Event Recorder
 *
 * Records system events to database for auditing, debugging,
 * and operational analysis.
 */

import { createLogger } from './structuredLogger.js';
import type { SystemEvent, SystemEventCategory, SystemEventSeverity } from '../types.js';
import { EVENT_MAX_IN_MEMORY } from '../constants.js';

const logger = createLogger({ subsystem: 'event_recorder' });

/** In-memory event buffer */
const eventBuffer: SystemEvent[] = [];

/**
 * Create a system event
 */
export function createEvent(
  category: SystemEventCategory,
  severity: SystemEventSeverity,
  message: string,
  options?: {
    correlationId?: string;
    operation?: string;
    channel?: string;
    jobId?: string;
    workerId?: string;
    metadata?: Record<string, unknown>;
  }
): SystemEvent {
  return {
    eventId: generateEventId(),
    category,
    severity,
    message,
    correlationId: options?.correlationId,
    operation: options?.operation,
    channel: options?.channel as any,
    jobId: options?.jobId,
    workerId: options?.workerId,
    metadata: options?.metadata,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Record an event to in-memory buffer
 */
export function recordEvent(event: SystemEvent): void {
  eventBuffer.push(event);

  // Trim buffer if needed
  if (eventBuffer.length > EVENT_MAX_IN_MEMORY) {
    eventBuffer.splice(0, eventBuffer.length - EVENT_MAX_IN_MEMORY);
  }

  // Log the event at appropriate level
  const logFn = {
    debug: logger.debug,
    info: logger.info,
    warn: logger.warn,
    error: logger.error,
    critical: logger.error,
  }[event.severity];

  logFn(`[${event.category}] ${event.message}`, {
    correlationId: event.correlationId,
    operation: event.operation,
    channel: event.channel,
    jobId: event.jobId,
    workerId: event.workerId,
    metadata: event.metadata,
  });
}

/**
 * Record event with category/severity helpers
 */
export function recordJobEvent(
  message: string,
  severity: SystemEventSeverity,
  options?: {
    correlationId?: string;
    operation?: string;
    channel?: string;
    jobId?: string;
    workerId?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  recordEvent(createEvent('job', severity, message, options));
}

export function recordPublishEvent(
  message: string,
  severity: SystemEventSeverity,
  options?: {
    correlationId?: string;
    operation?: string;
    channel?: string;
    jobId?: string;
    workerId?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  recordEvent(createEvent('publish', severity, message, options));
}

export function recordCrawlEvent(
  message: string,
  severity: SystemEventSeverity,
  options?: {
    correlationId?: string;
    operation?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  recordEvent(createEvent('crawl', severity, message, options));
}

export function recordAiEnrichmentEvent(
  message: string,
  severity: SystemEventSeverity,
  options?: {
    correlationId?: string;
    operation?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  recordEvent(createEvent('ai_enrichment', severity, message, options));
}

export function recordWorkerEvent(
  message: string,
  severity: SystemEventSeverity,
  options?: {
    correlationId?: string;
    workerId?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  recordEvent(createEvent('worker', severity, message, options));
}

export function recordSystemEvent(
  message: string,
  severity: SystemEventSeverity,
  options?: {
    correlationId?: string;
    operation?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  recordEvent(createEvent('system', severity, message, options));
}

export function recordErrorEvent(
  error: Error,
  context: {
    category?: SystemEventCategory;
    correlationId?: string;
    operation?: string;
    channel?: string;
    jobId?: string;
    workerId?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  const category = context.category || 'system';
  const severity: SystemEventSeverity = 'error';

  recordEvent(createEvent(category, severity, error.message, {
    correlationId: context.correlationId,
    operation: context.operation,
    channel: context.channel,
    jobId: context.jobId,
    workerId: context.workerId,
    metadata: {
      ...context.metadata,
      errorName: error.name,
      errorStack: error.stack,
      errorCause: error.cause?.toString(),
    },
  }));
}

/**
 * Get events from buffer
 */
export function getEvents(filter?: {
  category?: SystemEventCategory;
  severity?: SystemEventSeverity;
  since?: string;
  limit?: number;
}): SystemEvent[] {
  let events = [...eventBuffer];

  if (filter?.category) {
    events = events.filter(e => e.category === filter.category);
  }

  if (filter?.severity) {
    events = events.filter(e => e.severity === filter.severity);
  }

  if (filter?.since) {
    const sinceDate = new Date(filter.since);
    events = events.filter(e => new Date(e.createdAt) >= sinceDate);
  }

  // Sort by timestamp descending (newest first)
  events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (filter?.limit) {
    events = events.slice(0, filter.limit);
  }

  return events;
}

/**
 * Clear event buffer
 */
export function clearEvents(): number {
  const count = eventBuffer.length;
  eventBuffer.length = 0;
  return count;
}

/**
 * Get event buffer size
 */
export function getEventBufferSize(): number {
  return eventBuffer.length;
}
