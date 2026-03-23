/**
 * MasOffer Sync Service
 *
 * Orchestrates the full sync pipeline for MasOffer:
 *  fetch (paginated) → normalise → upsert (batch) → log
 *
 * Sources prioritised (P0 → P3):
 *  P0: /v1/offer/pushsale   — hot/exclusive deals (highest quality, sync first)
 *  P0: /v1/offer/all        — combined endpoint (covers deals+vouchers+coupons)
 *  P1: /v1/deals            — deal-specific data
 *  P1: /v1/vouchers         — voucher-specific data
 *  P1: /v1/coupons          — coupon-specific data
 *  P2: /v1/promotions       — platform-level promotions
 *  P2: /v1/campaigns        — merchant-level records
 *
 * Deduplication strategy:
 *  1. Intra-source dedup: collect all items, dedupe by ID before normalisation
 *     (same offer ID can appear in deals + vouchers + coupons)
 *  2. Cross-source dedupe: DB UNIQUE constraint on (source, external_id)
 *  3. Semantic dedupe: normalized_hash comparison in upsertOfferBatch
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
  dedupeOfferItems,
} from './masoffer.mapper.js';

// =============================================================================
// Types
// =============================================================================

export interface SyncOffersOptions {
  dryRun?: boolean;
  batchSize?: number;
  /** Sync pushsale/hot deals (P0, default true) */
  includePushSale?: boolean;
  /** Sync combined /offer/all endpoint (P0, default true) */
  includeOfferAll?: boolean;
  /** Sync /v1/deals (P1, default true) */
  includeDeals?: boolean;
  /** Sync /v1/vouchers (P1, default true) */
  includeVouchers?: boolean;
  /** Sync /v1/coupons (P1, default true) */
  includeCoupons?: boolean;
  /** Sync /v1/promotions (P2, default false — lower priority) */
  includePromotions?: boolean;
  /** Active status filter (default: 'active') */
  status?: string;
}

export interface FullSyncResult {
  pushsale: SyncResult;
  offers: SyncResult;
  promotions: SyncResult;
  campaigns: SyncResult;
  totalDurationMs: number;
}

// =============================================================================
// Helpers
// =============================================================================

async function upsertBatchSafely(
  runId: string,
  records: Parameters<typeof upsertOfferBatch>[0],
  batchIndex: number,
  dryRun: boolean,
  batchSize: number
): Promise<{ inserted: number; updated: number; skipped: number }> {
  if (dryRun) {
    console.info(`[MasOffer] [DRY RUN] Would upsert ${records.length} offers`);
    return { inserted: records.length, updated: 0, skipped: 0 };
  }
  try {
    return await upsertOfferBatch(records);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[MasOffer] Batch ${batchIndex} upsert failed: ${msg}`);
    await insertSyncError({
      sync_run_id: runId,
      source: 'masoffer',
      external_id: null,
      stage: 'upsert',
      error_message: `Batch ${batchIndex}: ${msg}`,
      raw_context: { batchSize: records.length },
    }).catch(() => {/* non-fatal */});
    return { inserted: 0, updated: 0, skipped: 0 };
  }
}

// =============================================================================
// Sync Jobs
// =============================================================================

/**
 * Sync MasOffer pushsale / hot / exclusive deals.
 * These are the highest-quality offers — sync first, highest priority.
 */
export async function syncMasOfferPushSale(
  client: MasOfferApiClient,
  runId: string,
  options: { dryRun?: boolean; batchSize?: number; status?: string } = {}
): Promise<{ fetched: number; records: ReturnType<typeof mapOfferItemToOffer>[] }> {
  const { dryRun = false, batchSize = 50, status = 'active' } = options;
  const allItems: MasOfferOfferItem[] = [];

  for await (const batch of client.streamPushSale({ status, pageSize: 100 })) {
    allItems.push(...batch);
  }

  // Pushsale can overlap with deals/vouchers/coupons — dedupe by ID
  const deduped = dedupeOfferItems(allItems);
  const records = deduped.map((item) => mapOfferItemToOffer(item));

  if (!dryRun) {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await upsertBatchSafely(runId, batch, Math.floor(i / batchSize), dryRun, batchSize);
    }
  }

  return { fetched: deduped.length, records };
}

/**
 * Sync all MasOffer offers from all endpoints.
 * Uses all available endpoints and deduplicates across sources.
 */
export async function syncMasOfferOffers(
  client: MasOfferApiClient,
  options: SyncOffersOptions = {}
): Promise<SyncResult> {
  const {
    dryRun = false,
    batchSize = 50,
    status = 'active',
    includePushSale = true,
    includeOfferAll = true,
    includeDeals = true,
    includeVouchers = true,
    includeCoupons = true,
    includePromotions = false,
  } = options;

  const start = Date.now();
  const now = new Date().toISOString();
  const errors: string[] = [];
  const run = await createSyncRun('masoffer', 'sync_offers');
  await ensureOfferSource('masoffer', 'MasOffer Publisher Network');

  try {
    // ── Phase 1: Gather all items from all endpoints concurrently ────────────
    // Collect in memory then dedupe (same ID can appear in multiple endpoints)
    const allItems: MasOfferOfferItem[] = [];
    const fetchErrors: string[] = [];

    const fetchPromises: Array<{ label: string; promise: Promise<MasOfferOfferItem[]> }> = [];

    if (includePushSale) {
      fetchPromises.push({
        label: 'pushsale',
        promise: (async () => {
          const items: MasOfferOfferItem[] = [];
          for await (const batch of client.streamPushSale({ status, pageSize: 100 })) {
            items.push(...batch);
          }
          return items;
        })(),
      });
    }

    if (includeOfferAll) {
      fetchPromises.push({
        label: 'offer/all',
        promise: (async () => {
          const items: MasOfferOfferItem[] = [];
          for await (const batch of client.streamOfferAll({ status, pageSize: 100 })) {
            items.push(...batch);
          }
          return items;
        })(),
      });
    }

    if (includeDeals) {
      fetchPromises.push({
        label: 'deals',
        promise: (async () => {
          const items: MasOfferOfferItem[] = [];
          for await (const batch of client.streamDeals({ status, pageSize: 100 })) {
            items.push(...batch);
          }
          return items;
        })(),
      });
    }

    if (includeVouchers) {
      fetchPromises.push({
        label: 'vouchers',
        promise: (async () => {
          const items: MasOfferOfferItem[] = [];
          for await (const batch of client.streamVouchers({ status, pageSize: 100 })) {
            items.push(...batch);
          }
          return items;
        })(),
      });
    }

    if (includeCoupons) {
      fetchPromises.push({
        label: 'coupons',
        promise: (async () => {
          const items: MasOfferOfferItem[] = [];
          for await (const batch of client.streamCoupons({ status, pageSize: 100 })) {
            items.push(...batch);
          }
          return items;
        })(),
      });
    }

    if (includePromotions) {
      fetchPromises.push({
        label: 'promotions',
        promise: (async () => {
          const items: MasOfferOfferItem[] = [];
          for await (const batch of client.streamPromotions({ status, pageSize: 100 })) {
            items.push(...batch);
          }
          return items;
        })(),
      });
    }

    // Fetch all endpoints in parallel — much faster than sequential
    const results = await Promise.allSettled(
      fetchPromises.map(({ label, promise }) =>
        promise.then((items) => ({ label, items }))
      )
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        console.info(`[MasOffer] Fetched ${result.value.items.length} items from ${result.value.label}`);
        allItems.push(...result.value.items);
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        console.warn(`[MasOffer] Failed to fetch from ${result.reason}: ${msg}`);
        fetchErrors.push(msg);
        errors.push(`Fetch error: ${msg}`);
      }
    }

    // ── Phase 2: Intra-source dedup — same ID from multiple endpoints ─────────
    const deduped = dedupeOfferItems(allItems);
    console.info(`[MasOffer] Collected ${allItems.length} items → ${deduped.length} unique after dedupe`);

    if (deduped.length !== allItems.length) {
      const removed = allItems.length - deduped.length;
      console.info(`[MasOffer] Removed ${removed} duplicate items across endpoints`);
    }

    // ── Phase 3: Normalise ────────────────────────────────────────────────────
    const records = deduped.map((item) => mapOfferItemToOffer(item));

    // ── Phase 4: Batch upsert ─────────────────────────────────────────────────
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let processed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { inserted, updated, skipped } = await upsertBatchSafely(
        run.id,
        batch,
        Math.floor(i / batchSize),
        dryRun,
        batchSize
      );
      totalInserted += inserted;
      totalUpdated += updated;
      totalSkipped += skipped;
      processed += batch.length;
      console.info(`[MasOffer] Upserted ${processed}/${records.length}`);
    }

    const result: SyncResult = {
      fetched: deduped.length,
      inserted: totalInserted,
      updated: totalUpdated,
      skipped: totalSkipped,
      errors: [...fetchErrors, ...errors],
      startedAt: now,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
    };

    await completeSyncRun(run.id, {
      recordsFetched: result.fetched,
      recordsInserted: result.inserted,
      recordsUpdated: result.updated,
      recordsSkipped: result.skipped,
      errorSummary: result.errors.length > 0 ? result.errors.join('; ') : undefined,
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

    const records = campaigns.map((c) => mapCampaignToOffer(c));
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { inserted, updated, skipped } = await upsertBatchSafely(
        run.id,
        batch,
        Math.floor(i / batchSize),
        dryRun,
        batchSize
      );
      totalInserted += inserted;
      totalUpdated += updated;
      totalSkipped += skipped;
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
 * Sync MasOffer promotions (platform-level deals).
 */
export async function syncMasOfferPromotions(
  client: MasOfferApiClient,
  options: { dryRun?: boolean; batchSize?: number; status?: string } = {}
): Promise<SyncResult> {
  const { dryRun = false, batchSize = 50, status = 'active' } = options;
  const start = Date.now();
  const now = new Date().toISOString();
  const errors: string[] = [];

  const run = await createSyncRun('masoffer', 'sync_promotions');
  await ensureOfferSource('masoffer', 'MasOffer Publisher Network');

  try {
    const allItems: MasOfferOfferItem[] = [];
    for await (const batch of client.streamPromotions({ status, pageSize: 100 })) {
      allItems.push(...batch);
    }

    const deduped = dedupeOfferItems(allItems);
    const records = deduped.map((item) => mapOfferItemToOffer(item));

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { inserted, updated, skipped } = await upsertBatchSafely(
        run.id,
        batch,
        Math.floor(i / batchSize),
        dryRun,
        batchSize
      );
      totalInserted += inserted;
      totalUpdated += updated;
      totalSkipped += skipped;
    }

    const result: SyncResult = {
      fetched: deduped.length,
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
    });

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await failSyncRun(run.id, msg);
    return {
      fetched: 0, inserted: 0, updated: 0, skipped: 0,
      errors: [msg], startedAt: now,
      completedAt: new Date().toISOString(), durationMs: Date.now() - start,
    };
  }
}

/**
 * Run full sync: campaigns, promotions, then offers (all endpoints).
 */
export async function runMasOfferFullSync(
  client: MasOfferApiClient,
  options: { dryRun?: boolean; includePromotions?: boolean } = {}
): Promise<FullSyncResult> {
  const start = Date.now();
  console.info('[MasOffer] Starting full sync...');

  const { dryRun = false, includePromotions = false } = options;

  // Campaigns first (merchant-level data for reference)
  const campaigns = await syncMasOfferCampaigns(client, { dryRun });

  // Promotions (platform-level, P2)
  const promotions = includePromotions
    ? await syncMasOfferPromotions(client, { dryRun })
    : { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [], startedAt: '', completedAt: '', durationMs: 0 };

  // All offers from all endpoints with full dedupe
  const offers = await syncMasOfferOffers(client, {
    dryRun,
    includePushSale: true,
    includeOfferAll: true,
    includeDeals: true,
    includeVouchers: true,
    includeCoupons: true,
    includePromotions: false, // already synced above
  });

  const total = Date.now() - start;
  console.info(`[MasOffer] Full sync complete in ${total}ms.`);

  return {
    campaigns,
    promotions,
    offers,
    pushsale: offers, // alias for backwards compat
    totalDurationMs: total,
  };
}
