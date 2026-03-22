/**
 * Security Layer - Dashboard Security Integration
 * Integration of security layer into dashboard/frontend
 */

import type { ActorIdentity } from '../types';
import { PERMISSIONS } from '../types';
import { hasPermission, hasPermissionGroup, getRolePermissions } from '../auth/rolesAndPermissions.js';
import { sanitizeAdminApiResponse } from '../data/responseSanitizer';
import { isFieldPublicSafe, isFieldRestricted } from '../data/dataClassification';

// =============================================================================
// DATA SANITIZATION
// =============================================================================

/**
 * Sanitize dashboard data for client
 */
export function sanitizeDashboardDataForClient(
  data: unknown,
  context?: {
    actor: ActorIdentity;
    resourceType?: string;
  }
): unknown {
  // Determine target based on role
  const target = context?.actor.role === 'readonly_observer'
    ? 'operator'
    : 'admin';

  return sanitizeAdminApiResponse(data, {
    target,
    resourceType: context?.resourceType,
    actorRole: context?.actor.role,
  });
}

// =============================================================================
// ACCESS ENFORCEMENT
// =============================================================================

/**
 * Enforce dashboard access
 */
export function enforceDashboardAccess(
  actor: ActorIdentity,
  resource: string,
  context?: {
    resourceId?: string;
    action?: 'read' | 'write' | 'execute';
  }
): {
  allowed: boolean;
  error?: string;
} {
  // Map resource to permission
  const permission = mapResourceToPermission(resource, context?.action ?? 'read');

  if (!permission) {
    return { allowed: true }; // Unknown resource, allow
  }

  if (!hasPermission(actor, permission)) {
    return {
      allowed: false,
      error: `Access denied to ${resource}`,
    };
  }

  return { allowed: true };
}

// =============================================================================
// PERMISSION SNAPSHOT
// =============================================================================

/**
 * Build frontend permission snapshot
 */
export function buildFrontendPermissionSnapshot(
  actor: ActorIdentity,
  context?: {
    includeGroups?: boolean;
  }
): {
  role: string;
  permissions: string[];
  groups?: Record<string, boolean>;
  canAccess: (resource: string) => boolean;
} {
  const includeGroups = context?.includeGroups ?? true;

  // Get all permissions for role
  const permissions = getRolePermissions(actor.role);

  // Build groups if requested
  const groups = includeGroups
    ? {
        dashboard: hasPermissionGroup(actor, 'DASHBOARD'),
        publishJobs: hasPermissionGroup(actor, 'PUBLISH_JOBS'),
        crawler: hasPermissionGroup(actor, 'CRAWLER'),
        aiEnrichment: hasPermissionGroup(actor, 'AI_ENRICHMENT'),
        publishing: hasPermissionGroup(actor, 'PUBLISHING'),
        deadLetter: hasPermissionGroup(actor, 'DEAD_LETTER'),
        audit: hasPermissionGroup(actor, 'AUDIT'),
        admin: hasPermissionGroup(actor, 'ADMIN'),
      }
    : undefined;

  return {
    role: actor.role,
    permissions: [...permissions],
    groups,
    canAccess: (resource: string) => {
      const permission = mapResourceToPermission(resource, 'read');
      return permission ? hasPermission(actor, permission) : true;
    },
  };
}

// =============================================================================
// UI HELPER
// =============================================================================

/**
 * Check if field should be shown in UI
 */
export function shouldShowFieldInUI(
  fieldName: string,
  actor: ActorIdentity
): {
  show: boolean;
  reason?: string;
} {
  // Check if restricted
  if (isFieldRestricted(fieldName)) {
    // Only admin+ can see restricted fields
    if (actor.role !== 'admin' && actor.role !== 'super_admin') {
      return {
        show: false,
        reason: 'Insufficient permissions',
      };
    }
  }

  return { show: true };
}

/**
 * Get visible fields for actor
 */
export function getVisibleFields(
  fields: string[],
  actor: ActorIdentity
): string[] {
  return fields.filter((field) => shouldShowFieldInUI(field, actor).show);
}

// =============================================================================
// HELPER
// =============================================================================

/**
 * Map resource to permission
 */
function mapResourceToPermission(
  resource: string,
  action: 'read' | 'write' | 'execute'
): string | null {
  const mapping: Record<string, Record<string, string>> = {
    dashboard: {
      read: PERMISSIONS.DASHBOARD_READ,
    },
    'publish-jobs': {
      read: PERMISSIONS.PUBLISH_JOB_READ,
      write: PERMISSIONS.PUBLISH_JOB_CREATE,
      execute: PERMISSIONS.PUBLISH_JOB_RETRY,
    },
    crawler: {
      read: PERMISSIONS.CRAWLER_READ,
      execute: PERMISSIONS.CRAWLER_EXECUTE,
    },
    'ai-enrichment': {
      read: PERMISSIONS.AI_ENRICHMENT_READ,
      execute: PERMISSIONS.AI_ENRICHMENT_EXECUTE,
    },
    publishing: {
      read: PERMISSIONS.PUBLISHING_READ,
      execute: PERMISSIONS.PUBLISHING_EXECUTE,
    },
    'dead-letters': {
      read: PERMISSIONS.DEAD_LETTER_READ,
      execute: PERMISSIONS.DEAD_LETTER_REQUEUE,
    },
    audit: {
      read: PERMISSIONS.AUDIT_LOG_READ,
      write: PERMISSIONS.SECURITY_EVENT_MANAGE,
    },
    'security-events': {
      read: PERMISSIONS.SECURITY_EVENT_READ,
    },
    users: {
      read: PERMISSIONS.ADMIN_USER_READ,
      write: PERMISSIONS.ADMIN_USER_MANAGE,
    },
    config: {
      read: PERMISSIONS.CONFIG_READ,
    },
  };

  return mapping[resource]?.[action] ?? null;
}
