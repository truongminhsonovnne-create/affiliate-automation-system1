/**
 * AccessTrade Test Connection — GET /api/admin/accesstrade/test
 *
 * Verifies the AccessTrade API key is valid and the API is reachable.
 * Requires admin authentication (session cookie).
 *
 * Response:
 *   200 — { success: true, campaign_count, response_time_ms, tested_at }
 *   401 — Unauthorized
 *   503 — API key not configured or connection failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAccessTradeClient } from '@/lib/api/accesstrade-client';
import type { AccessTradeConnectionTest } from '@/lib/api/accesstrade-types';

/**
 * GET /api/admin/accesstrade/test
 *
 * Test AccessTrade API connectivity.
 * Returns connection status, latency, and basic account info.
 */
export async function GET(request: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────
  // Uses the same HMAC-signed session cookie as all other admin routes.
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized — valid admin session required' },
      { status: 401 }
    );
  }

  // ── Run test ─────────────────────────────────────────────────
  const client = getAccessTradeClient();

  if (!client.isConfigured()) {
    return NextResponse.json<AccessTradeConnectionTest>(
      {
        success: false,
        response_time_ms: 0,
        tested_at: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  const result = await client.testConnection();

  return NextResponse.json<AccessTradeConnectionTest>(result, {
    status: result.success ? 200 : 503,
  });
}
