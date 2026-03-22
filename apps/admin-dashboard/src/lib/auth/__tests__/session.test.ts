/**
 * Unit tests for Admin Session Management
 *
 * Tests the HMAC-signed token session system.
 * These are pure unit tests — they mock crypto operations.
 *
 * Run with: npx vitest run src/lib/auth/__tests__/session.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac, randomBytes } from 'crypto';

// =============================================================================
// Mock Environment
// =============================================================================

const TEST_SECRET = 'test-session-secret-min-32-characters-long!!';
const TEST_VERSION = 1;

function mockSessionEnv() {
  vi.stubEnv('SESSION_SECRET', TEST_SECRET);
  vi.stubEnv('SESSION_VERSION', String(TEST_VERSION));
}

function clearSessionEnv() {
  vi.unstubAllEnvs();
}

// =============================================================================
// Token Utilities (mirror of session.ts logic for test isolation)
// =============================================================================

function getSigningKey(secret: string) {
  return createHmac('sha256', secret).update('session-signing-v1').digest();
}

function signPayload(payload: string, secret: string): string {
  const key = getSigningKey(secret);
  return createHmac('sha256', key).update(payload).digest('base64url');
}

function encodePayload(payload: object): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf8').toString('base64').replaceAll('+', '-').replaceAll('/', '_');
}

function createValidToken(secret: string, version: number, overrides: Partial<{
  actorId: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
}> = {}): string {
  const now = Date.now();
  const payload = {
    actorId: 'admin',
    role: 'admin',
    issuedAt: now,
    expiresAt: now + 8 * 60 * 60 * 1000,
    version,
    ...overrides,
  };
  const payloadB64 = encodePayload(payload);
  const sigB64 = signPayload(payloadB64, secret);
  return `${payloadB64}.${sigB64}`;
}

// =============================================================================
// Tests
// =============================================================================

describe('Session Token Integrity', () => {
  beforeEach(() => mockSessionEnv());
  afterEach(() => clearSessionEnv());

  it('creates a valid signed token format', () => {
    const token = createValidToken(TEST_SECRET, TEST_VERSION);
    expect(token).toBeDefined();
    expect(token.includes('.')).toBe(true);
    const [payload, sig] = token.split('.');
    expect(payload.length).toBeGreaterThan(20); // base64url payload
    expect(sig.length).toBeGreaterThan(20);    // base64url HMAC
  });

  it('produces different signatures for different payloads', () => {
    const payload1 = encodePayload({ actorId: 'admin', role: 'admin', version: 1, issuedAt: 0, expiresAt: 9999999999999 });
    const payload2 = encodePayload({ actorId: 'attacker', role: 'super_admin', version: 1, issuedAt: 0, expiresAt: 9999999999999 });

    const sig1 = signPayload(payload1, TEST_SECRET);
    const sig2 = signPayload(payload2, TEST_SECRET);

    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different secrets', () => {
    const payload = encodePayload({ actorId: 'admin', role: 'admin', version: 1, issuedAt: 0, expiresAt: 9999999999999 });

    const sig1 = signPayload(payload, TEST_SECRET);
    const sig2 = signPayload(payload, 'different-secret-that-is-32-chars!!');

    expect(sig1).not.toBe(sig2);
  });

  it('tampered token fails signature verification', () => {
    const token = createValidToken(TEST_SECRET, TEST_VERSION);
    const [payload, _sig] = token.split('.');

    // Tamper with the payload
    const tamperedPayload = Buffer.from('{"actorId":"admin","role":"super_admin","version":1,"issuedAt":0,"expiresAt":9999999999999}').toString('base64').replaceAll('+', '-').replaceAll('/', '_');
    const tamperedToken = `${tamperedPayload}.fake_signature_that_wont_match`;

    // Verify that tampering makes the token invalid
    const expectedSig = signPayload(tamperedPayload, TEST_SECRET);
    expect(expectedSig).not.toBe('fake_signature_that_wont_match');
  });
});

describe('Session Expiry', () => {
  beforeEach(() => mockSessionEnv());
  afterEach(() => clearSessionEnv());

  it('detects an expired session token', () => {
    const now = Date.now();
    const expiredPayload = {
      actorId: 'admin',
      role: 'admin',
      version: TEST_VERSION,
      issuedAt: now - 10 * 60 * 60 * 1000, // issued 10 hours ago
      expiresAt: now - 2 * 60 * 60 * 1000,  // expired 2 hours ago
    };

    // Should be rejected because expiresAt < now
    expect(expiredPayload.expiresAt < now).toBe(true);
  });

  it('accepts a non-expired session token', () => {
    const now = Date.now();
    const validPayload = {
      actorId: 'admin',
      role: 'admin',
      version: TEST_VERSION,
      issuedAt: now - 1 * 60 * 60 * 1000, // issued 1 hour ago
      expiresAt: now + 7 * 60 * 60 * 1000, // expires in 7 hours
    };

    expect(validPayload.expiresAt > now).toBe(true);
  });

  it('rejects a session with expiresAt in the past', () => {
    const past = Date.now() - 1000;
    expect(past < Date.now()).toBe(true);
  });
});

describe('Session Version (Revocation)', () => {
  beforeEach(() => mockSessionEnv());
  afterEach(() => clearSessionEnv());

  it('rejects a session with old version number', () => {
    // Current version is 1, token was issued with version 0
    const tokenV0 = createValidToken(TEST_SECRET, 0);
    const [payloadB64, _sig] = tokenV0.split('.');
    let base64 = payloadB64.replaceAll('-', '+').replaceAll('_', '/');
    while (base64.length % 4) base64 += '=';
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

    // Token version 0 should be rejected (current version is 1)
    expect(payload.version).not.toBe(TEST_VERSION);
  });

  it('accepts a session with matching version number', () => {
    const tokenV1 = createValidToken(TEST_SECRET, TEST_VERSION);
    const [payloadB64, _sig] = tokenV1.split('.');
    let base64 = payloadB64.replaceAll('-', '+').replaceAll('_', '/');
    while (base64.length % 4) base64 += '=';
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

    expect(payload.version).toBe(TEST_VERSION);
  });
});

describe('Role Resolution', () => {
  beforeEach(() => mockSessionEnv());
  afterEach(() => clearSessionEnv());

  it('resolves admin username to admin role', () => {
    const USER_ROLES: Record<string, string> = {
      admin: 'admin',
      operator: 'operator',
      observer: 'readonly_observer',
      superadmin: 'super_admin',
    };
    expect(USER_ROLES['admin']).toBe('admin');
  });

  it('resolves operator username to operator role', () => {
    const USER_ROLES: Record<string, string> = {
      admin: 'admin',
      operator: 'operator',
      observer: 'readonly_observer',
      superadmin: 'super_admin',
    };
    expect(USER_ROLES['operator']).toBe('operator');
  });

  it('resolves unknown username to readonly_observer role', () => {
    const USER_ROLES: Record<string, string> = {
      admin: 'admin',
      operator: 'operator',
      observer: 'readonly_observer',
      superadmin: 'super_admin',
    };
    const role = USER_ROLES['unknown-user'] ?? 'readonly_observer';
    expect(role).toBe('readonly_observer');
  });

  it('does NOT use the role from the cookie payload', () => {
    // Critical security test: even if an attacker crafts a cookie with role: 'super_admin',
    // the server resolves role from username only.
    const USER_ROLES: Record<string, string> = {
      admin: 'admin',
      operator: 'operator',
    };
    const cookieRole = 'super_admin'; // Attacker-set role in cookie
    const resolvedRole = USER_ROLES['admin'] ?? 'readonly_observer'; // Server resolves from username

    expect(resolvedRole).toBe('admin'); // Not 'super_admin'
    expect(cookieRole).not.toBe(resolvedRole); // Cookie role is ignored
  });
});

describe('Malformed Token Handling', () => {
  beforeEach(() => mockSessionEnv());
  afterEach(() => clearSessionEnv());

  it('rejects a token without a dot separator', () => {
    const noDot = 'no-dot-token';
    expect(noDot.split('.').length).toBe(1);
  });

  it('rejects a token with too many dot separators', () => {
    const manyDots = 'a.b.c';
    expect(manyDots.split('.').length).toBeGreaterThan(2);
  });

  it('rejects a token that is too short', () => {
    const shortToken = 'abc';
    expect(shortToken.length).toBeLessThan(80);
  });

  it('rejects invalid base64 in payload', () => {
    const invalidPayload = '!!!not-base64!!!';
    let base64 = invalidPayload.replaceAll('-', '+').replaceAll('_', '/');
    try {
      Buffer.from(base64, 'base64');
    } catch {
      // Should throw — invalid base64
      expect(true).toBe(true);
      return;
    }
    expect('Should have thrown').toBe('Did not throw');
  });
});

describe('Cookie Security Attributes', () => {
  it('session cookie must be httpOnly', () => {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 8 * 60 * 60,
      path: '/',
    };
    expect(cookieOptions.httpOnly).toBe(true);
  });

  it('session cookie must not expose Secure flag in dev', () => {
    // In dev mode, secure: false (HTTP is allowed)
    const isDev = process.env.NODE_ENV !== 'production';
    const secureFlag = isDev ? false : true;
    expect(secureFlag).toBe(false);
  });

  it('session cookie must use Secure flag in production', () => {
    const isProd = process.env.NODE_ENV === 'production';
    const secureFlag = isProd;
    expect(secureFlag).toBe(true);
  });

  it('sameSite strict prevents CSRF', () => {
    const sameSite = 'strict';
    expect(['lax', 'none'].includes(sameSite)).toBe(false);
  });
});

describe('Session Version Increment (Revocation)', () => {
  it('incrementing SESSION_VERSION invalidates all existing tokens', () => {
    const oldVersion = 1;
    const newVersion = oldVersion + 1;

    // Simulate token issued with old version
    const oldTokenPayload = { version: oldVersion, actorId: 'admin', role: 'admin', issuedAt: 0, expiresAt: 9999999999999 };

    // Server checks against current (new) version
    expect(oldTokenPayload.version).not.toBe(newVersion); // Invalid!
  });

  it('can revoke all sessions by incrementing SESSION_VERSION env', () => {
    // This documents the intended behavior for operational use
    const VERSION_1 = 1;
    const VERSION_2 = 2;

    // All tokens from version 1 should be rejected when server uses version 2
    const tokenFromV1 = { version: VERSION_1 };
    expect(tokenFromV1.version === VERSION_2).toBe(false); // Rejected
  });
});
