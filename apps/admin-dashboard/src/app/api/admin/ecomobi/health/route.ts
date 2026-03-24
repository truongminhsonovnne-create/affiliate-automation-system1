/**
 * Ecomobi Health Check — GET /api/admin/ecomobi/health
 *
 * Internal admin-only endpoint. Returns connection status for the Ecomobi API.
 *
 * PENDING: Returns scaffold response until real Ecomobi API endpoint is confirmed.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    // Check if env vars are set
    const apiKey = process.env.ECOMOBI_API_KEY;
    const publisherId = process.env.ECOMOBI_PUBLISHER_ID;

    if (!apiKey) {
      return NextResponse.json(
        {
          connected: false,
          apiKeyConfigured: false,
          publisherId: publisherId ?? undefined,
          error: 'ECOMOBI_API_KEY is not configured.',
        },
        { status: 200 }
      );
    }

    // TODO: Replace with real Ecomobi health check once API endpoint is confirmed.
    // Common patterns: GET /me, GET /account, GET /ping
    // e.g.:
    //   const { getEcomobiApiClient } = await import('@/integrations/ecomobi/client');
    //   const result = await getEcomobiApiClient().healthCheck();

    return NextResponse.json(
      {
        connected: false, // PENDING: set to true once real health check is wired
        apiKeyConfigured: true,
        publisherId: publisherId ?? undefined,
        error: 'PENDING: Real Ecomobi health check endpoint not yet implemented. ' +
          'Replace with actual API call once Ecomobi docs are available.',
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/admin/ecomobi/health]', message);
    return NextResponse.json(
      { connected: false, apiKeyConfigured: true, error: message },
      { status: 500 }
    );
  }
}
