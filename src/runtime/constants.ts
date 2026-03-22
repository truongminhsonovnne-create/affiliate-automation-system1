/**
 * Runtime Layer - Constants
 * Centralized configuration for runtime behaviors
 */

import type { RuntimeRole, RuntimeEnvironment } from './types';

// =============================================================================
// PORTS
// =============================================================================

/** Default ports by runtime role */
export const DEFAULT_PORTS: Record<RuntimeRole, number> = {
  web: 3000,
  'control-plane': 4000,
  'worker-crawler': 0, // No HTTP port
  'worker-ai': 0,
  'worker-publisher': 0,
  'ops-runner': 0,
};

// =============================================================================
// HEALTH CHECKS
// =============================================================================

/** Health check intervals (ms) */
export const HEALTH_CHECK_INTERVAL_MS = 30000;

/** Health check timeout (ms) */
export const HEALTH_CHECK_TIMEOUT_MS = 5000;

/** Startup timeout (ms) */
export const STARTUP_TIMEOUT_MS = 60000;

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

/** Graceful shutdown timeout (ms) */
export const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 30000;

/** Force kill timeout after graceful (ms) */
export const FORCE_KILL_TIMEOUT_MS = 5000;

/** Drain connection timeout (ms) */
export const DRAIN_CONNECTION_TIMEOUT_MS = 10000;

// =============================================================================
// WORKER CONCURRENCY
// =============================================================================

/** Default concurrency by worker type */
export const DEFAULT_WORKER_CONCURRENCY: Partial<Record<RuntimeRole, number>> = {
  'worker-crawler': 3,
  'worker-ai': 5,
  'worker-publisher': 10,
  'ops-runner': 1,
};

/** Queue poll interval (ms) */
export const QUEUE_POLL_INTERVAL_MS = 5000;

/** Heartbeat interval (ms) */
export const HEARTBEAT_INTERVAL_MS = 30000;

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/** Default feature flags by environment */
export const DEFAULT_FEATURE_FLAGS: Record<RuntimeEnvironment, Record<string, boolean>> = {
  local: {
    ENABLE_DEBUG_MODE: true,
    ENABLE_VERBOSE_LOGGING: true,
    ENABLE_DRY_RUN: true,
    ENABLE_METRICS: false,
    ENABLE_DEV_UI: true,
  },
  development: {
    ENABLE_DEBUG_MODE: true,
    ENABLE_VERBOSE_LOGGING: true,
    ENABLE_DRY_RUN: true,
    ENABLE_METRICS: true,
    ENABLE_DEV_UI: false,
  },
  staging: {
    ENABLE_DEBUG_MODE: false,
    ENABLE_VERBOSE_LOGGING: false,
    ENABLE_DRY_RUN: true,
    ENABLE_METRICS: true,
    ENABLE_DEV_UI: false,
  },
  production: {
    ENABLE_DEBUG_MODE: false,
    ENABLE_VERBOSE_LOGGING: false,
    ENABLE_DRY_RUN: false,
    ENABLE_METRICS: true,
    ENABLE_DEV_UI: false,
  },
};

// =============================================================================
// STARTUP
// =============================================================================

/** Dependency check timeout (ms) */
export const DEPENDENCY_CHECK_TIMEOUT_MS = 15000;

/** Database connection timeout (ms) */
export const DATABASE_CONNECTION_TIMEOUT_MS = 10000;

/** Startup retry attempts */
export const STARTUP_RETRY_ATTEMPTS = 3;

/** Startup retry delay (ms) */
export const STARTUP_RETRY_DELAY_MS = 2000;

// =============================================================================
// RELEASE VERIFICATION
// =============================================================================

/** Release verification timeout (ms) */
export const RELEASE_VERIFICATION_TIMEOUT_MS = 120000;

/** Smoke test timeout (ms) */
export const SMOKE_TEST_TIMEOUT_MS = 60000;

/** Health verification timeout (ms) */
export const HEALTH_VERIFICATION_TIMEOUT_MS = 30000;

/** Critical path verification timeout (ms) */
export const CRITICAL_PATH_TIMEOUT_MS = 30000;

// =============================================================================
// RATE LIMITS
// =============================================================================

/** Rate limit multiplier by environment */
export const RATE_LIMIT_MULTIPLIER: Record<RuntimeEnvironment, number> = {
  local: 100,
  development: 10,
  staging: 2,
  production: 1,
};

// =============================================================================
// ENVIRONMENT-SPECIFIC SAFETY
// =============================================================================

/** Safety toggles by environment */
export const ENVIRONMENT_SAFETY: Record<RuntimeEnvironment, {
  allowMutations: boolean;
  allowMigrations: boolean;
  requireApproval: boolean;
  dryRunDefault: boolean;
}> = {
  local: {
    allowMutations: true,
    allowMigrations: true,
    requireApproval: false,
    dryRunDefault: true,
  },
  development: {
    allowMutations: true,
    allowMigrations: true,
    requireApproval: false,
    dryRunDefault: true,
  },
  staging: {
    allowMutations: true,
    allowMigrations: true,
    requireApproval: false,
    dryRunDefault: true,
  },
  production: {
    allowMutations: true,
    allowMigrations: false,
    requireApproval: true,
    dryRunDefault: false,
  },
};

// =============================================================================
// WORKER SPECIFIC
// =============================================================================

/** Crawler worker settings */
export const CRAWLER_WORKER_CONFIG = {
  maxSessions: 5,
  sessionTimeout: 300000, // 5 minutes
  maxRetries: 3,
  retryDelay: 5000,
};

/** AI worker settings */
export const AI_WORKER_CONFIG = {
  batchSize: 10,
  batchDelay: 1000,
  maxRetries: 3,
  retryDelay: 5000,
  requestTimeout: 60000,
};

/** Publisher worker settings */
export const PUBLISHER_WORKER_CONFIG = {
  batchSize: 20,
  batchDelay: 2000,
  maxRetries: 3,
  retryDelay: 5000,
  requestTimeout: 120000,
};

// =============================================================================
// LOGGING
// =============================================================================

/** Log levels by environment */
export const LOG_LEVELS: Record<RuntimeEnvironment, string> = {
  local: 'debug',
  development: 'debug',
  staging: 'info',
  production: 'warn',
};

// =============================================================================
// STORAGE PATHS
// =============================================================================

/** Storage paths */
export const STORAGE_PATHS = {
  sessions: '/app/data/sessions',
  logs: '/app/logs',
  temp: '/tmp',
  cache: '/app/.cache',
};

// =============================================================================
// VALIDATION
// =============================================================================

/** Valid environment values */
export const VALID_ENVIRONMENTS: RuntimeEnvironment[] = ['local', 'development', 'staging', 'production'];

/** Valid role values */
export const VALID_ROLES: RuntimeRole[] = ['web', 'control-plane', 'worker-crawler', 'worker-ai', 'worker-publisher', 'ops-runner'];

/** Required env vars by role */
export const REQUIRED_ENV_VARS: Partial<Record<RuntimeRole, string[]>> = {
  web: ['NODE_ENV', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'],
  'control-plane': ['NODE_ENV', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'INTERNAL_AUTH_SECRET'],
  'worker-crawler': ['NODE_ENV', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  'worker-ai': ['NODE_ENV', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'],
  'worker-publisher': ['NODE_ENV', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  'ops-runner': ['NODE_ENV', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
};

/**
 * Get required environment variables for a role and environment
 */
export function getRequiredEnvVars(
  role: RuntimeRole,
  environment: RuntimeEnvironment
): string[] {
  const base = REQUIRED_ENV_VARS[role] || [];

  // Add environment-specific requirements
  const additional: string[] = [];

  if (environment === 'production') {
    additional.push('LOG_DRAIN_URL');
  }

  if (role === 'worker-crawler') {
    additional.push('CRAWLER_SESSION_TIMEOUT', 'CRAWLER_MAX_SESSIONS');
  }

  if (role === 'worker-ai') {
    additional.push('AI_BATCH_SIZE', 'AI_REQUEST_TIMEOUT');
  }

  return [...base, ...additional];
}

// =============================================================================
// RE-EXPORT FROM TYPES
// =============================================================================

// Note: RUNTIME_ROLES and RUNTIME_ENVIRONMENTS are defined in types.ts
// They are re-exported here for convenience

// =============================================================================
// SECURITY
// =============================================================================

/** Config sensitivity levels */
export const CONFIG_SENSITIVITY = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  SECRET: 'secret',
} as const;

export type ConfigSensitivity = typeof CONFIG_SENSITIVITY[keyof typeof CONFIG_SENSITIVITY];

/** Default security config */
export const DEFAULT_SECURITY_CONFIG = {
  requireHttps: true,
  allowedOrigins: [],
  maxRequestSize: 1048576, // 1MB
  rateLimitWindowMs: 60000,
  rateLimitMaxRequests: 100,
};
