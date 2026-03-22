/**
 * Request Context Middleware - HARDENED VERSION
 *
 * Creates request context with correlation ID and authentication.
 * FAIL-CLOSED: No authentication = no actor in context.
 */

import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { AdminActor, ControlPlaneRequestContext } from '../../types.js';
import { resolveAdminActor, resolveAdminActorRequired } from '../../auth/internalAuth.js';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER, DEFAULT_CORRELATION_PREFIX } from '../../constants.js';

declare global {
  namespace Express {
    interface Request {
      cpContext?: ControlPlaneRequestContext;
      startTime?: number;
    }
  }
}

/**
 * Generate correlation ID
 */
function generateCorrelationId(): string {
  return `${DEFAULT_CORRELATION_PREFIX}_${Date.now().toString(36)}_${uuidv4().substring(0, 8)}`;
}

/**
 * Request context middleware - HARDENED VERSION
 *
 * This middleware:
 * 1. Always runs authentication
 * 2. Returns null actor if no valid authentication
 * 3. Does NOT auto-create default actor anymore
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Get or generate correlation ID
  const correlationId = req.headers[CORRELATION_ID_HEADER] as string || generateCorrelationId();

  // Get request ID
  const requestId = req.headers[REQUEST_ID_HEADER] as string || `req_${Date.now().toString(36)}`;

  // Resolve actor - FAIL CLOSED (returns null if not authenticated)
  const actor = resolveAdminActor({
    headers: req.headers as Record<string, string | undefined>,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  });

  // Create context
  req.cpContext = {
    correlationId,
    requestId,
    actor, // Can be null if not authenticated
    sourceIp: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
    isAuthenticated: actor !== null,
  };

  req.startTime = startTime;

  // Add correlation ID to response headers
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}

/**
 * Require authentication middleware - MUST be authenticated
 *
 * Use this for routes that REQUIRE authentication.
 * Returns 401 if not authenticated.
 */
export function requireAuthentication(req: Request, res: Response, next: NextFunction): void {
  if (!req.cpContext?.actor) {
    res.status(401).json({
      ok: false,
      status: 'error',
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

/**
 * Get request context
 */
export function getRequestContext(req: Request): ControlPlaneRequestContext | undefined {
  return req.cpContext;
}

/**
 * Get actor from request
 */
export function getActor(req: Request): AdminActor | undefined {
  return req.cpContext?.actor;
}

/**
 * Get correlation ID from request
 */
export function getCorrelationId(req: Request): string {
  return req.cpContext?.correlationId || generateCorrelationId();
}

/**
 * Check if request is authenticated
 */
export function isAuthenticated(req: Request): boolean {
  return req.cpContext?.isAuthenticated === true && req.cpContext?.actor !== null;
}
