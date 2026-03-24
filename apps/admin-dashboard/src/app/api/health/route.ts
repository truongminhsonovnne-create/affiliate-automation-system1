/**
 * Healthcheck endpoint — GET /api/health
 *
 * Returns 200 if the Next.js server is healthy.
 * Use cases:
 *   - Uptime monitors (UptimeRobot, Better Uptime, Grafana)
 *   - Load balancer health checks
 *   - Kubernetes readiness probes
 *   - Docker HEALTHCHECK
 *
 * No authentication required. Always dynamic.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'VoucherFinder',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      // Prevent any proxy caching
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    }
  );
}
