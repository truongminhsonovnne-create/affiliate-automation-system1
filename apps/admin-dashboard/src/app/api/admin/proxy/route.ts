/**
 * Admin API Proxy
 *
 * Handles dashboard data in two modes:
 * 1. LOCAL (default, no Railway needed):
 *    GET /overview, /activity, /failure-insights, /trends
 *    → reads directly from Supabase
 *
 * 2. FORWARD (when INTERNAL_API_URL is set):
 *    all other routes (products, crawl-jobs, publish-jobs, workers, etc.)
 *    → forwards to Railway/control-plane backend
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth/session';
import { logProxyRequest } from '@/lib/auth/auditLogger';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// Supabase
// =============================================================================

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// =============================================================================
// Railway (optional)
// =============================================================================

const INTERNAL_BASE_URL = process.env.INTERNAL_API_URL;
const INTERNAL_SECRET = process.env.CONTROL_PLANE_INTERNAL_SECRET ?? '';
const hasRailway = Boolean(INTERNAL_BASE_URL && INTERNAL_SECRET);

// =============================================================================
// Local handlers — no Railway needed
// =============================================================================

async function handleOverview(): Promise<NextResponse> {
  try {
    const sb = getSupabase();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

    const [products, pj, pjToday, posts, deadLetters, crawlJobs] = await Promise.allSettled([
      sb.from('affiliate_products').select('id', { count: 'exact', head: true }),
      sb.from('publish_jobs').select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'running', 'scheduled', 'ready', 'publishing']),
      sb.from('publish_jobs').select('id', { count: 'exact', head: true }).gte('created_at', yesterday),
      sb.from('posts').select('id', { count: 'exact', head: true }),
      sb.from('dead_letters').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      sb.from('crawl_jobs').select('id, status').gte('started_at', weekAgo)
        .order('started_at', { ascending: false }).limit(20),
    ]);

    const totalProducts  = products.status === 'fulfilled' ? (products.value.count ?? 0) : 0;
    const activeJobs    = pj.status === 'fulfilled' ? (pj.value.count ?? 0) : 0;
    const jobsToday     = pjToday.status === 'fulfilled' ? (pjToday.value.count ?? 0) : 0;
    const postsCount   = posts.status === 'fulfilled' ? (posts.value.count ?? 0) : 0;
    const deadCount    = deadLetters.status === 'fulfilled' ? (deadLetters.value.count ?? 0) : 0;
    const crawls       = crawlJobs.status === 'fulfilled' ? (crawlJobs.value.data ?? []) : [];
    const done         = crawls.filter((j: any) => j.status === 'completed').length;
    const failed       = crawls.filter((j: any) => j.status === 'failed').length;

    return NextResponse.json({
      ok: true,
      status: 'success',
      data: {
        totalProducts, publishJobsToday: jobsToday, activeWorkers: 0,
        successRate: crawls.length > 0 ? Math.round((done / crawls.length) * 100) : 100,
        pendingJobs: activeJobs, runningJobs: 0, completedJobs: done, failedJobs: failed,
        totalJobs: crawls.length,
        shopeeProducts: 0, lazadaProducts: 0, tiktokProducts: 0, tikiProducts: 0,
        totalActivities: 0, totalWorkers: 0, idleWorkers: 0, errorWorkers: 0,
        newFailures24h: deadCount, maxCount: deadCount || 1, deadLetters: deadCount,
        postsCount,
        trends: { crawl: { count: done }, publish: { count: jobsToday }, ai_content: { count: 0 }, worker: { count: 0 } },
      },
      timestamp: now.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

async function handleActivity(): Promise<NextResponse> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('admin_action_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const items = (data ?? []).map((row: any) => ({
      id: row.id, type: row.action_type || 'system',
      message: `${row.action_type} by ${row.actor_id || 'system'}`,
      entity_type: row.target_type, entity_id: row.target_id,
      user_id: row.actor_id, created_at: row.created_at,
    }));

    return NextResponse.json({
      ok: true, status: 'success',
      data: { items, pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1 } },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      ok: true, status: 'success',
      data: { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
      timestamp: new Date().toISOString(),
    });
  }
}

async function handleFailureInsights(): Promise<NextResponse> {
  try {
    const sb = getSupabase();
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const { data, error } = await sb
      .from('dead_letters')
      .select('id, error_message, source_type, status, created_at')
      .eq('status', 'failed')
      .gte('created_at', yesterday)
      .limit(20);

    if (error) throw error;

    const grouped: Record<string, { count: number; last_occurrence: string; error_message: string }> = {};
    for (const row of (data ?? [])) {
      const key = row.error_message || 'Unknown error';
      if (!grouped[key]) grouped[key] = { count: 0, last_occurrence: row.created_at, error_message: key };
      grouped[key].count++;
      if (row.created_at > grouped[key].last_occurrence) grouped[key].last_occurrence = row.created_at;
    }

    const insights = Object.values(grouped).map((item) => ({
      error_type: item.error_message.substring(0, 50),
      error_message: item.error_message,
      count: item.count, percentage: 100,
      last_occurrence: item.last_occurrence, affected_entities: [],
    }));

    return NextResponse.json({
      ok: true, status: 'success',
      data: {
        insights,
        newFailures24h: insights.reduce((s, i: any) => s + i.count, 0),
        maxCount: insights.length || 1,
        trends: { crawl: { count: 0 }, publish: { count: 0 }, ai_content: { count: 0 }, worker: { count: 0 } },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function handleTrends(): NextResponse {
  return NextResponse.json({
    ok: true, status: 'success',
    data: {
      newFailures24h: 0, maxCount: 1,
      trends: { crawl: { count: 0 }, publish: { count: 0 }, ai_content: { count: 0 }, worker: { count: 0 } },
    },
    timestamp: new Date().toISOString(),
  });
}

// =============================================================================
// Railway forwarder
// =============================================================================

async function forwardToRailway(
  path: string,
  method: string,
  request: NextRequest,
  actorId: string,
  role: string,
): Promise<NextResponse> {
  const url = `${INTERNAL_BASE_URL}/internal/dashboard${path}`;
  const body = method === 'GET' ? undefined : await request.text();

  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 30_000);

    const resp = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET,
        'x-actor-id': actorId,
        'x-actor-role': role || 'unknown',
        'x-correlation-id': `proxy_${Date.now().toString(36)}`,
      },
      body,
      signal: ctrl.signal as AbortSignal,
    });

    clearTimeout(tid);

    const ct = resp.headers.get('content-type') ?? '';
    const raw = await resp.text();
    let safe: unknown;
    try { safe = JSON.parse(raw); } catch { safe = { message: 'Unexpected response', status: resp.status }; }

    logProxyRequest({ event: 'PROXY_SUCCESS', actorId, ip: getClientIp(request), targetPath: path, method, status: resp.status });
    return NextResponse.json(safe as any, { status: resp.status });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown';
    logProxyRequest({ event: 'PROXY_ERROR', actorId, ip: getClientIp(request), targetPath: path, method, reason: 'internal service unreachable' });
    if (reason.includes('abort')) return NextResponse.json({ error: 'Internal service timeout' }, { status: 504 });
    return NextResponse.json({ error: 'Internal service unreachable' }, { status: 502 });
  }
}

// =============================================================================
// Route dispatcher
// =============================================================================

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request);
}

async function proxyRequest(request: NextRequest): Promise<NextResponse> {
  // Auth
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('path');
  if (!raw) return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });

  const path = '/' + raw.replace(/^\/+/, '');
  const method = request.method;
  const actorId = session.actorId;
  const role = session.role ?? 'unknown';

  // Local handlers
  if (method === 'GET' && path === '/overview') {
    logProxyRequest({ event: 'PROXY_SUCCESS', actorId, ip: getClientIp(request), targetPath: path, method, status: 200 });
    return handleOverview();
  }
  if (method === 'GET' && path === '/activity') {
    logProxyRequest({ event: 'PROXY_SUCCESS', actorId, ip: getClientIp(request), targetPath: path, method, status: 200 });
    return handleActivity();
  }
  if (method === 'GET' && path === '/failure-insights') {
    logProxyRequest({ event: 'PROXY_SUCCESS', actorId, ip: getClientIp(request), targetPath: path, method, status: 200 });
    return handleFailureInsights();
  }
  if (method === 'GET' && path === '/trends') {
    logProxyRequest({ event: 'PROXY_SUCCESS', actorId, ip: getClientIp(request), targetPath: path, method, status: 200 });
    return handleTrends();
  }

  // Railway fallback
  if (hasRailway) {
    return forwardToRailway(path, method, request, actorId, role);
  }

  return NextResponse.json(
    { error: 'Route not available locally. Configure INTERNAL_API_URL + CONTROL_PLANE_INTERNAL_SECRET on Vercel to enable this endpoint.' },
    { status: 501 }
  );
}

// =============================================================================
// Utils
// =============================================================================

function getClientIp(request: NextRequest): string {
  return (
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
