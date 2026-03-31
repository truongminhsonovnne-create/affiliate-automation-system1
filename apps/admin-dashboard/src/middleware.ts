/**
 * Admin Auth Middleware — Edge Runtime
 *
 * Protects admin routes at the edge before they reach the server.
 *
 * Layer 1 of 2: Authentication (HMAC signed session)
 * Layer 2: RBAC role check for privileged routes
 *
 * How auth works:
 *   1. Login sets cookie: admin_session_v2 = <base64url(payload)>.<base64url(HMAC-SHA256)>
 *   2. Middleware verifies HMAC → rejects tampered cookies
 *   3. Middleware checks expiry → rejects expired sessions
 *   4. Middleware checks SESSION_VERSION → enables instant global revocation
 *   5. For SUPER_ADMIN routes: decode role and check at edge level
 *   6. Server component (AdminRouteGuard) checks RBAC again for all routes
 *
 * The two-layer approach means:
 *   - Edge middleware blocks unauthenticated/tampered requests before they hit the server
 *   - Server-side guard enforces role-specific access
 *   - Both together prevent any bypass
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// =============================================================================
// Constants (must match session.ts)
// =============================================================================

const SESSION_COOKIE_NAME = 'admin_session_v2';
const SESSION_VERSION = parseInt(process.env.SESSION_VERSION ?? '1', 10);

const SESSION_SECRET = process.env.SESSION_SECRET ?? '';

// =============================================================================
// Role Constants (must match rbac.ts)
// =============================================================================

const ROLE_LEVEL: Record<string, number> = {
  readonly_observer: 1,
  operator: 2,
  admin: 3,
  super_admin: 4,
};

// =============================================================================
// Helpers (Edge-compatible: Web Crypto API)
// =============================================================================

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}

async function deriveKey(secret: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret + '-session-signing-v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  return new Uint8Array(hashBuffer);
}

async function verifySignature(
  payload: string,
  signatureB64Url: string,
  key: Uint8Array
): Promise<boolean> {
  try {
    const expectedSig = await hmacSha256(key, payload);

    // Decode provided signature from base64url
    let base64 = signatureB64Url.replaceAll('-', '+').replaceAll('_', '/');
    while (base64.length % 4) base64 += '=';
    const providedSigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    if (providedSigBytes.length !== expectedSig.length) return false;

    // Constant-time comparison
    let diff = 0;
    for (let i = 0; i < providedSigBytes.length; i++) {
      diff |= providedSigBytes[i] ^ expectedSig[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

interface SessionPayload {
  actorId: string;
  role: string;
  version: number;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Fully verify a session token and return the decoded payload.
 * Returns null if token is invalid, tampered, expired, or version-mismatched.
 */
async function verifyAndDecodeToken(token: string): Promise<SessionPayload | null> {
  if (!token || token.length < 80) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signatureB64] = parts;
  const key = await deriveKey(SESSION_SECRET);

  if (!(await verifySignature(payloadB64, signatureB64, key))) return null;

  try {
    let base64 = payloadB64.replaceAll('-', '+').replaceAll('_', '/');
    while (base64.length % 4) base64 += '=';
    const json = atob(base64);
    const payload = JSON.parse(json) as Partial<SessionPayload>;

    if (typeof payload.expiresAt !== 'number') return null;
    if (payload.expiresAt < Date.now()) return null;
    if (typeof payload.version !== 'number' || payload.version !== SESSION_VERSION) return null;

    // Validate required fields
    if (
      typeof payload.actorId !== 'string' ||
      typeof payload.role !== 'string' ||
      !payload.actorId
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Check if the user role meets the minimum required level.
 * Role is decoded from the already-verified token, so no additional signature check needed.
 */
function hasMinimumRoleLevel(userRole: string, requiredLevel: number): boolean {
  return (ROLE_LEVEL[userRole] ?? 0) >= requiredLevel;
}

// =============================================================================
// Route Definitions
// =============================================================================

// SUPER_ADMIN routes — must be checked at middleware level before hitting server
const SUPER_ADMIN_PREFIXES = [
  '/admin/settings',
  '/admin/audit',
  '/admin/dead-letters/delete',
  '/admin/workers/control',
];

// Paths that are always public (no auth required)
const PUBLIC_PREFIXES = [
  '/admin/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/_next',
  '/favicon',
  '/site.webmanifest',
];

// All /admin/* paths require authentication
const ADMIN_PREFIX = '/admin';

// =============================================================================
// Middleware Handler
// =============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — pass through without auth check
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // /api/auth/session — return JSON {authenticated:false} instead of redirecting
  // This prevents the /admin/login → /api/auth/session → redirect → /admin/login loop
  if (pathname === '/api/auth/session') {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? '';
    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }
    const payload = await verifyAndDecodeToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }
    return NextResponse.json({
      authenticated: true,
      user: { id: payload.actorId, role: payload.role },
    });
  }

  // All other admin paths — require auth
  if (!pathname.startsWith(ADMIN_PREFIX)) {
    return NextResponse.next();
  }

  // SEO headers
  const adminResponse = NextResponse.next();
  adminResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
  adminResponse.headers.set('X-Content-Type-Options', 'nosniff');

  // Auth check
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? '';
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const payload = await verifyAndDecodeToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Super admin RBAC
  if (SUPER_ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!hasMinimumRoleLevel(payload.role, ROLE_LEVEL['super_admin'])) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return adminResponse;
}

export const config = {
  matcher: ['/admin/:path*', '/api/auth/:path*'],
};
