/**
 * Security Layer - Type Definitions
 * Production-grade typed interfaces for security model
 */

// =============================================================================
// SECURITY DOMAINS
// =============================================================================

/** Security domains in the system */
export const SECURITY_DOMAINS = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONTROL_PLANE: 'control_plane',
  ADMIN: 'admin',
  CRAWLER: 'crawler',
  AI_ENRICHMENT: 'ai_enrichment',
  PUBLISHING: 'publishing',
  DATABASE: 'database',
  EXTERNAL_INTEGRATION: 'external_integration',
} as const;

export type SecurityDomain = typeof SECURITY_DOMAINS[keyof typeof SECURITY_DOMAINS];

// =============================================================================
// SECRET CLASSIFICATION
// =============================================================================

/** Classification levels for secrets */
export const SECRET_CLASSIFICATION = {
  PUBLIC_SAFE: 'public_safe',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted',
  SECRET: 'secret',
} as const;

export type SecretClassification = typeof SECRET_CLASSIFICATION[keyof typeof SECRET_CLASSIFICATION];

// =============================================================================
// CONFIG SENSITIVITY
// =============================================================================

/** Configuration sensitivity levels */
export const CONFIG_SENSITIVITY = {
  PUBLIC: 'public',
  SERVER_ONLY: 'server_only',
  HIGH_SENSITIVITY: 'high_sensitivity',
} as const;

export type ConfigSensitivity = typeof CONFIG_SENSITIVITY[keyof typeof CONFIG_SENSITIVITY];

// =============================================================================
// SECURITY EVENT TYPES & SEVERITY
// =============================================================================

/** Security event types */
export const SECURITY_EVENT_TYPES = {
  // Authentication events
  AUTH_SUCCESS: 'auth_success',
  AUTH_FAILURE: 'auth_failure',
  AUTH_TOKEN_ISSUED: 'auth_token_issued',
  AUTH_TOKEN_REVOKED: 'auth_token_revoked',
  AUTH_SESSION_EXPIRED: 'auth_session_expired',
  AUTH_INVALID_TOKEN: 'auth_invalid_token',

  // Authorization events
  PERMISSION_GRANTED: 'permission_granted',
  PERMISSION_DENIED: 'permission_denied',
  ACCESS_POLICY_VIOLATION: 'access_policy_violation',
  MUTATION_POLICY_VIOLATION: 'mutation_policy_violation',

  // Secret management events
  SECRET_ACCESSED: 'secret_accessed',
  SECRET_EXPOSED: 'secret_exposed',
  SECRET_ROTATED: 'secret_rotated',
  SECRET_ACCESS_DENIED: 'secret_access_denied',

  // Security violations
  VIOLATION_SUSPICIOUS_REQUEST: 'violation_suspicious_request',
  VIOLATION_INVALID_ORIGIN: 'violation_invalid_origin',
  VIOLATION_CSRF_FAILURE: 'violation_csrf_failure',
  VIOLATION_RATE_LIMIT_EXCEEDED: 'violation_rate_limit_exceeded',
  VIOLATION_RUNTIME_BOUNDARY: 'violation_runtime_boundary',
  VIOLATION_ENVIRONMENT_POLICY: 'violation_environment_policy',

  // System events
  SYSTEM_STARTUP: 'system_startup',
  SYSTEM_SHUTDOWN: 'system_shutdown',
  CONFIG_VALIDATION_FAILED: 'config_validation_failed',
} as const;

export type SecurityEventType = typeof SECURITY_EVENT_TYPES[keyof typeof SECURITY_EVENT_TYPES];

/** Security event severity levels */
export const SECURITY_EVENT_SEVERITY = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

export type SecurityEventSeverity = typeof SECURITY_EVENT_SEVERITY[keyof typeof SECURITY_EVENT_SEVERITY];

// =============================================================================
// ACCESS ROLES
// =============================================================================

/** System roles */
export const ACCESS_ROLES = {
  READONLY_OBSERVER: 'readonly_observer',
  OPERATOR: 'operator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  SYSTEM_WORKER: 'system_worker',
} as const;

export type AccessRole = typeof ACCESS_ROLES[keyof typeof ACCESS_ROLES];

// =============================================================================
// PERMISSIONS
// =============================================================================

/** Granular permissions */
export const PERMISSIONS = {
  // Dashboard/Read permissions
  DASHBOARD_READ: 'dashboard:read',
  DASHBOARD_STATS_READ: 'dashboard:stats:read',

  // Publish job permissions
  PUBLISH_JOB_READ: 'publish_job:read',
  PUBLISH_JOB_CREATE: 'publish_job:create',
  PUBLISH_JOB_RETRY: 'publish_job:retry',
  PUBLISH_JOB_CANCEL: 'publish_job:cancel',
  PUBLISH_JOB_UNLOCK: 'publish_job:unlock',

  // Crawler permissions
  CRAWLER_EXECUTE: 'crawler:execute',
  CRAWLER_READ: 'crawler:read',

  // AI Enrichment permissions
  AI_ENRICHMENT_EXECUTE: 'ai_enrichment:execute',
  AI_ENRICHMENT_READ: 'ai_enrichment:read',

  // Publishing permissions
  PUBLISHING_PREPARE: 'publishing:prepare',
  PUBLISHING_EXECUTE: 'publishing:execute',
  PUBLISHING_READ: 'publishing:read',

  // Dead letter permissions
  DEAD_LETTER_READ: 'dead_letter:read',
  DEAD_LETTER_REQUEUE: 'dead_letter:requeue',
  DEAD_LETTER_RESOLVE: 'dead_letter:resolve',

  // Audit/Security permissions
  AUDIT_LOG_READ: 'audit_log:read',
  SECURITY_EVENT_READ: 'security_event:read',
  SECURITY_EVENT_MANAGE: 'security_event:manage',

  // Secret/System permissions
  SECRET_METADATA_READ: 'secret_metadata:read',
  CONFIG_READ: 'config:read',
  INTERNAL_SESSION_MANAGE: 'internal_session:manage',

  // Admin permissions
  ADMIN_USER_READ: 'admin:user:read',
  ADMIN_USER_MANAGE: 'admin:user:manage',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// =============================================================================
// ACTOR & SESSION
// =============================================================================

/** Actor identity in the system */
export interface ActorIdentity {
  id: string;
  name: string;
  email?: string;
  role: AccessRole;
  capabilities: AccessRole[];
  metadata?: Record<string, unknown>;
}

/** Session information */
export interface ActorSession {
  sessionId: string;
  actorId: string;
  role: AccessRole;
  issuedAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// EXECUTION CONTEXT
// =============================================================================

/** Trusted execution context */
export interface TrustedExecutionContext {
  /** Execution domain */
  domain: SecurityDomain;

  /** Whether running in server environment */
  isServerEnvironment: boolean;

  /** Whether running in worker environment */
  isWorkerEnvironment: boolean;

  /** Whether running in control plane */
  isControlPlane: boolean;

  /** Environment name */
  environment: string;

  /** Request ID if applicable */
  requestId?: string;

  /** Correlation ID if applicable */
  correlationId?: string;
}

// =============================================================================
// SECURITY BOUNDARIES
// =============================================================================

/** Security boundaries in the system */
export const SECURITY_BOUNDARIES = {
  PUBLIC_UNTRUSTED: 'public_untrusted',
  BROWSER_CLIENT: 'browser_client',
  NEXTJS_SERVER: 'nextjs_server',
  CONTROL_PLANE: 'control_plane',
  INTERNAL_API: 'internal_api',
  WORKER_RUNTIME: 'worker_runtime',
  DATABASE: 'database',
  SENSITIVE_STORAGE: 'sensitive_storage',
} as const;

export type SecurityBoundary = typeof SECURITY_BOUNDARIES[keyof typeof SECURITY_BOUNDARIES];

// =============================================================================
// DATA CLASSIFICATION
// =============================================================================

/** Data classification levels */
export const DATA_CLASSIFICATION = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted',
} as const;

export type DataClassification = typeof DATA_CLASSIFICATION[keyof typeof DATA_CLASSIFICATION];

// =============================================================================
// SECRET REFERENCE
// =============================================================================

/** Reference to a secret */
export interface SecretReference {
  name: string;
  classification: SecretClassification;
  allowedDomains: SecurityDomain[];
  isRotatable: boolean;
  rotationPeriodDays?: number;
  lastRotatedAt?: Date;
}

// =============================================================================
// SECURITY VIOLATION
// =============================================================================

/** Security violation record */
export interface SecurityViolation {
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  message: string;
  actor?: ActorIdentity;
  resource?: string;
  context?: Record<string, unknown>;
  correlationId?: string;
  timestamp: Date;
}

// =============================================================================
// SECURITY CHECK RESULT
// =============================================================================

/** Result of a security check */
export interface SecurityCheckResult {
  passed: boolean;
  reason?: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

// =============================================================================
// PERMISSION DECISION
// =============================================================================

/** Permission decision */
export interface PermissionDecision {
  granted: boolean;
  reason?: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

// =============================================================================
// INTERNAL AUTH CONTEXT
// =============================================================================

/** Internal authentication context */
export interface InternalAuthContext {
  actor: ActorIdentity;
  session?: ActorSession;
  context: TrustedExecutionContext;
  authenticatedAt: Date;
  tokenAudience?: string;
  tokenScope?: string[];
}

// =============================================================================
// SECURITY AUDIT RECORD
// =============================================================================

/** Security audit record input */
export interface SecurityAuditRecordInput {
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  actorId?: string;
  actorRole?: AccessRole;
  subsystem: string;
  message: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

// =============================================================================
// SENSITIVE FIELD POLICY
// =============================================================================

/** Policy for sensitive fields */
export interface SensitiveFieldPolicy {
  fieldName: string;
  classification: DataClassification;
  redactForLogs: boolean;
  redactForClient: boolean;
  redactForAudit: boolean;
  maskCharacter?: string;
  preserveLength?: boolean;
}

// =============================================================================
// SECURITY CONFIG
// =============================================================================

/** Security configuration */
export interface SecurityConfig {
  environment: string;
  sessionTTLMinutes: number;
  tokenTTLMinutes: number;
  maxFailedAuthAttempts: number;
  lockoutDurationMinutes: number;
  requireMfaForRoles?: AccessRole[];
  allowedOrigins?: string[];
  adminDomain?: string;
}

// =============================================================================
// REDACTION OPTIONS
// =============================================================================

/** Options for redaction */
export interface RedactionOptions {
  /** Preserve length of original string */
  preserveLength?: boolean;

  /** Character to use for masking */
  maskCharacter?: string;

  /** Show only first N characters */
  showFirst?: number;

  /** Show only last N characters */
  showLast?: number;

  /** Custom fields to redact */
  customFields?: string[];

  /** Fields to preserve (not redact) */
  preserveFields?: string[];
}
