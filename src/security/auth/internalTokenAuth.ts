/**
 * Security Layer - Internal Token Authentication
 *
 * Production-grade internal authentication for control plane / backend.
 *
 * Storage (dual-layer):
 *  1. Redis    – hot path for session validation (TTL-managed)
 *  2. Supabase – cold path for audit trail and slow validation fallback
 *
 * Token format: base64url(header).base64url(payload).base64url(signature)
 *   where signature = HMAC-SHA256(header.payload, INTERNAL_AUTH_SECRET)
 *
 * The token itself is stateless (contains all needed claims). The session
 * record in Redis/Supabase enables revocation and activity tracking.
 */

import { randomUUID } from 'crypto';
import { createHmac, timingSafeEqual } from 'crypto';
import type {
  ActorIdentity,
  ActorSession,
  InternalAuthContext,
  TrustedExecutionContext,
} from '../types';
import { SECURITY_DOMAINS, ACCESS_ROLES } from '../types';
import {
  getServerOnlySecret,
  getTokenTTLMinutes,
  assertServerRuntimeForSecretAccess,
} from '../config/secureEnv';
import { getSecurityConfig } from '../config/secureEnv';
import { CLOCK_SKEW_SECONDS } from '../constants';
import {
  storeSession,
  storeSessionWithToken,
  validateSession,
  deleteSession,
  hashToken,
  type SessionRecord,
} from './redisSessionStore';
import {
  insertInternalSession,
  getInternalSessionByTokenHash,
  revokeInternalSession as revokeSessionInDb,
  touchInternalSession,
  getActiveSessionCount as getSessionCount,
  cleanupExpiredSessions,
} from '../repositories/internalSessionRepository';
import { insertSecurityEvent } from '../repositories/securityEventRepository';
import { logger } from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface InternalTokenPayload {
  jti: string;        // Session ID
  sub: string;         // Actor ID
  role: string;       // Actor role
  aud: string;        // Token audience
  scope: string[];
  iat: number;         // Issued at (Unix seconds)
  exp: number;         // Expiration (Unix seconds)
}

export interface TokenGenerationOptions {
  actor: ActorIdentity;
  audience?: string;
  scope?: string[];
  ttlMinutes?: number;
  metadata?: Record<string, unknown>;
}

export interface TokenValidationOptions {
  audience: string;
  requiredScope?: string[];
  allowExpired?: boolean;
}

// =============================================================================
// TOKEN GENERATION
// =============================================================================

/**
 * Issue a new internal session token.
 *
 * Steps:
 * 1. Generate session ID and compute expiry.
 * 2. Create session record → Redis (hot) + Supabase (cold).
 * 3. Build and sign the stateless token.
 *
 * Returns the raw token (must be transmitted securely) plus the session metadata.
 */
export async function issueInternalSession(
  input: TokenGenerationOptions
): Promise<{
  token: string;
  session: ActorSession;
  expiresAt: Date;
}> {
  assertServerRuntimeForSecretAccess();

  const { actor, audience = 'control-plane', scope = [], ttlMinutes, metadata } = input;

  const ttl = ttlMinutes ?? getTokenTTLMinutes();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl * 60 * 1000);
  const sessionId = randomUUID();

  const actorSession: ActorSession = {
    sessionId,
    actorId: actor.id,
    role: actor.role,
    issuedAt: now,
    expiresAt,
    lastActivityAt: now,
    metadata,
  };

  // Store in Redis + Supabase (both async; Redis is critical for auth speed)
  // Token is generated below; hash it for DB storage (never store plaintext)
  const token = encodeToken(payload, getInternalAuthSecret());
  const tokenHash = hashToken(token);

  await insertInternalSession({
    actorId: actor.id,
    actorRole: actor.role,
    tokenHash, // hashed before storage
    expiresAt,
    audience,
    scope,
    metadata,
  });

  // Build payload (without the raw token – we store only the hash)
  const payload: InternalTokenPayload = {
    jti: sessionId,
    sub: actor.id,
    role: actor.role,
    aud: audience,
    scope,
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000),
  };

  const token = encodeToken(payload, getInternalAuthSecret());

  // Store session in Redis (for fast validation) — includes token hash for revoke-by-token
  await storeSessionWithToken(token, {
    sessionId,
    actorId: actor.id,
    role: actor.role,
    audience,
    scope,
    issuedAt: now.getTime(),
    expiresAt: expiresAt.getTime(),
    lastActivityAt: now.getTime(),
    metadata,
  });

  logger.debug({ sessionId, actorId: actor.id, audience }, 'Internal session issued');

  return { token, session: actorSession, expiresAt };
}

// =============================================================================
// TOKEN ENCODING / DECODING
// =============================================================================

function encodeToken(payload: InternalTokenPayload, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${payloadEncoded}`).digest('base64url');
  return `${header}.${payloadEncoded}.${signature}`;
}

function decodeToken(token: string): InternalTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload as InternalTokenPayload;
  } catch {
    return null;
  }
}

function verifySignature(token: string, secret: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    const sigBuf = Buffer.from(parts[2]);
    const expBuf = Buffer.from(expected);
    return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

// =============================================================================
// TOKEN VALIDATION
// =============================================================================

/**
 * Validate an internal session token (async — reads from Redis).
 *
 * Validation steps:
 * 1. Decode and verify token signature.
 * 2. Check expiry (with clock-skew tolerance).
 * 3. Check audience and scope.
 * 4. Validate session in Redis (revocation + expiry check).
 */
export async function validateInternalSession(
  token: string,
  options: TokenValidationOptions
): Promise<{
  valid: boolean;
  payload?: InternalTokenPayload;
  session?: ActorSession;
  error?: string;
}> {
  assertServerRuntimeForSecretAccess();

  const { audience, requiredScope = [], allowExpired = false } = options;
  const secret = getInternalAuthSecret();

  // 1. Decode
  const payload = decodeToken(token);
  if (!payload) {
    return { valid: false, error: 'Invalid token format' };
  }

  // 2. Verify signature
  if (!verifySignature(token, secret)) {
    await logSecurityEvent('auth_invalid_token', 'warning', undefined,
      `Invalid signature for actor ${payload.sub}`);
    return { valid: false, error: 'Invalid token signature' };
  }

  // 3. Check audience
  if (payload.aud !== audience) {
    return { valid: false, error: 'Invalid token audience' };
  }

  // 4. Check expiry (with clock-skew tolerance)
  const now = Math.floor(Date.now() / 1000);
  const clockSkew = CLOCK_SKEW_SECONDS;
  if (!allowExpired && payload.exp < now - clockSkew) {
    return { valid: false, error: 'Token expired' };
  }

  // 5. Check scope
  if (requiredScope.length > 0) {
    const hasScope = requiredScope.every((s) => payload.scope.includes(s));
    if (!hasScope) {
      return { valid: false, error: 'Insufficient scope' };
    }
  }

  // 6. Validate session in Redis (revocation check + expiry confirmation)
  const sessionResult = await validateSession(payload.jti);
  if (!sessionResult.valid) {
    return { valid: false, error: sessionResult.error ?? 'Session invalid' };
  }

  const redis = sessionResult.session!;

  // Touch session to refresh TTL (async, don't block response)
  touchSession(payload.jti).catch(() => {});

  const actorSession: ActorSession = {
    sessionId: redis.sessionId,
    actorId: redis.actorId,
    role: redis.role,
    issuedAt: new Date(redis.issuedAt),
    expiresAt: new Date(redis.expiresAt),
    lastActivityAt: new Date(redis.lastActivityAt),
    metadata: redis.metadata,
  };

  return { valid: true, payload, session: actorSession };
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Revoke an internal session immediately.
 */
export async function revokeInternalSession(sessionId: string): Promise<boolean> {
  assertServerRuntimeForSecretAccess();
  return revokeSessionInDb(sessionId, undefined, 'User logout');
}

/**
 * Get session by ID.
 */
export async function getInternalSession(sessionId: string): Promise<ActorSession | null> {
  const { getInternalSession: getSession } = await import('../repositories/internalSessionRepository');
  const row = await getSession(sessionId);
  if (!row) return null;

  return {
    sessionId: row.id,
    actorId: row.actor_id,
    role: row.actor_role,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    lastActivityAt: row.last_activity_at,
    metadata: row.metadata ?? undefined,
  };
}

/**
 * Cleanup expired sessions (call from a scheduled job, not per-request).
 */
export async function cleanupExpiredSessionsJob(): Promise<number> {
  const count = await cleanupExpiredSessions();
  if (count > 0) {
    logger.info({ count }, 'Expired sessions cleaned up');
  }
  return count;
}

// =============================================================================
// REQUEST AUTHENTICATION
// =============================================================================

export interface RequestContext {
  headers: Record<string, string | undefined>;
  ip?: string;
  method: string;
  path: string;
}

function extractBearerToken(ctx: RequestContext): string | null {
  const auth = ctx.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const internal = ctx.headers['x-internal-token'];
  if (internal) return internal;
  return null;
}

/**
 * Authenticate an internal request (async).
 *
 * Convenience wrapper around validateInternalSession for HTTP handlers.
 */
export async function authenticateInternalRequest(
  ctx: RequestContext,
  options?: {
    audience?: string;
    requiredScope?: string[];
    allowWorkerAuth?: boolean;
  }
): Promise<{
  authenticated: boolean;
  context?: InternalAuthContext;
  error?: string;
}> {
  const config = getSecurityConfig();
  const audience = options?.audience ?? 'control-plane';

  const token = extractBearerToken(ctx);
  if (!token) {
    return { authenticated: false, error: 'No token provided' };
  }

  const result = await validateInternalSession(token, {
    audience,
    requiredScope: options?.requiredScope,
    allowExpired: false,
  });

  if (!result.valid || !result.session) {
    await logSecurityEvent('auth_failure', 'warning', undefined,
      `Auth failed: ${result.error}`, ctx.headers['x-correlation-id']);
    return { authenticated: false, error: result.error };
  }

  await logSecurityEvent('auth_success', 'info', {
    id: result.session.actorId,
    role: result.session.role,
  }, 'Internal auth success', ctx.headers['x-correlation-id']);

  const execCtx: TrustedExecutionContext = {
    domain: SECURITY_DOMAINS.CONTROL_PLANE,
    isServerEnvironment: true,
    isWorkerEnvironment: false,
    isControlPlane: true,
    environment: config.environment,
  };

  const actor: ActorIdentity = {
    id: result.session.actorId,
    name: result.session.actorId,
    role: result.session.role,
    capabilities: [result.session.role as any],
  };

  return {
    authenticated: true,
    context: {
      actor,
      session: result.session,
      context: execCtx,
      authenticatedAt: new Date(),
      tokenAudience: audience,
      tokenScope: result.payload?.scope,
    },
  };
}

// =============================================================================
// SECURITY EVENT LOGGING (fire-and-forget, never blocks auth path)
// =============================================================================

type SecuritySeverity = 'critical' | 'error' | 'warning' | 'info' | 'debug';

async function logSecurityEvent(
  eventType: string,
  severity: SecuritySeverity,
  actor: { id: string; role: string } | undefined,
  message: string,
  correlationId?: string
): Promise<void> {
  insertSecurityEvent({
    eventType: eventType as any,
    severity,
    actorId: actor?.id,
    actorRole: actor?.role,
    subsystem: 'authentication',
    message,
    correlationId: correlationId ?? null,
  }).catch((err) => {
    logger.warn({ err }, '[Auth] Failed to log security event');
  });
}

// =============================================================================
// INTERNAL AUTH SECRET
// =============================================================================

function getInternalAuthSecret(): string {
  const secret = getServerOnlySecret('INTERNAL_AUTH_SECRET');
  if (!secret) {
    throw new Error('INTERNAL_AUTH_SECRET is not configured — set it in environment variables');
  }
  return secret;
}
