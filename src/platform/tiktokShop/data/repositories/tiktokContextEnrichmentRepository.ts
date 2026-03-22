/**
 * TikTok Shop Context Enrichment Repository
 * Repository for TikTok Shop context enrichment records
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { TikTokShopContextEnrichmentRecord, TikTokShopEnrichmentType, TikTokShopEnrichmentStatus } from '../types.js';

interface TikTokShopContextEnrichmentRow {
  id: string;
  canonical_reference_key: string;
  enrichment_type: string;
  enrichment_status: string;
  enrichment_payload: Record<string, unknown>;
  quality_score: number | null;
  created_at: string;
}

function mapRowToEnrichment(row: TikTokShopContextEnrichmentRow): TikTokShopContextEnrichmentRecord {
  return {
    id: row.id,
    canonicalReferenceKey: row.canonical_reference_key,
    enrichmentType: row.enrichment_type as TikTokShopEnrichmentType,
    enrichmentStatus: row.enrichment_status as TikTokShopEnrichmentStatus,
    enrichmentPayload: row.enrichment_payload,
    qualityScore: row.quality_score ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

export class TikTokContextEnrichmentRepository {
  async findAll(): Promise<TikTokShopContextEnrichmentRecord[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_context_enrichment_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch enrichment records: ${error.message}`);
    return (data || []).map(mapRowToEnrichment);
  }

  async findById(id: string): Promise<TikTokShopContextEnrichmentRecord | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_context_enrichment_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch enrichment record: ${error.message}`);
    }
    return mapRowToEnrichment(data as TikTokShopContextEnrichmentRow);
  }

  async findByReferenceKey(referenceKey: string): Promise<TikTokShopContextEnrichmentRecord[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_context_enrichment_records')
      .select('*')
      .eq('canonical_reference_key', referenceKey)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch enrichment records by reference: ${error.message}`);
    return (data || []).map(mapRowToEnrichment);
  }

  async findByType(enrichmentType: TikTokShopEnrichmentType): Promise<TikTokShopContextEnrichmentRecord[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_context_enrichment_records')
      .select('*')
      .eq('enrichment_type', enrichmentType)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch enrichment records by type: ${error.message}`);
    return (data || []).map(mapRowToEnrichment);
  }

  async create(data: Omit<TikTokShopContextEnrichmentRecord, 'id' | 'createdAt'>): Promise<TikTokShopContextEnrichmentRecord> {
    const supabase = getSupabaseClient();
    const { data: row, error } = await supabase
      .from('tiktok_shop_context_enrichment_records')
      .insert({
        canonical_reference_key: data.canonicalReferenceKey,
        enrichment_type: data.enrichmentType,
        enrichment_status: data.enrichmentStatus,
        enrichment_payload: data.enrichmentPayload,
        quality_score: data.qualityScore ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create enrichment record: ${error.message}`);
    return mapRowToEnrichment(row as TikTokShopContextEnrichmentRow);
  }

  async update(id: string, data: Partial<TikTokShopContextEnrichmentRecord>): Promise<TikTokShopContextEnrichmentRecord> {
    const supabase = getSupabaseClient();
    const updates: Record<string, unknown> = {};

    if (data.enrichmentStatus) updates.enrichment_status = data.enrichmentStatus;
    if (data.enrichmentPayload) updates.enrichment_payload = data.enrichmentPayload;
    if (data.qualityScore !== undefined) updates.quality_score = data.qualityScore;

    const { data: row, error } = await supabase
      .from('tiktok_shop_context_enrichment_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update enrichment record: ${error.message}`);
    return mapRowToEnrichment(row as TikTokShopContextEnrichmentRow);
  }
}

let repository: TikTokContextEnrichmentRepository | null = null;

export function getTikTokContextEnrichmentRepository(): TikTokContextEnrichmentRepository {
  if (!repository) {
    repository = new TikTokContextEnrichmentRepository();
  }
  return repository;
}
