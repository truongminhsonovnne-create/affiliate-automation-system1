/**
 * Admin Session Management - Production-Grade
 *
 * Replaces raw JSON cookie sessions with HMAC-SHA256 signed tokens.
 *
 * HOW IT WORKS:
 *   The cookie value is: <base64url(payload)>.<base64url(signature)>
 *   where:
 *     payload = base64url(JSON.stringify({ actorId, role, version, issuedAt, expiresAt }))
 *     signature = HMAC-SHA256(derived_key, payload)
 *     derived_key = SHA256(SESSION_SECRET)
 *
 * SECURITY GUARANTEES:
 *   - Integrity: Client cannot forge/tamper session payload (HMAC verification fails)
 *   - Expiry: Expired sessions are rejected even if signature is valid
 *   - No plaintext JSON in cookie: payload is base64url-encoded
 *   - Role is NEVER trusted from client: always resolved server-side from actorId
 *   - Session version enables instant revocation without a store
 *   - Constant-time HMAC comparison prevents timing attacks
 *
 * SESSION REVOCATION:
 *   - Increment SESSION_VERSION in env to revoke ALL existing sessions
 *   - Individual revocation: not supported (stateless), use Redis for that
 */

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { Role } from './rbac';

// =============================================================================
// Constants
// =============================================================================

const SESSION_COOKIE_NAME = 'admin_session_v2'; // rename to force expiry of old cookies
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;   // 8 hours
const SESSION_VERSION = parseInt(process.env.SESSION_VERSION ?? '1', 10);

// The minimum number of characters a valid session token must have
// (base64url payload ≈ 60 chars + dot + base64url signature ≈ 44 chars)
const MIN_TOKEN_LENGTH = 80;

// =============================================================================
// Types
// =============================================================================

/** Internal session data (never sent to client as-is) */
interface SessionPayload {
  actorId: string;
  role: Role;
  version: number;
  issuedAt: number;   // Unix ms timestamp
  expiresAt: number;  // Unix ms timestamp
}

/** Server-side session with derived fields */
export interface AdminSession {
  actorId: string;
  role: Role;
  issuedAt: number;
  expiresAt: number;
  sessionId: string; // truncated hash for audit logs — not the token itself
}

// =============================================================================
// Role Resolution (server-side only)
// =============================================================================

/** Maps usernames to roles. Role is NEVER read from the client cookie. */
const USER_ROLES: Record<string, Role> = {
  admin: 'admin',
  operator: 'operator',
  observer: 'readonly_observer',
  superadmin: 'super_admin',
} as const;

export function resolveRole(actorId: string): Role {
  return USER_ROLES[actorId] ?? 'readonly_observer';
}

// =============================================================================
// Session Token (De)serialization
// =============================================================================

/**
 * Derive a fixed-length key from SESSION_SECRET via SHA-256.
 * HMAC-SHA256 requires a fixed-length key; hashing the secret gives 32 bytes.
 */
function getSigningKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: SESSION_SECRET is not set. ' +
        'Generate one with: openssl rand -hex 32. ' +
        'The server cannot start without a session signing secret.'
    );
  }
  if (secret.length < 32) {
    throw new Error(
      `FATAL: SESSION_SECRET is too short (${secret.length} chars). ` +
        'Minimum 32 characters required. Generate: openssl rand -hex 32'
    );
  }
  return createHmac('sha256', secret).update('session-signing-v1').digest();
}

/**
 * Create HMAC-SHA256 signature of the payload.
 */
function signPayload(payload: string): string {
  const key = getSigningKey();
  return createHmac('sha256', key).update(payload).digest('base64url');
}

/**
 * Verify HMAC signature using constant-time comparison.
 * Returns true only if the signature exactly matches.
 */
function verifySignature(payload: string, signature: string): boolean {
  const expected = signPayload(payload);
  // Use timingSafeEqual only for equal-length strings
  // If lengths differ, constant-time comparison still matters
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Encode session payload to a signed token string.
 * Format: <base64url(JSON)>
 */
function encodeSession(session: SessionPayload): string {
  const json = JSON.stringify(session);
  // Use replaceAll for + and / to make it URL-safe base64
  const base64 = Buffer.from(json, 'utf8').toString('base64').replaceAll('+', '-').replaceAll('/', '_');
  return base64;
}

/**
 * Decode and verify a signed token string back to a session payload.
 * Returns null if token is invalid, tampered, or malformed.
 */
function decodeSession(token: string): SessionPayload | null {
  try {
    // Restore base64 padding
    const base64 = token.replaceAll('-', '+').replaceAll('_', '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as Partial<SessionPayload>;

    // Validate required fields exist and have correct types
    if (
      typeof parsed.actorId !== 'string' ||
      typeof parsed.role !== 'string' ||
      typeof parsed.version !== 'number' ||
      typeof parsed.issuedAt !== 'number' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }

    return parsed as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a signed token string (integrity + expiry check).
 * Returns the payload if valid, null if tampered or expired.
 */
function verifyToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signatureB64] = parts;

  // Step 1: Reconstruct and verify HMAC signature
  if (!verifySignature(payloadB64, signatureB64)) {
    // Log but don't expose what was wrong
    return null;
  }

  // Step 2: Decode the payload
  const payload = decodeSession(payloadB64);
  if (!payload) return null;

  // Step 3: Check expiry
  if (payload.expiresAt < Date.now()) return null;

  // Step 4: Check session version (allows instant revocation)
  if (payload.version !== SESSION_VERSION) return null;

  return payload;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get the current session from the signed cookie.
 * Returns null if not authenticated, token invalid, or expired.
 *
 * The role is ALWAYS resolved server-side from the username —
 * the role stored in the cookie payload is IGNORED for authorization decisions.
 */
export async function getSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!rawToken || rawToken.length < MIN_TOKEN_LENGTH) {
      return null;
    }

    const payload = verifyToken(rawToken);
    if (!payload) {
      return null;
    }

    // Re-resolve role server-side — never trust the role from the cookie payload
    const role = resolveRole(payload.actorId);

    // Derive a deterministic session ID for audit logging (not the actual token)
    const sessionId = createHmac('sha256', getSigningKey())
      .update(rawToken)
      .digest('hex')
      .substring(0, 16);

    return {
      actorId: payload.actorId,
      role,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
      sessionId,
    };
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated (server-side)
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Set a new signed session cookie.
 * The role in the payload is included but will be IGNORED on read —
 * it's only used as a hint for the initial set; the real role always comes
 * from resolveRole().
 */
export async function setSession(
  actorId: string,
  options?: { maxAgeSeconds?: number }
): Promise<void> {
  const now = Date.now();
  const maxAge = options?.maxAgeSeconds ?? SESSION_MAX_AGE_SECONDS;
  const role = resolveRole(actorId);

  const payload: SessionPayload = {
    actorId,
    role,
    version: SESSION_VERSION,
    issuedAt: now,
    expiresAt: now + maxAge * 1000,
  };

  const payloadB64 = encodeSession(payload);
  const signatureB64 = signPayload(payloadB64);
  const token = `${payloadB64}.${signatureB64}`;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/',
    // Do NOT set domain unless explicitly configured
  });
}

/**
 * Clear the session cookie (logout).
 * Uses maxAge=0 to immediately invalidate.
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}

/**
 * Get current user role from verified session.
 * Returns null if not authenticated.
 */
export async function getUserRole(): Promise<Role | null> {
  const session = await getSession();
  return session?.role ?? null;
}

/**
 * Get the actor ID from the verified session.
 */
export async function getActorId(): Promise<string | null> {
  const session = await getSession();
  return session?.actorId ?? null;
}

/**
 * Get the truncated session ID for audit logging.
 */
export async function getSessionId(): Promise<string | null> {
  const session = await getSession();
  return session?.sessionId ?? null;
}

// Re-export
export { hasRole, hasPermission, permissions, getAccessibleRoutes as getAccessibleRoutesFromRbac } from './rbac';
export type { Role };
