/**
 * Observability Constants
 *
 * Centralized configuration for logging, metrics, health checks,
 * and operational safeguards in the Affiliate Automation System.
 */

import type {
  CircuitBreakerConfig,
  RetryBudgetConfig,
  RateLimitConfig,
  HealthCheckConfig,
} from './types.js';

// =============================================================================
// SERVICE IDENTIFICATION
// =============================================================================

/** Service name for all observability data */
export const SERVICE_NAME = 'affiliate-automation';

/** Service version */
export const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';

/** Environment */
export const ENVIRONMENT = process.env.NODE_ENV || 'development';

// =============================================================================
// LOGGING CONFIGURATION
// =============================================================================

/** Minimum log level */
export const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal';

/** Enable JSON structured logging */
export const LOG_JSON = process.env.LOG_JSON !== 'false';

/** Enable colored console output (development only) */
export const LOG_COLOR = process.env.NODE_ENV !== 'production';

/** Log destination */
export const LOG_DESTINATION = process.env.LOG_DESTINATION || 'console';

/** Maximum log entry size in bytes */
export const LOG_MAX_ENTRY_SIZE = parseInt(process.env.LOG_MAX_ENTRY_SIZE || '65536', 10);

/** Whether to include stack traces in logs */
export const LOG_INCLUDE_STACKTRACE = process.env.NODE_ENV === 'development';

/** Whether to add request/response bodies to logs */
export const LOG_INCLUDE_BODY = process.env.NODE_ENV === 'development';

// =============================================================================
// METRICS CONFIGURATION
// =============================================================================

/** Metrics flush interval in milliseconds */
export const METRICS_FLUSH_INTERVAL_MS = parseInt(
  process.env.METRICS_FLUSH_INTERVAL_MS || '30000',
  10
);

/** Maximum metrics in memory before forcing flush */
export const METRICS_MAX_IN_MEMORY = parseInt(
  process.env.METRICS_MAX_IN_MEMORY || '10000',
  10
);

/** Enable Prometheus-compatible metrics */
export const METRICS_PROMETHEUS_ENABLED = process.env.METRICS_PROMETHEUS_ENABLED === 'true';

/** Metrics retention period in milliseconds */
export const METRICS_RETENTION_MS = parseInt(
  process.env.METRICS_RETENTION_MS || '3600000',
  10
);

/** Default histogram buckets */
export const DEFAULT_HISTOGRAM_BUCKETS = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

// =============================================================================
// HEALTH CHECK CONFIGURATION
// =============================================================================

/** Default health check timeout in milliseconds */
export const HEALTH_CHECK_TIMEOUT_MS = parseInt(
  process.env.HEALTH_CHECK_TIMEOUT_MS || '5000',
  10
);

/** Health check interval in milliseconds */
export const HEALTH_CHECK_INTERVAL_MS = parseInt(
  process.env.HEALTH_CHECK_INTERVAL_MS || '30000',
  10
);

/** Health check configurations */
export const HEALTH_CHECK_CONFIGS: HealthCheckConfig[] = [
  {
    name: 'database',
    component: 'database',
    check: async () => ({ status: 'healthy' as const, component: 'database' }),
    timeoutMs: 5000,
    critical: true,
  },
  {
    name: 'gemini_client',
    component: 'gemini',
    check: async () => ({ status: 'healthy' as const, component: 'gemini' }),
    timeoutMs: 3000,
    critical: false,
  },
  {
    name: 'crawler',
    component: 'crawler',
    check: async () => ({ status: 'healthy' as const, component: 'crawler' }),
    timeoutMs: 5000,
    critical: false,
  },
  {
    name: 'publisher_runner',
    component: 'publisher_runner',
    check: async () => ({ status: 'healthy' as const, component: 'publisher_runner' }),
    timeoutMs: 3000,
    critical: false,
  },
];

// =============================================================================
// HEARTBEAT CONFIGURATION
// =============================================================================

/** Heartbeat interval in milliseconds */
export const HEARTBEAT_INTERVAL_MS = parseInt(
  process.env.HEARTBEAT_INTERVAL_MS || '15000',
  10
);

/** Worker considered dead after this many missed heartbeats */
export const HEARTBEAT_MISSED_THRESHOLD = parseInt(
  process.env.HEARTBEAT_MISSED_THRESHOLD || '3',
  10
);

/** Heartbeat retention period in milliseconds */
export const HEARTBEAT_RETENTION_MS = parseInt(
  process.env.HEARTBEAT_RETENTION_MS || '3600000',
  10
);

// =============================================================================
// CIRCUIT BREAKER CONFIGURATIONS
// =============================================================================

/** Default circuit breaker configuration */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 30000,
  halfOpenMaxCalls: 3,
};

/** Circuit breaker configurations by component */
export const CIRCUIT_BREAKER_CONFIGS: Record<string, CircuitBreakerConfig> = {
  gemini: {
    name: 'gemini',
    failureThreshold: 3,
    successThreshold: 2,
    timeoutMs: 30000,
    halfOpenMaxCalls: 2,
  },
  database: {
    name: 'database',
    failureThreshold: 5,
    successThreshold: 3,
    timeoutMs: 10000,
    halfOpenMaxCalls: 5,
  },
  tiktok: {
    name: 'tiktok',
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 60000,
    halfOpenMaxCalls: 3,
  },
  facebook: {
    name: 'facebook',
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 60000,
    halfOpenMaxCalls: 3,
  },
  website: {
    name: 'website',
    failureThreshold: 3,
    successThreshold: 2,
    timeoutMs: 30000,
    halfOpenMaxCalls: 3,
  },
  crawl: {
    name: 'crawl',
    failureThreshold: 10,
    successThreshold: 3,
    timeoutMs: 120000,
    halfOpenMaxCalls: 5,
  },
  ai_enrichment: {
    name: 'ai_enrichment',
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 60000,
    halfOpenMaxCalls: 3,
  },
};

// =============================================================================
// RETRY BUDGET CONFIGURATIONS
// =============================================================================

/** Default retry budget configuration */
export const DEFAULT_RETRY_BUDGET_CONFIG: RetryBudgetConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
  budgetWindowMs: 60000,
  maxRetriesPerWindow: 10,
};

/** Retry budget configurations by operation */
export const RETRY_BUDGET_CONFIGS: Record<string, RetryBudgetConfig> = {
  publish_job: {
    name: 'publish_job',
    maxRetries: 5,
    baseDelayMs: 2000,
    maxDelayMs: 120000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
    budgetWindowMs: 60000,
    maxRetriesPerWindow: 10,
  },
  gemini_call: {
    name: 'gemini_call',
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.3,
    budgetWindowMs: 60000,
    maxRetriesPerWindow: 5,
  },
  crawl_navigation: {
    name: 'crawl_navigation',
    maxRetries: 3,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 1.5,
    jitterFactor: 0.2,
    budgetWindowMs: 60000,
    maxRetriesPerWindow: 20,
  },
  database_query: {
    name: 'database_query',
    maxRetries: 3,
    baseDelayMs: 500,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
    budgetWindowMs: 60000,
    maxRetriesPerWindow: 15,
  },
};

// =============================================================================
// RATE LIMIT CONFIGURATIONS
// =============================================================================

/** Default rate limit configuration */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  name: 'default',
  maxRequests: 100,
  windowMs: 60000,
};

/** Rate limit configurations by component */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  gemini: {
    name: 'gemini',
    maxRequests: parseInt(process.env.GEMINI_RATE_LIMIT || '50', 10),
    windowMs: 60000,
  },
  tiktok_publish: {
    name: 'tiktok_publish',
    maxRequests: parseInt(process.env.TIKTOK_RATE_LIMIT || '10', 10),
    windowMs: 60000,
    blockDurationMs: 300000,
  },
  facebook_publish: {
    name: 'facebook_publish',
    maxRequests: parseInt(process.env.FACEBOOK_RATE_LIMIT || '20', 10),
    windowMs: 60000,
    blockDurationMs: 300000,
  },
  website_publish: {
    name: 'website_publish',
    maxRequests: parseInt(process.env.WEBSITE_RATE_LIMIT || '100', 10),
    windowMs: 60000,
  },
  crawl_navigation: {
    name: 'crawl_navigation',
    maxRequests: parseInt(process.env.CRAWL_RATE_LIMIT || '30', 10),
    windowMs: 60000,
    blockDurationMs: 60000,
  },
  api_general: {
    name: 'api_general',
    maxRequests: parseInt(process.env.API_RATE_LIMIT || '1000', 10),
    windowMs: 60000,
  },
};

// =============================================================================
// STUCK JOB DETECTION CONFIGURATION
// =============================================================================

/** Maximum time a job can be in 'publishing' status before considered stuck */
export const JOB_STUCK_THRESHOLD_MS = parseInt(
  process.env.JOB_STUCK_THRESHOLD_MS || '300000',
  10
);

/** Maximum time a lock can be held before considered stale */
export const LOCK_STALE_THRESHOLD_MS = parseInt(
  process.env.LOCK_STALE_THRESHOLD_MS || '180000',
  10
);

/** Maximum job age before considered orphaned */
export const JOB_ORPHANED_THRESHOLD_MS = parseInt(
  process.env.JOB_ORPHANED_THRESHOLD_MS || '86400000',
  10
);

/** Time before a worker is considered dead (no heartbeat) */
export const WORKER_DEAD_THRESHOLD_MS = parseInt(
  process.env.WORKER_DEAD_THRESHOLD_MS || '60000',
  10
);

// =============================================================================
// DEAD LETTER CONFIGURATION
// =============================================================================

/** Maximum attempts before moving to dead letter */
export const DEAD_LETTER_MAX_ATTEMPTS = parseInt(
  process.env.DEAD_LETTER_MAX_ATTEMPTS || '5',
  10
);

/** Dead letter retention period in days */
export const DEAD_LETTER_RETENTION_DAYS = parseInt(
  process.env.DEAD_LETTER_RETENTION_DAYS || '30',
  10
);

/** Enable automatic quarantine */
export const DEAD_LETTER_AUTO_QUARANTINE = process.env.DEAD_LETTER_AUTO_QUARANTINE !== 'false';

// =============================================================================
// EVENT RETENTION CONFIGURATION
// =============================================================================

/** System event retention period in days */
export const EVENT_RETENTION_DAYS = parseInt(
  process.env.EVENT_RETENTION_DAYS || '7',
  10
);

/** Maximum events to keep in memory */
export const EVENT_MAX_IN_MEMORY = parseInt(
  process.env.EVENT_MAX_IN_MEMORY || '1000',
  10
);

// =============================================================================
// ALERTING CONFIGURATION
// =============================================================================

/** Enable alerting */
export const ALERTING_ENABLED = process.env.ALERTING_ENABLED !== 'false';

/** Alert cooldown period in milliseconds */
export const ALERT_COOLDOWN_MS = parseInt(
  process.env.ALERT_COOLDOWN_MS || '300000',
  10
);

/** Alert check interval in milliseconds */
export const ALERT_CHECK_INTERVAL_MS = parseInt(
  process.env.ALERT_CHECK_INTERVAL_MS || '60000',
  10
);

// =============================================================================
// SUBSYSTEM IDENTIFIERS
// =============================================================================

/** Subsystem names */
export const SUBSYSTEMS = {
  CRAWLER: 'crawler',
  AI_ENRICHMENT: 'ai_enrichment',
  PUBLISHING: 'publishing',
  PUBLISHER_RUNNER: 'publisher_runner',
  DATABASE: 'database',
  GEMINI_CLIENT: 'gemini_client',
} as const;

/** Operation names */
export const OPERATIONS = {
  // Crawler operations
  CRAWL_PAGE: 'crawl_page',
  EXTRACT_CONTENT: 'extract_content',
  NAVIGATE: 'navigate',

  // AI operations
  ENRICH_PRODUCT: 'enrich_product',
  GENERATE_CONTENT: 'generate_content',
  ANALYZE_SENTIMENT: 'analyze_sentiment',

  // Publishing operations
  SCHEDULE_JOB: 'schedule_job',
  PREPARE_PAYLOAD: 'prepare_payload',
  PUBLISH_CONTENT: 'publish_content',

  // Runner operations
  SELECT_JOBS: 'select_jobs',
  CLAIM_JOB: 'claim_job',
  EXECUTE_JOB: 'execute_job',
  RETRY_JOB: 'retry_job',

  // Database operations
  QUERY: 'query',
  TRANSACTION: 'transaction',
  BATCH_INSERT: 'batch_insert',
} as const;
