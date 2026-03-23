/**
 * AccessTrade Sync — Supabase Repository
 *
 * Handles all database operations for the AccessTrade integration:
 *  - offer_sources   (source registry)
 *  - offers          (canonical offer records — upsert with dedupe)
 *  - offer_snapshots (payload change history)
 *  - sync_runs       (job execution log)
 *  - sync_errors     (per-record error log)
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY so RLS policies are bypassed.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  NormalisedOffer,
  OfferSourceRecord,
  SyncRunRecord,
  SyncErrorRecord,
  SyncRunStatus,
  OfferRepository,
  SyncRunRepository,
  SyncErrorRepository,
} from './types.js';
import { createHash } from 'crypto';

// =============================================================================
// Client (lazy singleton)
// =============================================================================

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — ' +
        'these are required for the sync service.'
    );
  }

  // Normalise URL: extract from PostgreSQL connection string if needed
  let httpUrl = url;
  if (url.startsWith('postgresql://')) {
    const match = url.match(/postgresql:\/\/[^@]+@([^:]+):(\d+)\/(\w+)/);
    if (match) httpUrl = `https://${match[1]}`;
  }

  _supabase = createClient(httpUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _supabase;
}

// =============================================================================
// Offer Repository
// =============================================================================

/**
 * Upsert a single offer.
 * Returns the operation type: 'insert', 'update', or 'skip'.
 *
 * Skips if a record with the same (source, external_id) exists AND
 * the normalized_hash matches — no meaningful data change.
 */
export async function upsertOffer(
  offer: Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'>
): Promise<{ id: string; operation: 'insert' | 'update' | 'skip' }> {
  const sb = getSupabase();

  const { data: existing } = await sb
    .from('offers')
    .select('id, normalized_hash, first_seen_at')
    .eq('source', offer.source)
    .eq('external_id', offer.external_id)
    .single();

  if (existing) {
    // Same hash → no meaningful change, skip
    if (existing.normalized_hash === offer.normalized_hash) {
      // Update last_seen_at only
      await sb
        .from('offers')
        .update({
          last_seen_at: offer.last_seen_at,
          synced_at: offer.synced_at,
          status: offer.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      return { id: existing.id, operation: 'skip' };
    }

    // Different hash → meaningful change, update
    const { data, error } = await sb
      .from('offers')
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
      } satisfies Partial<NormalisedOffer>)
      .eq('id', existing.id)
      .select('id')
      .single();

    if (error) throw error;

    // Capture snapshot on update
    await captureSnapshot(existing.id, offer.raw_payload_jsonb);

    return { id: existing.id, operation: 'update' };
  }

  // New record — insert
  const { data, error } = await sb
    .from('offers')
    .insert({
      source: offer.source,
      source_type: offer.source_type,
      external_id: offer.external_id,
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
      first_seen_at: offer.first_seen_at,
      synced_at: offer.synced_at,
      raw_payload_jsonb: offer.raw_payload_jsonb,
      normalized_hash: offer.normalized_hash,
    })
    .select('id')
    .single();

  if (error) throw error;

  return { id: data.id, operation: 'insert' };
}

/**
 * Batch upsert — groups external IDs into a single DB query for efficiency.
 */
export async function upsertOfferBatch(
  offers: Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'>[]
): Promise<{ inserted: number; updated: number; skipped: number }> {
  if (offers.length === 0) return { inserted: 0, updated: 0, skipped: 0 };

  const sb = getSupabase();

  // Fetch existing records for all external_ids in one query
  const externalIds = offers.map((o) => o.external_id);
  const sources = [...new Set(offers.map((o) => o.source))];
  const { data: existingRows } = await sb
    .from('offers')
    .select('id, external_id, source, normalized_hash, first_seen_at')
    .in('source', sources)
    .in('external_id', externalIds);

  // Key by composite (source, external_id) to correctly dedupe across sources
  const existingMap = new Map<string, { id: string; hash: string; first_seen_at: string }>();
  for (const row of existingRows ?? []) {
    existingMap.set(`${row.source}::${row.external_id}`, {
      id: row.id,
      hash: row.normalized_hash,
      first_seen_at: row.first_seen_at,
    });
  }

  const toInsert: Array<Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'>> = [];
  const toUpdate: Array<{ id: string; offer: Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'> }> = [];
  let skipped = 0;

  for (const offer of offers) {
    const existing = existingMap.get(`${offer.source}::${offer.external_id}`);
    if (!existing) {
      toInsert.push(offer);
    } else if (existing.hash === offer.normalized_hash) {
      // No meaningful change — touch last_seen_at only
      await sb
        .from('offers')
        .update({ last_seen_at: offer.last_seen_at, synced_at: offer.synced_at, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      skipped++;
    } else {
      toUpdate.push({ id: existing.id, offer });
    }
  }

  // Batch insert new records
  if (toInsert.length > 0) {
    const insertRows = toInsert.map((o) => ({ ...o }));
    const { error } = await sb.from('offers').insert(insertRows);
    if (error) throw error;
  }

  // Batch update changed records
  if (toUpdate.length > 0) {
    for (const { id, offer } of toUpdate) {
      const original = existingMap.get(`${offer.source}::${offer.external_id}`);
      await sb
        .from('offers')
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
          // Preserve original first_seen_at so we always know ingestion age
          first_seen_at: original?.first_seen_at ?? offer.first_seen_at,
          // Enrichment fields (only update if present in the new payload)
          ...(offer.used_count !== undefined       && { used_count: offer.used_count }),
          ...(offer.click_count !== undefined      && { click_count: offer.click_count }),
          ...(offer.conversion_count !== undefined && { conversion_count: offer.conversion_count }),
          ...(offer.hotness_score !== undefined    && { hotness_score: offer.hotness_score }),
          ...(offer.is_pushsale !== undefined       && { is_pushsale: offer.is_pushsale }),
          ...(offer.is_exclusive !== undefined     && { is_exclusive: offer.is_exclusive }),
          ...(offer.freshness_score !== undefined  && { freshness_score: offer.freshness_score }),
          ...(offer.url_quality_score !== undefined && { url_quality_score: offer.url_quality_score }),
          ...(offer.deal_subtype !== undefined     && { deal_subtype: offer.deal_subtype }),
        } satisfies Partial<NormalisedOffer>)
        .eq('id', id);

      await captureSnapshot(id, offer.raw_payload_jsonb);
    }
  }

  return {
    inserted: toInsert.length,
    updated: toUpdate.length,
    skipped,
  };
}

/**
 * Get offer counts.
 */
export async function getOfferCount(source?: string): Promise<number> {
  const sb = getSupabase();
  let q = sb.from('offers').select('id', { count: 'exact', head: true });
  if (source) q = q.eq('source', source);
  const { count } = await q;
  return count ?? 0;
}

/**
 * Get recent offers from a source.
 */
export async function getRecentOffers(source: string, limit = 20): Promise<NormalisedOffer[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('offers')
    .select('*')
    .eq('source', source)
    .order('synced_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as NormalisedOffer[]) ?? [];
}

// =============================================================================
// Snapshots
// =============================================================================

async function captureSnapshot(
  offerId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const sb = getSupabase();
  const checksum = createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');

  await sb.from('offer_snapshots').insert({
    offer_id: offerId,
    raw_payload_jsonb: payload,
    captured_at: new Date().toISOString(),
    checksum,
  });
}

// =============================================================================
// Sync Run Repository
// =============================================================================

export async function createSyncRun(source: string, jobName: string): Promise<SyncRunRecord> {
  const sb = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await sb
    .from('sync_runs')
    .insert({
      source,
      job_name: jobName,
      status: 'running',
      started_at: now,
      records_fetched: 0,
      records_inserted: 0,
      records_updated: 0,
      records_skipped: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as SyncRunRecord;
}

export async function completeSyncRun(
  runId: string,
  stats: {
    recordsFetched: number;
    recordsInserted: number;
    recordsUpdated: number;
    recordsSkipped: number;
    errorSummary?: string;
  }
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('sync_runs')
    .update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      records_fetched: stats.recordsFetched,
      records_inserted: stats.recordsInserted,
      records_updated: stats.recordsUpdated,
      records_skipped: stats.recordsSkipped,
      error_summary: stats.errorSummary ?? null,
    } satisfies Partial<SyncRunRecord>)
    .eq('id', runId);

  if (error) throw error;
}

export async function failSyncRun(runId: string, errorSummary: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('sync_runs')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_summary: errorSummary,
    })
    .eq('id', runId);

  if (error) throw error;
}

export async function getLastSyncRun(source: string): Promise<SyncRunRecord | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('sync_runs')
    .select('*')
    .eq('source', source)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return (data as unknown as SyncRunRecord) ?? null;
}

// =============================================================================
// Sync Error Repository
// =============================================================================

export async function insertSyncError(error: Omit<SyncErrorRecord, 'id' | 'created_at'>): Promise<void> {
  const sb = getSupabase();
  const { error: dbError } = await sb.from('sync_errors').insert({
    sync_run_id: error.sync_run_id,
    source: error.source,
    external_id: error.external_id,
    stage: error.stage,
    error_message: error.error_message,
    raw_context: error.raw_context ?? null,
  });

  if (dbError) {
    // Non-fatal — log to console but don't throw
    console.error('[AccessTrade][SyncError] Failed to record sync error:', dbError);
  }
}

// =============================================================================
// Source Registry
// =============================================================================

export async function ensureOfferSource(key: string, name: string): Promise<void> {
  const sb = getSupabase();

  const { data: existing } = await sb
    .from('offer_sources')
    .select('id')
    .eq('key', key)
    .single();

  if (!existing) {
    const now = new Date().toISOString();
    await sb.from('offer_sources').insert({
      key,
      name,
      is_enabled: true,
      created_at: now,
      updated_at: now,
    });
  }
}
