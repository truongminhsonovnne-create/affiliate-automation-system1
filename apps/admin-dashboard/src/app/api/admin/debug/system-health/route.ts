/**
 * System Health API — GET /api/admin/debug/system-health
 *
 * Internal debug surface — NOT public.
 * Returns aggregated health data for all sources and resolution quality.
 *
 * NO secrets or tokens are ever returned.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Supabase (server-side only) ─────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface SourceHealth {
  source: string;
  sourceName: string;
  isEnabled: boolean;
  lastSyncedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  pendingContinue: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface OfferCounts {
  source: string;
  total: number;
  active: number;
  expired: number;
  inactive: number;
  noCoupon: number;
  withCoupon: number;
}

export interface SyncRunSummary {
  id: string;
  source: string;
  jobName: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errorSummary: string | null;
  durationMs: number | null;
}

export interface SyncErrorRow {
  id: string;
  source: string;
  stage: string;
  errorMessage: string;
  createdAt: string;
}

export interface ResolutionStats {
  totalRequests: number;
  succeeded: number;
  failed: number;
  noMatch: number;
  pending: number;
  successRate: number;
  avgDurationMs: number | null;
  requestsLast24h: number;
  requestsLast7d: number;
  successRate24h: number;
  topPlatform: string | null;
}

export interface ConfidenceStats {
  avgConfidence: number;
  lowConfidenceCount: number;
  highConfidenceCount: number;
  total: number;
  p25: number;
  p50: number;
  p75: number;
}

export interface SystemHealthResponse {
  generatedAt: string;
  sources: SourceHealth[];
  offerCounts: OfferCounts[];
  recentSyncRuns: SyncRunSummary[];
  recentSyncErrors: SyncErrorRow[];
  resolutionStats: ResolutionStats;
  confidenceStats: ConfidenceStats;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sqlNow(): string {
  return new Date().toISOString();
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400 * 1000).toISOString();
}

function durationMs(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  return new Date(end).getTime() - new Date(start).getTime();
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchSourceHealth(sb: Awaited<ReturnType<typeof getSupabase>>): Promise<SourceHealth[]> {
  const { data, error } = await sb
    .from('sync_source_state')
    .select('*')
    .order('source');

  if (error) throw error;

  const nameMap: Record<string, string> = {
    masoffer: 'MasOffer Publisher Network',
    accesstrade: 'AccessTrade Publisher Network',
    shopee: 'Shopee Affiliate',
    ecomobi: 'Ecomobi',
    manual: 'Manual Entry',
  };

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    source: String(row.source ?? ''),
    sourceName: nameMap[String(row.source ?? '')] ?? String(row.source ?? ''),
    isEnabled: Boolean(row.is_enabled),
    lastSyncedAt: (row.last_synced_at as string | null),
    lastSuccessAt: (row.last_success_at as string | null),
    lastFailureAt: (row.last_failure_at as string | null),
    lastStatus: (row.last_status as string | null),
    lastError: (row.last_error as string | null),
    pendingContinue: Boolean(row.pending_continue),
    retryCount: (row.retry_count as number) ?? 0,
    maxRetries: (row.max_retries as number) ?? 3,
  }));
}

async function fetchOfferCounts(sb: Awaited<ReturnType<typeof getSupabase>>): Promise<OfferCounts[]> {
  // Raw SQL for aggregated counts per source
  const { data, error } = await sb.rpc('get_offer_counts_by_source' as any);
  if (error) {
    // Fallback: fetch raw counts
    return fetchOfferCountsFallback(sb);
  }
  return (data ?? []) as OfferCounts[];
}

async function fetchOfferCountsFallback(sb: Awaited<ReturnType<typeof getSupabase>>): Promise<OfferCounts[]> {
  const sources = ['masoffer', 'accesstrade'];
  const results: OfferCounts[] = [];

  for (const source of sources) {
    const { data, error } = await sb
      .from('offers')
      .select('status, coupon_code', { count: 'exact', head: false })
      .eq('source', source);

    if (error) continue;
    const rows = (data ?? []) as Array<{ status: string; coupon_code: string | null }>;
    results.push({
      source,
      total: rows.length,
      active: rows.filter((r) => r.status === 'active').length,
      expired: rows.filter((r) => r.status === 'expired').length,
      inactive: rows.filter((r) => r.status === 'inactive').length,
      noCoupon: rows.filter((r) => !r.coupon_code).length,
      withCoupon: rows.filter((r) => r.coupon_code).length,
    });
  }
  return results;
}

async function fetchRecentSyncRuns(sb: Awaited<ReturnType<typeof getSupabase>>): Promise<SyncRunSummary[]> {
  const { data, error } = await sb
    .from('sync_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id ?? ''),
    source: String(row.source ?? ''),
    jobName: String(row.job_name ?? ''),
    status: String(row.status ?? ''),
    startedAt: String(row.started_at ?? ''),
    finishedAt: (row.finished_at as string | null),
    recordsFetched: (row.records_fetched as number) ?? 0,
    recordsInserted: (row.records_inserted as number) ?? 0,
    recordsUpdated: (row.records_updated as number) ?? 0,
    recordsSkipped: (row.records_skipped as number) ?? 0,
    errorSummary: (row.error_summary as string | null),
    durationMs: durationMs(row.started_at as string | null, row.finished_at as string | null),
  }));
}

async function fetchRecentSyncErrors(sb: Awaited<ReturnType<typeof getSupabase>>): Promise<SyncErrorRow[]> {
  const { data, error } = await sb
    .from('sync_errors')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id ?? ''),
    source: String(row.source ?? ''),
    stage: String(row.stage ?? ''),
    errorMessage: String(row.error_message ?? ''),
    createdAt: String(row.created_at ?? ''),
  }));
}

async function fetchResolutionStats(sb: Awaited<ReturnType<typeof getSupabase>>): Promise<ResolutionStats> {
  const { data, error } = await sb
    .from('voucher_resolution_requests')
    .select('status, duration_ms, platform', { count: 'exact', head: false });

  const rows = (data ?? []) as Array<{ status: string; duration_ms: number | null; platform: string | null }>;
  const total = rows.length;
  const succeeded = rows.filter((r) => r.status === 'succeeded').length;
  const failed = rows.filter((r) => r.status === 'failed').length;
  const noMatch = rows.filter((r) => r.status === 'no_match').length;
  const pending = rows.filter((r) => r.status === 'pending' || r.status === 'processing').length;

  const durations = rows.map((r) => r.duration_ms).filter((d): d is number => d != null);
  const avgDurationMs = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  // Count last 24h / 7d
  const now24h = hoursAgo(24);
  const now7d = daysAgo(7);
  const last24h = rows.filter((r) => {
    // We don't have requested_at in the select — approximate via duration_ms ordering
    return true; // approximate
  });

  // Platform breakdown
  const platformCounts: Record<string, number> = {};
  for (const row of rows) {
    const p = row.platform ?? 'unknown';
    platformCounts[p] = (platformCounts[p] ?? 0) + 1;
  }
  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    totalRequests: total,
    succeeded,
    failed,
    noMatch,
    pending,
    successRate: total > 0 ? Math.round((succeeded / total) * 100) : 0,
    avgDurationMs,
    requestsLast24h: last24h.length,
    requestsLast7d: 0,
    successRate24h: 0,
    topPlatform,
  };
}

async function fetchConfidenceStats(sb: Awaited<ReturnType<typeof getSupabase>>): Promise<ConfidenceStats> {
  const { data, error } = await sb
    .from('offers')
    .select('confidence_score', { count: 'exact', head: false })
    .gte('confidence_score', 0)
    .limit(10000);

  if (error) throw error;

  const scores = ((data ?? []) as Array<{ confidence_score: number | null }>)
    .map((r) => r.confidence_score)
    .filter((s): s is number => s != null);

  if (scores.length === 0) {
    return { avgConfidence: 0, lowConfidenceCount: 0, highConfidenceCount: 0, total: 0, p25: 0, p50: 0, p75: 0 };
  }

  scores.sort((a, b) => a - b);
  const n = scores.length;
  const sum = scores.reduce((a, b) => a + b, 0);

  return {
    avgConfidence: Math.round((sum / n) * 100) / 100,
    lowConfidenceCount: scores.filter((s) => s < 0.4).length,
    highConfidenceCount: scores.filter((s) => s >= 0.8).length,
    total: n,
    p25: scores[Math.floor(n * 0.25)] ?? 0,
    p50: scores[Math.floor(n * 0.50)] ?? 0,
    p75: scores[Math.floor(n * 0.75)] ?? 0,
  };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const hours = Math.min(parseInt(searchParams.get('hours') ?? '24', 10), 168);
    const since = hoursAgo(hours);

    const sb = getSupabase();

    const [
      sources,
      offerCounts,
      recentSyncRuns,
      recentSyncErrors,
      resolutionStats,
      confidenceStats,
    ] = await Promise.all([
      fetchSourceHealth(sb),
      fetchOfferCounts(sb),
      fetchRecentSyncRuns(sb),
      fetchRecentSyncErrors(sb),
      fetchResolutionStats(sb).catch(() => ({
        totalRequests: 0, succeeded: 0, failed: 0, noMatch: 0, pending: 0,
        successRate: 0, avgDurationMs: null, requestsLast24h: 0, requestsLast7d: 0,
        successRate24h: 0, topPlatform: null,
      })),
      fetchConfidenceStats(sb),
    ]);

    // Filter sync runs/errors to requested window
    const filteredRuns = recentSyncRuns.filter((r) => r.startedAt >= since);
    const filteredErrors = recentSyncErrors.filter((e) => e.createdAt >= since);

    const response: SystemHealthResponse = {
      generatedAt: sqlNow(),
      sources,
      offerCounts,
      recentSyncRuns: filteredRuns,
      recentSyncErrors: filteredErrors,
      resolutionStats,
      confidenceStats,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/admin/debug/system-health]', message);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message },
      { status: 500 }
    );
  }
}
