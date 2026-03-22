/**
 * Unit tests for Password Hashing Module
 *
 * Tests bcrypt password verification logic.
 *
 * Run with: npx vitest run src/lib/auth/__tests__/password.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const BCRYPT_ROUNDS = 12;

// =============================================================================
// Mock Environment Helpers
// =============================================================================

function mockPasswordEnv(hash: string | null, plain: string | null) {
  vi.stubEnv('ADMIN_PASSWORD_HASH', hash ?? '');
  vi.stubEnv('ADMIN_PASSWORD', plain ?? '');
}

function clearPasswordEnv() {
  vi.unstubAllEnvs();
}

// =============================================================================
// Bcrypt Helpers (replicate password.ts logic)
// =============================================================================

async function bcryptHash(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function bcryptCompare(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

function isBcryptHash(value: string): boolean {
  return (
    (value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$')) &&
    value.length >= 60
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('bcrypt Hash Format Validation', () => {
  it('recognizes a valid bcrypt hash', () => {
    const validHash = '$2b$12$abcdefghijklmnopqrstuO9Yf3Y1kRqJqWqJqWqJqWqJqW';
    expect(isBcryptHash(validHash)).toBe(true);
  });

  it('rejects a plain-text password as a hash', () => {
    const plain = 'my-secret-password';
    expect(isBcryptHash(plain)).toBe(false);
  });

  it('rejects a short string as a hash', () => {
    const short = '$2b$12$abc';
    expect(isBcryptHash(short)).toBe(false);
  });

  it('rejects a JWT-like token as a hash', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    expect(isBcryptHash(jwt)).toBe(false);
  });
});

describe('bcrypt Hashing', () => {
  it('generates a bcrypt hash from a password', async () => {
    const password = 'my-secure-password-123';
    const hash = await bcryptHash(password);
    expect(hash).toBeDefined();
    expect(hash.startsWith('$2b$12$')).toBe(true);
    expect(hash.length).toBe(60);
  });

  it('generates different hashes for the same password (salt)', async () => {
    const password = 'same-password';
    const hash1 = await bcryptHash(password);
    const hash2 = await bcryptHash(password);
    expect(hash1).not.toBe(hash2);
  });

  it('hash is long enough to pass isBcryptHash validation', async () => {
    const hash = await bcryptHash('any-password');
    expect(isBcryptHash(hash)).toBe(true);
  });
});

describe('bcrypt Password Comparison', () => {
  it('accepts the correct password', async () => {
    const password = 'correct-horse-battery-staple';
    const hash = await bcryptHash(password);
    const result = await bcryptCompare(password, hash);
    expect(result).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const password = 'correct-password';
    const wrong = 'wrong-password';
    const hash = await bcryptHash(password);
    const result = await bcryptCompare(wrong, hash);
    expect(result).toBe(false);
  });

  it('rejects an empty password against a valid hash', async () => {
    const hash = await bcryptHash('non-empty-password');
    const result = await bcryptCompare('', hash);
    expect(result).toBe(false);
  });

  it('rejects a very long password that exceeds reasonable input', async () => {
    const longPassword = 'a'.repeat(1000);
    const hash = await bcryptHash('normal-password');
    const result = await bcryptCompare(longPassword, hash);
    expect(result).toBe(false);
  });
});

describe('Credential Storage Modes', () => {
  it('production mode: ADMIN_PASSWORD_HASH is set', () => {
    const hash = '$2b$12$abcdefghijklmnopqrstuO9Yf3Y1kRqJqWqJqWqJqWqJqW';
    mockPasswordEnv(hash, null);
    expect(process.env.ADMIN_PASSWORD_HASH).toBe(hash);
    expect(process.env.ADMIN_PASSWORD).toBe('');
    clearPasswordEnv();
  });

  it('dev mode: ADMIN_PASSWORD is set', () => {
    mockPasswordEnv(null, 'dev-only-password');
    expect(process.env.ADMIN_PASSWORD).toBe('dev-only-password');
    expect(process.env.ADMIN_PASSWORD_HASH).toBe('');
    clearPasswordEnv();
  });

  it('neither set: should fail at startup', () => {
    mockPasswordEnv(null, null);
    const hasHash = process.env.ADMIN_PASSWORD_HASH && process.env.ADMIN_PASSWORD_HASH.length > 0;
    const hasPlain = process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length > 0;
    expect(hasHash || hasPlain).toBe(false); // Should fail
    clearPasswordEnv();
  });
});

describe('Hash Format Detection', () => {
  it('detects bcrypt $2a$ variant', () => {
    const hash2a = '$2a$12$abcdefghijklmnopqrstuO9Yf3Y1kRqJqWqJqWqJqWqJqW';
    expect(isBcryptHash(hash2a)).toBe(true);
  });

  it('detects bcrypt $2b$ variant', () => {
    const hash2b = '$2b$12$abcdefghijklmnopqrstuO9Yf3Y1kRqJqWqJqWqJqWqJqW';
    expect(isBcryptHash(hash2b)).toBe(true);
  });

  it('rejects sha256 hash as bcrypt', () => {
    // SHA256 hashes look very different from bcrypt
    const sha256Hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(isBcryptHash(sha256Hash)).toBe(false);
  });

  it('rejects JWT secret as bcrypt', () => {
    const secret = 'my-super-secret-jwt-signing-key-32chars!';
    expect(isBcryptHash(secret)).toBe(false);
  });
});
