/**
 * Admin Login API
 *
 * Handles admin authentication with production-grade security:
 *   - bcrypt password verification (constant-time comparison)
 *   - HMAC-signed session tokens (tamper-proof cookies)
 *   - Rate limiting (5 attempts / 15 min window, 30 min block)
 *   - Structured audit logging (no secrets logged)
 *   - Role resolved server-side only (never from client)
 *
 * FAIL-CLOSED: Invalid credentials = no session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { setSession, resolveRole } from '@/lib/auth/session';
import { isRateLimited, recordFailedAttempt, recordSuccess } from '@/lib/rateLimit';
import { verifyPassword } from '@/lib/auth/password';
import { logLoginSuccess, logLoginFailure, logRateLimited } from '@/lib/auth/auditLogger';

const MAX_USERNAME_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 128;

function getClientIp(request: NextRequest): string {
  return (
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    // --- 1. Rate limit check ---
    const rateLimitCheck = isRateLimited(ip);
    if (rateLimitCheck.limited) {
      logRateLimited(ip);
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimitCheck.retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimitCheck.retryAfter ?? 1800) },
        }
      );
    }

    // --- 2. CSRF protection: require X-Requested-With header ---
    // This header is automatically sent by same-origin fetch() but NOT by CSRF forms.
    // Note: This is defense-in-depth. SameSite=strict cookie prevents cross-site cookie send.
    const csrfHeader = request.headers.get('x-requested-with');
    const isXmlHttpRequest = csrfHeader?.toLowerCase() === 'xmlhttprequest';
    if (!isXmlHttpRequest && process.env.NODE_ENV === 'production') {
      // In production, strictly require the header. In dev, allow missing (browser dev tools).
      logLoginFailure(ip, undefined, 'csrf_missing', userAgent);
      recordFailedAttempt(ip);
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // --- 3. Parse request body ---
    let body: { username?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { username, password } = body;

    // --- 4. Input validation ---
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      username.trim().length === 0 ||
      password.length === 0
    ) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Length bounds to prevent DoS
    const safeUsername = username.trim().substring(0, MAX_USERNAME_LENGTH);
    const safePassword = password.substring(0, MAX_PASSWORD_LENGTH);

    // --- 5. Verify password (async, constant-time) ---
    const passwordOk = await verifyPassword(safePassword);

    if (!passwordOk) {
      // Record failed attempt for rate limiting
      recordFailedAttempt(ip);

      // Log failure for audit (no password logged)
      logLoginFailure(ip, safeUsername, 'password_mismatch', userAgent);

      // Fail-closed: same message whether username or password is wrong
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // --- 6. Additional checks: username must be known ---
    // verifyPassword already checked the hash, but we also need to confirm
    // the username is in our allowlist (prevent enum/username enumeration via timing)
    const KNOWN_USERS = new Set(['admin', 'operator', 'observer', 'superadmin']);
    if (!KNOWN_USERS.has(safeUsername)) {
      // Log failure but don't reveal that username doesn't exist
      // Use same timing as password failure to prevent oracle attacks
      recordFailedAttempt(ip);
      logLoginFailure(ip, safeUsername, 'user_not_found', userAgent);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // --- 6. Record success ---
    recordSuccess(ip);
    logLoginSuccess(ip, safeUsername, userAgent);

    // --- 7. Create signed session ---
    await setSession(safeUsername);

    // --- 8. Return safe user info (role from server-side map only) ---
    return NextResponse.json({
      success: true,
      user: {
        id: safeUsername,
        // Role is resolved server-side from username, not from request
        role: resolveRole(safeUsername),
      },
    });
  } catch (err) {
    console.error('[LOGIN] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

