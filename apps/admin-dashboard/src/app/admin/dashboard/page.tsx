import { DashboardClient } from './DashboardClient';

/**
 * Dashboard page — auth is handled by middleware (Edge layer).
 * Middleware verifies session for all /admin/* routes before this renders.
 * No server-side auth import needed — keeps the client bundle clean.
 */
export default function DashboardPage() {
  return <DashboardClient />;
}

