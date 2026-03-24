/**
 * Sync Health — GET /api/internal/sync/health
 *
 * Internal endpoint for GitHub Actions / external scheduler to check
 * if the sync infrastructure is ready.
 *
 * Auth: x-sync-secret header
 * No admin session required.
 */

import { NextRequest, NextResponse } from 'next/server';

const SYNC_SHARED_SECRET = process.env.SYNC_SHARED_SECRET ?? '';

function rejectUnauthorized(request: NextRequest): Response | null {
  const secret = request.headers.get('x-sync-secret') ?? '';
  if (!secret || secret !== SYNC_SHARED_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'INVALID_SYNC_SECRET' },
      { status: 401 }
    );
  }
  return null;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = rejectUnauthorized(request);
  if (authError) return authError;

  const envCheck: Record<string, string> = {
    SUPABASE_URL: 'not set',
    SUPABASE_SERVICE_ROLE_KEY: 'not set',
    SYNC_SHARED_SECRET: 'not set',
    MASOFFER_PUBLISHER_ID: 'not set',
    MASOFFER_API_TOKEN: 'not set',
    ACCESSTRADE_API_KEY: 'not set',
  };

  const safeMeta: Record<string, string> = {};

  envCheck['SUPABASE_URL'] =
    process.env.SUPABASE_URL ? '✓ configured' : '✗ MISSING';
  envCheck['SUPABASE_SERVICE_ROLE_KEY'] =
    process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ configured' : '✗ MISSING';
  envCheck['SYNC_SHARED_SECRET'] =
    SYNC_SHARED_SECRET ? '✓ configured' : '✗ MISSING';
  envCheck['MASOFFER_PUBLISHER_ID'] =
    process.env.MASOFFER_PUBLISHER_ID ? '✓ configured' : '✗ MISSING';
  envCheck['MASOFFER_API_TOKEN'] =
    process.env.MASOFFER_API_TOKEN ? '✓ configured' : '✗ MISSING';
  envCheck['ACCESSTRADE_API_KEY'] =
    process.env.ACCESSTRADE_API_KEY ? '✓ configured' : '✗ MISSING';

  // Test Supabase connectivity
  let dbStatus = 'disconnected';
  let dbError = '';
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );
    const { error } = await sb.from('sync_source_state').select('source', { count: 'exact', head: true }).limit(1);
    if (error) {
      dbStatus = 'error';
      dbError = error.message;
    } else {
      dbStatus = 'connected';
    }
  } catch (err) {
    dbStatus = 'error';
    dbError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: envCheck,
    database: {
      status: dbStatus,
      error: dbError || undefined,
    },
  });
}
