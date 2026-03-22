/**
 * Security Layer - Security Audit Logger
 *
 * High-level facade for recording security events.
 *
 * Write path:
 *   recordSecurityEvent() → insertSecurityEvent() (Supabase)
 *     - critical/error → synchronous (must not be lost)
 *     - warning/info/debug → fire-and-forget (non-blocking)
 *
 * Note: All sensitive data is redacted before being passed to the repository.
 * The Supabase repository hashes IP addresses and never stores raw values.
 */

import type {
  SecurityAuditRecordInput,
  SecurityEventType,
  SecurityEventSeverity,
  ActorIdentity,
} from '../types';
import { SECURITY_EVENT_SEVERITY } from '../types';
import { EVENT_TYPE_SEVERITY } from '../constants';
import { redactForAuditLog } from '../redaction/sensitiveDataRedaction';
import {
  insertSecurityEvent,
  querySecurityEvents,
  getSecurityEventById,
  getEventsByCorrelationId,
  getSecurityViolations,
  getEventCountBySeverity,
  type SecurityEventRow,
} from '../repositories/securityEventRepository';

// ── Record Event ───────────────────────────────────────────────────────────────

/**
 * Record a security event to the audit log.
 *
 * Severity guide:
 *   critical / error → synchronous Supabase write
 *   warning / info   → fire-and-forget (non-blocking)
 *
 * The `redact` option defaults to true — all metadata is sanitized
 * before storage so no secrets ever reach the database.
 */
export async function recordSecurityEvent(
  input: SecurityAuditRecordInput,
  options?: {
    redact?: boolean;
    correlationId?: string;
    ipAddress?: string;
  }
): Promise<SecurityEventRow | null> {
  const severity = input.severity ?? (
    EVENT_TYPE_SEVERITY[input.eventType] as SecurityEventSeverity ?? 'info'
  );

  const event = {
    eventType: input.eventType,
    severity,
    actorId: input.actorId,
    actorRole: input.actorRole,
    subsystem: input.subsystem,
    message: input.message,
    metadata: options?.redact !== false
      ? redactForAuditLog(input.metadata)
      : input.metadata,
    correlationId: options?.correlationId ?? input.correlationId,
    ipAddress: options?.ipAddress,
  };

  // Console log in non-production (development / local debugging)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SecurityEvent]', JSON.stringify(event, null, 2));
  }

  return insertSecurityEvent(event);
}

/**
 * Record an authentication event (synchronous for failures).
 */
export async function recordAuthSecurityEvent(
  eventType: SecurityEventType,
  actor: ActorIdentity | undefined,
  message: string,
  options?: {
    success?: boolean;
    metadata?: Record<string, unknown>;
    correlationId?: string;
    ipAddress?: string;
  }
): Promise<SecurityEventRow | null> {
  const severity: SecurityEventSeverity = (
    eventType.includes('FAILURE') ||
    eventType.includes('INVALID') ||
    eventType.includes('DENIED')
  )
    ? SECURITY_EVENT_SEVERITY.WARNING
    : SECURITY_EVENT_SEVERITY.INFO;

  return recordSecurityEvent(
    {
      eventType,
      severity,
      actorId: actor?.id,
      actorRole: actor?.role,
      subsystem: 'authentication',
      message,
      metadata: options?.metadata,
      correlationId: options?.correlationId,
    },
    {
      redact: true,
      ipAddress: options?.ipAddress,
    }
  );
}

/**
 * Record a permission denied event.
 */
export async function recordPermissionDeniedEvent(
  actor: ActorIdentity,
  permission: string,
  resource: string,
  options?: {
    correlationId?: string;
    ipAddress?: string;
  }
): Promise<SecurityEventRow | null> {
  return recordSecurityEvent(
    {
      eventType: 'permission_denied',
      severity: SECURITY_EVENT_SEVERITY.WARNING,
      actorId: actor.id,
      actorRole: actor.role,
      subsystem: 'authorization',
      message: `Permission denied: '${permission}' on '${resource}'`,
      metadata: { permission, resource },
    },
    {
      redact: true,
      correlationId: options?.correlationId,
      ipAddress: options?.ipAddress,
    }
  );
}

/**
 * Record a secret access event.
 */
export async function recordSecretAccessEvent(
  actor: ActorIdentity,
  secretName: string,
  action: 'read' | 'write' | 'rotate',
  options?: {
    correlationId?: string;
    ipAddress?: string;
  }
): Promise<SecurityEventRow | null> {
  return recordSecurityEvent(
    {
      eventType: 'secret_accessed',
      severity: SECURITY_EVENT_SEVERITY.INFO,
      actorId: actor.id,
      actorRole: actor.role,
      subsystem: 'secret_management',
      message: `Secret ${action}: '${secretName}'`,
      metadata: { secretName, action },
    },
    {
      redact: true,
      correlationId: options?.correlationId,
      ipAddress: options?.ipAddress,
    }
  );
}

/**
 * Record a security violation.
 */
export async function recordSecurityViolation(
  violationType: SecurityEventType,
  message: string,
  options?: {
    actor?: ActorIdentity;
    severity?: SecurityEventSeverity;
    metadata?: Record<string, unknown>;
    correlationId?: string;
    ipAddress?: string;
  }
): Promise<SecurityEventRow | null> {
  return recordSecurityEvent(
    {
      eventType: violationType,
      severity: options?.severity ?? SECURITY_EVENT_SEVERITY.ERROR,
      actorId: options?.actor?.id,
      actorRole: options?.actor?.role,
      subsystem: 'security',
      message,
      metadata: options?.metadata,
      correlationId: options?.correlationId,
    },
    {
      redact: true,
      ipAddress: options?.ipAddress,
    }
  );
}

// ── Query Events ───────────────────────────────────────────────────────────────

/**
 * Query recent security events (from Supabase).
 *
 * Use for admin dashboards and audit trails.
 */
export async function querySecurityEventsFromDb(
  options?: {
    eventType?: SecurityEventType;
    severity?: SecurityEventSeverity;
    actorId?: string;
    subsystem?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }
): Promise<{ events: SecurityEventRow[]; total: number }> {
  return querySecurityEvents(options);
}

/**
 * Get a security event by ID.
 */
export async function getSecurityEventByIdFromDb(
  id: string
): Promise<SecurityEventRow | null> {
  return getSecurityEventById(id);
}

/**
 * Get all events for a correlation ID (full request trace).
 */
export async function getSecurityEventsByCorrelationIdFromDb(
  correlationId: string
): Promise<SecurityEventRow[]> {
  return getEventsByCorrelationId(correlationId);
}

/**
 * Get security violations (error + critical).
 */
export async function getSecurityViolationsFromDb(
  options?: {
    actorId?: string;
    subsystem?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }
): Promise<{ events: SecurityEventRow[]; total: number }> {
  return getSecurityViolations(options);
}

/**
 * Get event counts by severity (for dashboards).
 */
export async function getSecurityEventCountsBySeverity(
  from?: Date,
  to?: Date
): Promise<Record<SecurityEventSeverity, number>> {
  return getEventCountBySeverity(from, to);
}
