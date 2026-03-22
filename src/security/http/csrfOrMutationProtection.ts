/**
 * Security Layer - CSRF / Mutation Protection
 * Protection for admin mutations from browser
 */

import { randomBytes } from 'crypto';

// =============================================================================
// CONFIG
// =============================================================================

/** CSRF token configuration */
export interface CSRFTokenConfig {
  /** Token length in bytes */
  tokenLength?: number;

  /** Token header name */
  headerName?: string;

  /** Cookie name */
  cookieName?: string;

  /** Cookie options */
  cookieOptions?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
    path?: string;
  };
}

const DEFAULT_CONFIG: Required<CSRFTokenConfig> = {
  tokenLength: 32,
  headerName: 'x-csrf-token',
  cookieName: 'csrf_token',
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600, // 1 hour
    path: '/',
  },
};

// =============================================================================
// TOKEN GENERATION
// =============================================================================

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(config?: CSRFTokenConfig): string {
  const tokenLength = config?.tokenLength ?? DEFAULT_CONFIG.tokenLength;
  return randomBytes(tokenLength).toString('hex');
}

/**
 * Build mutation protection token
 * This is a simplified version - in production use proper JWT
 */
export function buildMutationProtectionToken(
  sessionId: string,
  options?: {
    expiresInMinutes?: number;
    salt?: string;
  }
): {
  token: string;
  expiresAt: Date;
} {
  const expiresInMinutes = options?.expiresInMinutes ?? 60;
  const salt = options?.salt ?? randomBytes(16).toString('hex');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

  // Create token payload
  const payload = {
    sessionId,
    salt,
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000),
  };

  // Simple base64 encoding (in production, use proper JWT)
  const token = Buffer.from(JSON.stringify(payload)).toString('base64url');

  return { token, expiresAt };
}

// =============================================================================
// TOKEN VALIDATION
// =============================================================================

/**
 * Validate mutation protection token
 */
export function validateMutationProtectionToken(
  token: string,
  sessionId: string,
  options?: {
    allowExpired?: boolean;
    clockSkewSeconds?: number;
  }
): {
  valid: boolean;
  error?: string;
} {
  try {
    // Decode token
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString());

    // Check session ID
    if (payload.sessionId !== sessionId) {
      return { valid: false, error: 'Invalid session' };
    }

    // Check expiration
    if (!options?.allowExpired) {
      const clockSkew = options?.clockSkewSeconds ?? 30;
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp < now - clockSkew) {
        return { valid: false, error: 'Token expired' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid token format' };
  }
}

/**
 * Extract CSRF token from request
 */
export function extractCSRFToken(
  headers: Record<string, string | undefined>
): string | null {
  // Try header
  const headerToken = headers[DEFAULT_CONFIG.headerName];
  if (headerToken) {
    return headerToken;
  }

  return null;
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(
  requestToken: string | null,
  storedToken: string | null
): {
  valid: boolean;
  error?: string;
} {
  if (!requestToken) {
    return { valid: false, error: 'No CSRF token provided' };
  }

  if (!storedToken) {
    return { valid: false, error: 'No stored CSRF token' };
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(requestToken, storedToken)) {
    return { valid: false, error: 'Invalid CSRF token' };
  }

  return { valid: true };
}

// =============================================================================
// ENFORCEMENT
// =============================================================================

/** Request context for enforcement */
export interface MutationProtectionContext {
  headers: Record<string, string | undefined>;
  method: string;
  path: string;
  sessionId?: string;
  storedCSRFToken?: string;
}

/**
 * Enforce sensitive mutation protection
 */
export function enforceSensitiveMutationProtection(
  context: MutationProtectionContext,
  options?: {
    requiredForMethods?: string[];
    exemptPaths?: string[];
  }
): {
  enforced: boolean;
  error?: string;
} {
  const requiredForMethods = options?.requiredForMethods ?? ['POST', 'PUT', 'DELETE', 'PATCH'];
  const exemptPaths = options?.exemptPaths ?? [];

  // Check if this is a mutation
  if (!requiredForMethods.includes(context.method.toUpperCase())) {
    return { enforced: true };
  }

  // Check if path is exempt
  for (const exempt of exemptPaths) {
    if (context.path.startsWith(exempt)) {
      return { enforced: true };
    }
  }

  // Require CSRF token for mutations
  const csrfToken = extractCSRFToken(context.headers);
  const valid = validateCSRFToken(csrfToken, context.storedCSRFToken);

  if (!valid.valid) {
    return {
      enforced: false,
      error: valid.error,
    };
  }

  return { enforced: true };
}

// =============================================================================
// COOKIE HELPERS
// =============================================================================

/**
 * Build CSRF cookie options for response
 */
export function buildCSRFCookieOptions(secure?: boolean): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    path: string;
  };
} {
  const token = generateCSRFToken();
  const isSecure = secure ?? process.env.NODE_ENV === 'production';

  return {
    name: DEFAULT_CONFIG.cookieName,
    value: token,
    options: {
      ...DEFAULT_CONFIG.cookieOptions,
      secure: isSecure,
    },
  };
}

// =============================================================================
// TIMING-SAFE COMPARISON
// =============================================================================

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// =============================================================================
// SIGNED REQUEST TOKEN (Alternative to CSRF)
// =============================================================================

/** Signed request options */
export interface SignedRequestOptions {
  /** Secret for signing */
  secret: string;

  /** Request path */
  path: string;

  /** Request method */
  method: string;

  /** Request body hash */
  bodyHash?: string;

  /** Timestamp */
  timestamp?: number;

  /** Window in seconds */
  windowSeconds?: number;
}

/**
 * Build signed request token
 */
export function buildSignedRequestToken(options: SignedRequestOptions): string {
  const {
    secret,
    path,
    method,
    bodyHash,
    timestamp = Math.floor(Date.now() / 1000),
  } = options;

  const payload = [method, path, timestamp, bodyHash].filter(Boolean).join(':');

  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return Buffer.from(
    JSON.stringify({ ts: timestamp, sig: signature })
  ).toString('base64url');
}

/**
 * Validate signed request token
 */
export function validateSignedRequestToken(
  token: string,
  options: Omit<SignedRequestOptions, 'timestamp'>
): {
  valid: boolean;
  error?: string;
} {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    const { ts, sig } = decoded;

    // Check timestamp
    const windowSeconds = options.windowSeconds ?? 300; // 5 minutes
    const now = Math.floor(Date.now() / 1000);

    if (Math.abs(now - ts) > windowSeconds) {
      return { valid: false, error: 'Token expired' };
    }

    // Verify signature
    const payload = [options.method, options.path, ts, options.bodyHash].filter(Boolean).join(':');
    const crypto = require('crypto');
    const expectedSig = crypto
      .createHmac('sha256', options.secret)
      .update(payload)
      .digest('hex');

    if (!timingSafeEqual(sig, expectedSig)) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid token format' };
  }
}
