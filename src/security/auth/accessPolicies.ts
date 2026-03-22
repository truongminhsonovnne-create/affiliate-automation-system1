/**
 * Security Layer - Access Policies
 * Context-aware policy evaluation beyond basic role permissions
 */

import type { ActorIdentity, SecurityCheckResult, Permission } from '../types';
import { PERMISSIONS } from '../types';
import { hasPermission, hasAnyPermission } from './rolesAndPermissions';
import { isProduction } from '../config/secureEnv';
import { SENSITIVE_MUTATIONS, CONFIRMATION_REQUIRED_MUTATIONS } from '../constants';

// =============================================================================
// POLICY TYPES
// =============================================================================

/** Action types for policy evaluation */
export type PolicyAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'execute'
  | 'admin';

/** Resource types */
export type ResourceType =
  | 'dashboard'
  | 'publish_job'
  | 'crawler'
  | 'ai_enrichment'
  | 'publishing'
  | 'dead_letter'
  | 'audit_log'
  | 'security_event'
  | 'user'
  | 'config'
  | 'secret';

/** Resource context for policy evaluation */
export interface ResourceContext {
  resourceType: ResourceType;
  resourceId?: string;
  resourceOwnerId?: string;
  environment?: string;
  metadata?: Record<string, unknown>;
}

/** Policy evaluation context */
export interface PolicyEvaluationContext {
  actor: ActorIdentity;
  action: PolicyAction;
  resource: ResourceContext;
  requestMetadata?: {
    ip?: string;
    userAgent?: string;
    timestamp?: Date;
  };
}

// =============================================================================
// ACCESS POLICY EVALUATION
// =============================================================================

/**
 * Evaluate access policy for an action on a resource
 */
export function evaluateAccessPolicy(
  actor: ActorIdentity,
  action: PolicyAction,
  resource: ResourceContext
): SecurityCheckResult {
  // Check environment restrictions
  const envCheck = evaluateEnvironmentPolicy(actor, action, resource);
  if (!envCheck.passed) {
    return envCheck;
  }

  // Check role-based access
  const permission = mapActionToPermission(action, resource.resourceType);
  if (permission) {
    const hasAccess = hasPermission(actor, permission, {
      resourceId: resource.resourceId,
      resourceOwnerId: resource.resourceOwnerId,
      environment: resource.environment,
    });

    if (!hasAccess) {
      return {
        passed: false,
        reason: `Permission denied for ${action} on ${resource.resourceType}`,
      };
    }
  }

  // Additional policy checks based on resource type
  switch (resource.resourceType) {
    case 'publish_job':
      return evaluatePublishJobPolicy(actor, action, resource);
    case 'dead_letter':
      return evaluateDeadLetterPolicy(actor, action, resource);
    case 'config':
      return evaluateConfigPolicy(actor, action, resource);
    case 'secret':
      return evaluateSecretPolicy(actor, action, resource);
    case 'user':
      return evaluateUserPolicy(actor, action, resource);
    default:
      return { passed: true };
  }
}

/**
 * Evaluate mutation safety policy
 */
export function evaluateMutationSafetyPolicy(
  actor: ActorIdentity,
  action: string,
  resource: ResourceContext
): SecurityCheckResult {
  // Read-only roles cannot mutate
  if (actor.role === 'readonly_observer') {
    return {
      passed: false,
      reason: 'Read-only observers cannot perform mutations',
    };
  }

  // Check if operation is sensitive
  if (SENSITIVE_MUTATIONS.has(action)) {
    // In production, additional checks may be required
    if (isProduction()) {
      // Production may have additional approval requirements
      const warning = `Sensitive mutation '${action}' - ensure proper authorization`;
      return {
        passed: true,
        warnings: [warning],
      };
    }
  }

  return { passed: true };
}

/**
 * Evaluate read access policy
 */
export function evaluateReadAccessPolicy(
  actor: ActorIdentity,
  resource: ResourceContext
): SecurityCheckResult {
  const permission = mapActionToPermission('read', resource.resourceType);

  if (permission) {
    const hasAccess = hasPermission(actor, permission);
    if (!hasAccess) {
      return {
        passed: false,
        reason: `Read access denied for ${resource.resourceType}`,
      };
    }
  }

  // Resource-specific checks
  if (resource.resourceType === 'config') {
    // Only admin+ can read full config
    if (!hasAnyPermission(actor, [PERMISSIONS.ADMIN_USER_READ])) {
      return {
        passed: false,
        reason: 'Insufficient permissions to read configuration',
      };
    }
  }

  return { passed: true };
}

// =============================================================================
// RESOURCE-SPECIFIC POLICIES
// =============================================================================

/**
 * Evaluate publish job policy
 */
function evaluatePublishJobPolicy(
  actor: ActorIdentity,
  action: PolicyAction,
  resource: ResourceContext
): SecurityCheckResult {
  // Cancel requires admin
  if (action === 'delete' || action === 'execute') {
    if (!hasPermission(actor, PERMISSIONS.PUBLISH_JOB_CANCEL)) {
      return {
        passed: false,
        reason: 'Cancel/publish actions require admin role',
      };
    }
  }

  // Unlock requires admin
  if (resource.metadata?.operation === 'unlock') {
    if (!hasPermission(actor, PERMISSIONS.PUBLISH_JOB_UNLOCK)) {
      return {
        passed: false,
        reason: 'Unlock operations require admin role',
      };
    }
  }

  return { passed: true };
}

/**
 * Evaluate dead letter policy
 */
function evaluateDeadLetterPolicy(
  actor: ActorIdentity,
  action: PolicyAction,
  resource: ResourceContext
): SecurityCheckResult {
  // Resolve requires operator at minimum
  if (action === 'update' || action === 'execute') {
    if (!hasAnyPermission(actor, [
      PERMISSIONS.DEAD_LETTER_RESOLVE,
      PERMISSIONS.DEAD_LETTER_REQUEUE,
    ])) {
      return {
        passed: false,
        reason: 'Resolve/requeue dead letters requires operator role',
      };
    }
  }

  return { passed: true };
}

/**
 * Evaluate config policy
 */
function evaluateConfigPolicy(
  actor: ActorIdentity,
  action: PolicyAction,
  resource: ResourceContext
): SecurityCheckResult {
  // Only admin+ can modify config
  if (action === 'update' || action === 'create' || action === 'delete') {
    if (!hasAnyPermission(actor, [PERMISSIONS.ADMIN_USER_MANAGE])) {
      return {
        passed: false,
        reason: 'Configuration modifications require admin role',
      };
    }
  }

  return { passed: true };
}

/**
 * Evaluate secret policy
 */
function evaluateSecretPolicy(
  actor: ActorIdentity,
  action: PolicyAction,
  resource: ResourceContext
): SecurityCheckResult {
  // Only super_admin can manage secrets
  if (actor.role !== 'super_admin' && actor.role !== 'system_worker') {
    return {
      passed: false,
      reason: 'Secret access requires super_admin role',
    };
  }

  // Read-only for metadata, not the secrets themselves
  if (action === 'read') {
    if (!hasPermission(actor, PERMISSIONS.SECRET_METADATA_READ)) {
      return {
        passed: false,
        reason: 'Secret metadata access not permitted',
      };
    }
  }

  return { passed: true };
}

/**
 * Evaluate user policy
 */
function evaluateUserPolicy(
  actor: ActorIdentity,
  action: PolicyAction,
  resource: ResourceContext
): SecurityCheckResult {
  // User management requires admin
  if (action === 'create' || action === 'delete') {
    if (!hasPermission(actor, PERMISSIONS.ADMIN_USER_MANAGE)) {
      return {
        passed: false,
        reason: 'User management requires admin role',
      };
    }
  }

  // Check if modifying own user
  if (resource.resourceOwnerId && resource.resourceOwnerId === actor.id) {
    // Users can read their own profile
    if (action === 'read') {
      return { passed: true };
    }
  }

  return { passed: true };
}

// =============================================================================
// ENVIRONMENT POLICY
// =============================================================================

/**
 * Evaluate environment-based policy
 */
function evaluateEnvironmentPolicy(
  actor: ActorIdentity,
  action: PolicyAction,
  resource: ResourceContext
): SecurityCheckResult {
  const env = resource.environment ?? process.env.NODE_ENV ?? 'development';

  // Production has stricter policies
  if (env === 'production') {
    // Sensitive operations require stronger authentication in prod
    if (SENSITIVE_MUTATIONS.has(action.toUpperCase())) {
      if (actor.role === 'readonly_observer' || actor.role === 'operator') {
        return {
          passed: false,
          reason: `Sensitive operations restricted in production environment`,
        };
      }
    }
  }

  return { passed: true };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Map action + resource type to permission
 */
function mapActionToPermission(
  action: PolicyAction,
  resourceType: ResourceType
): Permission | null {
  const mapping: Record<string, Record<PolicyAction, Permission | null>> = {
    dashboard: {
      read: PERMISSIONS.DASHBOARD_READ,
      create: null,
      update: null,
      delete: null,
      execute: null,
      admin: null,
    },
    publish_job: {
      read: PERMISSIONS.PUBLISH_JOB_READ,
      create: PERMISSIONS.PUBLISH_JOB_CREATE,
      update: null,
      delete: PERMISSIONS.PUBLISH_JOB_CANCEL,
      execute: PERMISSIONS.PUBLISH_JOB_RETRY,
      admin: PERMISSIONS.PUBLISH_JOB_UNLOCK,
    },
    crawler: {
      read: PERMISSIONS.CRAWLER_READ,
      create: null,
      update: null,
      delete: null,
      execute: PERMISSIONS.CRAWLER_EXECUTE,
      admin: null,
    },
    ai_enrichment: {
      read: PERMISSIONS.AI_ENRICHMENT_READ,
      create: null,
      update: null,
      delete: null,
      execute: PERMISSIONS.AI_ENRICHMENT_EXECUTE,
      admin: null,
    },
    publishing: {
      read: PERMISSIONS.PUBLISHING_READ,
      create: PERMISSIONS.PUBLISHING_PREPARE,
      update: null,
      delete: null,
      execute: PERMISSIONS.PUBLISHING_EXECUTE,
      admin: null,
    },
    dead_letter: {
      read: PERMISSIONS.DEAD_LETTER_READ,
      create: null,
      update: null,
      delete: null,
      execute: null,
      admin: null,
    },
    audit_log: {
      read: PERMISSIONS.AUDIT_LOG_READ,
      create: null,
      update: null,
      delete: null,
      execute: null,
      admin: null,
    },
    security_event: {
      read: PERMISSIONS.SECURITY_EVENT_READ,
      create: null,
      update: null,
      delete: null,
      execute: null,
      admin: PERMISSIONS.SECURITY_EVENT_MANAGE,
    },
    user: {
      read: PERMISSIONS.ADMIN_USER_READ,
      create: PERMISSIONS.ADMIN_USER_MANAGE,
      update: PERMISSIONS.ADMIN_USER_MANAGE,
      delete: PERMISSIONS.ADMIN_USER_MANAGE,
      execute: null,
      admin: PERMISSIONS.ADMIN_USER_MANAGE,
    },
    config: {
      read: PERMISSIONS.CONFIG_READ,
      create: PERMISSIONS.ADMIN_USER_MANAGE,
      update: PERMISSIONS.ADMIN_USER_MANAGE,
      delete: null,
      execute: null,
      admin: PERMISSIONS.ADMIN_USER_MANAGE,
    },
    secret: {
      read: PERMISSIONS.SECRET_METADATA_READ,
      create: null,
      update: null,
      delete: null,
      execute: null,
      admin: null,
    },
  };

  return mapping[resourceType]?.[action] ?? null;
}

/**
 * Check if action requires confirmation
 */
export function requiresConfirmation(action: string): boolean {
  return CONFIRMATION_REQUIRED_MUTATIONS.has(action.toUpperCase());
}
