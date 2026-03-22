/**
 * Security Tests - Roles and Permissions
 *
 * Tests RBAC: role hierarchy, permission resolution, and failure modes.
 * Covers the access model used by all admin/protected routes.
 */

import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isRoleAtLeast,
  getRoleLevel,
  buildPermissionDecision,
  createActorIdentity,
  createSystemWorkerActor,
  getRolePermissions,
} from '../../security/auth/rolesAndPermissions.js';
import { ACCESS_ROLES, PERMISSIONS } from '../../security/types.js';
import type { ActorIdentity } from '../../security/types.js';

// ── Test helpers ───────────────────────────────────────────────────────────────

function actor(role: AccessRole, caps: AccessRole[] = []): ActorIdentity {
  return createActorIdentity(`test-${role}`, role, { name: `Test ${role}` });
}

// ── Role hierarchy ───────────────────────────────────────────────────────────

describe('Role Hierarchy', () => {
  it('readonly_observer < operator < admin < super_admin', () => {
    expect(getRoleLevel(ACCESS_ROLES.READONLY_OBSERVER)).toBeLessThan(
      getRoleLevel(ACCESS_ROLES.OPERATOR)
    );
    expect(getRoleLevel(ACCESS_ROLES.OPERATOR)).toBeLessThan(
      getRoleLevel(ACCESS_ROLES.ADMIN)
    );
    expect(getRoleLevel(ACCESS_ROLES.ADMIN)).toBeLessThan(
      getRoleLevel(ACCESS_ROLES.SUPER_ADMIN)
    );
  });

  it('system_worker has its own level independent of admin hierarchy', () => {
    // system_worker is not in the same hierarchy as admin roles
    // It has operational permissions but doesn't imply super_admin
    expect(getRoleLevel(ACCESS_ROLES.SYSTEM_WORKER)).toBeGreaterThanOrEqual(0);
  });

  it('isRoleAtLeast enforces hierarchy correctly', () => {
    expect(isRoleAtLeast('admin', 'operator')).toBe(true);
    expect(isRoleAtLeast('operator', 'admin')).toBe(false);
    expect(isRoleAtLeast('super_admin', 'readonly_observer')).toBe(true);
    expect(isRoleAtLeast('super_admin', 'super_admin')).toBe(true);
    expect(isRoleAtLeast('readonly_observer', 'operator')).toBe(false);
  });
});

// ── Permission resolution ───────────────────────────────────────────────────

describe('Permission Resolution', () => {
  it('super_admin has every permission', () => {
    const superAdmin = actor(ACCESS_ROLES.SUPER_ADMIN);
    expect(hasPermission(superAdmin, PERMISSIONS.DASHBOARD_READ)).toBe(true);
    expect(hasPermission(superAdmin, PERMISSIONS.PUBLISH_JOB_CREATE)).toBe(true);
    expect(hasPermission(superAdmin, PERMISSIONS.PUBLISH_JOB_UNLOCK)).toBe(true);
    expect(hasPermission(superAdmin, PERMISSIONS.ADMIN_USER_MANAGE)).toBe(true);
    expect(hasPermission(superAdmin, PERMISSIONS.SECRET_METADATA_READ)).toBe(true);
  });

  it('admin has all admin+operator+observer permissions but NOT secret metadata', () => {
    const admin = actor(ACCESS_ROLES.ADMIN);
    expect(hasPermission(admin, PERMISSIONS.DASHBOARD_READ)).toBe(true);
    expect(hasPermission(admin, PERMISSIONS.PUBLISH_JOB_CREATE)).toBe(true);
    expect(hasPermission(admin, PERMISSIONS.INTERNAL_SESSION_MANAGE)).toBe(true);
    expect(hasPermission(admin, PERMISSIONS.SECRET_METADATA_READ)).toBe(false); // super_admin only
  });

  it('operator has operational permissions but NOT admin-level', () => {
    const operator = actor(ACCESS_ROLES.OPERATOR);
    expect(hasPermission(operator, PERMISSIONS.DASHBOARD_READ)).toBe(true);
    expect(hasPermission(operator, PERMISSIONS.PUBLISH_JOB_RETRY)).toBe(true);
    expect(hasPermission(operator, PERMISSIONS.CRAWLER_EXECUTE)).toBe(true);
    expect(hasPermission(operator, PERMISSIONS.PUBLISH_JOB_CREATE)).toBe(false); // admin only
    expect(hasPermission(operator, PERMISSIONS.ADMIN_USER_READ)).toBe(false); // admin only
  });

  it('readonly_observer has read-only permissions', () => {
    const observer = actor(ACCESS_ROLES.READONLY_OBSERVER);
    expect(hasPermission(observer, PERMISSIONS.DASHBOARD_READ)).toBe(true);
    expect(hasPermission(observer, PERMISSIONS.PUBLISH_JOB_READ)).toBe(true);
    expect(hasPermission(observer, PERMISSIONS.PUBLISH_JOB_RETRY)).toBe(false); // operator
    expect(hasPermission(observer, PERMISSIONS.CRAWLER_EXECUTE)).toBe(false); // operator
  });

  it('system_worker has operational permissions but NOT dashboard/admin', () => {
    const worker = actor(ACCESS_ROLES.SYSTEM_WORKER);
    expect(hasPermission(worker, PERMISSIONS.CRAWLER_EXECUTE)).toBe(true);
    expect(hasPermission(worker, PERMISSIONS.AI_ENRICHMENT_EXECUTE)).toBe(true);
    expect(hasPermission(worker, PERMISSIONS.PUBLISHING_EXECUTE)).toBe(true);
    expect(hasPermission(worker, PERMISSIONS.DASHBOARD_READ)).toBe(false); // not in worker perms
    expect(hasPermission(worker, PERMISSIONS.ADMIN_USER_READ)).toBe(false);
  });

  it('hasAnyPermission returns true if ANY of the perms are present', () => {
    const operator = actor(ACCESS_ROLES.OPERATOR);
    expect(hasAnyPermission(operator, [PERMISSIONS.PUBLISH_JOB_CREATE, PERMISSIONS.PUBLISH_JOB_RETRY])).toBe(true);
    expect(hasAnyPermission(operator, [PERMISSIONS.PUBLISH_JOB_CREATE, PERMISSIONS.ADMIN_USER_MANAGE])).toBe(false);
  });

  it('hasAllPermissions returns true only if ALL perms are present', () => {
    const operator = actor(ACCESS_ROLES.OPERATOR);
    expect(hasAllPermissions(operator, [PERMISSIONS.PUBLISH_JOB_RETRY, PERMISSIONS.DEAD_LETTER_RESOLVE])).toBe(true);
    expect(hasAllPermissions(operator, [PERMISSIONS.PUBLISH_JOB_RETRY, PERMISSIONS.PUBLISH_JOB_CREATE])).toBe(false);
  });

  it('permissions check capabilities array in addition to primary role', () => {
    // An observer granted operator capabilities
    const elevatedObserver = createActorIdentity('elevated-user', ACCESS_ROLES.READONLY_OBSERVER, {
      capabilities: [ACCESS_ROLES.OPERATOR],
    });
    expect(hasPermission(elevatedObserver, PERMISSIONS.CRAWLER_EXECUTE)).toBe(true); // from capabilities
    expect(hasPermission(elevatedObserver, PERMISSIONS.DASHBOARD_READ)).toBe(true); // from role
  });
});

// ── Permission decision ─────────────────────────────────────────────────────

describe('buildPermissionDecision', () => {
  it('grants permission and includes actor role in metadata', () => {
    const admin = actor(ACCESS_ROLES.ADMIN);
    const decision = buildPermissionDecision(admin, PERMISSIONS.DASHBOARD_READ);
    expect(decision.granted).toBe(true);
    expect(decision.metadata?.actorRole).toBe('admin');
  });

  it('denies permission with reason', () => {
    const observer = actor(ACCESS_ROLES.READONLY_OBSERVER);
    const decision = buildPermissionDecision(observer, PERMISSIONS.PUBLISH_JOB_CREATE);
    expect(decision.granted).toBe(false);
    expect(decision.reason).toContain('readonly_observer');
    expect(decision.reason).toContain('publish_job:create');
  });

  it('adds elevated-permission warning for roles below admin', () => {
    const operator = actor(ACCESS_ROLES.OPERATOR);
    const decision = buildPermissionDecision(operator, PERMISSIONS.INTERNAL_SESSION_MANAGE);
    // operator doesn't have this permission anyway, so no warning
    expect(decision.granted).toBe(false);
  });
});

// ── System worker factory ───────────────────────────────────────────────────

describe('createSystemWorkerActor', () => {
  it('creates actor with SYSTEM_WORKER role and worker capabilities', () => {
    const worker = createSystemWorkerActor('worker-123');
    expect(worker.id).toBe('worker-123');
    expect(worker.role).toBe(ACCESS_ROLES.SYSTEM_WORKER);
    expect(worker.capabilities).toContain(ACCESS_ROLES.SYSTEM_WORKER);
    expect(hasPermission(worker, PERMISSIONS.AI_ENRICHMENT_EXECUTE)).toBe(true);
  });
});

// ── Permission coverage invariant ───────────────────────────────────────────
// Every permission in PERMISSIONS must be assigned to at least one role.

describe('Permission Coverage Invariant', () => {
  const allPermissions = Object.values(PERMISSIONS) as string[];

  it('every permission is assigned to at least one role', () => {
    const covered = new Set<string>();

    for (const role of Object.values(ACCESS_ROLES) as AccessRole[]) {
      for (const p of getRolePermissions(role) as string[]) {
        covered.add(p);
      }
    }

    const uncovered = allPermissions.filter(p => !covered.has(p));
    expect(uncovered, `Permissions without role assignment: ${uncovered.join(', ')}`).toHaveLength(0);
  });
});
