/**
 * Security Layer - Control Plane Security Integration
 * Integration of security layer into control plane
 */

import type { RequestGuardContext } from '../http/requestGuards';
import { guardInternalAPIRequest, guardAdminMutation } from '../http/requestGuards';
import { authenticateInternalRequest } from '../auth/internalTokenAuth';
import { evaluateAccessPolicy } from '../auth/accessPolicies';
import { createActorIdentity } from '../auth/rolesAndPermissions';
import { recordPermissionDeniedEvent, recordSecurityViolation } from '../audit/securityAuditLogger';
import type { ActorIdentity, Permission } from '../types';

// =============================================================================
// REQUEST SECURITY
// =============================================================================

/** Options for securing control plane request */
export interface SecureControlPlaneRequestOptions {
  /** Required permission */
  requiredPermission?: Permission;

  /** Allow unauthenticated (for health checks) */
  allowUnauthenticated?: boolean;

  /** Require admin role */
  requireAdmin?: boolean;

  /** Custom guard function */
  guard?: (context: RequestGuardContext) => { passed: boolean; reason?: string };
}

/**
 * Secure control plane request
 */
export async function secureControlPlaneRequest(
  requestContext: RequestGuardContext,
  options: SecureControlPlaneRequestOptions = {}
): Promise<{
  secure: boolean;
  actor?: ActorIdentity;
  error?: string;
}> {
  // Apply request guards
  const guardResult = options.guard
    ? options.guard(requestContext)
    : guardInternalAPIRequest(requestContext);

  if (!guardResult.passed) {
    recordSecurityViolation(
      'violation_invalid_origin',
      `Request guard failed: ${guardResult.reason}`,
      {
        metadata: {
          path: requestContext.path,
          method: requestContext.method,
        },
      }
    );
    return { secure: false, error: guardResult.reason };
  }

  // Check authentication
  if (!options.allowUnauthenticated) {
    const authResult = authenticateInternalRequest(requestContext, {
      audience: 'control-plane',
    });

    if (!authResult.authenticated) {
      return { secure: false, error: authResult.error };
    }

    // Check permissions if required
    if (options.requiredPermission) {
      const hasPermission = evaluateAccessPolicy(
        authResult.context!.actor,
        'execute',
        { resourceType: 'internal' }
      );

      if (!hasPermission.passed) {
        recordPermissionDeniedEvent(
          authResult.context!.actor,
          options.requiredPermission,
          requestContext.path
        );
        return { secure: false, error: 'Insufficient permissions' };
      }
    }

    return { secure: true, actor: authResult.context!.actor };
  }

  return { secure: true };
}

/**
 * Secure admin mutation request
 */
export async function secureAdminMutationRequest(
  requestContext: RequestGuardContext,
  actor: ActorIdentity,
  action: string,
  options?: {
    resourceType?: string;
  }
): Promise<{
  secure: boolean;
  error?: string;
}> {
  // Apply mutation guard
  const guardResult = guardAdminMutation(requestContext);

  if (!guardResult.passed) {
    recordSecurityViolation(
      'violation_invalid_origin',
      `Admin mutation guard failed: ${guardResult.reason}`,
      {
        actor,
        metadata: {
          action,
          path: requestContext.path,
        },
      }
    );
    return { secure: false, error: guardResult.reason };
  }

  // Evaluate access policy
  const policyResult = evaluateAccessPolicy(
    actor,
    'execute',
    {
      resourceType: options?.resourceType ?? 'internal',
      resourceId: requestContext.path,
    }
  );

  if (!policyResult.passed) {
    recordPermissionDeniedEvent(actor, action as Permission, requestContext.path);
    return { secure: false, error: policyResult.reason };
  }

  return { secure: true };
}

// =============================================================================
// RESPONSE SANITIZATION
// =============================================================================

import { sanitizeAdminApiResponse } from '../data/responseSanitizer';

/**
 * Sanitize control plane response
 */
export function sanitizeControlPlaneResponse(
  data: unknown,
  context?: {
    target?: 'admin' | 'operator';
    resourceType?: string;
  }
): unknown {
  return sanitizeAdminApiResponse(data, {
    target: context?.target ?? 'admin',
    resourceType: context?.resourceType,
  });
}
