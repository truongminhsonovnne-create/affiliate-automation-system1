/**
 * Auth Guard Middleware - HARDENED VERSION
 *
 * Enforces authorization for admin actions.
 * Works with FAIL-CLOSED authentication (actor can be null).
 */

import type { Request, Response, NextFunction } from 'express';
import type { AdminActionType } from '../../types.js';
import { authorizeAdminAction, ensureAdminActionAllowed } from '../../auth/internalAuth.js';
import { createResponseBuilder } from '../../contracts.js';

/**
 * Middleware factory to require authentication
 *
 * Use this as the FIRST auth middleware for protected routes.
 * Returns 401 if not authenticated.
 */
export function requireAuthentication(req: Request, res: Response, next: NextFunction): void {
  const actor = req.cpContext?.actor;

  if (!actor) {
    const response = createResponseBuilder(
      req.cpContext?.correlationId || 'unknown',
      req.cpContext?.requestId
    ).unauthorized('Authentication required');

    res.status(401).json(response);
    return;
  }

  next();
}

/**
 * Middleware factory to require specific action permission
 *
 * MUST be used AFTER requireAuthentication or requestContextMiddleware.
 */
export function requireAction(action: AdminActionType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const actor = req.cpContext?.actor;

      // Should not happen if requireAuthentication is used first
      if (!actor) {
        const response = createResponseBuilder(
          req.cpContext?.correlationId || 'unknown',
          req.cpContext?.requestId
        ).unauthorized('Authentication required');

        res.status(401).json(response);
        return;
      }

      const decision = authorizeAdminAction(actor, action, {
        path: req.path,
        method: req.method,
        sourceIp: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (!decision.allowed) {
        const response = createResponseBuilder(
          req.cpContext?.correlationId || 'unknown',
          req.cpContext?.requestId
        ).forbidden(decision.reason || 'Access denied');

        res.status(403).json(response);
        return;
      }

      next();
    } catch (err) {
      const response = createResponseBuilder(
        req.cpContext?.correlationId || 'unknown',
        req.cpContext?.requestId
      ).internal('Authorization check failed');

      res.status(500).json(response);
    }
  };
}

/**
 * Middleware factory to require minimum role
 *
 * MUST be used AFTER requireAuthentication.
 */
export function requireRole(minRole: 'readonly_observer' | 'operator' | 'admin' | 'super_admin') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const actor = req.cpContext?.actor;

      if (!actor) {
        const response = createResponseBuilder(
          req.cpContext?.correlationId || 'unknown',
          req.cpContext?.requestId
        ).unauthorized('Authentication required');

        res.status(401).json(response);
        return;
      }

      const roleHierarchy: Record<string, number> = {
        readonly_observer: 0,
        operator: 1,
        admin: 2,
        super_admin: 3,
      };

      if ((roleHierarchy[actor.role] ?? 0) < roleHierarchy[minRole]) {
        const response = createResponseBuilder(
          req.cpContext?.correlationId || 'unknown',
          req.cpContext?.requestId
        ).forbidden(`Requires ${minRole} role or higher`);

        res.status(403).json(response);
        return;
      }

      next();
    } catch (err) {
      const response = createResponseBuilder(
        req.cpContext?.correlationId || 'unknown',
        req.cpContext?.requestId
      ).internal('Role check failed');

      res.status(500).json(response);
    }
  };
}

/**
 * Optional auth middleware - continues even if not authenticated
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.cpContext) {
    console.warn('Request context missing - ensure requestContextMiddleware is registered first');
  }
  next();
}

/**
 * Health check endpoint bypass - doesn't require auth
 */
export function skipAuth(req: Request, res: Response, next: NextFunction): void {
  next();
}
