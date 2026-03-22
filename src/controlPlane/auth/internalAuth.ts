/**
 * Internal Authorization - HARDENED VERSION
 *
 * Production-grade internal authorization for the control plane.
 * Removed weak auth mechanisms and default actor fallback.
 * FAIL-CLOSED by default.
 */

import type { AdminActor, AdminRole, AdminActionType, ControlPlaneRequestContext } from '../types.js';
import { ACTION_ROLE_REQUIREMENTS, ROLE_HIERARCHY } from '../types.js';
import {
  DEFAULT_ADMIN_ROLE,
  ALLOWED_ADMIN_ROLES,
  SUPER_ADMIN_ACTIONS,
  ADMIN_ACTIONS,
  OPERATOR_ACTIONS,
} from '../constants.js';
import { createLogger } from '../../observability/logger/structuredLogger.js';

const logger = createLogger({ subsystem: 'control_plane_auth' });

// =============================================================================
// AUTHENTICATION CONFIG
// =============================================================================

/** Environment variable name for internal auth secret - SINGLE SOURCE OF TRUTH */
const INTERNAL_AUTH_SECRET_ENV = 'CONTROL_PLANE_INTERNAL_SECRET';

/** Get the internal auth secret from environment */
function getInternalAuthSecret(): string | undefined {
  return process.env[INTERNAL_AUTH_SECRET_ENV];
}

/** Check if we're in development mode with explicit dev auth enabled */
function isDevModeExplicit(): boolean {
  return process.env.NODE_ENV === 'development' &&
         process.env.EXPLICIT_DEV_AUTH === 'true';
}

/** DEV-ONLY: Get dev secret - MUST NEVER be used in production */
function getDevSecret(): string | undefined {
  return process.env.CONTROL_PLANE_DEV_SECRET;
}

// =============================================================================
// ACTOR RESOLUTION - FAIL CLOSED
// =============================================================================

/**
 * Resolve admin actor from request context
 * FAIL-CLOSED: Returns null if no valid authentication
 */
export function resolveAdminActor(
  requestContext: {
    headers?: Record<string, string | undefined>;
    ip?: string;
    userAgent?: string;
  },
  options?: {
    allowDevFallback?: boolean; // ONLY for explicit dev mode
  }
): AdminActor | null {
  const allowDevFallback = options?.allowDevFallback === true && isDevModeExplicit();
  const internalSecret = getInternalAuthSecret();
  const devSecret = getDevSecret();

  // Extract auth headers
  const authHeader = requestContext.headers?.['authorization'];
  const internalSecretHeader = requestContext.headers?.['x-internal-secret'];
  const xActorId = requestContext.headers?.['x-actor-id'];
  const xActorRole = requestContext.headers?.['x-actor-role'];

  // ===========================================================================
  // MECHANISM 1: Production internal secret (STRONGEST - REQUIRED IN PROD)
  // ===========================================================================
  if (internalSecret && internalSecretHeader === internalSecret) {
    if (!xActorId) {
      logger.warn('Internal secret provided but no x-actor-id');
      return null;
    }

    const role = parseRole(xActorRole) || 'operator';
    const actor: AdminActor = {
      id: xActorId,
      role,
      email: `${xActorId}@internal`,
      displayName: 'Internal Service',
    };

    logger.debug('Authenticated via internal secret', { actorId: actor.id, role: actor.role });
    return actor;
  }

  // ===========================================================================
  // MECHANISM 2: Dev mode explicit fallback (ONLY IF EXPLICITLY ENABLED)
  // ===========================================================================
  if (allowDevFallback && devSecret) {
    // Check dev secret via x-internal-secret or Bearer
    if (internalSecretHeader === devSecret ||
        (authHeader?.startsWith('Bearer ') && authHeader.substring(7) === devSecret)) {

      const actor: AdminActor = {
        id: xActorId || 'dev-user',
        role: parseRole(xActorRole) || 'super_admin',
        email: `${xActorId || 'dev-user'}@dev.local`,
        displayName: 'Dev User',
      };

      logger.warn('DEV MODE: Using dev fallback actor', { actorId: actor.id, role: actor.role });
      return actor;
    }
  }

  // ===========================================================================
  // REMOVED WEAK MECHANISMS (SECURITY HARDENING):
  // - Bearer actorId:role (too easy to spoof)
  // - x-actor-id + x-actor-role headers without secret
  // - Default actor fallback in production
  // ===========================================================================

  // Log authentication failure
  const hasAnyAuth = !!(internalSecretHeader || authHeader || xActorId);
  if (hasAnyAuth) {
    logger.warn('Authentication failed - invalid credentials', {
      hasInternalSecret: !!internalSecret,
      hasAuthHeader: !!authHeader,
      hasXActorId: !!xActorId,
    });
  }

  // FAIL CLOSED: Return null - no authentication
  return null;
}

/**
 * Resolve admin actor with explicit requireAuth flag
 * Throws if authentication fails
 */
export function resolveAdminActorRequired(
  requestContext: {
    headers?: Record<string, string | undefined>;
    ip?: string;
    userAgent?: string;
  }
): AdminActor {
  const actor = resolveAdminActor(requestContext);

  if (!actor) {
    const error = new Error('Authentication required') as Error & { code: string };
    error.code = 'UNAUTHORIZED';
    throw error;
  }

  return actor;
}

/**
 * Parse role from string
 */
function parseRole(roleStr: string | undefined): AdminRole | null {
  if (!roleStr) return null;

  const normalized = roleStr.toLowerCase().replace(/[_\s-]/g, '_');

  if (ALLOWED_ADMIN_ROLES.includes(normalized as AdminRole)) {
    return normalized as AdminRole;
  }

  return null;
}

// =============================================================================
// AUTHORIZATION
// =============================================================================

/**
 * Authorize admin action
 */
export function authorizeAdminAction(
  actor: AdminActor,
  action: AdminActionType,
  context?: {
    sourceIp?: string;
    userAgent?: string;
    path?: string;
    method?: string;
  }
): { allowed: boolean; reason?: string } {
  const requiredRole = ACTION_ROLE_REQUIREMENTS[action];

  if (!requiredRole) {
    logger.warn('Unknown action type', { action, actorId: actor.id });
    return { allowed: false, reason: `Unknown action: ${action}` };
  }

  const hasPermission = hasRoleLevel(actor, requiredRole);

  if (!hasPermission) {
    logger.warn('Permission denied', {
      action,
      actorId: actor.id,
      actorRole: actor.role,
      requiredRole,
    });

    return {
      allowed: false,
      reason: `Role '${actor.role}' requires '${requiredRole}' permission for action '${action}'`,
    };
  }

  logger.debug('Action authorized', {
    action,
    actorId: actor.id,
    actorRole: actor.role,
    requiredRole,
  });

  return { allowed: true };
}

/**
 * Ensure admin action is allowed - throws if not
 */
export function ensureAdminActionAllowed(
  actor: AdminActor,
  action: AdminActionType,
  context?: {
    sourceIp?: string;
    userAgent?: string;
    path?: string;
    method?: string;
  }
): void {
  const decision = authorizeAdminAction(actor, action, context);

  if (!decision.allowed) {
    const error = new Error(decision.reason) as Error & { code: string };
    error.code = 'FORBIDDEN';
    throw error;
  }
}

/**
 * Check if actor can perform action
 */
export function canPerformAction(actor: AdminActor, action: AdminActionType): boolean {
  return authorizeAdminAction(actor, action).allowed;
}

// =============================================================================
// ROLE CHECK HELPERS
// =============================================================================

/**
 * Check if actor is at least a specific role level
 */
export function isAtRoleLevel(actor: AdminActor, minRole: AdminRole): boolean {
  return hasRoleLevel(actor, minRole);
}

/**
 * Check if actor is super admin
 */
export function isSuperAdmin(actor: AdminActor): boolean {
  return actor.role === 'super_admin';
}

/**
 * Check if actor is admin or higher
 */
export function isAdmin(actor: AdminActor): boolean {
  return hasRoleLevel(actor, 'admin');
}

/**
 * Check if actor is operator or higher
 */
export function isOperator(actor: AdminActor): boolean {
  return hasRoleLevel(actor, 'operator');
}

/**
 * Validate role assignment
 */
export function validateRoleAssignment(
  targetRole: AdminRole,
  assignerRole: AdminRole
): { allowed: boolean; reason?: string } {
  // Can't assign higher role than yourself
  if (ROLE_HIERARCHY[targetRole] > ROLE_HIERARCHY[assignerRole]) {
    return {
      allowed: false,
      reason: `Cannot assign role '${targetRole}' higher than your own role '${assignerRole}'`,
    };
  }

  return { allowed: true };
}

/**
 * Create audit context for authorization events
 */
export function createAuthorizationAuditContext(
  actor: AdminActor,
  action: AdminActionType,
  context?: {
    sourceIp?: string;
    userAgent?: string;
    path?: string;
    method?: string;
  }
): Record<string, unknown> {
  return {
    actorId: actor.id,
    actorRole: actor.role,
    actorEmail: actor.email,
    action,
    sourceIp: context?.sourceIp,
    userAgent: context?.userAgent,
    path: context?.path,
    method: context?.method,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if actor has required role level
 */
function hasRoleLevel(actor: AdminActor, requiredRole: AdminRole): boolean {
  const actorLevel = ROLE_HIERARCHY[actor.role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return actorLevel >= requiredLevel;
}
