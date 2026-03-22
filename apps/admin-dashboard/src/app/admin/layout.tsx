import type { Metadata } from 'next';

// Admin pages must never be statically pre-rendered — they use dynamic auth checks.
export const dynamic = 'force-dynamic';

/**
 * Admin Layout — Server Component Shell
 *
 * This is a Server Component that wraps all /admin/* routes.
 *
 * SEO: All /admin/* routes are explicitly marked noindex/nofollow since they
 * are behind auth and not part of the public surface.
 *
 * Layer 1 (Edge/Middleware):   HMAC session + expiry check at the edge
 * Layer 2 (Server Component):  RBAC role + permission check before rendering
 *
 * Together they ensure:
 *   - Tampered cookies are rejected at the edge
 *   - Users without sufficient roles never see the admin UI
 *   - Role escalation via cookie tampering is impossible
 *
 * Route classification (from routes.ts):
 *   PUBLIC        → /admin/login, /api/auth/*
 *   AUTH_REQUIRED → /admin/dashboard, /admin/activity (all roles)
 *   PRIVILEGED    → /admin/products, /admin/jobs/*, /admin/ai-content (operator+)
 *   SUPER_ADMIN   → /admin/settings, /admin/audit, /admin/dead-letters/delete
 */

export const metadata: Metadata = {
  title: {
    template: '%s | VoucherFinder Admin',
    default: 'Admin Dashboard | VoucherFinder',
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

import { headers } from 'next/headers';
import { AdminLayoutShell } from '@/components/admin/layout/AdminLayoutShell';
import { AdminRouteGuard } from '@/components/admin/layout/AdminRouteGuard';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get current pathname for autoGuard (available in Server Components via headers())
  const headersList = await headers();
  const pathname = headersList.get('x-invoke-path') ?? headersList.get('x-matched-path') ?? '/admin';

  return (
    <AdminRouteGuard autoGuard pathname={pathname}>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </AdminRouteGuard>
  );
}
