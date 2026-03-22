/**
 * Observability Types
 *
 * Central type definitions for structured logging, metrics, health checks,
 * and operational safeguards in the Affiliate Automation System.
 */

import type { Channel } from '../publishing/types.js';

// =============================================================================
// LOGGING TYPES
// =============================================================================

/** Log severity levels */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Structured log entry */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  correlationId?: string;
  spanId?: string;
  parentSpanId?: string;
  errors?: LogError[];
  metadata?: Record<string, unknown>;
}

/** Log context for categorization */
export interface LogContext {
  service: string;
  subsystem?: string;
  operation?: string;
  channel?: Channel;
  jobId?: string;
  workerId?: string;
  [key: string]: unknown;
}

/** Error details for logging */
export interface LogError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  cause?: string;
}

// =============================================================================
// METRICS TYPES
// =============================================================================

/** Metric types supported */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

/** Metric value */
export type MetricValue = number;

/** Metric labels for dimensional metrics */
export interface MetricLabels {
  [key: string]: string | number | boolean;
}

/** Individual metric definition */
export interface Metric {
  name: string;
  type: MetricType;
  value: MetricValue;
  labels: MetricLabels;
  timestamp: string;
}

/** Metrics snapshot */
export interface MetricsSnapshot {
  timestamp: string;
  metrics: Metric[];
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, HistogramSnapshot>;
  timers: Record<string, HistogramSnapshot>;
}

/** Histogram snapshot with percentiles */
export interface HistogramSnapshot {
  count: number;
  sum: number;
  min: number;
  max: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

// =============================================================================
// HEALTH CHECK TYPES
// =============================================================================

/** Health check status */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/** Health check result */
export interface HealthCheckResult {
  status: HealthStatus;
  component: string;
  message?: string;
  timestamp: string;
  durationMs: number;
  details?: Record<string, unknown>;
  checks?: Record<string, HealthCheckResult>;
}

/** Health check function type */
export type HealthCheckFn = () => Promise<HealthCheckResult> | HealthCheckResult;

/** Health check configuration */
export interface HealthCheckConfig {
  name: string;
  component: string;
  check: HealthCheckFn;
  timeoutMs: number;
  critical: boolean;
}

// =============================================================================
// HEARTBEAT TYPES
// =============================================================================

/** Worker heartbeat record */
export interface WorkerHeartbeat {
  id?: string;
  workerId: string;
  workerName: string;
  status: 'alive' | 'shutting_down' | 'dead';
  lastSeenAt: string;
  startedAt: string;
  currentJobId?: string;
  currentOperation?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// SAFEGUARD TYPES
// =============================================================================

/** Circuit breaker states */
export type CircuitState = 'closed' | 'open' | 'half_open';

/** Circuit breaker configuration */
export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  halfOpenMaxCalls: number;
}

/** Circuit breaker state */
export interface CircuitBreakerState {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt?: string;
  lastFailureReason?: string;
  nextAttemptAt?: string;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
}

/** Retry budget configuration */
export interface RetryBudgetConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
  budgetWindowMs: number;
  maxRetriesPerWindow: number;
}

/** Retry budget state */
export interface RetryBudgetState {
  operation: string;
  available: boolean;
  remainingRetries: number;
  usedInWindow: number;
  windowResetAt?: string;
}

/** Rate limit configuration */
export interface RateLimitConfig {
  name: string;
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

/** Rate limit state */
export interface RateLimitState {
  name: string;
  current: number;
  max: number;
  remaining: number;
  resetAt: string;
  blocked: boolean;
  blockedUntil?: string;
}

/** Dead letter item status */
export type DeadLetterStatus = 'quarantined' | 'review' | 'resolved' | 'discarded';

/** Dead letter item */
export interface DeadLetterItem {
  id?: string;
  originalJobId?: string;
  channel?: Channel;
  operation: string;
  payload: Record<string, unknown>;
  errorCode?: string;
  errorMessage: string;
  errorCategory?: string;
  attemptCount: number;
  lastAttemptAt: string;
  status: DeadLetterStatus;
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/** Stuck job detection result */
export interface StuckJobInfo {
  jobId: string;
  channel?: Channel;
  issue: 'stale_lock' | 'execution_timeout' | 'orphaned' | 'stale_heartbeat';
  detectedAt: string;
  lockHeldBy?: string;
  lockExpiresAt?: string;
  lastUpdateAt?: string;
  ageMs: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/** System event categories */
export type SystemEventCategory =
  | 'job'
  | 'publish'
  | 'crawl'
  | 'ai_enrichment'
  | 'worker'
  | 'system'
  | 'error';

/** System event severity */
export type SystemEventSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical';

/** System event record */
export interface SystemEvent {
  id?: string;
  eventId?: string;
  category: SystemEventCategory;
  severity: SystemEventSeverity;
  message: string;
  correlationId?: string;
  operation?: string;
  channel?: Channel;
  jobId?: string;
  workerId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// =============================================================================
// OPERATIONAL SNAPSHOT TYPES
// =============================================================================

/** Alert severity */
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

/** Operational alert */
export interface OperationalAlert {
  id: string;
  severity: AlertSeverity;
  component: string;
  message: string;
  details?: Record<string, unknown>;
  detectedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

/** Operational snapshot */
export interface OperationalSnapshot {
  timestamp: string;
  durationMs: number;
  health: {
    overall: HealthStatus;
    checks: HealthCheckResult[];
  };
  metrics: MetricsSnapshot;
  safeguards: {
    circuitBreakers: CircuitBreakerState[];
    retryBudgets: RetryBudgetState[];
    rateLimits: RateLimitState[];
    stuckJobs: StuckJobInfo[];
  };
  alerts: OperationalAlert[];
  metadata: Record<string, unknown>;
}

// =============================================================================
// RESULT BUILDER TYPES
// =============================================================================

/** Observability operation result */
export interface ObservabilityResult {
  success: boolean;
  logs: LogEntry[];
  metrics: MetricsSnapshot;
  health: HealthCheckResult[];
  alerts: OperationalAlert[];
  durationMs: number;
  errors: Array<{
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }>;
  warnings: Array<{
    code: string;
    message: string;
  }>;
}
