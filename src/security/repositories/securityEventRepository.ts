/**
 * Security Layer - Security Event Repository
 *
 * Persists security audit events to Supabase.
 * This is an append-only log — events are never updated or deleted in-app
 * except via the retention cleanup job.
 *
 * Write path: Supabase (source of truth).
 * Read path:  Supabase (direct query).
 *
 * Note: critical/error events are written synchronously (they are rare and
 * must not be lost). Debug/info events are written asynchronously via a
 * background queue to avoid blocking request paths.
 */

import { createHash } from 'crypto';
import { getSupabaseClient } from '../../../db/supabaseClient';
import { logger } from '../../../utils/logger';
import type {
  SecurityAuditRecordInput,
  SecurityEventType,
  SecurityEventSeverity,
} from '../types';
import {
  SECURITY_EVENT_RETENTION_DAYS,
} from '../constants';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SecurityEventRow {
  id: string;
  event_type: SecurityEventType;
  severity: SecurityEventSeverity;
  actor_id: string | null;
  actor_role: string | null;
  ip_hash: string | null;
  correlation_id: string | null;
  request_id: string | null;
  session_id: string | null;
  subsystem: string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface InsertSecurityEvent {
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  actorId?: string | null;
  actorRole?: string | null;
  ipAddress?: string | null; // hashed before insert
  subsystem: string;
  message: string;
  metadata?: Record<string, unknown>;
  correlationId?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
}

export interface QuerySecurityEventsOptions {
  eventType?: SecurityEventType;
  severity?: SecurityEventSeverity;
  actorId?: string;
  subsystem?: string;
  correlationId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Hash an IP address before storing — privacy-preserving */
function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  try {
    return createHash('sha256').update(ip).digest('hex').slice(0, 16);
  } catch {
    return null;
  }
}

// ── Insert ─────────────────────────────────────────────────────────────────────

/**
 * Persist a security event to Supabase.
 *
 * Severity guide:
 *  - critical / error → written synchronously (must not be lost)
 *  - warning / info   → written asynchronously via fire-and-forget
 */
export async function insertSecurityEvent(
  event: InsertSecurityEvent
): Promise<SecurityEventRow | null> {
  const sb = getSupabaseClient();
  if (!sb) {
    // Fallback: log to console only — event will be lost on restart
    logger.warn('[SecurityEventRepo] Supabase unavailable, event dropped', {
      eventType: event.eventType,
      subsystem: event.subsystem,
    });
    return null;
  }

  const row = {
    id: crypto.randomUUID(),
    event_type: event.eventType,
    severity: event.severity,
    actor_id: event.actorId ?? null,
    actor_role: event.actorRole ?? null,
    ip_hash: hashIp(event.ipAddress),
    correlation_id: event.correlationId ?? null,
    request_id: event.requestId ?? null,
    session_id: event.sessionId ?? null,
    subsystem: event.subsystem,
    message: event.message,
    metadata: event.metadata ?? null,
    created_at: new Date().toISOString(),
  };

  try {
    const isHighSeverity =
      event.severity === 'critical' || event.severity === 'error';

    if (isHighSeverity) {
      // Synchronous – do not lose critical events
      const { data, error } = await sb
        .from('security_events')
        .insert(row)
        .select()
        .single();

      if (error) {
        logger.error({ err: error, row }, '[SecurityEventRepo] Failed to insert event');
        return null;
      }

      return deserializeRow(data);
    } else {
      // Fire-and-forget – don't block the request path for low-severity events
      sb.from('security_events').insert(row).then(({ error }) => {
        if (error) {
          logger.warn({ err: error, eventType: event.eventType },
            '[SecurityEventRepo] Async insert failed');
        }
      });

      // Return a synthetic row for callers that expect the inserted record
      return deserializeRow(row as Record<string, unknown>);
    }
  } catch (err) {
    logger.error({ err, eventType: event.eventType },
      '[SecurityEventRepo] Unexpected insert error');
    return null;
  }
}

// ── Query ─────────────────────────────────────────────────────────────────────

/**
 * Query recent security events with filters.
 * Supports pagination and time-range filtering.
 */
export async function querySecurityEvents(
  options: QuerySecurityEventsOptions = {}
): Promise<{ events: SecurityEventRow[]; total: number }> {
  const sb = getSupabaseClient();
  if (!sb) return { events: [], total: 0 };

  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  try {
    let query = sb
      .from('security_events')
      .select('*', { count: 'exact' });

    if (options.eventType)  query = query.eq('event_type', options.eventType);
    if (options.severity)   query = query.eq('severity', options.severity);
    if (options.actorId)     query = query.eq('actor_id', options.actorId);
    if (options.subsystem)  query = query.eq('subsystem', options.subsystem);
    if (options.correlationId) query = query.eq('correlation_id', options.correlationId);
    if (options.from)       query = query.gte('created_at', options.from.toISOString());
    if (options.to)         query = query.lte('created_at', options.to.toISOString());

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error({ err: error, options }, '[SecurityEventRepo] Query failed');
      return { events: [], total: 0 };
    }

    return {
      events: (data ?? []).map(deserializeRow),
      total: count ?? 0,
    };
  } catch (err) {
    logger.error({ err, options }, '[SecurityEventRepo] Unexpected query error');
    return { events: [], total: 0 };
  }
}

/**
 * Get a single security event by ID.
 */
export async function getSecurityEventById(
  id: string
): Promise<SecurityEventRow | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('security_events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return deserializeRow(data);
  } catch (err) {
    logger.warn({ err, id }, '[SecurityEventRepo] getSecurityEventById failed');
    return null;
  }
}

/**
 * Get all events for a correlation ID (full request trace).
 */
export async function getEventsByCorrelationId(
  correlationId: string
): Promise<SecurityEventRow[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('security_events')
      .select('*')
      .eq('correlation_id', correlationId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.warn({ err: error, correlationId }, '[SecurityEventRepo] getEventsByCorrelationId failed');
      return [];
    }

    return (data ?? []).map(deserializeRow);
  } catch (err) {
    return [];
  }
}

/**
 * Get security violations (error + critical severity).
 */
export async function getSecurityViolations(
  options: Omit<QuerySecurityEventsOptions, 'severity'>
): Promise<{ events: SecurityEventRow[]; total: number }> {
  return querySecurityEvents({
    ...options,
    severity: 'error' as SecurityEventSeverity,
  });
}

/**
 * Count events by severity (for dashboards).
 */
export async function getEventCountBySeverity(
  from?: Date,
  to?: Date
): Promise<Record<SecurityEventSeverity, number>> {
  const sb = getSupabaseClient();
  if (!sb) return { critical: 0, error: 0, warning: 0, info: 0, debug: 0 };

  try {
    let query = sb
      .from('security_events')
      .select('severity');

    if (from) query = query.gte('created_at', from.toISOString());
    if (to)   query = query.lte('created_at', to.toISOString());

    const { data, error } = await query;

    if (error) return { critical: 0, error: 0, warning: 0, info: 0, debug: 0 };

    const counts: Record<string, number> = { critical: 0, error: 0, warning: 0, info: 0, debug: 0 };
    for (const row of data ?? []) {
      const s = (row.severity as string) as SecurityEventSeverity;
      if (s in counts) counts[s]++;
    }

    return counts as Record<SecurityEventSeverity, number>;
  } catch {
    return { critical: 0, error: 0, warning: 0, info: 0, debug: 0 };
  }
}

// ── Deserialization ─────────────────────────────────────────────────────────────

function deserializeRow(raw: Record<string, unknown>): SecurityEventRow {
  return {
    id: raw.id as string,
    event_type: raw.event_type as SecurityEventType,
    severity: raw.severity as SecurityEventSeverity,
    actor_id: raw.actor_id as string | null,
    actor_role: raw.actor_role as string | null,
    ip_hash: raw.ip_hash as string | null,
    correlation_id: raw.correlation_id as string | null,
    request_id: raw.request_id as string | null,
    session_id: raw.session_id as string | null,
    subsystem: raw.subsystem as string,
    message: raw.message as string,
    metadata: raw.metadata as Record<string, unknown> | null,
    created_at: new Date(raw.created_at as string),
  };
}
