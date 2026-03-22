/**
 * Security Layer - Roles and Permissions
 * Production-grade role-based access control
 */

import type { ActorIdentity, Permission, PermissionDecision, AccessRole } from '../types';
import { ACCESS_ROLES, PERMISSIONS } from '../types';
import { ROLE_LEVELS, ROLE_HIERARCHY } from '../constants';

// =============================================================================
// ROLE-PERMISSION MAPPING
// =============================================================================

/** Map of roles to their permissions */
const ROLE_PERMISSIONS: Record<AccessRole, Permission[]> = {
  [ACCESS_ROLES.READONLY_OBSERVER]: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.DASHBOARD_STATS_READ,
    PERMISSIONS.PUBLISH_JOB_READ,
    PERMISSIONS.CRAWLER_READ,
    PERMISSIONS.AI_ENRICHMENT_READ,
    PERMISSIONS.PUBLISHING_READ,
    PERMISSIONS.DEAD_LETTER_READ,
    PERMISSIONS.AUDIT_LOG_READ,
    PERMISSIONS.SECURITY_EVENT_READ,
    PERMISSIONS.CONFIG_READ,
  ],

  [ACCESS_ROLES.OPERATOR]: [
    // All readonly permissions
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.DASHBOARD_STATS_READ,
    PERMISSIONS.PUBLISH_JOB_READ,
    PERMISSIONS.CRAWLER_READ,
    PERMISSIONS.AI_ENRICHMENT_READ,
    PERMISSIONS.PUBLISHING_READ,
    PERMISSIONS.DEAD_LETTER_READ,
    PERMISSIONS.AUDIT_LOG_READ,
    PERMISSIONS.SECURITY_EVENT_READ,
    PERMISSIONS.CONFIG_READ,

    // Operator permissions
    PERMISSIONS.PUBLISH_JOB_RETRY,
    PERMISSIONS.PUBLISH_JOB_CANCEL,
    PERMISSIONS.CRAWLER_EXECUTE,
    PERMISSIONS.AI_ENRICHMENT_EXECUTE,
    PERMISSIONS.PUBLISHING_PREPARE,
    PERMISSIONS.DEAD_LETTER_REQUEUE,
    PERMISSIONS.DEAD_LETTER_RESOLVE,
  ],

  [ACCESS_ROLES.ADMIN]: [
    // Readonly
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.DASHBOARD_STATS_READ,
    PERMISSIONS.PUBLISH_JOB_READ,
    PERMISSIONS.CRAWLER_READ,
    PERMISSIONS.AI_ENRICHMENT_READ,
    PERMISSIONS.PUBLISHING_READ,
    PERMISSIONS.DEAD_LETTER_READ,
    PERMISSIONS.AUDIT_LOG_READ,
    PERMISSIONS.SECURITY_EVENT_READ,
    PERMISSIONS.CONFIG_READ,
    // Operator
    PERMISSIONS.PUBLISH_JOB_RETRY,
    PERMISSIONS.PUBLISH_JOB_CANCEL,
    PERMISSIONS.CRAWLER_EXECUTE,
    PERMISSIONS.AI_ENRICHMENT_EXECUTE,
    PERMISSIONS.PUBLISHING_PREPARE,
    PERMISSIONS.DEAD_LETTER_REQUEUE,
    PERMISSIONS.DEAD_LETTER_RESOLVE,
    // Admin
    PERMISSIONS.PUBLISH_JOB_CREATE,
    PERMISSIONS.PUBLISH_JOB_UNLOCK,
    PERMISSIONS.PUBLISHING_EXECUTE,
    PERMISSIONS.ADMIN_USER_READ,
    PERMISSIONS.SECURITY_EVENT_MANAGE,
    PERMISSIONS.INTERNAL_SESSION_MANAGE,
  ],

  [ACCESS_ROLES.SUPER_ADMIN]: [
    // All admin permissions
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.DASHBOARD_STATS_READ,
    PERMISSIONS.PUBLISH_JOB_READ,
    PERMISSIONS.PUBLISH_JOB_CREATE,
    PERMISSIONS.PUBLISH_JOB_RETRY,
    PERMISSIONS.PUBLISH_JOB_CANCEL,
    PERMISSIONS.PUBLISH_JOB_UNLOCK,
    PERMISSIONS.CRAWLER_READ,
    PERMISSIONS.CRAWLER_EXECUTE,
    PERMISSIONS.AI_ENRICHMENT_READ,
    PERMISSIONS.AI_ENRICHMENT_EXECUTE,
    PERMISSIONS.PUBLISHING_READ,
    PERMISSIONS.PUBLISHING_PREPARE,
    PERMISSIONS.PUBLISHING_EXECUTE,
    PERMISSIONS.DEAD_LETTER_READ,
    PERMISSIONS.DEAD_LETTER_REQUEUE,
    PERMISSIONS.DEAD_LETTER_RESOLVE,
    PERMISSIONS.AUDIT_LOG_READ,
    PERMISSIONS.SECURITY_EVENT_READ,
    PERMISSIONS.SECURITY_EVENT_MANAGE,
    PERMISSIONS.INTERNAL_SESSION_MANAGE,
    PERMISSIONS.CONFIG_READ,
    // Admin
    PERMISSIONS.ADMIN_USER_READ,
    // Super admin
    PERMISSIONS.ADMIN_USER_MANAGE,
    PERMISSIONS.SECRET_METADATA_READ,
  ],

  [ACCESS_ROLES.SYSTEM_WORKER]: [
    // Worker gets specific operational permissions
    PERMISSIONS.PUBLISH_JOB_READ,
    PERMISSIONS.PUBLISH_JOB_CREATE,
    PERMISSIONS.CRAWLER_EXECUTE,
    PERMISSIONS.CRAWLER_READ,
    PERMISSIONS.AI_ENRICHMENT_EXECUTE,
    PERMISSIONS.AI_ENRICHMENT_READ,
    PERMISSIONS.PUBLISHING_READ,
    PERMISSIONS.PUBLISHING_EXECUTE,
    PERMISSIONS.DEAD_LETTER_READ,
  ],
};

// =============================================================================
// PERMISSION DECISION
// =============================================================================

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: AccessRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if actor has a specific permission
 */
export function hasPermission(
  actor: ActorIdentity,
  permission: Permission,
  context?: {
    resourceId?: string;
    resourceOwnerId?: string;
    environment?: string;
  }
): boolean {
  // Check if actor's role has the permission
  const rolePermissions = getRolePermissions(actor.role);

  if (rolePermissions.includes(permission)) {
    return true;
  }

  // Check capabilities (for roles with additional capabilities)
  for (const capability of actor.capabilities) {
    const capabilityPermissions = getRolePermissions(capability as AccessRole);
    if (capabilityPermissions.includes(permission)) {
      return true;
    }
  }

  return false;
}

/**
 * Build permission decision with details
 */
export function buildPermissionDecision(
  actor: ActorIdentity,
  permission: Permission,
  context?: {
    resourceId?: string;
    resourceOwnerId?: string;
    environment?: string;
  }
): PermissionDecision {
  const hasThePermission = hasPermission(actor, permission, context);
  const rolePermissions = getRolePermissions(actor.role);

  // Generate reason
  let reason: string | undefined;
  if (!hasThePermission) {
    reason = `Role '${actor.role}' does not have permission '${permission}'`;
  }

  // Generate warnings
  const warnings: string[] = [];

  // Check if permission is at boundary of role
  const roleLevel = ROLE_LEVELS[actor.role] ?? 0;
  if (hasThePermission && roleLevel < 2) {
    warnings.push('Elevated permission - audit recommended');
  }

  return {
    granted: hasThePermission,
    reason,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      actorRole: actor.role,
      permission,
      rolePermissions: rolePermissions.length,
    },
  };
}

/**
 * Require a permission - throws if not granted
 */
export function requirePermission(
  actor: ActorIdentity,
  permission: Permission,
  context?: {
    resourceId?: string;
    resourceOwnerId?: string;
    environment?: string;
  }
): void {
  const decision = buildPermissionDecision(actor, permission, context);

  if (!decision.granted) {
    const error = new Error(decision.reason ?? 'Permission denied');
    (error as any).code = 'PERMISSION_DENIED';
    (error as any).permission = permission;
    (error as any).actor = actor.id;
    throw error;
  }
}

/**
 * Check if actor has any of the permissions
 */
export function hasAnyPermission(
  actor: ActorIdentity,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(actor, p));
}

/**
 * Check if actor has all of the permissions
 */
export function hasAllPermissions(
  actor: ActorIdentity,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(actor, p));
}

// =============================================================================
// ROLE HIERARCHY
// =============================================================================

/**
 * Check if role A is >= role B in hierarchy
 */
export function isRoleAtLeast(roleA: AccessRole, roleB: AccessRole): boolean {
  const levelA = ROLE_LEVELS[roleA] ?? 0;
  const levelB = ROLE_LEVELS[roleB] ?? 0;
  return levelA >= levelB;
}

/**
 * Get role level
 */
export function getRoleLevel(role: AccessRole): number {
  return ROLE_LEVELS[role] ?? 0;
}

/**
 * Get all roles above a certain level
 */
export function getRolesAboveLevel(level: number): AccessRole[] {
  return ROLE_HIERARCHY.filter((role) => ROLE_LEVELS[role] >= level) as AccessRole[];
}

// =============================================================================
// PERMISSION GROUPS
// =============================================================================

/** Permission groups for batch checking */
export const PERMISSION_GROUPS = {
  DASHBOARD: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.DASHBOARD_STATS_READ,
  ],
  PUBLISH_JOBS: [
    PERMISSIONS.PUBLISH_JOB_READ,
    PERMISSIONS.PUBLISH_JOB_CREATE,
    PERMISSIONS.PUBLISH_JOB_RETRY,
    PERMISSIONS.PUBLISH_JOB_CANCEL,
    PERMISSIONS.PUBLISH_JOB_UNLOCK,
  ],
  CRAWLER: [
    PERMISSIONS.CRAWLER_READ,
    PERMISSIONS.CRAWLER_EXECUTE,
  ],
  AI_ENRICHMENT: [
    PERMISSIONS.AI_ENRICHMENT_READ,
    PERMISSIONS.AI_ENRICHMENT_EXECUTE,
  ],
  PUBLISHING: [
    PERMISSIONS.PUBLISHING_READ,
    PERMISSIONS.PUBLISHING_PREPARE,
    PERMISSIONS.PUBLISHING_EXECUTE,
  ],
  DEAD_LETTER: [
    PERMISSIONS.DEAD_LETTER_READ,
    PERMISSIONS.DEAD_LETTER_REQUEUE,
    PERMISSIONS.DEAD_LETTER_RESOLVE,
  ],
  AUDIT: [
    PERMISSIONS.AUDIT_LOG_READ,
    PERMISSIONS.SECURITY_EVENT_READ,
    PERMISSIONS.SECURITY_EVENT_MANAGE,
  ],
  ADMIN: [
    PERMISSIONS.ADMIN_USER_READ,
    PERMISSIONS.ADMIN_USER_MANAGE,
    PERMISSIONS.INTERNAL_SESSION_MANAGE,
  ],
} as const;

/**
 * Check if actor has permission group
 */
export function hasPermissionGroup(
  actor: ActorIdentity,
  groupName: keyof typeof PERMISSION_GROUPS
): boolean {
  const group = PERMISSION_GROUPS[groupName];
  return hasAllPermissions(actor, [...group]);
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create actor identity from user data
 */
export function createActorIdentity(
  userId: string,
  role: AccessRole,
  options?: {
    name?: string;
    email?: string;
    capabilities?: AccessRole[];
    metadata?: Record<string, unknown>;
  }
): ActorIdentity {
  return {
    id: userId,
    name: options?.name ?? userId,
    email: options?.email,
    role,
    capabilities: options?.capabilities ?? [role],
    metadata: options?.metadata,
  };
}

/**
 * Create system worker actor
 */
export function createSystemWorkerActor(workerId: string): ActorIdentity {
  return {
    id: workerId,
    name: `worker:${workerId}`,
    role: ACCESS_ROLES.SYSTEM_WORKER,
    capabilities: [ACCESS_ROLES.SYSTEM_WORKER],
  };
}
