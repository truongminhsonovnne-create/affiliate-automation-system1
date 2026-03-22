/**
 * Supabase Write Helper — Server-side only
 *
 * Provides batch upsert for NormalisedOffer records.
 * Uses SUPABASE_SERVICE_ROLE_KEY for full access.
 */

import { createClient } from '@supabase/supabase-js';

interface NormalisedOffer {
  source: string;
  source_type: string;
  external_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  merchant_name: string;
  merchant_id: string | null;
  category: string | null;
  destination_url: string | null;
  tracking_url: string | null;
  coupon_code: string | null;
  discount_type: string | null;
  discount_value: number | null;
  max_discount: number | null;
  min_order_value: number | null;
  currency: string;
  start_at: string | null;
  end_at: string | null;
  status: string;
  terms: string | null;
  image_url: string | null;
  confidence_score: number;
  last_seen_at: string;
  first_seen_at: string;
  synced_at: string;
  raw_payload_jsonb: Record<string, unknown>;
  normalized_hash: string;
}

let _sb: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (_sb) return _sb;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  _sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _sb;
}

/**
 * Batch upsert offers using the source + external_id unique constraint.
 * Returns counts for inserted, updated, and skipped records.
 */
export async function upsertOfferBatch(
  offers: Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'>[]
): Promise<{ inserted: number; updated: number; skipped: number }> {
  if (offers.length === 0) return { inserted: 0, updated: 0, skipped: 0 };

  const sb = getSupabase();

  // Fetch existing records for all external_ids in one query
  const externalIds = offers.map((o) => o.external_id);
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
  const toUpdate: Array<{ id: string; offer: Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'> }> = [];
  let skipped = 0;

  for (const offer of offers) {
    const existing = existingMap.get(offer.external_id);
    if (!existing) {
      toInsert.push(offer);
    } else if (existing.hash === offer.normalized_hash) {
      // No meaningful change — touch last_seen_at
      await (sb.from('offers') as any).update({
          last_seen_at: offer.last_seen_at,
          synced_at: offer.synced_at,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      skipped++;
    } else {
      toUpdate.push({ id: existing.id, offer });
    }
  }

  let inserted = 0;
  let updated = 0;

  // Batch insert new records
  if (toInsert.length > 0) {
    const { error } = await (sb.from('offers') as any).insert(toInsert);
    if (error) throw error;
    inserted = toInsert.length;
  }

  // Batch update changed records
  if (toUpdate.length > 0) {
    for (const { id, offer } of toUpdate) {
      const { error } = await (sb
        .from('offers') as any)
        .update({
          title: offer.title,
          slug: offer.slug,
          description: offer.description,
          merchant_name: offer.merchant_name,
          merchant_id: offer.merchant_id,
          category: offer.category,
          destination_url: offer.destination_url,
          tracking_url: offer.tracking_url,
          coupon_code: offer.coupon_code,
          discount_type: offer.discount_type,
          discount_value: offer.discount_value,
          max_discount: offer.max_discount,
          min_order_value: offer.min_order_value,
          currency: offer.currency,
          start_at: offer.start_at,
          end_at: offer.end_at,
          status: offer.status,
          terms: offer.terms,
          image_url: offer.image_url,
          confidence_score: offer.confidence_score,
          last_seen_at: offer.last_seen_at,
          synced_at: offer.synced_at,
          raw_payload_jsonb: offer.raw_payload_jsonb,
          normalized_hash: offer.normalized_hash,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id);

      if (error) throw error;
      updated++;
    }
  }

  return { inserted, updated, skipped };
}
