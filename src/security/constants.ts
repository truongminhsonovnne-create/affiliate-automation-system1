/**
 * Security Layer - Constants & Default Values
 * Centralized configuration for security behaviors
 */

import type { SecurityConfig } from './types';

// =============================================================================
// AUTH HEADERS & COOKIES
// =============================================================================

/** Header names for authentication */
export const AUTH_HEADERS = {
  AUTHORIZATION: 'authorization',
  X_INTERNAL_TOKEN: 'x-internal-token',
  X_SESSION_TOKEN: 'x-session-token',
  X_API_KEY: 'x-api-key',
  X_REQUEST_ID: 'x-request-id',
  X_CORRELATION_ID: 'x-correlation-id',
} as const;

/** Cookie names */
export const AUTH_COOKIES = {
  SESSION_TOKEN: 'session_token',
  CSRF_TOKEN: 'csrf_token',
} as const;

// =============================================================================
// TOKEN & SESSION CONFIG
// =============================================================================

/** Default session TTL in minutes */
export const DEFAULT_SESSION_TTL_MINUTES = 60 * 24; // 24 hours

/** Default token TTL in minutes */
export const DEFAULT_TOKEN_TTL_MINUTES = 60; // 1 hour

/** Internal service token TTL in minutes */
export const INTERNAL_TOKEN_TTL_MINUTES = 60 * 12; // 12 hours

/** Clock skew tolerance in seconds */
export const CLOCK_SKEW_SECONDS = 30;

/** Session refresh threshold in minutes before expiry */
export const SESSION_REFRESH_THRESHOLD_MINUTES = 15;

// =============================================================================
// RATE LIMITING & BRUTE FORCE GUARD
// =============================================================================

/** Maximum failed auth attempts before lockout */
export const MAX_FAILED_AUTH_ATTEMPTS = 5;

/** Lockout duration in minutes after max attempts */
export const AUTH_LOCKOUT_DURATION_MINUTES = 30;

/** Rate limit window in seconds */
export const RATE_LIMIT_WINDOW_SECONDS = 60;

/** Rate limit max requests per window */
export const RATE_LIMIT_MAX_REQUESTS = 100;

// =============================================================================
// SECRET MASKING
// =============================================================================

/** Default mask character for secrets */
export const DEFAULT_MASK_CHARACTER = '*';

/** Show first N characters of secret */
export const SECRET_SHOW_FIRST_COUNT = 4;

/** Show last N characters of secret */
export const SECRET_SHOW_LAST_COUNT = 4;

/** Minimum length to show anything */
export const SECRET_MIN_LENGTH_FOR_MASKING = 8;

// =============================================================================
// SECURITY HEADERS
// =============================================================================

/** Default security headers */
export const DEFAULT_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

/** Strict security headers for admin */
export const ADMIN_STRICT_SECURITY_HEADERS = {
  ...DEFAULT_SECURITY_HEADERS,
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
} as const;

/** Content Security Policy */
export const DEFAULT_CSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'connect-src': ["'self'"],
  'font-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
} as const;

// =============================================================================
// INTERNAL ORIGINS
// =============================================================================

/** Allowed origins for internal API calls */
export const ALLOWED_INTERNAL_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
]);

/** Allowed origins for admin dashboard */
export const ALLOWED_ADMIN_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
]);

// =============================================================================
// RESTRICTED ENVIRONMENTS
// =============================================================================

/** Environments that are restricted for certain operations */
export const RESTRICTED_ENVIRONMENTS = new Set(['production']);

/** Environments that allow debug/security logs */
export const VERBOSE_LOG_ENVIRONMENTS = new Set(['development', 'local']);

// =============================================================================
// SENSITIVE FIELDS
// =============================================================================

/** Fields that are always considered secrets */
export const ALWAYS_SECRET_FIELDS = new Set([
  'password',
  'password_hash',
  'api_key',
  'secret_key',
  'access_token',
  'refresh_token',
  'private_key',
  'service_role_key',
  'session_token',
  'csrf_token',
  'authorization',
  'bearer',
  'credentials',
]);

/** Fields that are always restricted */
export const ALWAYS_RESTRICTED_FIELDS = new Set([
  'password',
  'password_hash',
  'secret_key',
  'private_key',
  'service_role_key',
  'session_token',
  'csrf_token',
]);

/** Fields that should never be logged */
export const NEVER_LOG_FIELDS = new Set([
  'password',
  'password_hash',
  'secret_key',
  'private_key',
  'service_role_key',
  'csrf_token',
]);

/** Fields that should never be exposed to client */
export const NEVER_CLIENT_EXPOSE_FIELDS = new Set([
  'password',
  'password_hash',
  'secret_key',
  'private_key',
  'service_role_key',
  'session_token',
  'csrf_token',
  'internal_metadata',
  'system_notes',
]);

// =============================================================================
// STORAGE PATHS
// =============================================================================

/** Paths that should be restricted */
export const RESTRICTED_STORAGE_PATHS = new Set([
  'sessions',
  'credentials',
  'keys',
  'secrets',
  '.env',
  '.env.local',
  '.env.production',
]);

/** Paths that should be ignored in git */
export const GITIGNORE_PATTERNS = [
  '*.log',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  '.env',
  '.env.local',
  '.env.*.local',
  '*.pem',
  'key.pem',
  'service-account.json',
  'credentials.json',
  '.DS_Store',
  'Thumbs.db',
  'sessions/*',
  '*.session',
  '.cache/**',
  'dist/**',
  'node_modules/**',
];

// =============================================================================
// AUDIT RETENTION
// =============================================================================

/** Audit log retention in days by environment */
export const AUDIT_RETENTION_DAYS = {
  local: 7,
  development: 30,
  staging: 90,
  production: 365,
};

/** Security event retention in days */
export const SECURITY_EVENT_RETENTION_DAYS = 365;

// =============================================================================
// ENVIRONMENT POLICIES
// =============================================================================

/** Default security config by environment */
export const DEFAULT_SECURITY_CONFIG: Record<string, SecurityConfig> = {
  local: {
    environment: 'local',
    sessionTTLMinutes: 60 * 24 * 7, // 7 days
    tokenTTLMinutes: 60 * 24, // 24 hours
    maxFailedAuthAttempts: 10,
    lockoutDurationMinutes: 5,
    requireMfaForRoles: [],
    allowedOrigins: ['*'],
  },
  development: {
    environment: 'development',
    sessionTTLMinutes: 60 * 24, // 24 hours
    tokenTTLMinutes: 60 * 4, // 4 hours
    maxFailedAuthAttempts: 10,
    lockoutDurationMinutes: 15,
    requireMfaForRoles: [],
    allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
  },
  staging: {
    environment: 'staging',
    sessionTTLMinutes: 60 * 12, // 12 hours
    tokenTTLMinutes: 60, // 1 hour
    maxFailedAuthAttempts: 5,
    lockoutDurationMinutes: 30,
    requireMfaForRoles: ['super_admin'],
  },
  production: {
    environment: 'production',
    sessionTTLMinutes: 60 * 8, // 8 hours
    tokenTTLMinutes: 30, // 30 minutes
    maxFailedAuthAttempts: 3,
    lockoutDurationMinutes: 60,
    requireMfaForRoles: ['admin', 'super_admin'],
  },
};

// =============================================================================
// ROLE HIERARCHY
// =============================================================================

/** Role hierarchy - higher index = more permissions */
export const ROLE_HIERARCHY = [
  'readonly_observer',
  'operator',
  'admin',
  'super_admin',
  'system_worker',
] as const;

/** Role level mapping */
export const ROLE_LEVELS: Record<string, number> = {
  readonly_observer: 0,
  operator: 1,
  admin: 2,
  super_admin: 3,
  system_worker: 4,
};

// =============================================================================
// SECURITY EVENT SEVERITY MAPPING
// =============================================================================

/** Default severity for event types */
export const EVENT_TYPE_SEVERITY: Record<string, string> = {
  auth_success: 'info',
  auth_failure: 'warning',
  auth_token_issued: 'debug',
  auth_token_revoked: 'info',
  auth_session_expired: 'info',
  auth_invalid_token: 'warning',
  permission_granted: 'debug',
  permission_denied: 'warning',
  access_policy_violation: 'warning',
  mutation_policy_violation: 'error',
  secret_accessed: 'info',
  secret_exposed: 'critical',
  secret_rotated: 'info',
  secret_access_denied: 'error',
  violation_suspicious_request: 'error',
  violation_invalid_origin: 'warning',
  violation_csrf_failure: 'error',
  violation_rate_limit_exceeded: 'warning',
  violation_runtime_boundary: 'error',
  violation_environment_policy: 'error',
  config_validation_failed: 'error',
};

// =============================================================================
// MUTATION SENSITIVITY
// =============================================================================

/** Operations that are considered sensitive mutations */
export const SENSITIVE_MUTATIONS = new Set([
  'PUBLISH_JOB_CANCEL',
  'PUBLISH_JOB_UNLOCK',
  'RESOLVE_DEAD_LETTER',
  'TRIGGER_PUBLISHER_RUN',
  'SECRET_MANAGE',
  'USER_MANAGE',
  'CONFIG_UPDATE',
]);

/** Operations that require additional confirmation */
export const CONFIRMATION_REQUIRED_MUTATIONS = new Set([
  'CANCEL_PUBLISH_JOB',
  'UNLOCK_PUBLISH_JOB',
  'RESOLVE_DEAD_LETTER',
  'TRIGGER_PUBLISHER_RUN',
]);

// =============================================================================
// ERROR MESSAGES
// =============================================================================

/** Security-related error messages (for client) */
export const SECURITY_ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to perform this action',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again',
  TOKEN_INVALID: 'Invalid authentication token',
  RATE_LIMITED: 'Too many requests. Please try again later',
  INVALID_ORIGIN: 'Request from invalid origin',
  CSRF_FAILURE: 'Request validation failed',
  ENVIRONMENT_POLICY: 'This action is not allowed in the current environment',
} as const;

// =============================================================================
// API RESPONSE CODES
// =============================================================================

/** Security-related HTTP status codes */
export const SECURITY_STATUS_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TOKEN_EXPIRED: 401,
  TOKEN_INVALID: 401,
  RATE_LIMITED: 429,
  CONFLICT: 409,
} as const;

// =============================================================================
// CONFIG SENSITIVITY
// =============================================================================

export const CONFIG_SENSITIVITY = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  SECRET: 'secret',
  SERVER_ONLY: 'server-only',
  HIGH_SENSITIVITY: 'high-sensitivity',
} as const;

export type ConfigSensitivity = typeof CONFIG_SENSITIVITY[keyof typeof CONFIG_SENSITIVITY];

