/**
 * Single Source Sync — POST /api/internal/sync/source
 * Get Source State — GET /api/internal/sync/source?source=masoffer
 *
 * Auth: x-sync-secret header (no admin session)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Auth ──────────────────────────────────────────────────────────────────

const SYNC_SHARED_SECRET = process.env.SYNC_SHARED_SECRET ?? '';

function rejectUnauthorized(request: NextRequest): NextResponse | null {
  if (!SYNC_SHARED_SECRET) {
    return NextResponse.json({ error: 'SYNC_SHARED_SECRET is not configured' }, { status: 503 });
  }
  const secret = request.headers.get('x-sync-secret') ?? '';
  if (!secret || secret !== SYNC_SHARED_SECRET) {
    return NextResponse.json({ error: 'Invalid x-sync-secret' }, { status: 401 });
  }
  return null;
}

// ── Supabase ──────────────────────────────────────────────────────────────────

let _sb: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  _sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _sb;
}

async function upsertOfferBatch(offers: Array<Record<string, unknown>>): Promise<{ inserted: number; updated: number; skipped: number }> {
  const sb = getSupabase();
  if (offers.length === 0) return { inserted: 0, updated: 0, skipped: 0 };

  const externalIds = offers.map((o) => o.external_id as string);
  const { data: existingRows } = await sb.from('offers').select('id, external_id, normalized_hash').in('external_id', externalIds);

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

  let inserted = 0, updated = 0;
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

async function getCheckpoint(source: string): Promise<{ lastPage: number; pendingContinue: boolean; retryCount: number }> {
  const sb = getSupabase();
  const { data, error } = await sb.from('sync_source_state').select('last_page, pending_continue, retry_count').eq('source', source).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return { lastPage: 0, pendingContinue: false, retryCount: 0 };
  const d = data as Record<string, unknown>;
  return { lastPage: (d.last_page as number) ?? 0, pendingContinue: (d.pending_continue as boolean) ?? false, retryCount: (d.retry_count as number) ?? 0 };
}

async function updateCheckpoint(source: string, opts: { lastPage?: number; pendingContinue?: boolean; succeeded?: boolean; error?: string | null }): Promise<void> {
  const sb = getSupabase();
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };
  if (opts.lastPage !== undefined) updates.last_page = opts.lastPage;
  if (opts.pendingContinue !== undefined) updates.pending_continue = opts.pendingContinue;
  if (opts.succeeded) {
    updates.last_status = 'completed'; updates.last_synced_at = now; updates.last_success_at = now;
    updates.last_error = null; updates.retry_count = 0;
  } else if (opts.error !== undefined) {
    updates.last_status = 'failed'; updates.last_synced_at = now; updates.last_failure_at = now;
    updates.last_error = opts.error;
  }
  // eslint-disable-next-line
  await (sb.from('sync_source_state') as any).update(updates).eq('source', source);
}

// ── Source sync adapters ───────────────────────────────────────────────────────

async function syncMasoffer(opts: { dryRun: boolean; maxPages: number }) {
  const { dryRun, maxPages } = opts;
  const { MasOfferClient } = await import('@/lib/api/masoffer-client');
  const client = new MasOfferClient();
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
    pendingContinue: hasMore, status: errors.length > 0 ? 'failed' : 'completed',
  };
}

async function syncAccessTrade(opts: { dryRun: boolean; maxPages: number }) {
  const { dryRun, maxPages } = opts;
  const { AccessTradeClient } = await import('@/lib/api/accesstrade-client');
  const client = new AccessTradeClient();
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
    pendingContinue: errors.length > 0, status: errors.length > 0 ? 'failed' : 'completed',
  };
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = rejectUnauthorized(request);
  if (authError) return authError;

  let body: { source: string; mode?: string; dryRun?: boolean; maxPages?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body. Required: { source: string }' }, { status: 400 });
  }

  const { source, dryRun = false, maxPages = 10 } = body;

  if (!source) return NextResponse.json({ error: 'Missing required field: source' }, { status: 400 });

  const ALLOWED = ['masoffer', 'accesstrade'];
  if (!ALLOWED.includes(source)) {
    return NextResponse.json({ error: `Unknown source. Allowed: ${ALLOWED.join(', ')}` }, { status: 400 });
  }

  const syncFn = source === 'masoffer' ? syncMasoffer : syncAccessTrade;
  const cp = await getCheckpoint(source);
  if (cp.retryCount >= 3 && !dryRun) {
    return NextResponse.json({
      ok: false, source, status: 'skipped',
      error: `Max retries exhausted (${cp.retryCount}/3)`,
    }, { status: 200 });
  }

  const result = await syncFn({ dryRun, maxPages });

  return NextResponse.json({
    ok: result.status !== 'failed',
    source,
    status: result.status,
    inserted: result.inserted,
    updated: result.updated,
    skipped: result.skipped,
    fetched: result.fetched,
    durationMs: result.durationMs,
    pendingContinue: result.pendingContinue,
    errors: result.errors,
    checkpoint: { lastPage: result.pendingContinue ? cp.lastPage : 0 },
    timestamp: new Date().toISOString(),
  }, { status: result.status === 'failed' ? 500 : 200 });
}

// ── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = rejectUnauthorized(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');

  if (!source) return NextResponse.json({ error: 'Missing query param: source' }, { status: 400 });

  const sb = getSupabase();
  const { data, error } = await sb.from('sync_source_state').select('*').eq('source', source).single();

  if (error && error.code === 'PGRST116') {
    return NextResponse.json({ error: `Source '${source}' not found` }, { status: 404 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const d = data as Record<string, unknown>;
  return NextResponse.json({
    source: d.source,
    isEnabled: d.is_enabled,
    lastSyncedAt: d.last_synced_at,
    lastSuccessAt: d.last_success_at,
    lastStatus: d.last_status,
    lastError: d.last_error,
    pendingContinue: d.pending_continue,
    retryCount: d.retry_count,
    lastPage: d.last_page,
    meta: d.meta_jsonb,
    updatedAt: d.updated_at,
  });
}
