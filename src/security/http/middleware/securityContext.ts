/**
 * Security Layer - Security Context Middleware
 * Middleware for creating unified security context
 */

import { randomUUID } from 'crypto';
import type { ActorIdentity, InternalAuthContext, TrustedExecutionContext } from '../../types';
import { SECURITY_DOMAINS } from '../../types';
import { getCurrentEnvironment } from '../../policies/environmentPolicies';

// =============================================================================
// CONTEXT TYPES
// =============================================================================

/** Security context */
export interface SecurityContext {
  /** Request ID */
  requestId: string;

  /** Correlation ID */
  correlationId: string;

  /** Execution context */
  executionContext: TrustedExecutionContext;

  /** Actor context (if authenticated) */
  actorContext?: InternalAuthContext;

  /** Request metadata */
  metadata: {
    ip?: string;
    userAgent?: string;
    timestamp: Date;
    path: string;
    method: string;
  };
}

/** Request context */
export interface RequestSecurityContext {
  headers: Record<string, string | undefined>;
  ip?: string;
  method: string;
  path: string;
  body?: unknown;
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Create security context from request
 */
export function createSecurityContext(
  request: RequestSecurityContext,
  options?: {
    correlationId?: string;
    actorContext?: InternalAuthContext;
  }
): SecurityContext {
  const requestId = randomUUID();
  const correlationId = options?.correlationId ?? request.headers['x-correlation-id'] ?? randomUUID();

  const executionContext: TrustedExecutionContext = {
    domain: SECURITY_DOMAINS.CONTROL_PLANE,
    isServerEnvironment: true,
    isWorkerEnvironment: false,
    isControlPlane: true,
    environment: getCurrentEnvironment(),
    requestId,
    correlationId,
  };

  return {
    requestId,
    correlationId,
    executionContext,
    actorContext: options?.actorContext,
    metadata: {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      timestamp: new Date(),
      path: request.path,
      method: request.method,
    },
  };
}

/**
 * Create anonymous security context
 */
export function createAnonymousSecurityContext(path: string, method: string): SecurityContext {
  const requestId = randomUUID();
  const correlationId = randomUUID();

  return {
    requestId,
    correlationId,
    executionContext: {
      domain: SECURITY_DOMAINS.CONTROL_PLANE,
      isServerEnvironment: true,
      isWorkerEnvironment: false,
      isControlPlane: true,
      environment: getCurrentEnvironment(),
      requestId,
      correlationId,
    },
    metadata: {
      timestamp: new Date(),
      path,
      method,
    },
  };
}

// =============================================================================
// CTX MANAGEMENT
// =============================================================================

/** Context storage (use AsyncLocalStorage in production) */
const contextStorage = new Map<string, SecurityContext>();

/**
 * Set context for current request
 */
export function setSecurityContext(context: SecurityContext): void {
  contextStorage.set(context.requestId, context);
}

/**
 * Get context for current request
 */
export function getSecurityContext(requestId?: string): SecurityContext | undefined {
  if (requestId) {
    return contextStorage.get(requestId);
  }
  // Return most recent context
  const contexts = Array.from(contextStorage.values());
  return contexts[contexts.length - 1];
}

/**
 * Delete context
 */
export function deleteSecurityContext(requestId: string): void {
  contextStorage.delete(requestId);
}

/**
 * Clear all contexts (for testing)
 */
export function clearSecurityContexts(): void {
  contextStorage.clear();
}

// =============================================================================
// REQUEST ID EXTRACTION
// =============================================================================

/**
 * Extract request ID from headers
 */
export function extractRequestId(headers: Record<string, string | undefined>): string {
  return (
    headers['x-request-id'] ??
    headers['x-correlation-id'] ??
    randomUUID()
  );
}

/**
 * Extract correlation ID from headers
 */
export function extractCorrelationId(headers: Record<string, string | undefined>): string {
  return (
    headers['x-correlation-id'] ??
    headers['x-request-id'] ??
    randomUUID()
  );
}

// =============================================================================
// CONTEXT PROPAGATION
// =============================================================================

/**
 * Build headers for context propagation
 */
export function buildContextPropagationHeaders(context: SecurityContext): Record<string, string> {
  return {
    'x-request-id': context.requestId,
    'x-correlation-id': context.correlationId,
  };
}

/**
 * Merge incoming context headers
 */
export function mergeIncomingContext(
  incoming: Record<string, string | undefined>,
  current: SecurityContext
): SecurityContext {
  const incomingRequestId = incoming['x-request-id'];
  const incomingCorrelationId = incoming['x-correlation-id'];

  return {
    ...current,
    correlationId: incomingCorrelationId ?? current.correlationId,
    executionContext: {
      ...current.executionContext,
      requestId: incomingRequestId ?? current.requestId,
      correlationId: incomingCorrelationId ?? current.correlationId,
    },
  };
}
