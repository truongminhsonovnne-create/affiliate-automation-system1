/**
 * Metric Names
 *
 * Centralized metric name definitions with consistent naming conventions.
 * All metrics follow the pattern: <subsystem>_<category>_<name>
 */

import type { Channel } from '../../publishing/types.js';

/** Core metric prefixes */
export const PREFIXES = {
  CRAWLER: 'crawler',
  AI: 'ai',
  PUBLISHING: 'publishing',
  RUNNER: 'runner',
  DATABASE: 'database',
  SYSTEM: 'system',
} as const;

/** Crawler metrics */
export const CRAWLER_METRICS = {
  PAGES_CRAWLED: `${PREFIXES.CRAWLER}_pages_crawled`,
  PAGES_FAILED: `${PREFIXES.CRAWLER}_pages_failed`,
  NAVIGATION_DURATION_MS: `${PREFIXES.CRAWLER}_navigation_duration_ms`,
  EXTRACTION_DURATION_MS: `${PREFIXES.CRAWLER}_extraction_duration_ms`,
  CONTENT_ITEMS_EXTRACTED: `${PREFIXES.CRAWLER}_content_items_extracted`,
  RATE_LIMIT_HITS: `${PREFIXES.CRAWLER}_rate_limit_hits`,
} as const;

/** AI enrichment metrics */
export const AI_METRICS = {
  ENRICHMENT_REQUESTS: `${PREFIXES.AI}_enrichment_requests`,
  ENRICHMENT_SUCCESS: `${PREFIXES.AI}_enrichment_success`,
  ENRICHMENT_FAILED: `${PREFIXES.AI}_enrichment_failed`,
  ENRICHMENT_DURATION_MS: `${PREFIXES.AI}_enrichment_duration_ms`,
  TOKEN_USAGE_PROMPT: `${PREFIXES.AI}_token_usage_prompt`,
  TOKEN_USAGE_COMPLETION: `${PREFIXES.AI}_token_usage_completion`,
  GEMINI_CALLS: `${PREFIXES.AI}_gemini_calls`,
  GEMINI_ERRORS: `${PREFIXES.AI}_gemini_errors`,
} as const;

/** Publishing metrics */
export const PUBLISHING_METRICS = {
  JOBS_CREATED: `${PREFIXES.PUBLISHING}_jobs_created`,
  JOBS_SCHEDULED: `${PREFIXES.PUBLISHING}_jobs_scheduled`,
  JOBS_FAILED: `${PREFIXES.PUBLISHING}_jobs_failed`,
  PAYLOAD_PREPARATION_DURATION_MS: `${PREFIXES.PUBLISHING}_payload_preparation_duration_ms`,
  SCHEDULING_DELAY_MS: `${PREFIXES.PUBLISHING}_scheduling_delay_ms`,
  ELIGIBILITY_CHECKS: `${PREFIXES.PUBLISHING}_eligibility_checks`,
  ELIGIBLE: `${PREFIXES.PUBLISHING}_eligible`,
  INELIGIBLE: `${PREFIXES.PUBLISHING}_ineligible`,
} as const;

/** Publisher runner metrics */
export const RUNNER_METRICS = {
  RUNS_INITIATED: `${PREFIXES.RUNNER}_runs_initiated`,
  RUNS_COMPLETED: `${PREFIXES.RUNNER}_runs_completed`,
  RUNS_FAILED: `${PREFIXES.RUNNER}_runs_failed`,
  RUN_DURATION_MS: `${PREFIXES.RUNNER}_run_duration_ms`,
  JOBS_SELECTED: `${PREFIXES.RUNNER}_jobs_selected`,
  JOBS_CLAIMED: `${PREFIXES.RUNNER}_jobs_claimed`,
  JOBS_EXECUTED: `${PREFIXES.RUNNER}_jobs_executed`,
  JOBS_PUBLISHED: `${PREFIXES.RUNNER}_jobs_published`,
  JOBS_FAILED: `${PREFIXES.RUNNER}_jobs_failed`,
  JOBS_RETRIED: `${PREFIXES.RUNNER}_jobs_retried`,
  JOBS_SKIPPED: `${PREFIXES.RUNNER}_jobs_skipped`,
  EXECUTION_DURATION_MS: `${PREFIXES.RUNNER}_execution_duration_ms`,
  LOCK_CONTENTIONS: `${PREFIXES.RUNNER}_lock_contentions`,
  STALE_LOCKS_DETECTED: `${PREFIXES.RUNNER}_stale_locks_detected`,
  WORKERS_ACTIVE: `${PREFIXES.RUNNER}_workers_active`,
} as const;

/** Database metrics */
export const DATABASE_METRICS = {
  QUERIES_EXECUTED: `${PREFIXES.DATABASE}_queries_executed`,
  QUERIES_FAILED: `${PREFIXES.DATABASE}_queries_failed`,
  QUERY_DURATION_MS: `${PREFIXES.DATABASE}_query_duration_ms`,
  CONNECTIONS_ACTIVE: `${PREFIXES.DATABASE}_connections_active`,
  CONNECTIONS_POOL_EXHAUSTED: `${PREFIXES.DATABASE}_connections_pool_exhausted`,
  TRANSACTIONS_COMMITTED: `${PREFIXES.DATABASE}_transactions_committed`,
  TRANSACTIONS_ROLLED_BACK: `${PREFIXES.DATABASE}_transactions_rolled_back`,
  BATCH_OPERATIONS: `${PREFIXES.DATABASE}_batch_operations`,
  BATCH_SIZE_AVG: `${PREFIXES.DATABASE}_batch_size_avg`,
} as const;

/** System metrics */
export const SYSTEM_METRICS = {
  UPTIME_SECONDS: `${PREFIXES.SYSTEM}_uptime_seconds`,
  MEMORY_USAGE_BYTES: `${PREFIXES.SYSTEM}_memory_usage_bytes`,
  CPU_USAGE_PERCENT: `${PREFIXES.SYSTEM}_cpu_usage_percent`,
  EVENT_LOOP_LAG_MS: `${PREFIXES.SYSTEM}_event_loop_lag_ms`,
  HEARTBEATS_SENT: `${PREFIXES.SYSTEM}_heartbeats_sent`,
  HEARTBEATS_MISSED: `${PREFIXES.SYSTEM}_heartbeats_missed`,
  GRACEFUL_SHUTDOWN_INITIATED: `${PREFIXES.SYSTEM}_graceful_shutdown_initiated`,
  GRACEFUL_SHUTDOWN_COMPLETED: `${PREFIXES.SYSTEM}_graceful_shutdown_completed`,
} as const;

/** Health check metrics */
export const HEALTH_METRICS = {
  CHECKS_PASSED: `health_checks_passed`,
  CHECKS_FAILED: `health_checks_failed`,
  CHECK_DURATION_MS: `health_check_duration_ms`,
} as const;

/** Safeguard metrics */
export const SAFEGUARD_METRICS = {
  CIRCUIT_BREAKER_OPENED: `safeguard_circuit_breaker_opened`,
  CIRCUIT_BREAKER_CLOSED: `safeguard_circuit_breaker_closed`,
  CIRCUIT_BREAKER_HALF_OPEN: `safeguard_circuit_breaker_half_open`,
  RATE_LIMIT_EXCEEDED: `safeguard_rate_limit_exceeded`,
  RATE_LIMIT_BLOCKED: `safeguard_rate_limit_blocked`,
  RETRY_BUDGET_EXHAUSTED: `safeguard_retry_budget_exhausted`,
  RETRY_ATTEMPTS: `safeguard_retry_attempts`,
  DEAD_LETTER_ITEMS: `safeguard_dead_letter_items`,
  STUCK_JOBS_DETECTED: `safeguard_stuck_jobs_detected`,
} as const;

/** Channel-specific labels helper */
export function createChannelLabels(channel: Channel): Record<string, string> {
  return { channel };
}

/** Operation labels helper */
export function createOperationLabels(operation: string): Record<string, string> {
  return { operation };
}

/** Combined labels helper */
export function createLabels(
  channel?: Channel,
  operation?: string,
  additional?: Record<string, string>
): Record<string, string> {
  const labels: Record<string, string> = {};

  if (channel) labels.channel = channel;
  if (operation) labels.operation = operation;
  if (additional) Object.assign(labels, additional);

  return labels;
}

/** All metric names as array for reference */
export const ALL_METRICS = [
  ...Object.values(CRAWLER_METRICS),
  ...Object.values(AI_METRICS),
  ...Object.values(PUBLISHING_METRICS),
  ...Object.values(RUNNER_METRICS),
  ...Object.values(DATABASE_METRICS),
  ...Object.values(SYSTEM_METRICS),
  ...Object.values(HEALTH_METRICS),
  ...Object.values(SAFEGUARD_METRICS),
] as const;

export type MetricName = typeof ALL_METRICS[number];
