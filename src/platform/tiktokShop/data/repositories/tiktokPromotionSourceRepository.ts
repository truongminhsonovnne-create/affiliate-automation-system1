/**
 * TikTok Shop Promotion Source Repository
 * Repository for TikTok Shop promotion source records
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { TikTokShopPromotionSourceRecord, TikTokShopNormalizationStatus, TikTokShopCompatibilityStatus } from '../types.js';

interface TikTokShopPromotionSourceRow {
  id: string;
  source_id: string | null;
  promotion_source_key: string;
  raw_payload: Record<string, unknown>;
  normalization_status: string;
  compatibility_status: string;
  created_at: string;
  updated_at: string;
}

function mapRowToPromotionSource(row: TikTokShopPromotionSourceRow): TikTokShopPromotionSourceRecord {
  return {
    id: row.id,
    sourceId: row.source_id ?? undefined,
    promotionSourceKey: row.promotion_source_key,
    rawPayload: row.raw_payload,
    normalizationStatus: row.normalization_status as TikTokShopNormalizationStatus,
    compatibilityStatus: row.compatibility_status as TikTokShopCompatibilityStatus,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class TikTokPromotionSourceRepository {
  async findAll(): Promise<TikTokShopPromotionSourceRecord[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_promotion_source_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch promotion source records: ${error.message}`);
    return (data || []).map(mapRowToPromotionSource);
  }

  async findById(id: string): Promise<TikTokShopPromotionSourceRecord | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_promotion_source_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch promotion source record: ${error.message}`);
    }
    return mapRowToPromotionSource(data as TikTokShopPromotionSourceRow);
  }

  async findBySourceId(sourceId: string): Promise<TikTokShopPromotionSourceRecord[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_promotion_source_records')
      .select('*')
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch promotion source records by source: ${error.message}`);
    return (data || []).map(mapRowToPromotionSource);
  }

  async findByKey(promotionSourceKey: string): Promise<TikTokShopPromotionSourceRecord[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_promotion_source_records')
      .select('*')
      .eq('promotion_source_key', promotionSourceKey)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch promotion source records by key: ${error.message}`);
    return (data || []).map(mapRowToPromotionSource);
  }

  async create(data: Omit<TikTokShopPromotionSourceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<TikTokShopPromotionSourceRecord> {
    const supabase = getSupabaseClient();
    const { data: row, error } = await supabase
      .from('tiktok_shop_promotion_source_records')
      .insert({
        source_id: data.sourceId ?? null,
        promotion_source_key: data.promotionSourceKey,
        raw_payload: data.rawPayload,
        normalization_status: data.normalizationStatus,
        compatibility_status: data.compatibilityStatus,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create promotion source record: ${error.message}`);
    return mapRowToPromotionSource(row as TikTokShopPromotionSourceRow);
  }

  async update(id: string, data: Partial<TikTokShopPromotionSourceRecord>): Promise<TikTokShopPromotionSourceRecord> {
    const supabase = getSupabaseClient();
    const updates: Record<string, unknown> = {};

    if (data.normalizationStatus) updates.normalization_status = data.normalizationStatus;
    if (data.compatibilityStatus) updates.compatibility_status = data.compatibilityStatus;
    if (data.rawPayload) updates.raw_payload = data.rawPayload;

    const { data: row, error } = await supabase
      .from('tiktok_shop_promotion_source_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update promotion source record: ${error.message}`);
    return mapRowToPromotionSource(row as TikTokShopPromotionSourceRow);
  }

  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('tiktok_shop_promotion_source_records')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete promotion source record: ${error.message}`);
  }
}

let repository: TikTokPromotionSourceRepository | null = null;

export function getTikTokPromotionSourceRepository(): TikTokPromotionSourceRepository {
  if (!repository) {
    repository = new TikTokPromotionSourceRepository();
  }
  return repository;
}
