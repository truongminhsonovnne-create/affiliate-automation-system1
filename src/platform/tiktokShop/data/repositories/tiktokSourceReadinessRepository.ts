/**
 * TikTok Shop Source Readiness Repository
 * Repository for TikTok Shop source readiness reviews
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { TikTokShopSourceReadinessReview, TikTokShopReadinessStatus } from '../types.js';

interface TikTokShopSourceReadinessRow {
  id: string;
  source_id: string | null;
  review_type: string;
  readiness_status: string;
  readiness_score: number | null;
  blocker_count: number;
  warning_count: number;
  review_payload: Record<string, unknown>;
  created_at: string;
}

function mapRowToReview(row: TikTokShopSourceReadinessRow): TikTokShopSourceReadinessReview {
  return {
    id: row.id,
    sourceId: row.source_id ?? undefined,
    reviewType: row.review_type,
    readinessStatus: row.readiness_status as TikTokShopReadinessStatus,
    readinessScore: row.readiness_score ?? undefined,
    blockerCount: row.blocker_count,
    warningCount: row.warning_count,
    reviewPayload: row.review_payload,
    createdAt: new Date(row.created_at),
  };
}

export class TikTokSourceReadinessRepository {
  async findAll(): Promise<TikTokShopSourceReadinessReview[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_source_readiness_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch readiness reviews: ${error.message}`);
    return (data || []).map(mapRowToReview);
  }

  async findById(id: string): Promise<TikTokShopSourceReadinessReview | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_source_readiness_reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch readiness review: ${error.message}`);
    }
    return mapRowToReview(data as TikTokShopSourceReadinessRow);
  }

  async findBySourceId(sourceId: string): Promise<TikTokShopSourceReadinessReview[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_source_readiness_reviews')
      .select('*')
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch readiness reviews by source: ${error.message}`);
    return (data || []).map(mapRowToReview);
  }

  async findLatestBySourceId(sourceId: string): Promise<TikTokShopSourceReadinessReview | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_source_readiness_reviews')
      .select('*')
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch latest readiness review: ${error.message}`);
    }
    return mapRowToReview(data as TikTokShopSourceReadinessRow);
  }

  async create(data: Omit<TikTokShopSourceReadinessReview, 'id' | 'createdAt'>): Promise<TikTokShopSourceReadinessReview> {
    const supabase = getSupabaseClient();
    const { data: row, error } = await supabase
      .from('tiktok_shop_source_readiness_reviews')
      .insert({
        source_id: data.sourceId ?? null,
        review_type: data.reviewType,
        readiness_status: data.readinessStatus,
        readiness_score: data.readinessScore ?? null,
        blocker_count: data.blockerCount,
        warning_count: data.warningCount,
        review_payload: data.reviewPayload,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create readiness review: ${error.message}`);
    return mapRowToReview(row as TikTokShopSourceReadinessRow);
  }
}

let repository: TikTokSourceReadinessRepository | null = null;

export function getTikTokSourceReadinessRepository(): TikTokSourceReadinessRepository {
  if (!repository) {
    repository = new TikTokSourceReadinessRepository();
  }
  return repository;
}
