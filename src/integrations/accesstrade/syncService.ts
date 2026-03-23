/**
 * AccessTrade Sync Service
 *
 * Orchestrates the full sync pipeline:
 *  1. Fetch raw records from AccessTrade API
 *  2. Normalise to domain Offer model
 *  3. Batch upsert to Supabase with dedupe
 *  4. Log sync run + per-record errors
 *
 * Designed to be:
 *  - Idempotent: safe to re-run
 *  - Resumable: processes page-by-page, commits per batch
 *  - Observable: full run metrics + per-error records
 */

import type { AccessTradeCampaign, AccessTradeOffer } from './types.js';
import { getAccessTradeApiClient } from './client.js';
import {
  upsertOfferBatch,
  insertSyncError,
  createSyncRun,
  completeSyncRun,
  failSyncRun,
  ensureOfferSource,
} from './supabase.js';
import { mapAccessTradeOfferToOffer, mapCampaignToOffer } from './mapper.js';

// =============================================================================
// Types
// =============================================================================

export interface SyncStats {
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: number;
  durationMs: number;
}

export interface SyncDealsOptions {
  dryRun?: boolean;
  /** 1 = active, 0 = expired. Default: 1 */
  status?: 0 | 1;
  /** 1 = only coupon-code offers, 0 = no-code offers, undefined = all */
  coupon?: 0 | 1;
  /** 'expiring' = deals expiring within 3 days */
  scope?: 'expiring';
  maxPages?: number;
}

export interface SyncCampaignsOptions {
  dryRun?: boolean;
  maxPages?: number;
}

export interface FullSyncOptions {
  dryRun?: boolean;
  maxDealPages?: number;
  maxCampaignPages?: number;
}

// =============================================================================
// Sync Deals
// =============================================================================

/**
 * Sync deals/vouchers from AccessTrade → Supabase.
 *
 * @param options.dryRun    If true, fetch but don't write to DB
 * @param options.status    Filter by deal status (default: active)
 * @param options.type      Filter by deal type (voucher, promotion, etc.)
 * @param options.maxPages  Cap on pages fetched (default: 20, 2000 records)
 */
export async function syncAccessTradeDeals(
  options: SyncDealsOptions = {}
): Promise<SyncStats> {
  const start = Date.now();
  const client = getAccessTradeApiClient();

  // ── Setup ──────────────────────────────────────────────────────
  await ensureOfferSource('accesstrade', 'AccessTrade Publisher Network');

  const run = await createSyncRun('accesstrade', 'sync_deals');
  const { dryRun = false, status = 1, coupon, scope, maxPages = 20 } = options;

  let recordsFetched = 0;
  let recordsInserted = 0;
  let recordsUpdated = 0;
  let recordsSkipped = 0;
  let errors = 0;

  try {
    // ── Phase 1: Stream all offers from /v1/offers_informations ───────────────
    const allOffers: AccessTradeOffer[] = [];

    console.info(
      `[AccessTrade][SyncDeals] Starting fetch ` +
        `(status=${status}, coupon=${coupon ?? 'all'}, scope=${scope ?? 'none'}, maxPages=${maxPages})`
    );

    let pageCount = 0;

    for await (const batch of client.streamOffers({ status, coupon, scope, pageSize: 100 })) {
      allOffers.push(...batch);
      recordsFetched += batch.length;
      pageCount++;
      console.info(
        `[AccessTrade][SyncDeals] Page ${pageCount}: +${batch.length} offers ` +
          `(running total: ${recordsFetched})`
      );
      if (pageCount >= maxPages) break;
    }

    console.info(`[AccessTrade][SyncDeals] Fetch complete: ${recordsFetched} offers fetched`);

    if (dryRun) {
      console.info('[AccessTrade][SyncDeals] Dry run — skipping DB writes');
      await completeSyncRun(run.id, {
        recordsFetched,
        recordsInserted: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errorSummary: null,
      });
      return {
        recordsFetched,
        recordsInserted: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors,
        durationMs: Date.now() - start,
      };
    }

    // ── Phase 2: Normalise + Upsert in batches ──────────────────
    const BATCH_SIZE = 50;

    for (let i = 0; i < allOffers.length; i += BATCH_SIZE) {
      const batch = allOffers.slice(i, i + BATCH_SIZE);
      const normalised: Parameters<typeof upsertOfferBatch>[0] = [];

      for (const offer of batch) {
        try {
          const rawPayload = offer as unknown as Record<string, unknown>;
          normalised.push(mapAccessTradeOfferToOffer(offer, rawPayload));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[AccessTrade][SyncDeals] Normalise error for offer ${offer.id}: ${msg}`);
          await insertSyncError({
            sync_run_id: run.id,
            source: 'accesstrade',
            external_id: `at_offer_${offer.id}`,
            stage: 'normalize',
            error_message: msg,
            raw_context: { offerId: offer.id, title: offer.name },
          });
          errors++;
        }
      }

      if (normalised.length > 0) {
        try {
          const result = await upsertOfferBatch(normalised);
          recordsInserted += result.inserted;
          recordsUpdated += result.updated;
          recordsSkipped += result.skipped;
          console.info(
            `[AccessTrade][SyncDeals] Batch ${Math.floor(i / BATCH_SIZE)}: ` +
              `+${result.inserted} inserted, ~${result.updated} updated, ${result.skipped} skipped`
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[AccessTrade][SyncDeals] Batch upsert error: ${msg}`);
          await insertSyncError({
            sync_run_id: run.id,
            source: 'accesstrade',
            external_id: null,
            stage: 'upsert',
            error_message: `Batch upsert failed: ${msg}`,
            raw_context: { batchIndex: Math.floor(i / BATCH_SIZE), batchSize: normalised.length },
          });
          errors++;
        }
      }
    }

    await completeSyncRun(run.id, {
      recordsFetched,
      recordsInserted,
      recordsUpdated,
      recordsSkipped,
      errorSummary: errors > 0 ? `${errors} records had errors` : null,
    });

    console.info(
      `[AccessTrade][SyncDeals] Done. Fetched=${recordsFetched} Inserted=${recordsInserted} ` +
        `Updated=${recordsUpdated} Skipped=${recordsSkipped} Errors=${errors} ` +
        `Duration=${Date.now() - start}ms`
    );

    return {
      recordsFetched,
      recordsInserted,
      recordsUpdated,
      recordsSkipped,
      errors,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[AccessTrade][SyncDeals] Fatal error: ${msg}`);
    await failSyncRun(run.id, msg);
    throw err;
  }
}

// =============================================================================
// Sync Campaigns
// =============================================================================

/**
 * Sync merchant campaigns from AccessTrade → Supabase.
 */
export async function syncAccessTradeCampaigns(
  options: SyncCampaignsOptions = {}
): Promise<SyncStats> {
  const start = Date.now();
  const client = getAccessTradeApiClient();

  await ensureOfferSource('accesstrade', 'AccessTrade Publisher Network');

  const run = await createSyncRun('accesstrade', 'sync_campaigns');
  const { dryRun = false, maxPages = 10 } = options;

  let recordsFetched = 0;
  let recordsInserted = 0;
  let recordsUpdated = 0;
  let recordsSkipped = 0;
  let errors = 0;

  try {
    const campaignBatches: AccessTradeCampaign[][] = [];

    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      try {
        const result = await client.fetchCampaigns({ page, pageSize: 100 });
        const batch = result.data;
        campaignBatches.push(batch);
        recordsFetched += batch.length;

        const totalPages = result.pagination?.total_pages ?? 1;
        hasMore = page < totalPages;
        page++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await insertSyncError({
          sync_run_id: run.id,
          source: 'accesstrade',
          external_id: null,
          stage: 'fetch',
          error_message: `Campaign page ${page} failed: ${msg}`,
          raw_context: { page },
        });
        errors++;
        hasMore = false;
      }
    }

    if (!dryRun) {
      for (const batch of campaignBatches) {
        const normalised = batch.map((c) => {
          const rawPayload = c as unknown as Record<string, unknown>;
          return mapCampaignToOffer(c, rawPayload);
        });

        try {
          const result = await upsertOfferBatch(normalised);
          recordsInserted += result.inserted;
          recordsUpdated += result.updated;
          recordsSkipped += result.skipped;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await insertSyncError({
            sync_run_id: run.id,
            source: 'accesstrade',
            external_id: null,
            stage: 'upsert',
            error_message: `Campaign batch upsert failed: ${msg}`,
            raw_context: { batchSize: normalised.length },
          });
          errors++;
        }
      }
    }

    await completeSyncRun(run.id, {
      recordsFetched,
      recordsInserted,
      recordsUpdated,
      recordsSkipped,
      errorSummary: errors > 0 ? `${errors} errors` : null,
    });

    return {
      recordsFetched,
      recordsInserted,
      recordsUpdated,
      recordsSkipped,
      errors,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await failSyncRun(run.id, msg);
    throw err;
  }
}

// =============================================================================
// Full Sync (Deals + Campaigns)
// =============================================================================

export interface FullSyncResult {
  deals: SyncStats;
  campaigns: SyncStats;
  totalDurationMs: number;
}

/**
 * Run both deals and campaigns sync sequentially.
 */
export async function runAccessTradeFullSync(
  options: FullSyncOptions = {}
): Promise<FullSyncResult> {
  const start = Date.now();
  const { dryRun = false, maxDealPages = 20, maxCampaignPages = 10 } = options;

  console.info('[AccessTrade][FullSync] Starting full sync (dryRun=' + dryRun + ')');

  const deals = await syncAccessTradeDeals({ dryRun, maxPages: maxDealPages });
  const campaigns = await syncAccessTradeCampaigns({ dryRun, maxPages: maxCampaignPages });

  console.info(
    `[AccessTrade][FullSync] Complete. ` +
      `Deals: +${deals.recordsInserted} inserted, Campaigns: +${campaigns.recordsInserted} inserted. ` +
      `Total duration: ${Date.now() - start}ms`
  );

  return {
    deals,
    campaigns,
    totalDurationMs: Date.now() - start,
  };
}
