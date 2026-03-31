import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth/session';
import { DashboardClient } from './DashboardClient';

/**
 * Server Component — verifies auth before rendering.
 * All dashboard pages MUST be Server Components to ensure auth
 * is enforced server-side (not just client-side).
 */
export default async function DashboardPage() {
  const authed = await isAuthenticated();
  if (!authed) {
    redirect('/admin/login');
  }
  return <DashboardClient />;
}

