/**
 * Sync Orchestrator — Source Registry
 *
 * Self-contained version for admin-dashboard Next.js deployment.
 * Uses relative imports within the admin-dashboard package.
 *
 * To add a new source:
 *  1. Add an entry to SOURCE_REGISTRY
 *  2. Ensure the source is in sync_source_state table
 */

import type { SyncMode } from './types.js';

export interface SourceSyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  durationMs: number;
  checkpoint: {
    lastPage: number;
    lastCursor: string | null;
    lastExternalTimestamp: string | null;
    pendingContinue: boolean;
  };
}

export interface SourceAdapter {
  key: string;
  name: string;
  enabled: boolean;
  defaultMode: SyncMode;
  maxPagesPerRun: number;
  maxRetries: number;
  sync(opts: {
    dryRun?: boolean;
    mode: SyncMode;
    checkpoint: {
      lastPage: number;
      lastCursor: string | null;
      lastExternalTimestamp: string | null;
      pendingContinue: boolean;
    };
    maxPages?: number;
  }): Promise<SourceSyncResult>;
}

export const SOURCE_REGISTRY: Record<string, SourceAdapter> = {};

// ── MasOffer ────────────────────────────────────────────────────────────────

async function createMasOfferAdapter(): Promise<SourceAdapter> {
  const { getMasOfferApiClient } = await import('@/lib/api/masoffer-client');
  const { mapOfferItemToOffer } = await import('@/lib/api/masoffer-mapper');

  return {
    key: 'masoffer',
    name: 'MasOffer Publisher Network',
    enabled: true,
    defaultMode: 'incremental',
    maxPagesPerRun: 10,
    maxRetries: 3,

    async sync({ dryRun, mode, checkpoint, maxPages = 10 }) {
      const client = getMasOfferApiClient();
      const { upsertOfferBatch } = await import('@/lib/api/supabase-write');
      const { updateCheckpoint } = await import('./checkpoint.js');
      const start = Date.now();
      const errors: string[] = [];

      // ── Deals ──────────────────────────────────────────────
      let page = checkpoint.pendingContinue && checkpoint.lastPage > 0
        ? checkpoint.lastPage + 1
        : 1;
      let totalFetched = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let hasMore = false;

      for (let i = 0; i < maxPages; i++) {
        try {
          const result = await client.getDeals({ page, limit: 100 });
          if (!result.data || result.data.length === 0) break;

          const records = result.data.map(mapOfferItemToOffer);
          if (!dryRun) {
            const r = await upsertOfferBatch(records);
            totalInserted += r.inserted;
            totalUpdated += r.updated;
            totalSkipped += r.skipped;
          } else {
            totalInserted += records.length;
          }
          totalFetched += result.data.length;

          const tp = result.pagination?.total_pages ?? 1;
          hasMore = page < tp;
          page++;

          if (!hasMore) break;
        } catch (err) {
          errors.push(`Page ${page}: ${err instanceof Error ? err.message : String(err)}`);
          await updateCheckpoint('masoffer', {
            pendingContinue: true,
            succeeded: false,
            error: errors[errors.length - 1],
          });
          break;
        }
      }

      // Save checkpoint
      await updateCheckpoint('masoffer', {
        lastPage: hasMore ? page - 1 : 0,
        pendingContinue: hasMore,
        succeeded: !hasMore && errors.length === 0,
        error: errors.length > 0 ? errors[errors.length - 1] : null,
      });

      return {
        fetched: totalFetched,
        inserted: totalInserted,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors,
        durationMs: Date.now() - start,
        checkpoint: {
          lastPage: hasMore ? page - 1 : 0,
          lastCursor: null,
          lastExternalTimestamp: null,
          pendingContinue: hasMore,
        },
      };
    },
  };
}

// ── AccessTrade ─────────────────────────────────────────────────────────────

async function createAccessTradeAdapter(): Promise<SourceAdapter> {
  const { getAccessTradeClient } = await import('@/lib/api/accesstrade-client');
  const { mapOfferToNormalisedOffer } = await import('@/lib/api/accesstrade-mapper');
  const { upsertOfferBatch } = await import('@/lib/api/supabase-write');
  const { updateCheckpoint } = await import('./checkpoint.js');

  return {
    key: 'accesstrade',
    name: 'AccessTrade Publisher Network',
    enabled: true,
    defaultMode: 'incremental',
    maxPagesPerRun: 20,
    maxRetries: 3,

    async sync({ dryRun, checkpoint, maxPages = 20 }) {
      const client = getAccessTradeClient();
      const start = Date.now();
      const errors: string[] = [];
      let page = 1;
      let totalFetched = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;

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
            totalInserted += r.inserted;
            totalUpdated += r.updated;
            totalSkipped += r.skipped;
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
              totalInserted += res.inserted;
              totalUpdated += res.updated;
              totalSkipped += res.skipped;
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

        await updateCheckpoint('accesstrade', {
          lastPage: 0,
          pendingContinue: false,
          succeeded: true,
        });
      } catch (err) {
        errors.push(String(err instanceof Error ? err.message : err));
        await updateCheckpoint('accesstrade', {
          pendingContinue: true,
          succeeded: false,
          error: errors[0],
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
          lastPage: 0,
          lastCursor: null,
          lastExternalTimestamp: null,
          pendingContinue: errors.length > 0,
        },
      };
    },
  };
}

// ── Ecomobi ─────────────────────────────────────────────────────────────────

async function createEcomobiAdapter(): Promise<SourceAdapter> {
  // Dynamic import to avoid circular deps and keep tree-shakeable
  const { syncEcomobiOffers } = await import('@/integrations/ecomobi/sync');

  return {
    key: 'ecomobi',
    name: 'Ecomobi',
    enabled: false, // PENDING: set to true once Ecomobi API credentials are available
    defaultMode: 'incremental',
    maxPagesPerRun: 10,
    maxRetries: 3,

    async sync({ dryRun, checkpoint, maxPages = 10 }) {
      const start = Date.now();
      const errors: string[] = [];

      try {
        const result = await syncEcomobiOffers({ dryRun, maxPages });

        return {
          fetched: result.fetched,
          inserted: result.inserted,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors,
          durationMs: result.durationMs,
          checkpoint: {
            lastPage: 0,
            lastCursor: null,
            lastExternalTimestamp: null,
            pendingContinue: result.errors.length > 0,
          },
        };
      } catch (err) {
        errors.push(String(err instanceof Error ? err.message : err));
        return {
          fetched: 0,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors,
          durationMs: Date.now() - start,
          checkpoint: {
            lastPage: checkpoint.lastPage,
            lastCursor: checkpoint.lastCursor,
            lastExternalTimestamp: checkpoint.lastExternalTimestamp,
            pendingContinue: true,
          },
        };
      }
    },
  };
}

// ── Initialize registry ────────────────────────────────────────────────────
// Registry is initialized once at module load time

let _initialized = false;

async function ensureInitialized(): Promise<void> {
  if (_initialized) return;

  const [mo, at, em] = await Promise.all([
    createMasOfferAdapter(),
    createAccessTradeAdapter(),
    createEcomobiAdapter(),
  ]);

  SOURCE_REGISTRY[mo.key] = mo;
  SOURCE_REGISTRY[at.key] = at;
  SOURCE_REGISTRY[em.key] = em;
  _initialized = true;
}

/**
 * Get a source adapter by key.
 */
export async function getSourceAdapter(key: string): Promise<SourceAdapter> {
  await ensureInitialized();
  const source = SOURCE_REGISTRY[key];
  if (!source) {
    throw new Error(
      `[Sync][Registry] Unknown source: '${key}'. Available: ${Object.keys(SOURCE_REGISTRY).join(', ')}`
    );
  }
  return source;
}

/**
 * Get all registered source keys.
 */
export async function getRegisteredKeys(): Promise<string[]> {
  await ensureInitialized();
  return Object.keys(SOURCE_REGISTRY);
}
