/**
 * TikTok Shop Product Snapshot Repository
 * Repository for TikTok Shop product snapshots
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { TikTokShopProductSnapshot, TikTokShopNormalizationStatus, TikTokShopEnrichmentStatus, TikTokShopFreshnessStatus } from '../types.js';

interface TikTokShopProductSnapshotRow {
  id: string;
  canonical_reference_key: string;
  source_id: string | null;
  product_payload: Record<string, unknown>;
  normalization_status: string;
  enrichment_status: string;
  freshness_status: string;
  quality_score: number | null;
  created_at: string;
  updated_at: string;
  snapshot_time: string;
}

function mapRowToSnapshot(row: TikTokShopProductSnapshotRow): TikTokShopProductSnapshot {
  return {
    id: row.id,
    canonicalReferenceKey: row.canonical_reference_key,
    sourceId: row.source_id ?? undefined,
    productPayload: row.product_payload,
    normalizationStatus: row.normalization_status as TikTokShopNormalizationStatus,
    enrichmentStatus: row.enrichment_status as TikTokShopEnrichmentStatus,
    freshnessStatus: row.freshness_status as TikTokShopFreshnessStatus,
    qualityScore: row.quality_score ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    snapshotTime: new Date(row.snapshot_time),
  };
}

export class TikTokProductSnapshotRepository {
  async findAll(): Promise<TikTokShopProductSnapshot[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_product_snapshots')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch product snapshots: ${error.message}`);
    return (data || []).map(mapRowToSnapshot);
  }

  async findById(id: string): Promise<TikTokShopProductSnapshot | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_product_snapshots')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch product snapshot: ${error.message}`);
    }
    return mapRowToSnapshot(data as TikTokShopProductSnapshotRow);
  }

  async findByReferenceKey(referenceKey: string): Promise<TikTokShopProductSnapshot[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_product_snapshots')
      .select('*')
      .eq('canonical_reference_key', referenceKey)
      .order('snapshot_time', { ascending: false });

    if (error) throw new Error(`Failed to fetch product snapshots by reference: ${error.message}`);
    return (data || []).map(mapRowToSnapshot);
  }

  async findLatestByReferenceKey(referenceKey: string): Promise<TikTokShopProductSnapshot | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_product_snapshots')
      .select('*')
      .eq('canonical_reference_key', referenceKey)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch latest product snapshot: ${error.message}`);
    }
    return mapRowToSnapshot(data as TikTokShopProductSnapshotRow);
  }

  async create(data: Omit<TikTokShopProductSnapshot, 'id' | 'createdAt' | 'updatedAt'>): Promise<TikTokShopProductSnapshot> {
    const supabase = getSupabaseClient();
    const { data: row, error } = await supabase
      .from('tiktok_shop_product_snapshots')
      .insert({
        canonical_reference_key: data.canonicalReferenceKey,
        source_id: data.sourceId ?? null,
        product_payload: data.productPayload,
        normalization_status: data.normalizationStatus,
        enrichment_status: data.enrichmentStatus,
        freshness_status: data.freshnessStatus,
        quality_score: data.qualityScore ?? null,
        snapshot_time: data.snapshotTime.toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create product snapshot: ${error.message}`);
    return mapRowToSnapshot(row as TikTokShopProductSnapshotRow);
  }

  async update(id: string, data: Partial<TikTokShopProductSnapshot>): Promise<TikTokShopProductSnapshot> {
    const supabase = getSupabaseClient();
    const updates: Record<string, unknown> = {};

    if (data.normalizationStatus) updates.normalization_status = data.normalizationStatus;
    if (data.enrichmentStatus) updates.enrichment_status = data.enrichmentStatus;
    if (data.freshnessStatus) updates.freshness_status = data.freshnessStatus;
    if (data.qualityScore !== undefined) updates.quality_score = data.qualityScore;
    if (data.productPayload) updates.product_payload = data.productPayload;

    const { data: row, error } = await supabase
      .from('tiktok_shop_product_snapshots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update product snapshot: ${error.message}`);
    return mapRowToSnapshot(row as TikTokShopProductSnapshotRow);
  }

  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('tiktok_shop_product_snapshots')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete product snapshot: ${error.message}`);
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_product_snapshots')
      .delete()
      .lt('snapshot_time', date.toISOString())
      .select('id');

    if (error) throw new Error(`Failed to delete old snapshots: ${error.message}`);
    return (data || []).length;
  }
}

let repository: TikTokProductSnapshotRepository | null = null;

export function getTikTokProductSnapshotRepository(): TikTokProductSnapshotRepository {
  if (!repository) {
    repository = new TikTokProductSnapshotRepository();
  }
  return repository;
}

// Convenience function
export async function saveProductSnapshot(
  data: Omit<TikTokShopProductSnapshot, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TikTokShopProductSnapshot> {
  return getTikTokProductSnapshotRepository().create(data);
}
