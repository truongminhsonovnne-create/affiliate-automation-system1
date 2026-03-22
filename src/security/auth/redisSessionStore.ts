/**
 * Security Layer — Redis Session Store
 *
 * Hot-path storage for internal session validation.
 *
 * Architecture:
 *  ┌─────────────────────────────────────────────────────┐
 *  │                    Redis (hot)                       │
 *  │  session:{sessionId} → { actorId, role, expires }   │
 *  │  TTL = token TTL + 5 min grace period              │
 *  │  Active session validation (every request)           │
 *  └──────────────────────────┬──────────────────────────┘
 *                             │ on write / cleanup
 *                             ▼
 *  ┌─────────────────────────────────────────────────────┐
 *  │                  Supabase (cold)                     │
 *  │  internal_sessions table                            │
 *  │  Full audit trail + revoke history                 │
 *  │  Used when Redis miss (slow path)                  │
 *  └─────────────────────────────────────────────────────┘
 *
 * Key design:
 *  - session:{id}           – main session data (TTL managed)
 *  - revoked:{tokenHash}   – revoked token lookup (TTL = 24h after revocation)
 *
 * Security:
 *  - Only SHA-256 hashes stored, never raw tokens.
 *  - TTL on revocation keys prevents indefinite memory growth.
 */

import { createHash } from 'crypto';
import { getRedisClient } from '../../voucherEngine/redis/redisClient';
import { logger } from '../../utils/logger';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionRecord {
  sessionId: string;
  tokenHash: string;  // SHA-256 of raw token — enables revoke-by-token lookup
  actorId: string;
  role: string;
  audience: string;
  scope: string[];
  issuedAt: number;   // Unix ms
  expiresAt: number; // Unix ms
  lastActivityAt: number; // Unix ms
  metadata?: Record<string, unknown>;
}

export interface SessionValidationResult {
  valid: boolean;
  session?: SessionRecord;
  error?: string;
}

// ── Key builders ─────────────────────────────────────────────────────────────

const SESSION_KEY_PREFIX = 'security:session:';
const REVOKED_KEY_PREFIX = 'security:revoked:';
const SESSION_TTL_GRACE_SECONDS = 300; // 5 min grace on top of token TTL

function sessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

function revokedKey(tokenHash: string): string {
  return `${REVOKED_KEY_PREFIX}${tokenHash}`;
}

// ── Token hash ────────────────────────────────────────────────────────────────

/** SHA-256 hash of a token – what we actually store in Redis/DB */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

// ── Session operations ─────────────────────────────────────────────────────────

/**
 * Store a new session in Redis.
 * TTL is calculated from expiresAt with a grace period.
 */
export async function storeSession(
  session: SessionRecord
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const key = sessionKey(session.sessionId);
  // Floor remaining time at 0 before adding grace — an expired session should
  // still get the grace period (not a reduced TTL from the negative delta).
  const remainingSeconds = Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000));
  const ttlSeconds = Math.max(
    remainingSeconds + SESSION_TTL_GRACE_SECONDS,
    1
  );

  try {
    await client.setex(key, ttlSeconds, JSON.stringify(session));
  } catch (err) {
    logger.warn({ err, sessionId: session.sessionId }, '[SessionStore] Failed to store session');
  }
}

/**
 * Store a new session using raw token (hashes automatically).
 */
export async function storeSessionWithToken(
  rawToken: string,
  session: Omit<SessionRecord, 'tokenHash'>
): Promise<void> {
  return storeSession({
    ...session,
    tokenHash: hashToken(rawToken),
  });
}

/**
 * Retrieve a session from Redis.
 * Returns null on miss or if the token is revoked.
 */
export async function getSession(
  sessionId: string
): Promise<SessionRecord | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const raw = await client.get(sessionKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as SessionRecord;
  } catch (err) {
    logger.warn({ err, sessionId }, '[SessionStore] Failed to get session');
    return null;
  }
}

/**
 * Validate a session: checks existence + expiry.
 * Returns the session record if valid, null otherwise.
 */
export async function validateSession(
  sessionId: string
): Promise<SessionValidationResult> {
  const session = await getSession(sessionId);

  if (!session) {
    return { valid: false, error: 'Session not found' };
  }

  if (Date.now() > session.expiresAt) {
    return { valid: false, error: 'Session expired' };
  }

  return { valid: true, session };
}

/**
 * Touch a session – update lastActivityAt and refresh TTL.
 * Called on every authenticated request to keep sessions alive.
 */
export async function touchSession(
  sessionId: string
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const raw = await client.get(sessionKey(sessionId));
    if (!raw) return false;

    const session = JSON.parse(raw) as SessionRecord;

    // Don't touch expired sessions
    if (Date.now() > session.expiresAt) return false;

    session.lastActivityAt = Date.now();

    const remainingMs = session.expiresAt - Date.now();
    const ttlSeconds = Math.max(
      Math.ceil(remainingMs / 1000) + SESSION_TTL_GRACE_SECONDS,
      1
    );

    await client.setex(sessionKey(sessionId), ttlSeconds, JSON.stringify(session));
    return true;
  } catch (err) {
    logger.warn({ err, sessionId }, '[SessionStore] Failed to touch session');
    return false;
  }
}

/**
 * Revoke a session in Redis.
 *
 * Two-step:
 *  1. Delete the session key  – immediately invalidates the session
 *  2. Set a revoked:{hash} key with TTL – enables token hash lookup for
 *     token-reuse detection (prevents re-issuing the same token)
 *
 * The revocation record expires after 24h (long enough for audit, short
 * enough to not accumulate indefinitely).
 */
export async function revokeSession(
  sessionId: string,
  tokenHash: string,
  reason?: string
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const sessionKey_ = sessionKey(sessionId);
  const revokedKey_ = revokedKey(tokenHash);
  const REVOKED_TTL = 86400; // 24 hours

  try {
    // Delete main session
    await client.del(sessionKey_);

    // Set revoked marker with reason
    await client.setex(
      revokedKey_,
      REVOKED_TTL,
      JSON.stringify({ sessionId, reason, revokedAt: Date.now() })
    );
  } catch (err) {
    logger.warn({ err, sessionId }, '[SessionStore] Failed to revoke session');
  }
}

/**
 * Check if a token hash is on the revocation list.
 * Used as a fallback when a session lookup misses (e.g., Redis restarted).
 */
export async function isTokenRevoked(tokenHash: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const exists = await client.exists(revokedKey(tokenHash));
    return exists === 1;
  } catch (err) {
    logger.warn({ err, tokenHash: tokenHash.slice(0, 8) + '...' }, '[SessionStore] Failed to check revocation');
    return false;
  }
}

/**
 * Delete a session (non-revocation path, e.g., explicit logout).
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.del(sessionKey(sessionId));
  } catch (err) {
    logger.warn({ err, sessionId }, '[SessionStore] Failed to delete session');
  }
}

/**
 * Count active sessions (for health / monitoring).
 */
export async function getActiveSessionCount(): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;

  try {
    const keys = await client.keys(`${SESSION_KEY_PREFIX}*`);
    return keys.length;
  } catch (err) {
    logger.warn({ err }, '[SessionStore] Failed to count sessions');
    return 0;
  }
}
