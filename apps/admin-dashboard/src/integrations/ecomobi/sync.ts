/**
 * Ecomobi Sync Job
 *
 * PENDING: Full production sync depends on confirmed Ecomobi API endpoints.
 * All fetch logic uses placeholder paths marked with // TODO.
 *
 * Architecture mirrors MasOffer and AccessTrade sync jobs.
 */

import { getEcomobiApiClient } from './client';
import { upsertEcomobiBatch } from './supabase';

export interface SyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  durationMs: number;
}

export interface SyncOptions {
  dryRun?: boolean;
  maxPages?: number;
}

/**
 * Sync all active offers from Ecomobi into the local database.
 *
 * PENDING: Replace with real pagination logic once Ecomobi API shape is confirmed.
 *
 * Flow:
 *  1. Fetch paginated offers from Ecomobi API
 *  2. Map each item to NormalisedOffer
 *  3. Upsert batch to Supabase
 *  4. Update sync_source_state checkpoint
 */
export async function syncEcomobiOffers(
  opts: SyncOptions = {}
): Promise<SyncResult> {
  const { dryRun = false, maxPages = 10 } = opts;
  const start = Date.now();
  const errors: string[] = [];

  const client = getEcomobiApiClient();

  let totalFetched = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let page = 1;
  let hasMore = false;

  try {
    // ── First page ────────────────────────────────────────────────────────────
    const first = await client.getOffers({ page: 1, limit: 100 });
    const items = first.data ?? [];
    totalFetched += items.length;

    if (items.length > 0) {
      if (!dryRun) {
        const r = await upsertEcomobiBatch(items);
        totalInserted += r.inserted;
        totalUpdated += r.updated;
        totalSkipped += r.skipped;
      } else {
        totalInserted += items.length;
      }
    }

    hasMore = items.length === 100 && page < first.pagination.total_pages;
    page++;

    // ── Subsequent pages ──────────────────────────────────────────────────────
    while (hasMore && page <= maxPages) {
      try {
        const result = await client.getOffers({ page, limit: 100 });
        const batch = result.data ?? [];
        totalFetched += batch.length;

        if (batch.length === 0) break;

        if (!dryRun) {
          const r = await upsertEcomobiBatch(batch);
          totalInserted += r.inserted;
          totalUpdated += r.updated;
          totalSkipped += r.skipped;
        } else {
          totalInserted += batch.length;
        }

        hasMore = batch.length === 100 && page < result.pagination.total_pages;
        page++;
      } catch (err) {
        errors.push(
          `Page ${page}: ${err instanceof Error ? err.message : String(err)}`
        );
        break;
      }
    }
  } catch (err) {
    errors.push(
      `Initial fetch failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // ── Update sync_source_state checkpoint ─────────────────────────────────────
  if (!dryRun) {
    await updateCheckpoint({
      succeeded: errors.length === 0,
      error: errors.length > 0 ? errors[errors.length - 1] : null,
      recordsFetched: totalFetched,
      recordsInserted: totalInserted,
      recordsUpdated: totalUpdated,
    });
  }

  return {
    fetched: totalFetched,
    inserted: totalInserted,
    updated: totalUpdated,
    skipped: totalSkipped,
    errors,
    durationMs: Date.now() - start,
  };
}

/**
 * Sync Ecomobi campaigns.
 *
 * PENDING: Replace with real campaigns endpoint once Ecomobi docs are available.
 */
export async function syncEcomobiCampaigns(
  opts: SyncOptions = {}
): Promise<SyncResult> {
  const { dryRun = false } = opts;
  const start = Date.now();
  const errors: string[] = [];

  const client = getEcomobiApiClient();

  try {
    // TODO: Replace with real Ecomobi campaigns endpoint
    // const result = await client.getCampaigns?.({ page: 1, limit: 100 });
    throw new Error(
      '[Ecomobi] getCampaigns is not yet implemented. ' +
        'Replace with real Ecomobi campaigns endpoint once docs are available.'
    );
  } catch (err) {
    errors.push(
      `syncEcomobiCampaigns: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return {
    fetched: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors,
    durationMs: Date.now() - start,
  };
}

// ── Checkpoint update ─────────────────────────────────────────────────────────

async function updateCheckpoint(data: {
  succeeded: boolean;
  error: string | null;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
}): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const now = new Date().toISOString();

    await (sb.from('sync_source_state') as any).upsert(
      {
        source: 'ecomobi',
        last_synced_at: now,
        last_status: data.succeeded ? 'success' : 'failed',
        last_success_at: data.succeeded ? now : null,
        last_failure_at: data.succeeded ? null : now,
        last_error: data.error,
        pending_continue: false,
        retry_count: data.succeeded ? 0 : 1,
        // Records from most recent sync run — summary only
        // Full breakdown stored in sync_runs table
        updated_at: now,
      },
      { onConflict: 'source' }
    );
  } catch (err) {
    console.error('[Ecomobi] updateCheckpoint failed', err);
  }
}
