/**
 * AccessTrade Health & Status — GET /api/admin/accesstrade/health
 *
 * Returns connection health and last sync run summary.
 * Requires admin session authentication.
 *
 * Calls the internal control plane via proxy, which owns the Supabase writes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

interface AccessTradeHealthResponse {
  apiKeyConfigured: boolean;
  apiConnection: {
    success: boolean;
    responseTimeMs: number;
    testedAt: string;
    offerCount?: number;
    error?: string;
  };
  database: {
    connected: boolean;
    offerCount: number;
  };
  lastSyncRun: {
    jobName: string;
    status: string;
    startedAt: string;
    recordsFetched: number;
    recordsInserted: number;
    recordsUpdated: number;
    recordsSkipped: number;
    errorSummary: string | null;
  } | null;
}

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 1. Test AccessTrade API connectivity ───────────────────────
  let apiKeyConfigured = false;
  let apiConnection: AccessTradeHealthResponse['apiConnection'] = {
    success: false,
    responseTimeMs: 0,
    testedAt: new Date().toISOString(),
    error: 'Not checked',
  };

  try {
    const { getAccessTradeClient } = await import('@/lib/api/accesstrade-client');
    const client = getAccessTradeClient();
    apiKeyConfigured = client.isConfigured();

    if (!apiKeyConfigured) {
      apiConnection.error = 'ACCESSTRADE_API_KEY is not configured';
    } else {
      const result = await client.testConnection();
      // Map snake_case → camelCase (AccessTradeConnectionTest uses snake_case)
      const r = result as unknown as Record<string, unknown>;
      apiConnection = {
        success: result.success,
        responseTimeMs: (r.response_time_ms as number) ?? 0,
        testedAt: (r.tested_at as string) ?? new Date().toISOString(),
        offerCount: r.offer_count as number | undefined,
        error: result.success ? undefined : (r.error as string | undefined),
      };
    }
  } catch (err) {
    apiConnection.error = err instanceof Error ? err.message : 'Unknown error';
  }

  // ── 2. Supabase: offer count + last sync run ──────────────────
  let database: AccessTradeHealthResponse['database'] = {
    connected: false,
    offerCount: 0,
  };
  let lastSyncRun: AccessTradeHealthResponse['lastSyncRun'] = null;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(supabaseUrl, supabaseKey);

      const [{ count }, { data: runData }] = await Promise.all([
        sb
          .from('offers')
          .select('id', { count: 'exact', head: true })
          .eq('source', 'accesstrade'),
        sb
          .from('sync_runs')
          .select(
            'job_name, status, records_fetched, records_inserted, ' +
              'records_updated, records_skipped, started_at, error_summary'
          )
          .eq('source', 'accesstrade')
          .order('started_at', { ascending: false })
          .limit(1)
          .single(),
      ]);

      database = { connected: true, offerCount: count ?? 0 };

      if (runData) {
        const r = runData as unknown as Record<string, unknown>;
        lastSyncRun = {
          jobName: r.job_name as string,
          status: r.status as string,
          startedAt: r.started_at as string,
          recordsFetched: r.records_fetched as number,
          recordsInserted: r.records_inserted as number,
          recordsUpdated: r.records_updated as number,
          recordsSkipped: r.records_skipped as number,
          errorSummary: (r.error_summary as string | null) ?? null,
        };
      }
    } catch {
      database = { connected: false, offerCount: 0 };
    }
  }

  return NextResponse.json<AccessTradeHealthResponse>({
    apiKeyConfigured,
    apiConnection,
    database,
    lastSyncRun,
  });
}
