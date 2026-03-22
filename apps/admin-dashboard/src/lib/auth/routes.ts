/**
 * Route Classification & RBAC Configuration
 *
 * Single source of truth for route access levels.
 * Used by both Edge middleware and server-side guards.
 *
 * Route Levels:
 *   PUBLIC       — accessible without any auth (login page, static assets)
 *   AUTH_REQUIRED — must have valid signed session
 *   PRIVILEGED    — must have role ≥ 'operator' (admin + operator)
 *   SUPER_ADMIN   — must have role = 'super_admin' only
 *
 * IMPORTANT: Middleware only verifies AUTH_REQUIRED.
 * The server-side AdminRouteGuard enforces PRIVILEGED and SUPER_ADMIN.
 */

import { Role } from './rbac';

// =============================================================================
// Access Levels
// =============================================================================

export type AccessLevel = 'PUBLIC' | 'AUTH_REQUIRED' | 'PRIVILEGED' | 'SUPER_ADMIN';

// =============================================================================
// Role Hierarchy (numeric for comparison)
// =============================================================================

const ROLE_LEVEL: Record<Role, number> = {
  readonly_observer: 1,
  operator: 2,
  admin: 3,
  super_admin: 4,
};

export function hasMinimumRoleLevel(userRole: Role, minLevel: AccessLevel): boolean {
  const required = ROLE_LEVELS[minLevel] ?? 1;
  return (ROLE_LEVEL[userRole] ?? 0) >= required;
}

const ROLE_LEVELS: Record<AccessLevel, number> = {
  PUBLIC: 0,
  AUTH_REQUIRED: 1,        // Any authenticated user (readonly_observer+)
  PRIVILEGED: 2,           // operator+
  SUPER_ADMIN: 4,         // super_admin only
};

// =============================================================================
// Route Definitions
// =============================================================================

export interface RouteDef {
  /** URL path pattern. Supports Next.js dynamic segments (e.g., /admin/products/[id]) */
  pattern: string;
  accessLevel: AccessLevel;
  /** Human-readable description for docs/debugging */
  description?: string;
}

export const ROUTES: RouteDef[] = [
  // ---- Public ----
  {
    pattern: '/admin/login',
    accessLevel: 'PUBLIC',
    description: 'Admin login page',
  },
  {
    pattern: '/api/auth/login',
    accessLevel: 'PUBLIC',
    description: 'Login API',
  },
  {
    pattern: '/api/auth/logout',
    accessLevel: 'PUBLIC',
    description: 'Logout API',
  },
  {
    pattern: '/api/auth/session',
    accessLevel: 'PUBLIC',
    description: 'Session check API',
  },

  // ---- Auth Required ----
  {
    pattern: '/admin/dashboard',
    accessLevel: 'AUTH_REQUIRED',
    description: 'Dashboard overview (all roles)',
  },
  {
    pattern: '/admin/activity',
    accessLevel: 'AUTH_REQUIRED',
    description: 'Activity log (all roles)',
  },

  // ---- Privileged (operator+) ----
  {
    pattern: '/admin/products',
    accessLevel: 'PRIVILEGED',
    description: 'Product management',
  },
  {
    pattern: '/admin/jobs',
    accessLevel: 'PRIVILEGED',
    description: 'Job management (crawl + publish)',
  },
  {
    pattern: '/admin/jobs/crawl',
    accessLevel: 'PRIVILEGED',
    description: 'Crawl job management',
  },
  {
    pattern: '/admin/jobs/publish',
    accessLevel: 'PRIVILEGED',
    description: 'Publish job management',
  },
  {
    pattern: '/admin/ai-content',
    accessLevel: 'PRIVILEGED',
    description: 'AI content management',
  },
  {
    pattern: '/admin/dead-letters',
    accessLevel: 'PRIVILEGED',
    description: 'Dead letter queue (read)',
  },

  // ---- Super Admin Only ----
  {
    pattern: '/admin/dead-letters/delete',
    accessLevel: 'SUPER_ADMIN',
    description: 'Delete dead letter entries',
  },
  {
    pattern: '/admin/settings',
    accessLevel: 'SUPER_ADMIN',
    description: 'System settings',
  },
  {
    pattern: '/admin/audit',
    accessLevel: 'SUPER_ADMIN',
    description: 'Audit log viewer',
  },
  {
    pattern: '/admin/workers/control',
    accessLevel: 'SUPER_ADMIN',
    description: 'Worker control (pause/resume)',
  },
];

/**
 * Match a pathname against defined routes.
 * Returns the most specific matching RouteDef, or null if no match.
 *
 * Handles Next.js dynamic routes by comparing path segments.
 */
export function matchRoute(pathname: string): RouteDef | null {
  let bestMatch: RouteDef | null = null;
  let bestScore = -1;

  for (const route of ROUTES) {
    const score = matchScore(pathname, route.pattern);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = route;
    }
  }

  // If no specific route matched, default to AUTH_REQUIRED for /admin/* paths
  if (!bestMatch && pathname.startsWith('/admin')) {
    return {
      pattern: '/admin',
      accessLevel: 'AUTH_REQUIRED',
      description: 'Default for unmapped admin routes',
    };
  }

  return bestMatch;
}

/**
 * Score how well a pathname matches a route pattern.
 * Higher score = better match. 0 = no match.
 */
function matchScore(pathname: string, pattern: string): number {
  if (pathname === pattern) return 100; // Exact match is best

  const pathnameParts = pathname.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);

  // Different depths can't match
  if (pathnameParts.length < patternParts.length) return 0;

  let score = 0;
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    const np = pathnameParts[i];

    if (pp === np) {
      score += 10;
    } else if (pp.startsWith('[') && pp.endsWith(']')) {
      // Dynamic segment — matches anything
      score += 5;
    } else {
      return 0; // Mismatch in a fixed segment
    }
  }

  // Exact depth match is better than prefix match
  if (pathnameParts.length === patternParts.length) {
    score += 20;
  }

  return score;
}

/**
 * Check if a route requires authentication at the middleware level.
 * Middleware only handles AUTH_REQUIRED vs above; server-side handles role checks.
 */
export function requiresAuth(accessLevel: AccessLevel): boolean {
  return accessLevel !== 'PUBLIC';
}

/**
 * Get the minimum role needed for a route.
 * Returns null if route is PUBLIC.
 */
export function getMinimumRole(accessLevel: AccessLevel): Role | null {
  switch (accessLevel) {
    case 'PUBLIC':
      return null;
    case 'AUTH_REQUIRED':
      return 'readonly_observer';
    case 'PRIVILEGED':
      return 'operator';
    case 'SUPER_ADMIN':
      return 'super_admin';
  }
}
