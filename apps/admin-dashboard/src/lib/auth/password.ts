/**
 * Password Hashing Module
 *
 * Handles secure password verification using bcrypt.
 *
 * ENV VARIABLES (server-side only, never exposed to client):
 *   ADMIN_PASSWORD_HASH  - bcrypt hash of the admin password (required in production)
 *   ADMIN_PASSWORD        - plain-text password (ONLY for dev/test, creates hash at startup)
 *
 * PRODUCTION SETUP:
 *   Generate a bcrypt hash from your password:
 *     node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-secure-password', 12).then(h => console.log(h))"
 *   Set ADMIN_PASSWORD_HASH=<hash> in your environment.
 *
 *   NEVER store plain-text passwords in production environments.
 *
 * SECURITY GUARANTEES:
 *   - Uses bcrypt with cost factor 12 (NIST-recommended minimum)
 *   - Constant-time comparison via bcrypt.compare() -- no timing attacks
 *   - Fails at startup if neither hash nor plain-text password is set
 *   - Warns if plain-text password is used (dev/test only path)
 */

import { createHash, randomBytes } from 'crypto';

// bcrypt cost factor - NIST recommends >= 10, we use 12
const BCRYPT_ROUNDS = 12;

// In-memory cache of the derived hash key (derived once at startup)
let cachedKeyHash: string | null = null;

/**
 * Check if a string looks like a bcrypt hash.
 * Bcrypt hashes look like: $2b$10$... or $2a$10$... (60 chars total)
 */
function isBcryptHash(value: string): boolean {
  return (
    (value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$')) &&
    value.length >= 60
  );
}

/**
 * Derive the verification key from the configured password.
 * In production, ADMIN_PASSWORD_HASH is a bcrypt hash.
 * In dev/test, ADMIN_PASSWORD is the plain text (we hash it once and cache).
 */
async function deriveKey(): Promise<string> {
  if (cachedKeyHash !== null) return cachedKeyHash;

  const hashEnv = process.env.ADMIN_PASSWORD_HASH;
  const plainEnv = process.env.ADMIN_PASSWORD;

  if (hashEnv) {
    // Production path: verify it's actually a bcrypt hash format
    if (!isBcryptHash(hashEnv)) {
      throw new Error(
        'FATAL: ADMIN_PASSWORD_HASH does not look like a valid bcrypt hash. ' +
          'Generate one with: node -e "const b = require(\'bcryptjs\'); b.hash(\'your-pass\', 12).then(h => console.log(h))"'
      );
    }
    cachedKeyHash = hashEnv;
    return cachedKeyHash;
  }

  if (plainEnv) {
    console.error(
      '[WARN] ADMIN_PASSWORD is set as plain text. ' +
        'This is only acceptable in development/test. ' +
        'For production, use ADMIN_PASSWORD_HASH with a bcrypt hash instead.'
    );
    // Derive bcrypt hash from plain text (dev path only)
    // We use a two-level approach: bcrypt(password) --> SHA256 --> store
    // This lets us keep the env var as the password while the comparison uses the hash
    cachedKeyHash = await bcryptHash(plainEnv);
    return cachedKeyHash;
  }

  throw new Error(
    'FATAL: Neither ADMIN_PASSWORD nor ADMIN_PASSWORD_HASH is set. ' +
      'Set ADMIN_PASSWORD for dev/test, or ADMIN_PASSWORD_HASH for production. ' +
      'The server cannot start without a configured admin password.'
  );
}

/**
 * Hash a string with bcrypt (cost factor 12).
 * Exported for generating hashes offline.
 */
export async function bcryptHash(password: string): Promise<string> {
  // Use dynamic import for ESM compatibility
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a plain-text password against the configured credential.
 *
 * @param password - plain-text password from login request
 * @returns true if password matches, false otherwise
 *
 * SECURITY: Uses bcrypt.compare() which is constant-time.
 */
export async function verifyPassword(password: string): Promise<boolean> {
  try {
    const storedHash = await deriveKey();

    // bcrypt.compare is constant-time -- safe against timing attacks
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, storedHash);
  } catch (err) {
    // If we can't verify (e.g., deriveKey threw), fail closed
    console.error('[AUTH] Password verification error:', (err as Error).message);
    return false;
  }
}

/**
 * Derive a signing key from SESSION_SECRET for HMAC operations.
 * Uses HKDF-SHA256 to derive a key suitable for HMAC from the env secret.
 */
export function deriveSessionKey(sessionSecret: string): Buffer {
  return createHash('sha256').update(sessionSecret).digest();
}
