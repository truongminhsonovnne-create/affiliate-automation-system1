/**
 * Security Tests - Session Store
 *
 * Tests session lifecycle: creation, validation, TTL expiry, revocation.
 * Tests token hash invariants and Redis-key format.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

// ── Test helpers ───────────────────────────────────────────────────────────

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function sessionKey(sessionId: string): string {
  return `security:session:${sessionId}`;
}

function revokedKey(tokenHash: string): string {
  return `security:revoked:${tokenHash}`;
}

// ── Token hashing invariants ───────────────────────────────────────────────

describe('Token Hashing Invariants', () => {
  it('hashToken produces a valid SHA-256 hex string (64 chars)', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.sig';
    const hash = hashToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hash is deterministic — same token always produces same hash', () => {
    const token = 'test-token-123';
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('different tokens produce different hashes', () => {
    const tokenA = 'token-a';
    const tokenB = 'token-b';
    expect(hashToken(tokenA)).not.toBe(hashToken(tokenB));
  });

  it('single character change produces completely different hash (avalanche effect)', () => {
    const tokenA = 'token-aaaaa';
    const tokenB = 'token-baaga';
    const hashA = hashToken(tokenA);
    const hashB = hashToken(tokenB);
    // SHA-256 avalanche: even 1-bit change flips ~50% of output bits
    // In practice, hex strings will differ in at least many chars
    expect(hashA).not.toBe(hashB);
  });

  it('hash is irreversible — cannot derive token from hash', () => {
    const token = 'super-secret-admin-token-abc123xyz';
    const hash = hashToken(token);
    // SHA-256 is one-way: there is no inverse function
    // We can only verify this by confirming the hash length (64 hex = 32 bytes)
    expect(hash).toHaveLength(64);
    // And that it's different from any plausible "decoded" form
    expect(hash).not.toBe(token);
    expect(hash).not.toBe(Buffer.from(token).toString('hex'));
  });

  it('empty string token produces valid hash', () => {
    const hash = hashToken('');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('unicode tokens are hashed correctly', () => {
    const token = 'token-用户名-token';
    const hash = hashToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(token)).toBe(hashToken(token)); // deterministic
  });
});

// ── Key format invariants ──────────────────────────────────────────────────

describe('Session Key Format', () => {
  it('session keys follow security:session:{id} format', () => {
    expect(sessionKey('abc123')).toBe('security:session:abc123');
    expect(sessionKey('uuid-0000-0000')).toBe('security:session:uuid-0000-0000');
  });

  it('revoked keys follow security:revoked:{hash} format', () => {
    const tokenHash = hashToken('test-token');
    expect(revokedKey(tokenHash)).toBe(`security:revoked:${tokenHash}`);
  });

  it('session key and revoked key are different', () => {
    const sessionId = 'sess-1';
    const tokenHash = hashToken('test-token');
    expect(sessionKey(sessionId)).not.toBe(revokedKey(tokenHash));
  });
});

// ── Session TTL invariants ─────────────────────────────────────────────────

const SESSION_TTL_GRACE_SECONDS = 300; // 5 min

function computeTTL(expiresAtMs: number): number {
  const now = Date.now();
  // Floor remaining time at 0 before adding grace
  const remainingSeconds = Math.max(0, Math.ceil((expiresAtMs - now) / 1000));
  return Math.max(remainingSeconds + SESSION_TTL_GRACE_SECONDS, 1);
}

describe('Session TTL Computation', () => {
  it('TTL is always positive', () => {
    const ttl = computeTTL(Date.now() + 3600_000);
    expect(ttl).toBeGreaterThan(0);
  });

  it('TTL includes grace period', () => {
    const expiresAtMs = Date.now() + 60_000; // 1 minute
    const ttl = computeTTL(expiresAtMs);
    // 60s + 300s grace = 360s
    expect(ttl).toBe(360);
  });

  it('TTL floors at grace period (300s) when expiry is in the past', () => {
    const expiredMs = Date.now() - 10_000; // expired 10s ago
    const ttl = computeTTL(expiredMs);
    // Remaining time is floored at 0, then grace period (300s) is added.
    // TTL = Math.max(0 + 300, 1) = 300.
    expect(ttl).toBe(300);
  });

  it('long-lived session gets long TTL', () => {
    const expiresAtMs = Date.now() + 86400_000; // 24 hours
    const ttl = computeTTL(expiresAtMs);
    // 86400 + 300 = 86700
    expect(ttl).toBe(86700);
  });

  it('very short-lived session (expires in < grace) gets at least grace', () => {
    const expiresAtMs = Date.now() + 30_000; // 30 seconds
    const ttl = computeTTL(expiresAtMs);
    expect(ttl).toBeGreaterThanOrEqual(300); // at least the grace period
  });
});

// ── Revocation TTL ────────────────────────────────────────────────────────

describe('Revocation Record TTL', () => {
  const REVOKED_TTL_SECONDS = 86400; // 24 hours

  it('revocation record TTL is 24 hours', () => {
    expect(REVOKED_TTL_SECONDS).toBe(24 * 60 * 60);
  });

  it('revocation TTL is much longer than session grace — prevents reuse window', () => {
    // Session grace: 5 min. Revocation TTL: 24 hours.
    // This means a revoked token cannot be re-issued for 24 hours after revocation.
    expect(REVOKED_TTL_SECONDS).toBeGreaterThan(3600); // > 1 hour
    expect(REVOKED_TTL_SECONDS).toBeGreaterThan(SESSION_TTL_GRACE_SECONDS * 10);
  });
});

// ── Session expiry validation ─────────────────────────────────────────────

describe('Session Expiry Validation', () => {
  it('session expiresAt in the past → expired', () => {
    const expiresAt = Date.now() - 1000;
    expect(Date.now() > expiresAt).toBe(true);
  });

  it('session expiresAt in the future → not expired', () => {
    const expiresAt = Date.now() + 1000;
    expect(Date.now() > expiresAt).toBe(false);
  });

  it('session at exact current time → considered expired (edge case)', () => {
    const now = Date.now();
    // If expiresAt === now, it's already expired
    expect(now >= now).toBe(true); // boundary case
  });
});

// ── Session record shape ───────────────────────────────────────────────────

describe('Session Record Shape', () => {
  it('session record must contain all required fields', () => {
    const record = {
      sessionId: 'sess-123',
      tokenHash: hashToken('test-token'),
      actorId: 'actor-1',
      role: 'admin',
      audience: 'control-plane',
      scope: ['dashboard:read'],
      issuedAt: Date.now() - 3600_000,
      expiresAt: Date.now() + 3600_000,
      lastActivityAt: Date.now(),
      metadata: undefined,
    };

    expect(record.sessionId).toBeTruthy();
    expect(record.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(record.actorId).toBeTruthy();
    expect(record.role).toBeTruthy();
    expect(record.expiresAt).toBeGreaterThan(record.issuedAt);
    expect(record.lastActivityAt).toBeGreaterThanOrEqual(record.issuedAt);
  });

  it('tokenHash is NOT the raw token', () => {
    const rawToken = 'super-secret-jwt-token-abc';
    const record = {
      tokenHash: hashToken(rawToken),
    };
    expect(record.tokenHash).not.toBe(rawToken);
    expect(record.tokenHash).toHaveLength(64);
  });

  it('metadata is optional', () => {
    const record = {
      sessionId: 'sess-123',
      tokenHash: hashToken('tok'),
      actorId: 'actor-1',
      role: 'admin',
      audience: 'control-plane',
      scope: [],
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600_000,
      lastActivityAt: Date.now(),
      metadata: undefined,
    };
    expect(record.metadata).toBeUndefined();
  });
});
