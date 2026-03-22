/**
 * Security Layer - Internal Session Repository
 *
 * Production-grade session storage using:
 *  1. Redis  – hot path (every validated request hits this)
 *  2. Supabase – cold path (audit trail, slow validation fallback, revoke history)
 *
 * Write path: Redis (source of truth for validation speed) + Supabase (async).
 * Read path:  Redis → Supabase (only on Redis miss).
 *
 * The Redis layer uses TTL that matches token expiry, so memory is naturally
 * reclaimed. Supabase keeps full history for audit purposes.
 */

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from '../../../db/supabaseClient';
import { logger } from '../../../utils/logger';
import {
  storeSession,
  getSession,
  revokeSession,
  deleteSession,
  touchSession,
  getActiveSessionCount as getRedisSessionCount,
  type SessionRecord,
  hashToken,
} from '../auth/redisSessionStore';
import type { ActorSession, AccessRole } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InternalSessionRow {
  id: string;
  actor_id: string;
  actor_role: string;
  token_hash: string;
  status: 'active' | 'revoked' | 'expired';
  issued_at: Date;
  expires_at: Date;
  last_activity_at: Date;
  revoked_at: Date | null;
  revocation_reason: string | null;
  revoked_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface InsertInternalSession {
  actorId: string;
  actorRole: AccessRole;
  tokenHash: string;  // SHA-256 hash of the raw JWT token — never the plaintext
  expiresAt: Date;
  audience?: string;
  scope?: string[];
  metadata?: Record<string, unknown>;
}

export interface QueryInternalSessionsOptions {
  actorId?: string;
  status?: 'active' | 'revoked' | 'expired';
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

// ── Hashing ───────────────────────────────────────────────────────────────────

function tokenHash(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// ── Insert ─────────────────────────────────────────────────────────────────────

/**
 * Create a new session.
 *
 * 1. Hash token → store in Redis (TTL = token TTL + 5 min grace)
 * 2. Insert into Supabase (async, non-blocking for critical auth path)
 */
export async function insertInternalSession(
  input: InsertInternalSession
): Promise<InternalSessionRow> {
  const now = new Date();
  const hash = tokenHash(input.rawToken);
  const id = uuidv4();

  const row: InternalSessionRow = {
    id,
    actor_id: input.actorId,
    actor_role: input.actorRole,
    token_hash: hash,
    status: 'active',
    issued_at: now,
    expires_at: input.expiresAt,
    last_activity_at: now,
    revoked_at: null,
    revocation_reason: null,
    revoked_by: null,
    metadata: input.metadata ?? null,
    created_at: now,
    updated_at: now,
  };

  // Redis: hot-path write (synchronous — critical for auth)
  await storeSession({
    sessionId: id,
    actorId: input.actorId,
    role: input.actorRole,
    audience: input.audience ?? 'control-plane',
    scope: input.scope ?? [],
    issuedAt: now.getTime(),
    expiresAt: input.expiresAt.getTime(),
    lastActivityAt: now.getTime(),
    metadata: input.metadata,
  });

  // Supabase: cold-path write (fire-and-forget — audit trail only)
  persistSessionToSupabase(row).catch((err) =>
    logger.warn({ err, sessionId: id }, '[SessionRepo] Supabase insert failed')
  );

  return row;
}

// ── Get ───────────────────────────────────────────────────────────────────────

/**
 * Get session by ID.
 *
 * Read path: Redis (fast) → Supabase (slow fallback).
 */
export async function getInternalSession(
  id: string
): Promise<InternalSessionRow | null> {
  // Try Redis first
  const redis = await getSession(id);
  if (redis) {
    return redisToRow(redis);
  }

  // Supabase fallback
  return getSessionFromSupabase(id);
}

/**
 * Get session by token hash (for auth validation).
 *
 * This is the primary validation path used by token auth middleware.
 * First checks Redis, then falls back to Supabase if Redis is cold.
 */
export async function getInternalSessionByTokenHash(
  rawToken: string
): Promise<InternalSessionRow | null> {
  const hash = tokenHash(rawToken);

  // Try Redis — get by sessionId from token hash lookup in Supabase
  // (Redis stores by sessionId, not hash, so we need DB to resolve)
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('internal_sessions')
        .select('*')
        .eq('token_hash', hash)
        .eq('status', 'active')
        .maybeSingle();

      if (!error && data) {
        // Warm Redis cache for next time
        const row = deserializeRow(data);
        await storeSession(rowToRedis(row)).catch(() => {});
        return row;
      }
    } catch (err) {
      logger.warn({ err, hash: hash.slice(0, 8) }, '[SessionRepo] DB lookup failed');
    }
  }

  return null;
}

/**
 * Check if a token hash has been revoked.
 * Queries Redis revocation list first, then Supabase.
 */
export async function isTokenRevoked(rawToken: string): Promise<boolean> {
  const hash = tokenHash(rawToken);

  // Redis revocation list
  const { isTokenRevoked: redisIsRevoked } = await import('../auth/redisSessionStore');
  if (await redisIsRevoked(hash)) return true;

  // Supabase check
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('internal_sessions')
        .select('id')
        .eq('token_hash', hash)
        .eq('status', 'revoked')
        .maybeSingle();

      if (!error && data) return true;
    } catch { /* ignore */ }
  }

  return false;
}

// ── Revoke ─────────────────────────────────────────────────────────────────────

/**
 * Revoke a session.
 *
 * 1. Delete from Redis (immediately invalidates)
 * 2. Update Supabase (async)
 */
export async function revokeInternalSession(
  id: string,
  revokedBy?: string,
  reason?: string
): Promise<boolean> {
  // Get the row first to retrieve token hash
  const row = await getInternalSessionFromSupabase(id);
  if (!row) return false;

  const hash = row.token_hash;

  // Redis: immediately invalidate
  await revokeSession(id, hash, reason);

  // Supabase: mark as revoked (async)
  persistRevocation(id, revokedBy, reason).catch((err) =>
    logger.warn({ err, sessionId: id }, '[SessionRepo] Supabase revocation failed')
  );

  return true;
}

/**
 * Revoke all sessions for an actor.
 */
export async function revokeAllSessionsForActor(
  actorId: string,
  revokedBy?: string,
  reason?: string
): Promise<number> {
  const sb = getSupabaseClient();
  if (!sb) return 0;

  try {
    const { data, error } = await sb
      .from('internal_sessions')
      .select('id, token_hash')
      .eq('actor_id', actorId)
      .eq('status', 'active');

    if (error || !data) return 0;

    let revoked = 0;
    for (const session of data) {
      await revokeSession(session.id, session.token_hash, reason);
      persistRevocation(session.id, revokedBy, reason).catch(() => {});
      revoked++;
    }

    return revoked;
  } catch (err) {
    logger.warn({ err, actorId }, '[SessionRepo] revokeAllSessionsForActor failed');
    return 0;
  }
}

// ── Query ─────────────────────────────────────────────────────────────────────

export async function queryInternalSessions(
  options: QueryInternalSessionsOptions = {}
): Promise<{ sessions: InternalSessionRow[]; total: number }> {
  const sb = getSupabaseClient();
  if (!sb) return { sessions: [], total: 0 };

  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  try {
    let query = sb
      .from('internal_sessions')
      .select('*', { count: 'exact' });

    if (options.actorId)  query = query.eq('actor_id', options.actorId);
    if (options.status)   query = query.eq('status', options.status);
    if (options.from)     query = query.gte('issued_at', options.from.toISOString());
    if (options.to)       query = query.lte('issued_at', options.to.toISOString());

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error({ err: error, options }, '[SessionRepo] query failed');
      return { sessions: [], total: 0 };
    }

    return {
      sessions: (data ?? []).map(deserializeRow),
      total: count ?? 0,
    };
  } catch (err) {
    logger.error({ err, options }, '[SessionRepo] Unexpected query error');
    return { sessions: [], total: 0 };
  }
}

export async function touchInternalSession(id: string): Promise<boolean> {
  const ok = await touchSession(id);
  if (ok) {
    // Also touch in Supabase (async)
    persistActivityTouch(id).catch(() => {});
  }
  return ok;
}

export async function cleanupExpiredSessions(): Promise<number> {
  const sb = getSupabaseClient();
  if (!sb) return 0;

  try {
    const { data, error } = await sb
      .from('internal_sessions')
      .select('id')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    if (error || !data) return 0;

    let updated = 0;
    for (const row of data) {
      await sb
        .from('internal_sessions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', row.id);
      updated++;
    }

    return updated;
  } catch (err) {
    logger.warn({ err }, '[SessionRepo] cleanupExpiredSessions failed');
    return 0;
  }
}

export async function getActiveSessionCountForActor(actorId: string): Promise<number> {
  const sb = getSupabaseClient();
  if (!sb) return 0;

  try {
    const { count, error } = await sb
      .from('internal_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('actor_id', actorId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
}

export async function getSessionStatistics(): Promise<{
  total: number;
  active: number;
  revoked: number;
  expired: number;
  redisActive: number;
}> {
  const sb = getSupabaseClient();
  let stats = { total: 0, active: 0, revoked: 0, expired: 0 };
  const redisActive = await getRedisSessionCount();

  if (sb) {
    try {
      const { data, error } = await sb
        .from('internal_sessions')
        .select('status');

      if (!error && data) {
        for (const row of data) {
          stats.total++;
          const s = row.status as string;
          if (s === 'active') stats.active++;
          else if (s === 'revoked') stats.revoked++;
          else stats.expired++;
        }
      }
    } catch { /* ignore */ }
  }

  return { ...stats, redisActive };
}

// ── Supabase Helpers ─────────────────────────────────────────────────────────

async function persistSessionToSupabase(row: InternalSessionRow): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;

  await sb.from('internal_sessions').insert({
    id: row.id,
    actor_id: row.actor_id,
    actor_role: row.actor_role,
    token_hash: row.token_hash,
    status: row.status,
    issued_at: row.issued_at.toISOString(),
    expires_at: row.expires_at.toISOString(),
    last_activity_at: row.last_activity_at.toISOString(),
    revoked_at: null,
    revocation_reason: null,
    revoked_by: null,
    metadata: row.metadata,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  });
}

async function persistRevocation(
  id: string,
  revokedBy?: string,
  reason?: string
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;

  await sb
    .from('internal_sessions')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy ?? null,
      revocation_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

async function persistActivityTouch(id: string): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;

  await sb
    .from('internal_sessions')
    .update({
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

async function getSessionFromSupabase(id: string): Promise<InternalSessionRow | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  const { data, error } = await sb
    .from('internal_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return deserializeRow(data);
}

async function getInternalSessionFromSupabase(id: string): Promise<InternalSessionRow | null> {
  return getSessionFromSupabase(id);
}

// ── Row Serialization ────────────────────────────────────────────────────────

function deserializeRow(raw: Record<string, unknown>): InternalSessionRow {
  return {
    id: raw.id as string,
    actor_id: raw.actor_id as string,
    actor_role: raw.actor_role as string,
    token_hash: raw.token_hash as string,
    status: raw.status as 'active' | 'revoked' | 'expired',
    issued_at: new Date(raw.issued_at as string),
    expires_at: new Date(raw.expires_at as string),
    last_activity_at: new Date(raw.last_activity_at as string),
    revoked_at: raw.revoked_at ? new Date(raw.revoked_at as string) : null,
    revocation_reason: raw.revocation_reason as string | null,
    revoked_by: raw.revoked_by as string | null,
    metadata: raw.metadata as Record<string, unknown> | null,
    created_at: new Date(raw.created_at as string),
    updated_at: new Date(raw.updated_at as string),
  };
}

function redisToRow(redis: SessionRecord): InternalSessionRow {
  return {
    id: redis.sessionId,
    actor_id: redis.actorId,
    actor_role: redis.role,
    token_hash: '', // not stored in Redis
    status: Date.now() > redis.expiresAt ? 'expired' : 'active',
    issued_at: new Date(redis.issuedAt),
    expires_at: new Date(redis.expiresAt),
    last_activity_at: new Date(redis.lastActivityAt),
    revoked_at: null,
    revocation_reason: null,
    revoked_by: null,
    metadata: redis.metadata ?? null,
    created_at: new Date(redis.issuedAt),
    updated_at: new Date(redis.lastActivityAt),
  };
}

function rowToRedis(row: InternalSessionRow): SessionRecord {
  return {
    sessionId: row.id,
    actorId: row.actor_id,
    role: row.actor_role,
    audience: 'control-plane',
    scope: [],
    issuedAt: row.issued_at.getTime(),
    expiresAt: row.expires_at.getTime(),
    lastActivityAt: row.last_activity_at.getTime(),
    metadata: row.metadata ?? undefined,
  };
}
