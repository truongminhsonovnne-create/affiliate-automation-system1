/**
 * MasOffer Sync — Supabase Repository
 *
 * Reuses the shared AccessTrade supabase infrastructure.
 * All functions delegate to the AccessTrade supabase module,
 * which operates on the shared schema (offers, sync_runs, etc.).
 */

import {
  upsertOffer,
  upsertOfferBatch,
  createSyncRun,
  completeSyncRun,
  failSyncRun,
  getLastSyncRun,
  insertSyncError,
  ensureOfferSource,
} from '../accesstrade/supabase.js';
import type {
  NormalisedOffer,
  SyncRunRecord,
  SyncErrorRecord,
} from '../accesstrade/types.js';

// Re-export so callers only need to import from masoffer.supabase
export {
  upsertOffer,
  upsertOfferBatch,
  createSyncRun,
  completeSyncRun,
  failSyncRun,
  getLastSyncRun,
  insertSyncError,
  ensureOfferSource,
};

export async function getMasOfferOfferCount(): Promise<number> {
  const { getOfferCount } = await import('../accesstrade/supabase.js');
  return getOfferCount('masoffer');
}

export async function getMasOfferRecentOffers(limit = 20): Promise<NormalisedOffer[]> {
  const { getRecentOffers } = await import('../accesstrade/supabase.js');
  return getRecentOffers('masoffer', limit);
}
