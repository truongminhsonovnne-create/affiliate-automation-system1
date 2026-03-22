/**
 * MasOffer Sync Service
 *
 * Orchestrates the full sync pipeline for MasOffer:
 *  fetch (paginated) → normalise → upsert (batch) → log
 *
 * All database operations go through the shared Supabase client
 * (same schema as AccessTrade).
 */

import type { MasOfferOfferItem, MasOfferCampaign, SyncResult } from './masoffer.types.js';
import { MasOfferApiClient } from './MasOfferApiClient.js';
import {
  upsertOfferBatch,
  createSyncRun,
  completeSyncRun,
  failSyncRun,
  insertSyncError,
  ensureOfferSource,
} from './masoffer.supabase.js';
import {
  mapOfferItemToOffer,
  mapCampaignToOffer,
} from './masoffer.mapper.js';

// =============================================================================
// Helpers
// =============================================================================

async function runWithErrorContext<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  return fn();
}

// =============================================================================
// Sync Jobs
// =============================================================================

/**
 * Sync all MasOffer deals, vouchers, and coupons into the database.
 * Paginated — fetches all pages, normalises, and upserts in batches.
 */
export async function syncMasOfferOffers(
  client: MasOfferApiClient,
  options: { dryRun?: boolean; batchSize?: number } = {}
): Promise<SyncResult> {
  const { dryRun = false, batchSize = 50 } = options;
  const start = Date.now();
  const now = new Date().toISOString();
  const errors: string[] = [];

  const run = await createSyncRun('masoffer', 'sync_offers');
  await ensureOfferSource('masoffer', 'MasOffer Publisher Network');

  try {
    const offerItemBatches: MasOfferOfferItem[][] = [];

    // Collect all pages from all three endpoints
    for await (const deals of client.streamDeals()) {
      offerItemBatches.push(deals);
    }
    for await (const vouchers of client.streamVouchers()) {
      offerItemBatches.push(vouchers);
    }
    for await (const coupons of client.streamCoupons()) {
      offerItemBatches.push(coupons);
    }

    const allItems = offerItemBatches.flat();
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let processed = 0;

    // Process in batches
    for (let i = 0; i < allItems.length; i += batchSize) {
      const batch = allItems.slice(i, i + batchSize);
      const records = batch.map(mapOfferItemToOffer);

      if (dryRun) {
        console.info(`[MasOffer] [DRY RUN] Would upsert ${records.length} offers`);
        totalInserted += records.length;
      } else {
        try {
          const { inserted, updated, skipped } = await upsertOfferBatch(records);
          totalInserted += inserted;
          totalUpdated += updated;
          totalSkipped += skipped;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Batch ${i / batchSize + 1}: ${msg}`);
          console.error(`[MasOffer] Batch upsert failed: ${msg}`);

          // Record per-item errors
          for (const item of batch) {
            await insertSyncError({
              sync_run_id: run.id,
              source: 'masoffer',
              external_id: `mo_${item.id}`,
              stage: 'upsert',
              error_message: msg,
            }).catch(() => {/* non-fatal */});
          }
        }
      }

      processed += batch.length;
      console.info(`[MasOffer] Processed ${processed}/${allItems.length} offers`);
    }

    const result: SyncResult = {
      fetched: allItems.length,
      inserted: totalInserted,
      updated: totalUpdated,
      skipped: totalSkipped,
      errors,
      startedAt: now,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
    };

    await completeSyncRun(run.id, {
      recordsFetched: result.fetched,
      recordsInserted: result.inserted,
      recordsUpdated: result.updated,
      recordsSkipped: result.skipped,
      errorSummary: errors.length > 0 ? errors.join('; ') : undefined,
    });

    console.info(`[MasOffer] Offers sync complete:`, result);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[MasOffer] Offers sync failed: ${msg}`);
    await failSyncRun(run.id, msg);

    return {
      fetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [msg],
      startedAt: now,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Sync all MasOffer campaigns into the database.
 */
export async function syncMasOfferCampaigns(
  client: MasOfferApiClient,
  options: { dryRun?: boolean; batchSize?: number; startPage?: number } = {}
): Promise<SyncResult> {
  const { dryRun = false, batchSize = 50, startPage = 1 } = options;
  const start = Date.now();
  const now = new Date().toISOString();
  const errors: string[] = [];

  const run = await createSyncRun('masoffer', 'sync_campaigns');
  await ensureOfferSource('masoffer', 'MasOffer Publisher Network');

  try {
    const result = await client.fetchCampaigns({ page: startPage, pageSize: 100 });
    const campaigns: MasOfferCampaign[] = result.data ?? [];

    // Fetch remaining pages
    const totalPages = result.pagination?.total_pages ?? 1;
    for (let page = startPage + 1; page <= totalPages; page++) {
      const pageResult = await client.fetchCampaigns({ page, pageSize: 100 });
      campaigns.push(...(pageResult.data ?? []));
    }

    const records = campaigns.map(mapCampaignToOffer);
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      if (dryRun) {
        console.info(`[MasOffer] [DRY RUN] Would upsert ${batch.length} campaigns`);
        totalInserted += batch.length;
      } else {
        try {
          const { inserted, updated, skipped } = await upsertOfferBatch(batch);
          totalInserted += inserted;
          totalUpdated += updated;
          totalSkipped += skipped;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Campaign batch ${i / batchSize + 1}: ${msg}`);
        }
      }
    }

    const syncResult: SyncResult = {
      fetched: campaigns.length,
      inserted: totalInserted,
      updated: totalUpdated,
      skipped: totalSkipped,
      errors,
      startedAt: now,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
    };

    await completeSyncRun(run.id, {
      recordsFetched: syncResult.fetched,
      recordsInserted: syncResult.inserted,
      recordsUpdated: syncResult.updated,
      recordsSkipped: syncResult.skipped,
      errorSummary: errors.length > 0 ? errors.join('; ') : undefined,
    });

    console.info(`[MasOffer] Campaigns sync complete:`, syncResult);
    return syncResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[MasOffer] Campaigns sync failed: ${msg}`);
    await failSyncRun(run.id, msg);

    return {
      fetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [msg],
      startedAt: now,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Run full sync: campaigns first, then offers (deals + vouchers + coupons).
 */
export async function runMasOfferFullSync(
  client: MasOfferApiClient,
  options: { dryRun?: boolean } = {}
): Promise<{ campaigns: SyncResult; offers: SyncResult }> {
  console.info('[MasOffer] Starting full sync...');

  const campaigns = await syncMasOfferCampaigns(client, options);
  const offers = await syncMasOfferOffers(client, options);

  console.info('[MasOffer] Full sync complete.', { campaigns, offers });
  return { campaigns, offers };
}
