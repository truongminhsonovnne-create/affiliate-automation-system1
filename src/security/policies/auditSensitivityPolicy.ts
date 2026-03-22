/**
 * Security Layer - Audit Sensitivity Policy
 * Policy for audit log sensitivity and retention
 */

import type { SecurityEventType } from '../types';

// =============================================================================
// CONFIG
// =============================================================================

/** Audit sensitivity levels */
export type AuditSensitivity = 'full' | 'summary' | 'minimal' | 'none';

/** Event type sensitivity mapping */
const EVENT_SENSITIVITY: Record<string, AuditSensitivity> = {
  // High sensitivity - store full details
  auth_success: 'full',
  auth_failure: 'full',
  permission_denied: 'full',
  secret_accessed: 'full',
  secret_exposed: 'full',
  secret_access_denied: 'full',
  violation_suspicious_request: 'full',
  violation_csrf_failure: 'full',

  // Medium sensitivity - store summary
  auth_token_issued: 'summary',
  auth_token_revoked: 'summary',
  permission_granted: 'summary',
  access_policy_violation: 'summary',
  secret_rotated: 'summary',
  violation_rate_limit_exceeded: 'summary',
  violation_environment_policy: 'summary',

  // Low sensitivity - store minimal
  auth_session_expired: 'minimal',
  auth_invalid_token: 'minimal',
  mutation_policy_violation: 'minimal',
  violation_invalid_origin: 'minimal',
  violation_runtime_boundary: 'minimal',

  // No audit
  config_validation_failed: 'none',
};

/** Fields to redact by sensitivity level */
const SENSITIVITY_REDACTION_FIELDS: Record<AuditSensitivity, string[]> = {
  full: ['password', 'password_hash', 'secret_key', 'private_key', 'service_role_key'],
  summary: ['password', 'secret_key', 'service_role_key', 'token'],
  minimal: ['password', 'secret_key', 'token', 'api_key'],
  none: [],
};

// =============================================================================
// POLICY FUNCTIONS
// =============================================================================

/**
 * Get audit sensitivity policy for event type
 */
export function getAuditSensitivityPolicy(
  eventType: SecurityEventType,
  context?: {
    actorRole?: string;
    environment?: string;
  }
): {
  sensitivity: AuditSensitivity;
  storeRawPayload: boolean;
  retentionDays: number;
} {
  const eventSensitivity = EVENT_SENSITIVITY[eventType] ?? 'summary';

  // Adjust based on context
  let sensitivity = eventSensitivity as AuditSensitivity;

  // Production has stricter policies
  if (context?.environment === 'production' && sensitivity === 'minimal') {
    sensitivity = 'summary';
  }

  // Sensitive roles get full audit
  if (context?.actorRole === 'super_admin' && sensitivity !== 'full') {
    sensitivity = 'full';
  }

  return {
    sensitivity,
    storeRawPayload: sensitivity === 'full',
    retentionDays: getRetentionDays(sensitivity),
  };
}

/**
 * Should store raw payload for event
 */
export function shouldStoreRawPayload(
  eventType: SecurityEventType,
  context?: {
    environment?: string;
  }
): boolean {
  const policy = getAuditSensitivityPolicy(eventType, context);
  return policy.storeRawPayload;
}

/**
 * Should redact field for audit
 */
export function shouldRedactFieldForAudit(
  fieldName: string,
  context?: {
    sensitivity?: AuditSensitivity;
    eventType?: SecurityEventType;
  }
): boolean {
  const sensitivity = context?.sensitivity ?? 'summary';

  // Check sensitivity-specific redaction
  const fieldsToRedact = SENSITIVITY_REDACTION_FIELDS[sensitivity];

  if (fieldsToRedact.includes(fieldName.toLowerCase())) {
    return true;
  }

  // Check always redact
  const alwaysRedact = ['password', 'secret', 'token', 'key', 'credential'];
  return alwaysRedact.some((term) => fieldName.toLowerCase().includes(term));
}

/**
 * Get fields to redact for audit by sensitivity
 */
export function getFieldsToRedactForAudit(
  sensitivity: AuditSensitivity
): string[] {
  return SENSITIVITY_REDACTION_FIELDS[sensitivity] ?? [];
}

// =============================================================================
// RETENTION
// =============================================================================

/** Retention days by sensitivity */
const RETENTION_DAYS: Record<AuditSensitivity, number> = {
  full: 365,
  summary: 180,
  minimal: 90,
  none: 0,
};

/**
 * Get retention days for sensitivity level
 */
function getRetentionDays(sensitivity: AuditSensitivity): number {
  return RETENTION_DAYS[sensitivity] ?? 90;
}

// =============================================================================
// EVENT TYPE HELPERS
// =============================================================================

/**
 * Check if event type should be audited
 */
export function shouldAuditEvent(eventType: SecurityEventType): boolean {
  const sensitivity = EVENT_SENSITIVITY[eventType] ?? 'summary';
  return sensitivity !== 'none';
}

/**
 * Get all events by sensitivity
 */
export function getEventsBySensitivity(
  sensitivity: AuditSensitivity
): string[] {
  return Object.entries(EVENT_SENSITIVITY)
    .filter(([, s]) => s === sensitivity)
    .map(([type]) => type);
}

/**
 * Get all high-sensitivity events
 */
export function getHighSensitivityEvents(): string[] {
  return getEventsBySensitivity('full');
}
