/**
 * Admin Route Guard — Server Component
 *
 * Last line of defense for RBAC at the server/rendering level.
 * ALWAYS use in conjunction with middleware auth check.
 *
 * How it works:
 *   1. Middleware (Edge) verifies the HMAC-signed session cookie exists + is valid
 *   2. AdminRouteGuard (Server) verifies:
 *        - Session is valid (re-verifies at render time)
 *        - User has the required role (if specified)
 *        - User has the required permission (if specified)
 *
 * SECURITY: Role and permission checks are 100% server-side.
 * The client NEVER provides role data — it's always resolved from the username.
 *
 * IMPORTANT: This component must be used INSIDE a Server Component context
 * (not imported in 'use client' components). Wrap the admin layout instead.
 */

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { permissions, Role } from '@/lib/auth/rbac';
import { getMinimumRole, matchRoute } from '@/lib/auth/routes';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  /**
   * Automatically determine required access from the current route.
   * This is the preferred mode — no need to specify requiredRole/requiredPermission.
   */
  autoGuard?: boolean;
  /**
   * Minimum role required to access this route.
   * Example: 'operator' → operator, admin, and super_admin can access.
   */
  requiredRole?: Role;
  /**
   * Specific permission required to access this route.
   * If set, overrides requiredRole.
   */
  requiredPermission?: keyof typeof permissions;
  /**
   * The current request path (passed from layout/page for autoGuard).
   */
  pathname?: string;
}

function AccessDenied({
  message,
  required,
  current,
}: {
  message: string;
  required?: string;
  current?: string;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '3rem',
            marginBottom: '1rem',
          }}
        >
          🚫
        </div>
        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem',
          }}
        >
          Access Denied
        </h1>
        <p
          style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '1rem',
          }}
        >
          {message}
        </p>
        {required && (
          <p
            style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              marginBottom: '0.25rem',
            }}
          >
            Required: {required}
          </p>
        )}
        {current && (
          <p
            style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
            }}
          >
            Your role: {current}
          </p>
        )}
        <a
          href="/admin/login"
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '0.25rem',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          Go to Login
        </a>
      </div>
    </div>
  );
}

export async function AdminRouteGuard({
  children,
  autoGuard = false,
  requiredRole,
  requiredPermission,
  pathname,
}: AdminRouteGuardProps) {
  // /admin/login page handles auth client-side — skip server-side guard entirely.
  // Without this check, if pathname === '/admin' (not '/admin/login'), the guard
  // would redirect to /admin/login, and the login page's layout would re-trigger
  // the same redirect → infinite loop → white screen.
  if (pathname?.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  // ---- Step 1: Verify session server-side ----
  const session = await getSession();

  if (!session) {
    // Session invalid or expired.
    redirect('/admin/login');
  }

  // ---- Step 2: Determine access requirements ----

  let effectiveRole: Role | undefined = requiredRole;
  let effectivePermission: keyof typeof permissions | undefined = requiredPermission;
  let routeDescription = '';

  if (autoGuard && pathname) {
    const routeDef = matchRoute(pathname);
    if (routeDef) {
      routeDescription = routeDef.description ?? routeDef.pattern;
      const minRole = getMinimumRole(routeDef.accessLevel);
      // Only override if not explicitly set
      if (!requiredRole && !requiredPermission) {
        effectiveRole = minRole ?? undefined;
      }
    }
  }

  // ---- Step 3: Role check (async, server-side) ----
  if (effectiveRole) {
    const roleHierarchy: Record<Role, number> = {
      readonly_observer: 1,
      operator: 2,
      admin: 3,
      super_admin: 4,
    };

    const userLevel = roleHierarchy[session.role] ?? 0;
    const requiredLevel = roleHierarchy[effectiveRole] ?? 99;

    if (userLevel < requiredLevel) {
      return (
        <AccessDenied
          message="You do not have sufficient privileges to access this page."
          required={effectiveRole}
          current={session.role}
        />
      );
    }
  }

  // ---- Step 4: Permission check (server-side) ----
  if (effectivePermission) {
    const allowedRoles = permissions[effectivePermission];
    if (!allowedRoles.includes(session.role)) {
      return (
        <AccessDenied
          message="You do not have the required permission for this action."
          required={effectivePermission}
          current={session.role}
        />
      );
    }
  }

  return <>{children}</>;
}
