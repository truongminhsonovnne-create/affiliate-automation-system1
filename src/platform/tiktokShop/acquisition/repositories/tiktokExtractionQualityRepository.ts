/**
 * TikTok Shop Extraction Quality Repository
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { TikTokShopExtractionQualityReview } from '../types.js';

interface Row {
  id: string;
  canonical_reference_key: string;
  review_type: string;
  quality_status: string;
  quality_score: number | null;
  review_payload: Record<string, unknown>;
  created_at: string;
}

function map(row: Row): TikTokShopExtractionQualityReview {
  return {
    id: row.id,
    canonicalReferenceKey: row.canonical_reference_key,
    reviewType: row.review_type,
    qualityStatus: row.quality_status as any,
    qualityScore: row.quality_score ?? undefined,
    reviewPayload: row.review_payload,
    createdAt: new Date(row.created_at),
  };
}

export class TikTokExtractionQualityRepository {
  async findAll() {
    const { data } = await getSupabaseClient().from('tiktok_shop_extraction_quality_reviews').select('*').order('created_at', { ascending: false });
    return (data || []).map(map);
  }

  async findByReferenceKey(referenceKey: string) {
    const { data } = await getSupabaseClient().from('tiktok_shop_extraction_quality_reviews').select('*').eq('canonical_reference_key', referenceKey).order('created_at', { ascending: false });
    return (data || []).map(map);
  }

  async create(review: Omit<TikTokShopExtractionQualityReview, 'id' | 'createdAt'>) {
    const { data } = await getSupabaseClient().from('tiktok_shop_extraction_quality_reviews').insert({
      canonical_reference_key: review.canonicalReferenceKey,
      review_type: review.reviewType,
      quality_status: review.qualityStatus,
      quality_score: review.qualityScore ?? null,
      review_payload: review.reviewPayload,
    }).select().single();
    return data ? map(data as Row) : null;
  }
}

let repo: TikTokExtractionQualityRepository | null = null;
export function getTikTokExtractionQualityRepository() {
  if (!repo) repo = new TikTokExtractionQualityRepository();
  return repo;
}
