/**
 * Ecomobi Supabase Write Operations
 *
 * Server-side only. Uses SUPABASE_SERVICE_ROLE_KEY.
 * Mirrors the pattern used by MasOffer and AccessTrade integrations.
 *
 * PENDING: The mapper must be verified before this is production-ready.
 */

import { upsertOfferBatch } from '@/lib/api/supabase-write';
import { mapEcomobiItemToOffer } from './mapper';
import type { EcomobiRawItem } from './types';

export interface UpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
}

/**
 * Upsert a batch of raw Ecomobi items.
 *
 * PENDING: Verify mapper output against real Ecomobi field names
 * before running in production.
 */
export async function upsertEcomobiBatch(
  items: EcomobiRawItem[]
): Promise<UpsertResult> {
  if (items.length === 0) {
    return { inserted: 0, updated: 0, skipped: 0 };
  }

  const records = items.map(mapEcomobiItemToOffer);
  return upsertOfferBatch(records);
}
