/**
 * Sync Orchestrator — Source Registry
 *
 * Central registry of all sync sources.
 * Orchestrator reads from here to know what to sync.
 *
 * To add a new source:
 *  1. Add an entry to SOURCE_REGISTRY below
 *  2. Implement the sync function in src/integrations/<source>/
 *  3. Add the source to migrations/003 (is_enabled=false initially)
 */

import type { SourceConfig } from './types.js';

export interface SyncSource {
  /** Unique key — must match keys in sync_source_state table */
  key: string;
  /** Human-readable name */
  name: string;
  /** Whether this source is enabled by default */
  enabled: boolean;
  /** Default sync mode */
  defaultMode: 'incremental' | 'full';
  /** Max pages per single orchestrator run (0 = unlimited) */
  maxPagesPerRun: number;
  /** Max consecutive failures before auto-disable */
  maxRetries: number;
  /** Sync function to call — signature: (opts) => Promise<SourceSyncResult> */
  sync: (opts: {
    dryRun?: boolean;
    mode: 'incremental' | 'full';
    checkpoint: {
      lastPage: number;
      lastCursor: string | null;
      lastExternalTimestamp: string | null;
      pendingContinue: boolean;
    };
    maxPages?: number;
  }) => Promise<SourceSyncResult>;
}

export interface SourceSyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  durationMs: number;
  /** Final checkpoint state after this run */
  checkpoint: {
    lastPage: number;
    lastCursor: string | null;
    lastExternalTimestamp: string | null;
    pendingContinue: boolean;
  };
}

/**
 * Source registry — orchestrator reads from here.
 *
 * The `sync` function is lazily imported to avoid loading all integrations
 * into memory when they're not needed.
 */
export const SOURCE_REGISTRY: Record<string, SyncSource> = {};

// ── MasOffer ────────────────────────────────────────────────────────────────

function createMasOfferSource(): SyncSource {
  return {
    key: 'masoffer',
    name: 'MasOffer Publisher Network',
    enabled: true,
    defaultMode: 'incremental',
    maxPagesPerRun: 10,  // 10 pages × 100 items = 1000 items max per run
    maxRetries: 3,

    async sync({ dryRun, mode, checkpoint, maxPages = 10 }) {
      const { getMasOfferApiClient } = await import('../../integrations/masoffer/MasOfferApiClient.js');
      const { syncMasOfferOffers, syncMasOfferCampaigns } = await import('../../integrations/masoffer/masoffer.sync.js');
      const { getCheckpoint, updateCheckpoint } = await import('./checkpoint.js');

      const client = getMasOfferApiClient();
      const start = Date.now();
      const errors: string[] = [];
      let totalFetched = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let finalPage = checkpoint.lastPage;

      // ── Step 1: Campaigns ─────────────────────────────────────
      try {
        const cp = await getCheckpoint('masoffer');
        const result = await syncMasOfferCampaigns(client, {
          dryRun,
          batchSize: 50,
          ...(mode === 'incremental' && cp.lastPage > 0 ? { startPage: cp.lastPage } : {}),
        });
        totalFetched += result.fetched;
        totalInserted += result.inserted;
        totalUpdated += result.updated;
        totalSkipped += result.skipped;
        errors.push(...result.errors);
        finalPage = Math.max(finalPage, result.fetched > 0 ? 1 : 0);
      } catch (err) {
        errors.push(`Campaigns: ${err instanceof Error ? err.message : String(err)}`);
      }

      // ── Step 2: Offers (deals + vouchers + coupons) ───────────
      try {
        // MasOffer doesn't support cursor or timestamp filters,
        // so we resume from lastPage using stream helpers
        let page = checkpoint.lastPage > 0 ? checkpoint.lastPage : 1;
        let hasMore = checkpoint.pendingContinue;
        const limitPages = Math.min(maxPages, this.maxPagesPerRun);
        let pageCount = 0;

        // Helper to normalise + upsert a page of items
        const { mapOfferItemToOffer } = await import('../../integrations/masoffer/masoffer.mapper.js');
        const { upsertOfferBatch } = await import('../../integrations/masoffer/masoffer.supabase.js');

        if (!hasMore) {
          // Fresh run — start from page 1 for deals
          const result = await client.fetchDeals({ page: 1, pageSize: 100 });
          if (result.data && result.data.length > 0) {
            const records = result.data.map((item: Parameters<typeof mapOfferItemToOffer>[0]) => mapOfferItemToOffer(item));
            if (!dryRun) {
              const r = await upsertOfferBatch(records);
              totalInserted += r.inserted;
              totalUpdated += r.updated;
              totalSkipped += r.skipped;
            } else {
              totalInserted += records.length;
            }
            totalFetched += result.data.length;
          }

          const totalPages = result.pagination?.total_pages ?? 1;
          hasMore = page < totalPages;
          finalPage = Math.max(finalPage, 1);
          page++;
          pageCount++;
        }

        // Continue from lastPage if pending
        while (hasMore && pageCount < limitPages) {
          const result = await client.fetchDeals({ page, pageSize: 100 });
          if (!result.data || result.data.length === 0) break;

          const records = result.data.map((item: Parameters<typeof mapOfferItemToOffer>[0]) => mapOfferItemToOffer(item));
          if (!dryRun) {
            const r = await upsertOfferBatch(records);
            totalInserted += r.inserted;
            totalUpdated += r.updated;
            totalSkipped += r.skipped;
          } else {
            totalInserted += records.length;
          }
          totalFetched += result.data.length;

          const totalPages = result.pagination?.total_pages ?? 1;
          hasMore = page < totalPages;
          finalPage = Math.max(finalPage, page);
          page++;
          pageCount++;
        }

        // Save checkpoint after deals
        await updateCheckpoint('masoffer', {
          lastPage: hasMore ? finalPage : 0,
          pendingContinue: hasMore,
          lastCursor: null,
          succeeded: !hasMore || dryRun,
          error: hasMore ? 'Incomplete — more pages remaining' : null,
        });
      } catch (err) {
        errors.push(`Offers: ${err instanceof Error ? err.message : String(err)}`);
        await updateCheckpoint('masoffer', {
          pendingContinue: true,
          succeeded: false,
          error: String(err),
        });
      }

      return {
        fetched: totalFetched,
        inserted: totalInserted,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors,
        durationMs: Date.now() - start,
        checkpoint: {
          lastPage: finalPage,
          lastCursor: null,
          lastExternalTimestamp: null,
          pendingContinue: errors.length > 0,
        },
      };
    },
  };
}

// ── AccessTrade ─────────────────────────────────────────────────────────────

function createAccessTradeSource(): SyncSource {
  return {
    key: 'accesstrade',
    name: 'AccessTrade Publisher Network',
    enabled: true,
    defaultMode: 'incremental',
    maxPagesPerRun: 20,
    maxRetries: 3,

    async sync({ dryRun, mode, checkpoint, maxPages = 20 }) {
      const { getAccessTradeApiClient } = await import('../../integrations/accesstrade/client.js');
      const { syncAccessTradeDeals, syncAccessTradeCampaigns } = await import('../../integrations/accesstrade/syncService.js');
      const { updateCheckpoint } = await import('./checkpoint.js');

      const start = Date.now();
      const errors: string[] = [];
      let totalFetched = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let finalPage = checkpoint.lastPage;

      // ── Campaigns ─────────────────────────────────────────────
      try {
        const cp = mode === 'incremental' && checkpoint.lastPage > 0
          ? checkpoint
          : { lastPage: 0, lastCursor: null, lastExternalTimestamp: null };

        const result = await syncAccessTradeCampaigns({
          dryRun,
          maxPages: Math.min(maxPages, 10),
        });
        totalFetched += result.recordsFetched;
        totalInserted += result.recordsInserted;
        totalUpdated += result.recordsUpdated;
        totalSkipped += result.recordsSkipped;
        if (result.errors > 0) errors.push(`Campaigns: ${result.errors} errors`);
        finalPage = Math.max(finalPage, 1);
      } catch (err) {
        errors.push(`Campaigns: ${err instanceof Error ? err.message : String(err)}`);
      }

      // ── Deals ────────────────────────────────────────────────
      try {
        // AccessTrade supports status filter — use timestamp for incremental
        const status = mode === 'incremental' ? 'active' : undefined;
        const result = await syncAccessTradeDeals({
          dryRun,
          status,
          maxPages: Math.min(maxPages, this.maxPagesPerRun),
        });
        totalFetched += result.recordsFetched;
        totalInserted += result.recordsInserted;
        totalUpdated += result.recordsUpdated;
        totalSkipped += result.recordsSkipped;
        if (result.errors > 0) errors.push(`Deals: ${result.errors} errors`);
        finalPage = Math.max(finalPage, 1);
      } catch (err) {
        errors.push(`Deals: ${err instanceof Error ? err.message : String(err)}`);
      }

      const succeeded = errors.length === 0;
      await updateCheckpoint('accesstrade', {
        lastPage: succeeded ? 0 : finalPage,
        pendingContinue: !succeeded,
        succeeded,
        error: succeeded ? null : errors.join('; '),
      });

      return {
        fetched: totalFetched,
        inserted: totalInserted,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors,
        durationMs: Date.now() - start,
        checkpoint: {
          lastPage: finalPage,
          lastCursor: null,
          lastExternalTimestamp: null,
          pendingContinue: !succeeded,
        },
      };
    },
  };
}

// ── Register all sources ────────────────────────────────────────────────────

SOURCE_REGISTRY['masoffer'] = createMasOfferSource();
SOURCE_REGISTRY['accesstrade'] = createAccessTradeSource();

/**
 * Get a source by key. Throws if not found.
 */
export function getSource(key: string): SyncSource {
  const source = SOURCE_REGISTRY[key];
  if (!source) {
    throw new Error(`[Sync][Registry] Unknown source: '${key}'. Available: ${Object.keys(SOURCE_REGISTRY).join(', ')}`);
  }
  return source;
}

/**
 * Get all registered source keys.
 */
export function getRegisteredKeys(): string[] {
  return Object.keys(SOURCE_REGISTRY);
}
