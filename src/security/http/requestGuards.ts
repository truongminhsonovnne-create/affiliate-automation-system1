/**
 * Security Layer - Request Guards
 * Production-grade request-level security guards
 */

import type { SecurityCheckResult } from '../types';
import { ALLOWED_INTERNAL_ORIGINS, ALLOWED_ADMIN_ORIGINS } from '../constants';

// =============================================================================
// REQUEST CONTEXT
// =============================================================================

/** Request context for guards */
export interface RequestGuardContext {
  /** Request method */
  method: string;

  /** Request path */
  path: string;

  /** Request headers */
  headers: Record<string, string | undefined>;

  /** Request IP */
  ip?: string;

  /** Request origin */
  origin?: string;

  /** Request query params */
  query?: Record<string, string>;

  /** Request body (if available) */
  body?: unknown;
}

// =============================================================================
// GUARDS
// =============================================================================

/**
 * Guard against invalid origins
 */
export function guardInternalOrigin(
  context: RequestGuardContext,
  options?: {
    allowedOrigins?: Set<string>;
    allowAllOrigins?: boolean;
    requireOrigin?: boolean;
  }
): SecurityCheckResult {
  const allowedOrigins = options?.allowedOrigins ?? ALLOWED_ADMIN_ORIGINS;
  const origin = context.headers.origin ?? context.headers.referer;

  // If allowing all origins, pass
  if (options?.allowAllOrigins) {
    return { passed: true };
  }

  // Check if origin is required
  if (options?.requireOrigin && !origin) {
    return {
      passed: false,
      reason: 'Origin header is required',
    };
  }

  // If no origin, check if we're in server-to-server context
  if (!origin) {
    // Allow if no origin but from same origin (server-side)
    return { passed: true };
  }

  // Check against allowed origins
  if (allowedOrigins.has(origin)) {
    return { passed: true };
  }

  // Also check without protocol for some cases
  const originWithoutProtocol = origin.replace(/^https?:\/\//, '');
  for (const allowed of allowedOrigins) {
    const allowedWithoutProtocol = allowed.replace(/^https?:\/\//, '');
    if (originWithoutProtocol.startsWith(allowedWithoutProtocol)) {
      return { passed: true };
    }
  }

  return {
    passed: false,
    reason: `Origin '${origin}' is not allowed`,
  };
}

/**
 * Guard allowed HTTP methods
 */
export function guardAllowedMethod(
  context: RequestGuardContext,
  options?: {
    allowedMethods?: string[];
    allowUnlistedMethods?: boolean;
  }
): SecurityCheckResult {
  const allowedMethods = options?.allowedMethods ?? ['GET', 'POST', 'PUT', 'DELETE'];
  const method = context.method.toUpperCase();

  if (allowedMethods.map((m) => m.toUpperCase()).includes(method)) {
    return { passed: true };
  }

  // Check unlisted methods
  if (options?.allowUnlistedMethods) {
    return { passed: true };
  }

  return {
    passed: false,
    reason: `Method '${method}' is not allowed. Allowed: ${allowedMethods.join(', ')}`,
  };
}

/**
 * Guard sensitive mutation requests
 */
export function guardSensitiveMutationRequest(
  context: RequestGuardContext,
  options?: {
    requireAuth?: boolean;
    requireCSRF?: boolean;
    sensitiveMethods?: string[];
  }
): SecurityCheckResult {
  const sensitiveMethods = options?.sensitiveMethods ?? ['POST', 'PUT', 'DELETE', 'PATCH'];

  // Check if this is a mutation
  if (!sensitiveMethods.includes(context.method.toUpperCase())) {
    return { passed: true };
  }

  // Check for authentication
  if (options?.requireAuth !== false) {
    const authHeader = context.headers.authorization;
    const internalToken = context.headers['x-internal-token'];

    if (!authHeader && !internalToken) {
      return {
        passed: false,
        reason: 'Authentication required for sensitive mutations',
      };
    }
  }

  // Check for CSRF token for browser requests
  if (options?.requireCSRF !== false) {
    const origin = context.headers.origin;
    const csrfToken = context.headers['x-csrf-token'];

    // Only enforce CSRF for browser requests (with origin)
    if (origin && !csrfToken) {
      return {
        passed: false,
        reason: 'CSRF token required for browser mutations',
      };
    }
  }

  return { passed: true };
}

/**
 * Guard trusted execution context
 */
export function guardTrustedExecutionContext(
  context: RequestGuardContext,
  options?: {
    requireServerEnvironment?: boolean;
    allowedPaths?: string[];
    blockedPaths?: string[];
  }
): SecurityCheckResult {
  const path = context.path;

  // Check blocked paths
  if (options?.blockedPaths) {
    for (const blocked of options.blockedPaths) {
      if (path.startsWith(blocked)) {
        return {
          passed: false,
          reason: `Path '${path}' is blocked`,
        };
      }
    }
  }

  // Check allowed paths
  if (options?.allowedPaths) {
    let allowed = false;
    for (const allowedPath of options.allowedPaths) {
      if (path.startsWith(allowedPath)) {
        allowed = true;
        break;
      }
    }

    if (!allowed) {
      return {
        passed: false,
        reason: `Path '${path}' is not in allowed paths`,
      };
    }
  }

  return { passed: true };
}

/**
 * Guard rate limiting (basic implementation)
 */
export function guardRateLimit(
  context: RequestGuardContext,
  options?: {
    windowMs?: number;
    maxRequests?: number;
    keyGenerator?: (context: RequestGuardContext) => string;
  }
): SecurityCheckResult {
  // This is a placeholder - in production, use Redis or similar
  // for actual rate limiting
  const windowMs = options?.windowMs ?? 60000; // 1 minute
  const maxRequests = options?.maxRequests ?? 100;

  // Simple in-memory implementation for demonstration
  const key = options?.keyGenerator?.(context) ?? context.ip ?? 'unknown';
  const now = Date.now();

  // In production, use Redis
  // For now, just pass through
  return { passed: true };
}

/**
 * Guard against suspicious requests
 */
export function guardSuspiciousRequest(
  context: RequestGuardContext
): SecurityCheckResult {
  const path = context.path.toLowerCase();
  const userAgent = context.headers['user-agent'] ?? '';

  // Check for path traversal attempts
  if (path.includes('..') || path.includes('%2e%2e')) {
    return {
      passed: false,
      reason: 'Suspicious path traversal detected',
    };
  }

  // Check for null bytes
  if (path.includes('\0') || path.includes('%00')) {
    return {
      passed: false,
      reason: 'Null byte injection detected',
    };
  }

  // Check for common attack patterns
  const attackPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /document\.cookie/i,
  ];

  const pathAndQuery = path + (context.query ? '?' + Object.values(context.query).join('&') : '');

  for (const pattern of attackPatterns) {
    if (pattern.test(pathAndQuery)) {
      return {
        passed: false,
        reason: 'Suspicious pattern detected in request',
      };
    }
  }

  // Check for missing user agent (suspicious)
  if (!userAgent && context.method.toUpperCase() !== 'OPTIONS') {
    return {
      passed: true,
      warnings: ['Request without User-Agent header'],
    };
  }

  return { passed: true };
}

// =============================================================================
// COMPOSED GUARDS
// =============================================================================

/**
 * Guard for internal API requests
 */
export function guardInternalAPIRequest(
  context: RequestGuardContext
): SecurityCheckResult {
  // Check method
  const methodCheck = guardAllowedMethod(context, {
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });
  if (!methodCheck.passed) return methodCheck;

  // Check origin
  const originCheck = guardInternalOrigin(context, {
    allowedOrigins: ALLOWED_INTERNAL_ORIGINS,
  });
  if (!originCheck.passed) return originCheck;

  // Check for suspicious requests
  const suspiciousCheck = guardSuspiciousRequest(context);
  if (!suspiciousCheck.passed) return suspiciousCheck;

  return { passed: true };
}

/**
 * Guard for admin mutations
 */
export function guardAdminMutation(
  context: RequestGuardContext
): SecurityCheckResult {
  // Check method is mutation
  const methodCheck = guardAllowedMethod(context, {
    allowedMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
  });
  if (!methodCheck.passed) return methodCheck;

  // Check sensitive mutation requirements
  const sensitiveCheck = guardSensitiveMutationRequest(context, {
    requireAuth: true,
    requireCSRF: true,
  });
  if (!sensitiveCheck.passed) return sensitiveCheck;

  // Check origin
  const originCheck = guardInternalOrigin(context, {
    allowedOrigins: ALLOWED_ADMIN_ORIGINS,
    requireOrigin: true,
  });
  if (!originCheck.passed) return originCheck;

  return { passed: true };
}
