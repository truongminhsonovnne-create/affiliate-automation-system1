/**
 * Platform Readiness Review Repository
 */

import { getSupabaseClient } from '../../db/supabaseClient.js';
import type { PlatformReadinessReview, PlatformReadinessReviewType, PlatformReadinessStatus } from '../types.js';

export class PlatformReadinessReviewRepository {
  async findByPlatform(platformKey: string): Promise<PlatformReadinessReview[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_readiness_reviews')
      .select('*')
      .eq('platform_key', platformKey)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(this.mapToRecord);
  }

  async findLatest(platformKey: string, reviewType?: PlatformReadinessReviewType): Promise<PlatformReadinessReview | null> {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('platform_readiness_reviews')
      .select('*')
      .eq('platform_key', platformKey);

    if (reviewType) {
      query = query.eq('review_type', reviewType);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.mapToRecord(data) : null;
  }

  async create(params: {
    platformKey: string;
    reviewType: PlatformReadinessReviewType;
    readinessStatus: PlatformReadinessStatus;
    readinessScore?: any;
    blockerCount: number;
    warningCount: number;
    reviewPayload: Record<string, unknown>;
    createdBy?: string;
  }): Promise<PlatformReadinessReview> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_readiness_reviews')
      .insert({
        platform_key: params.platformKey,
        review_type: params.reviewType,
        readiness_status: params.readinessStatus,
        readiness_score: params.readinessScore,
        blocker_count: params.blockerCount,
        warning_count: params.warningCount,
        review_payload: params.reviewPayload,
        created_by: params.createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecord(data);
  }

  async finalize(
    id: string,
    status: PlatformReadinessStatus,
    score?: any
  ): Promise<PlatformReadinessReview> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_readiness_reviews')
      .update({
        readiness_status: status,
        readiness_score: score,
        finalized_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecord(data);
  }

  private mapToRecord(data: any): PlatformReadinessReview {
    return {
      id: data.id,
      platformKey: data.platform_key,
      reviewType: data.review_type,
      readinessStatus: data.readiness_status,
      readinessScore: data.readiness_score,
      blockerCount: data.blocker_count,
      warningCount: data.warning_count,
      reviewPayload: data.review_payload,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      finalizedAt: data.finalized_at ? new Date(data.finalized_at) : null,
    };
  }
}

let repository: PlatformReadinessReviewRepository | null = null;

export function getPlatformReadinessReviewRepository(): PlatformReadinessReviewRepository {
  if (!repository) {
    repository = new PlatformReadinessReviewRepository();
  }
  return repository;
}
