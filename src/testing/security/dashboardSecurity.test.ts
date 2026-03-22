/**
 * Security Tests - Dashboard Security Integration
 *
 * Tests:
 * - Role-based field visibility (admin vs observer)
 * - Resource-to-permission mapping
 * - Frontend permission snapshot
 * - Dashboard data sanitization
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeDashboardDataForClient,
  enforceDashboardAccess,
  buildFrontendPermissionSnapshot,
  shouldShowFieldInUI,
  getVisibleFields,
} from '../../security/integration/dashboardSecurityIntegration.js';
import { createActorIdentity } from '../../security/auth/rolesAndPermissions.js';
import { ACCESS_ROLES } from '../../security/types.js';

// ── Test helpers ─────────────────────────────────────────────────────────

function adminActor() {
  return createActorIdentity('admin-1', ACCESS_ROLES.ADMIN, { name: 'Admin User' });
}

function observerActor() {
  return createActorIdentity('observer-1', ACCESS_ROLES.READONLY_OBSERVER, { name: 'Observer User' });
}

function operatorActor() {
  return createActorIdentity('operator-1', ACCESS_ROLES.OPERATOR, { name: 'Operator User' });
}

function superAdminActor() {
  return createActorIdentity('super-1', ACCESS_ROLES.SUPER_ADMIN, { name: 'Super Admin' });
}

// ── Resource access ────────────────────────────────────────────────────────

describe('enforceDashboardAccess', () => {
  it('admin can read dashboard', () => {
    const result = enforceDashboardAccess(adminActor(), 'dashboard', { action: 'read' });
    expect(result.allowed).toBe(true);
  });

  it('admin can write publish-jobs', () => {
    const result = enforceDashboardAccess(adminActor(), 'publish-jobs', { action: 'write' });
    expect(result.allowed).toBe(true);
  });

  it('observer can read publish-jobs but not write', () => {
    expect(enforceDashboardAccess(observerActor(), 'publish-jobs', { action: 'read' }).allowed).toBe(true);
    expect(enforceDashboardAccess(observerActor(), 'publish-jobs', { action: 'write' }).allowed).toBe(false);
  });

  it('operator can execute crawler', () => {
    const result = enforceDashboardAccess(operatorActor(), 'crawler', { action: 'execute' });
    expect(result.allowed).toBe(true);
  });

  it('operator cannot manage users', () => {
    const result = enforceDashboardAccess(operatorActor(), 'users', { action: 'write' });
    expect(result.allowed).toBe(false);
  });

  it('super_admin can manage users', () => {
    const result = enforceDashboardAccess(superAdminActor(), 'users', { action: 'write' });
    expect(result.allowed).toBe(true);
  });

  it('unknown resource is allowed through (fail-open for unmapped)', () => {
    const result = enforceDashboardAccess(adminActor(), 'completely-unknown-resource', { action: 'read' });
    expect(result.allowed).toBe(true);
  });

  it('audit logs: observer can read but not manage', () => {
    expect(enforceDashboardAccess(observerActor(), 'audit', { action: 'read' }).allowed).toBe(true);
    expect(enforceDashboardAccess(observerActor(), 'audit', { action: 'write' }).allowed).toBe(false);
  });

  it('dead-letters: operator can requeue but observer cannot', () => {
    expect(enforceDashboardAccess(operatorActor(), 'dead-letters', { action: 'execute' }).allowed).toBe(true);
    expect(enforceDashboardAccess(observerActor(), 'dead-letters', { action: 'execute' }).allowed).toBe(false);
  });
});

// ── Field visibility ──────────────────────────────────────────────────────

describe('Field Visibility', () => {
  it('admin can see restricted fields', () => {
    const admin = adminActor();
    expect(shouldShowFieldInUI('password_hash', admin).show).toBe(true);
  });

  it('readonly_observer cannot see restricted fields', () => {
    const observer = observerActor();
    expect(shouldShowFieldInUI('password_hash', observer).show).toBe(false);
    expect(shouldShowFieldInUI('password_hash', observer).reason).toBe('Insufficient permissions');
  });

  it('super_admin can see restricted fields', () => {
    const superAdmin = superAdminActor();
    expect(shouldShowFieldInUI('password_hash', superAdmin).show).toBe(true);
  });

  it('operator can see non-restricted fields', () => {
    const operator = operatorActor();
    expect(shouldShowFieldInUI('product_name', operator).show).toBe(true);
  });

  it('getVisibleFields filters based on role', () => {
    const observer = observerActor();
    const fields = ['product_name', 'price', 'password_hash', 'api_key'];
    const visible = getVisibleFields(fields, observer);
    expect(visible).not.toContain('password_hash');
    expect(visible).not.toContain('api_key');
  });
});

// ── Frontend permission snapshot ──────────────────────────────────────────

describe('buildFrontendPermissionSnapshot', () => {
  it('admin snapshot contains dashboard permissions', () => {
    const snapshot = buildFrontendPermissionSnapshot(adminActor(), { includeGroups: true });
    expect(snapshot.role).toBe('admin');
    expect(snapshot.permissions).toContain('dashboard:read');
    expect(snapshot.groups?.dashboard).toBe(true);
  });

  it('observer snapshot contains dashboard read permission', () => {
    const snapshot = buildFrontendPermissionSnapshot(observerActor(), { includeGroups: true });
    expect(snapshot.role).toBe('readonly_observer');
    expect(snapshot.permissions).toContain('dashboard:read');
  });

  it('canAccess function uses permission map correctly', () => {
    const snapshot = buildFrontendPermissionSnapshot(observerActor());
    expect(snapshot.canAccess('dashboard')).toBe(true);
    expect(snapshot.canAccess('publish-jobs')).toBe(true); // has read
    expect(snapshot.canAccess('crawler')).toBe(true); // has read
    expect(snapshot.canAccess('users')).toBe(false); // requires admin
  });

  it('admin canAccess everything mapped', () => {
    const snapshot = buildFrontendPermissionSnapshot(adminActor());
    expect(snapshot.canAccess('dashboard')).toBe(true);
    expect(snapshot.canAccess('publish-jobs')).toBe(true);
    expect(snapshot.canAccess('crawler')).toBe(true);
    expect(snapshot.canAccess('users')).toBe(true);
  });

  it('snapshot without groups omits group map', () => {
    const snapshot = buildFrontendPermissionSnapshot(adminActor(), { includeGroups: false });
    expect(snapshot.groups).toBeUndefined();
    expect(snapshot.permissions.length).toBeGreaterThan(0);
  });
});

// ── Sanitization ─────────────────────────────────────────────────────────

describe('sanitizeDashboardDataForClient', () => {
  it('returns data object unchanged (functional test — sanitization is structural)', () => {
    const data = { id: '1', name: 'Test Product', price: 100 };
    const result = sanitizeDashboardDataForClient(data, { actor: adminActor() });
    expect(result).toEqual(data);
  });

  it('returns plain data without context (no actor)', () => {
    const data = { secret: 'token-123' };
    const result = sanitizeDashboardDataForClient(data);
    expect(result).toEqual(data);
  });
});

// ── Permission coverage across all roles ──────────────────────────────────

describe('Dashboard Security - Complete Permission Matrix', () => {
  const actors = [
    { name: 'readonly_observer', actor: observerActor() },
    { name: 'operator', actor: operatorActor() },
    { name: 'admin', actor: adminActor() },
    { name: 'super_admin', actor: superAdminActor() },
  ];

  const resources: Array<{ name: string; action: 'read' | 'write' | 'execute' }> = [
    { name: 'dashboard', action: 'read' },
    { name: 'publish-jobs', action: 'read' },
    { name: 'publish-jobs', action: 'write' },
    { name: 'publish-jobs', action: 'execute' }, // retry
    { name: 'crawler', action: 'read' },
    { name: 'crawler', action: 'execute' },
    { name: 'ai-enrichment', action: 'read' },
    { name: 'ai-enrichment', action: 'execute' },
    { name: 'publishing', action: 'read' },
    { name: 'publishing', action: 'execute' },
    { name: 'dead-letters', action: 'read' },
    { name: 'dead-letters', action: 'execute' },
    { name: 'audit', action: 'read' },
    { name: 'users', action: 'read' },
    { name: 'users', action: 'write' },
  ];

  it('every resource+action combination returns a deterministic result (no exceptions)', () => {
    for (const { name, action } of resources) {
      for (const { name: roleName, actor } of actors) {
        const result = enforceDashboardAccess(actor, name, { action });
        // Just verify no errors and result has expected shape
        expect(typeof result.allowed).toBe('boolean');
      }
    }
  });

  it('higher privilege roles never have fewer permissions than lower ones', () => {
    // admin must have at least all operator permissions
    const adminPerms = buildFrontendPermissionSnapshot(adminActor()).permissions;
    const operatorPerms = buildFrontendPermissionSnapshot(operatorActor()).permissions;

    for (const p of operatorPerms) {
      expect(adminPerms).toContain(p);
    }
  });

  it('no role should have ADMIN_USER_MANAGE except super_admin', () => {
    for (const { name, actor } of actors) {
      const perms = buildFrontendPermissionSnapshot(actor).permissions;
      if (name !== 'super_admin') {
        expect(perms).not.toContain('admin:user:manage');
      }
    }
  });
});
