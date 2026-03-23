/**
 * Daily Sync Orchestrator — POST /api/internal/sync/daily
 *
 * The primary endpoint called by GitHub Actions scheduled workflow.
 *
 * Auth: x-sync-secret header (no admin session)
 *
 * Body (all optional):
 *   sources?: string[]      — override which sources to sync
 *   mode?: 'incremental' | 'full'
 *   dryRun?: boolean       — default false
 *   maxPages?: number       — per-source page limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Auth ──────────────────────────────────────────────────────────────────

const SYNC_SHARED_SECRET = process.env.SYNC_SHARED_SECRET ?? '';

function rejectUnauthorized(request: NextRequest): NextResponse | null {
  if (!SYNC_SHARED_SECRET) {
    return NextResponse.json(
      { error: 'SYNC_SHARED_SECRET is not configured', code: 'CONFIG_ERROR' },
      { status: 503 }
    );
  }
  const secret = request.headers.get('x-sync-secret') ?? '';
  if (!secret || secret !== SYNC_SHARED_SECRET) {
    return NextResponse.json(
      { error: 'Invalid or missing x-sync-secret header', code: 'INVALID_SYNC_SECRET' },
      { status: 401 }
    );
  }
  return null;
}

// ── Supabase client ────────────────────────────────────────────────────────

let _sb: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  _sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _sb;
}

// ── Safe logging ────────────────────────────────────────────────────────────

function logSync(label: string, msg: string, meta?: Record<string, unknown>): void {
  const safe: Record<string, unknown> = {};
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      safe[k] = k.toLowerCase().match(/token|key|auth|secret|password|code/)
        ? '[REDACTED]' : v;
    }
  }
  console.info(`[Sync][${label}] ${msg}`, safe);
}

// ── Source adapters ─────────────────────────────────────────────────────────

// Lazy cache for API clients and mappers
const _cache: Record<string, unknown> = {};

async function getMasOfferClient() {
  if (_cache.masoffer) return _cache.masoffer as unknown as { getDeals: (p: Record<string, unknown>) => Promise<{ data: Array<Record<string, unknown>>; pagination?: { total: number; total_pages: number } }> };
  const { MasOfferClient } = await import('@/lib/api/masoffer-client');
  const client = new MasOfferClient();
  _cache.masoffer = client;
  return client as unknown as { getDeals: (p: Record<string, unknown>) => Promise<{ data: Array<Record<string, unknown>>; pagination?: { total: number; total_pages: number } }> };
}

async function getAccessTradeClient() {
  if (_cache.accesstrade) return _cache.accesstrade as unknown as { getOffers: (p: Record<string, unknown>) => Promise<{ data: Array<Record<string, unknown>> }> };
  const { AccessTradeClient } = await import('@/lib/api/accesstrade-client');
  const client = new AccessTradeClient();
  _cache.accesstrade = client;
  return client as unknown as { getOffers: (p: Record<string, unknown>) => Promise<{ data: Array<Record<string, unknown>> }> };
}

// ── Checkpoint helpers ──────────────────────────────────────────────────────

async function getCheckpoint(source: string): Promise<{
  lastPage: number;
  lastCursor: string | null;
  pendingContinue: boolean;
  retryCount: number;
}> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('sync_source_state')
    .select('last_page, last_cursor, pending_continue, retry_count')
    .eq('source', source)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return { lastPage: 0, lastCursor: null, pendingContinue: false, retryCount: 0 };
  const d = data as Record<string, unknown>;
  return {
    lastPage: (d.last_page as number) ?? 0,
    lastCursor: (d.last_cursor as string | null) ?? null,
    pendingContinue: (d.pending_continue as boolean) ?? false,
    retryCount: (d.retry_count as number) ?? 0,
  };
}

async function updateCheckpoint(
  source: string,
  opts: {
    lastPage?: number;
    pendingContinue?: boolean;
    succeeded?: boolean;
    error?: string | null;
  }
): Promise<void> {
  const sb = getSupabase();
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };

  if (opts.lastPage !== undefined) updates.last_page = opts.lastPage;
  if (opts.pendingContinue !== undefined) updates.pending_continue = opts.pendingContinue;

  if (opts.succeeded) {
    updates.last_status = 'completed';
    updates.last_synced_at = now;
    updates.last_success_at = now;
    updates.last_error = null;
    updates.retry_count = 0;
  } else if (opts.error !== undefined) {
    updates.last_status = 'failed';
    updates.last_synced_at = now;
    updates.last_failure_at = now;
    updates.last_error = opts.error;
  }

  // eslint-disable-next-line
  await (sb.from('sync_source_state') as any).update(updates).eq('source', source);
}

async function getEnabledSources(): Promise<Array<{ source: string; is_enabled: boolean }>> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('sync_source_state')
    .select('source, is_enabled')
    .eq('is_enabled', true);
  if (error) throw error;
  return (data ?? []) as Array<{ source: string; is_enabled: boolean }>;
}

// ── Upsert helper ───────────────────────────────────────────────────────────

async function upsertOfferBatch(offers: Array<Record<string, unknown>>): Promise<{ inserted: number; updated: number; skipped: number }> {
  const sb = getSupabase();
  if (offers.length === 0) return { inserted: 0, updated: 0, skipped: 0 };

  const externalIds = offers.map((o) => o.external_id as string);
  const { data: existingRows } = await sb
    .from('offers')
    .select('id, external_id, normalized_hash')
    .in('external_id', externalIds);

  const existingMap = new Map<string, { id: string; hash: string }>();
  const rows = (existingRows ?? []) as Array<{ id: string; external_id: string; normalized_hash: string }>;
  for (const row of rows) {
    existingMap.set(row.external_id, { id: row.id, hash: row.normalized_hash });
  }

  const toInsert: typeof offers = [];
  const toUpdate: Array<{ id: string; offer: typeof offers[0] }> = [];
  let skipped = 0;

  for (const offer of offers) {
    const existing = existingMap.get(offer.external_id as string);
    if (!existing) {
      toInsert.push(offer);
    } else if (existing.hash === offer.normalized_hash) {
      await (sb.from('offers') as any).update({ last_seen_at: offer.last_seen_at, updated_at: new Date().toISOString() }).eq('id', existing.id);
      skipped++;
    } else {
      toUpdate.push({ id: existing.id, offer });
    }
  }

  let inserted = 0;
  let updated = 0;

  if (toInsert.length > 0) {
    await (sb.from('offers') as any).insert(toInsert as Record<string, unknown>[]);
    inserted = toInsert.length;
  }

  for (const { id, offer } of toUpdate) {
    await (sb.from('offers') as any).update(offer as Record<string, unknown>).eq('id', id);
    updated++;
  }

  return { inserted, updated, skipped };
}

// ── Source sync functions ─────────────────────────────────────────────────────

async function syncMasOffer(opts: { dryRun: boolean; maxPages: number }): Promise<{
  fetched: number; inserted: number; updated: number; skipped: number;
  errors: string[]; durationMs: number; pendingContinue: boolean;
}> {
  const { dryRun, maxPages } = opts;
  const client = await getMasOfferClient();
  const start = Date.now();
  const errors: string[] = [];
  let page = 1;
  let totalFetched = 0, totalInserted = 0, totalUpdated = 0, totalSkipped = 0;
  let hasMore = false;

  for (let i = 0; i < maxPages; i++) {
    try {
      const result = await client.getDeals({ page, limit: 100 });
      if (!result.data || result.data.length === 0) break;

      const { mapOfferItemToOffer } = await import('@/lib/api/masoffer-mapper');
      // eslint-disable-next-line
      const records = (result.data as unknown as Parameters<typeof mapOfferItemToOffer>[0][]).map(mapOfferItemToOffer);

      if (!dryRun) {
        const r = await upsertOfferBatch(records);
        totalInserted += r.inserted; totalUpdated += r.updated; totalSkipped += r.skipped;
      } else {
        totalInserted += records.length;
      }
      totalFetched += result.data.length;

      const tp = result.pagination?.total ?? 1;
      const pageCount = Math.ceil(tp / 100);
      hasMore = page < pageCount;
      page++;
      if (!hasMore) break;
    } catch (err) {
      errors.push(`Page ${page}: ${err instanceof Error ? err.message : String(err)}`);
      break;
    }
  }

  await updateCheckpoint('masoffer', {
    lastPage: hasMore ? page - 1 : 0,
    pendingContinue: hasMore,
    succeeded: errors.length === 0,
    error: errors.length > 0 ? errors[0] : null,
  });

  return {
    fetched: totalFetched, inserted: totalInserted, updated: totalUpdated,
    skipped: totalSkipped, errors, durationMs: Date.now() - start,
    pendingContinue: hasMore,
  };
}

async function syncAccessTrade(opts: { dryRun: boolean; maxPages: number }): Promise<{
  fetched: number; inserted: number; updated: number; skipped: number;
  errors: string[]; durationMs: number; pendingContinue: boolean;
}> {
  const { dryRun, maxPages } = opts;
  const client = await getAccessTradeClient();
  const { mapOfferToNormalisedOffer } = await import('@/lib/api/accesstrade-mapper');
  const start = Date.now();
  const errors: string[] = [];
  let page = 1;
  let totalFetched = 0, totalInserted = 0, totalUpdated = 0, totalSkipped = 0;

  try {
    // Fetch first page — /v1/offers_informations has no pagination wrapper
    const firstResult = await client.getOffers({ page, limit: 100, status: 1 });
    const firstOffers = firstResult.data ?? [];
    totalFetched += firstOffers.length;

    if (firstOffers.length > 0) {
      const records = firstOffers.map((o) =>
        mapOfferToNormalisedOffer(o, o as unknown as Record<string, unknown>)
      );
      if (!dryRun) {
        const r = await upsertOfferBatch(records);
        totalInserted += r.inserted; totalUpdated += r.updated; totalSkipped += r.skipped;
      } else {
        totalInserted += records.length;
      }
    }

    // Fetch remaining pages
    while (page < maxPages) {
      try {
        page++;
        const r = await client.getOffers({ page, limit: 100, status: 1 });
        const offers = r.data ?? [];
        if (offers.length === 0) break;

        const records = offers.map((o) =>
          mapOfferToNormalisedOffer(o, o as unknown as Record<string, unknown>)
        );
        if (!dryRun) {
          const res = await upsertOfferBatch(records);
          totalInserted += res.inserted; totalUpdated += res.updated; totalSkipped += res.skipped;
        } else {
          totalInserted += records.length;
        }
        totalFetched += offers.length;

        // If we got fewer than a full page, we've reached the end
        if (offers.length < 100) break;
      } catch (err) {
        errors.push(`Page ${page}: ${err instanceof Error ? err.message : String(err)}`);
        break;
      }
    }

    await updateCheckpoint('accesstrade', { lastPage: 0, pendingContinue: false, succeeded: true });
  } catch (err) {
    errors.push(String(err instanceof Error ? err.message : err));
    await updateCheckpoint('accesstrade', { pendingContinue: true, succeeded: false, error: errors[0] });
  }

  return {
    fetched: totalFetched, inserted: totalInserted, updated: totalUpdated,
    skipped: totalSkipped, errors, durationMs: Date.now() - start,
    pendingContinue: errors.length > 0,
  };
}

// ── Orchestrator ────────────────────────────────────────────────────────────

async function createOrchestratorRun(triggeredBy: string): Promise<string> {
  const sb = getSupabase();
  const { data, error } = await (sb.from('sync_orchestrator_runs') as any)
    .insert({
      job_name: 'daily_sync',
      triggered_by: triggeredBy,
      status: 'running',
      started_at: new Date().toISOString(),
      total_sources: 0, successful_sources: 0, failed_sources: 0,
      summary_jsonb: {},
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

async function completeOrchestratorRun(
  runId: string, status: string,
  total: number, successful: number, failed: number,
  summary: Record<string, unknown>
): Promise<void> {
  const sb = getSupabase();
  await (sb.from('sync_orchestrator_runs') as any).update({
    status, finished_at: new Date().toISOString(),
    total_sources: total, successful_sources: successful, failed_sources: failed,
    summary_jsonb: summary,
  }).eq('id', runId);
}

async function insertOrchestratorItem(
  runId: string, source: string,
  result: { status: string; fetched: number; inserted: number; updated: number; skipped: number; errors: string[]; durationMs: number }
): Promise<void> {
  const sb = getSupabase();
  await (sb.from('sync_orchestrator_items') as any).insert({
    orchestrator_run_id: runId,
    source,
    status: result.status,
    started_at: new Date(Date.now() - result.durationMs).toISOString(),
    finished_at: new Date().toISOString(),
    records_fetched: result.fetched,
    records_inserted: result.inserted,
    records_updated: result.updated,
    records_skipped: result.skipped,
    error_summary: result.errors.length > 0 ? result.errors.join('; ') : null,
  });
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = rejectUnauthorized(request);
  if (authError) return authError;

  let body: { sources?: string[]; mode?: string; dryRun?: boolean; maxPages?: number } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch { /* use defaults */ }

  const { sources, dryRun = false, maxPages = 10 } = body;
  const overallStart = Date.now();

  logSync('Orchestrator', `Starting daily sync (dryRun=${dryRun})`);

  // Get enabled sources
  const enabledSources = await getEnabledSources();
  const sourceKeys = sources ?? enabledSources.map((s) => s.source);

  if (sourceKeys.length === 0) {
    return NextResponse.json({ ok: true, sources: { total: 0, successful: 0, failed: 0, skipped: 0 }, timestamp: new Date().toISOString() });
  }

  const runId = await createOrchestratorRun('github_actions');

  const syncFns: Record<string, () => Promise<{ fetched: number; inserted: number; updated: number; skipped: number; errors: string[]; durationMs: number; status: string; pendingContinue: boolean }>> = {
    masoffer: async () => {
      const r = await syncMasOffer({ dryRun, maxPages });
      return { ...r, status: r.errors.length > 0 ? 'failed' : 'completed' };
    },
    accesstrade: async () => {
      const r = await syncAccessTrade({ dryRun, maxPages });
      return { ...r, status: r.errors.length > 0 ? 'failed' : 'completed' };
    },
  };

  const results: Record<string, unknown> = {};
  let successful = 0, failed = 0;

  for (const sourceKey of sourceKeys) {
    const syncFn = syncFns[sourceKey];
    if (!syncFn) {
      logSync('Orchestrator', `Source '${sourceKey}' has no adapter — skipping`);
      continue;
    }

    const cp = await getCheckpoint(sourceKey);
    if (cp.retryCount >= 3 && !dryRun) {
      logSync('Orchestrator', `Skipping '${sourceKey}' — max retries`);
      failed++;
      continue;
    }

    try {
      const r = await syncFn();
      results[sourceKey] = {
        status: r.status,
        inserted: r.inserted,
        updated: r.updated,
        skipped: r.skipped,
        fetched: r.fetched,
        durationMs: r.durationMs,
        errors: r.errors,
        pendingContinue: r.pendingContinue,
      };
      await insertOrchestratorItem(runId, sourceKey, r);
      if (r.status === 'completed') successful++;
      else failed++;
      logSync(sourceKey, `Done: +${r.inserted} inserted (${r.durationMs}ms)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logSync(sourceKey, `Failed: ${msg}`);
      results[sourceKey] = { status: 'failed', errors: [msg], inserted: 0, updated: 0, skipped: 0, fetched: 0, durationMs: 0 };
      failed++;
    }
  }

  await completeOrchestratorRun(runId, failed === sourceKeys.length ? 'failed' : 'completed',
    sourceKeys.length, successful, failed, results as Record<string, unknown>);

  const durationMs = Date.now() - overallStart;
  const httpStatus = failed === sourceKeys.length ? 500 : 200;

  return NextResponse.json(
    {
      ok: true,
      runId,
      status: failed === sourceKeys.length ? 'failed' : 'completed',
      triggeredBy: 'github_actions',
      sources: { total: sourceKeys.length, successful, failed, skipped: 0 },
      detail: results,
      durationMs,
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus }
  );
}
