/**
 * Voucher Intelligence Events
 */

import type { VoucherOptimizationSeverity } from '../types/index.js';

// ============================================================================
// Event Types
// ============================================================================

export type VoucherIntelligenceEventType =
  | 'analysis.started'
  | 'analysis.completed'
  | 'analysis.failed'
  | 'insight.generated'
  | 'insight.resolved'
  | 'ranking.tuning.suggested'
  | 'no_match.analyzed';

export interface VoucherIntelligenceEvent {
  eventType: VoucherIntelligenceEventType;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Event Logger
// ============================================================================

class VoucherIntelligenceEventLogger {
  private events: VoucherIntelligenceEvent[] = [];
  private maxEvents = 1000;

  log(event: VoucherIntelligenceEvent): void {
    this.events.push({
      ...event,
      timestamp: event.timestamp || Date.now(),
    });

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    console.log('[VoucherIntelligence]', event.eventType, event.metadata);
  }

  getRecentEvents(count: number = 100): VoucherIntelligenceEvent[] {
    return this.events.slice(-count);
  }

  clear(): void {
    this.events = [];
  }
}

const eventLogger = new VoucherIntelligenceEventLogger();

// ============================================================================
// Event Factory
// ============================================================================

export function createAnalysisStartedEvent(metadata?: Record<string, unknown>): VoucherIntelligenceEvent {
  return {
    eventType: 'analysis.started',
    timestamp: Date.now(),
    metadata,
  };
}

export function createAnalysisCompletedEvent(metadata?: Record<string, unknown>): VoucherIntelligenceEvent {
  return {
    eventType: 'analysis.completed',
    timestamp: Date.now(),
    metadata,
  };
}

export function createAnalysisFailedEvent(error: string, metadata?: Record<string, unknown>): VoucherIntelligenceEvent {
  return {
    eventType: 'analysis.failed',
    timestamp: Date.now(),
    metadata: { error, ...metadata },
  };
}

export function createInsightGeneratedEvent(
  insightType: string,
  severity: VoucherOptimizationSeverity,
  metadata?: Record<string, unknown>
): VoucherIntelligenceEvent {
  return {
    eventType: 'insight.generated',
    timestamp: Date.now(),
    metadata: { insightType, severity, ...metadata },
  };
}

// ============================================================================
// Logging Functions
// ============================================================================

export function logAnalysisStarted(metadata?: Record<string, unknown>): void {
  eventLogger.log(createAnalysisStartedEvent(metadata));
}

export function logAnalysisCompleted(metadata?: Record<string, unknown>): void {
  eventLogger.log(createAnalysisCompletedEvent(metadata));
}

export function logAnalysisFailed(error: string, metadata?: Record<string, unknown>): void {
  eventLogger.log(createAnalysisFailedEvent(error, metadata));
}

export function logInsightGenerated(
  insightType: string,
  severity: VoucherOptimizationSeverity,
  metadata?: Record<string, unknown>
): void {
  eventLogger.log(createInsightGeneratedEvent(insightType, severity, metadata));
}

export function getEventLogger(): VoucherIntelligenceEventLogger {
  return eventLogger;
}
