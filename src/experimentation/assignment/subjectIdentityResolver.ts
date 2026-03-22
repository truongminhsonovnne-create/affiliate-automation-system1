/**
 * Subject Identity Resolver
 *
 * Resolves experiment subject identity for public/product flow
 */

import { createHash } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface SubjectContext {
  sessionId?: string;
  requestId?: string;
  userId?: string;
  fingerprint?: string;
  ipHash?: string;
}

export interface ResolvedSubject {
  subjectKey: string;
  subjectType: 'session' | 'request' | 'user';
  fingerprint?: string;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Resolve experiment subject key from context
 */
export function resolveExperimentSubjectKey(context: SubjectContext): ResolvedSubject {
  // Priority: user > session > request

  if (context.userId) {
    return {
      subjectKey: hashIdentifier(context.userId, 'user'),
      subjectType: 'user',
    };
  }

  if (context.sessionId) {
    return {
      subjectKey: hashIdentifier(context.sessionId, 'session'),
      subjectType: 'session',
      fingerprint: context.sessionId,
    };
  }

  if (context.requestId) {
    return {
      subjectKey: hashIdentifier(context.requestId, 'request'),
      subjectType: 'request',
    };
  }

  // Fallback to random but stable
  return {
    subjectKey: hashIdentifier(context.requestId || crypto.randomUUID(), 'anonymous'),
    subjectType: 'request',
  };
}

/**
 * Resolve anonymous subject fingerprint
 */
export function resolveAnonymousSubjectFingerprint(context: SubjectContext): string | undefined {
  if (context.fingerprint) {
    return hashIdentifier(context.fingerprint, 'fingerprint');
  }

  if (context.ipHash) {
    return context.ipHash;
  }

  return undefined;
}

/**
 * Build subject assignment context
 */
export function buildSubjectAssignmentContext(params: {
  subjectKey: string;
  subjectType: 'session' | 'request' | 'user';
  environment?: string;
  surface?: string;
  platform?: string;
  attributionContext?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    subjectKey: params.subjectKey,
    subjectType: params.subjectType,
    environment: params.environment,
    surface: params.surface,
    platform: params.platform,
    attribution: params.attributionContext,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Hash identifier for privacy
 */
function hashIdentifier(identifier: string, type: string): string {
  const salt = process.env.EXPERIMENT_SALT;
  if (!salt) {
    throw new Error(
      'FATAL: EXPERIMENT_SALT is not set. ' +
        'Set a random string (min 16 chars) in your environment for experiment privacy.'
    );
  }
  const combined = `${type}:${identifier}:${salt}`;

  return createHash('sha256')
    .update(combined)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Generate session fingerprint
 */
export function generateSessionFingerprint(): string {
  return crypto.randomUUID();
}

/**
 * Extract subject from request headers
 */
export function extractSubjectFromRequest(headers: Record<string, string | undefined>): SubjectContext {
  return {
    sessionId: headers['x-session-id'] as string,
    requestId: headers['x-request-id'] as string,
    userId: headers['x-user-id'] as string,
    fingerprint: headers['x-fingerprint'] as string,
    ipHash: headers['x-ip-hash'] as string,
  };
}
