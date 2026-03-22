/**
 * Observability Result Builder
 *
 * Builds structured results for observability operations with proper
 * error handling and metadata tracking.
 */

import type { LogEntry, MetricsSnapshot, HealthCheckResult, OperationalAlert, ObservabilityResult } from './types.js';

/**
 * Result builder for observability operations
 */
export class ObservabilityResultBuilder {
  private logs: LogEntry[] = [];
  private errors: Array<{ code: string; message: string; details?: Record<string, unknown> }> = [];
  private warnings: Array<{ code: string; message: string }> = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Add a log entry
   */
  addLog(entry: LogEntry): this {
    this.logs.push(entry);
    return this;
  }

  /**
   * Add multiple log entries
   */
  addLogs(entries: LogEntry[]): this {
    this.logs.push(...entries);
    return this;
  }

  /**
   * Add an error
   */
  addError(code: string, message: string, details?: Record<string, unknown>): this {
    this.errors.push({ code, message, details });
    return this;
  }

  /**
   * Add a warning
   */
  addWarning(code: string, message: string): this {
    this.warnings.push({ code, message });
    return this;
  }

  /**
   * Build the result
   */
  build(
    metrics?: MetricsSnapshot,
    health?: HealthCheckResult[],
    alerts?: OperationalAlert[]
  ): ObservabilityResult {
    return {
      success: this.errors.length === 0,
      logs: this.logs,
      metrics: metrics || this.createEmptyMetricsSnapshot(),
      health: health || [],
      alerts: alerts || [],
      durationMs: Date.now() - this.startTime,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Build a success result
   */
  success(
    message?: string,
    metrics?: MetricsSnapshot,
    health?: HealthCheckResult[],
    alerts?: OperationalAlert[]
  ): ObservabilityResult {
    if (message) {
      this.addWarning('success', message);
    }
    return this.build(metrics, health, alerts);
  }

  /**
   * Build a failure result
   */
  failure(
    error: string | Error,
    code: string = 'UNKNOWN_ERROR',
    metrics?: MetricsSnapshot,
    health?: HealthCheckResult[],
    alerts?: OperationalAlert[]
  ): ObservabilityResult {
    const message = error instanceof Error ? error.message : error;
    this.addError(code, message);
    return this.build(metrics, health, alerts);
  }

  /**
   * Create empty metrics snapshot
   */
  private createEmptyMetricsSnapshot(): MetricsSnapshot {
    return {
      timestamp: new Date().toISOString(),
      metrics: [],
      counters: {},
      gauges: {},
      histograms: {},
      timers: {},
    };
  }
}

/**
 * Create a new result builder
 */
export function createObservabilityResult(): ObservabilityResultBuilder {
  return new ObservabilityResultBuilder();
}

/**
 * Build a simple observability result
 */
export function buildObservabilityResult(
  options: {
    success: boolean;
    logs?: LogEntry[];
    metrics?: MetricsSnapshot;
    health?: HealthCheckResult[];
    alerts?: OperationalAlert[];
    errors?: Array<{ code: string; message: string; details?: Record<string, unknown> }>;
    warnings?: Array<{ code: string; message: string }>;
    durationMs?: number;
  }
): ObservabilityResult {
  const startTime = Date.now();

  return {
    success: options.success,
    logs: options.logs || [],
    metrics: options.metrics || {
      timestamp: new Date().toISOString(),
      metrics: [],
      counters: {},
      gauges: {},
      histograms: {},
      timers: {},
    },
    health: options.health || [],
    alerts: options.alerts || [],
    durationMs: options.durationMs || Date.now() - startTime,
    errors: options.errors || [],
    warnings: options.warnings || [],
  };
}

/**
 * Merge multiple observability results
 */
export function mergeObservabilityResults(
  ...results: ObservabilityResult[]
): ObservabilityResult {
  const merged: ObservabilityResult = {
    success: true,
    logs: [],
    metrics: {
      timestamp: new Date().toISOString(),
      metrics: [],
      counters: {},
      gauges: {},
      histograms: {},
      timers: {},
    },
    health: [],
    alerts: [],
    durationMs: 0,
    errors: [],
    warnings: [],
  };

  for (const result of results) {
    // Success is false if any result is false
    merged.success = merged.success && result.success;

    // Merge logs
    merged.logs.push(...result.logs);

    // Merge metrics
    for (const [key, value] of Object.entries(result.metrics.counters)) {
      merged.metrics.counters[key] = (merged.metrics.counters[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(result.metrics.gauges)) {
      merged.metrics.gauges[key] = value;
    }

    // Merge health
    merged.health.push(...result.health);

    // Merge alerts
    merged.alerts.push(...result.alerts);

    // Merge errors and warnings
    merged.errors.push(...result.errors);
    merged.warnings.push(...result.warnings);

    // Sum duration
    merged.durationMs += result.durationMs;
  }

  return merged;
}
