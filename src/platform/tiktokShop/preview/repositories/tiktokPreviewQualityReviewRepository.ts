/**
 * TikTok Shop Preview Quality Review Repository
 *
 * Repository for managing preview quality and commercial readiness reviews using Supabase.
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  TikTokShopPreviewQualityReview,
  TikTokShopCommercialReadinessReview,
  TikTokShopPreviewQualityReviewType,
  TikTokShopPreviewQualityReviewStatus,
  TikTokShopCommercialReadinessReviewType,
  TikTokShopCommercialReadinessStatus,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * TikTok Shop Preview Quality Review Repository
 */
export class TikTokPreviewQualityReviewRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  /**
   * Create a quality review
   */
  async createReview(input: {
    reviewType: TikTokShopPreviewQualityReviewType;
    reviewPayload: Record<string, unknown>;
  }): Promise<TikTokShopPreviewQualityReview> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_quality_reviews')
      .insert({
        review_type: input.reviewType,
        review_status: 'pending',
        review_payload: input.reviewPayload,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to create quality review', error: error.message });
      throw new Error(`Failed to create review: ${error.message}`);
    }

    return this.mapToQualityReview(data);
  }

  /**
   * Update review status
   */
  async updateReviewStatus(
    id: string,
    status: TikTokShopPreviewQualityReviewStatus,
    scores?: {
      qualityScore?: number;
      usefulnessScore?: number;
      stabilityScore?: number;
    }
  ): Promise<TikTokShopPreviewQualityReview | null> {
    const updateData: Record<string, unknown> = { review_status: status };
    if (scores?.qualityScore !== undefined) updateData.quality_score = scores.qualityScore;
    if (scores?.usefulnessScore !== undefined) updateData.usefulness_score = scores.usefulnessScore;
    if (scores?.stabilityScore !== undefined) updateData.stability_score = scores.stabilityScore;

    const { data, error } = await this.client
      .from('tiktok_shop_preview_quality_reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to update quality review', error: error.message });
      throw new Error(`Failed to update review: ${error.message}`);
    }

    return data ? this.mapToQualityReview(data) : null;
  }

  /**
   * Get latest review by type
   */
  async getLatestReviewByType(type: TikTokShopPreviewQualityReviewType): Promise<TikTokShopPreviewQualityReview | null> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_quality_reviews')
      .select('*')
      .eq('review_type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error({ msg: 'Failed to get latest review by type', error: error.message });
      throw new Error(`Failed to get review: ${error.message}`);
    }

    return data ? this.mapToQualityReview(data) : null;
  }

  /**
   * Map database row to quality review
   */
  private mapToQualityReview(row: Record<string, unknown>): TikTokShopPreviewQualityReview {
    return {
      id: row.id as string,
      reviewType: row.review_type as TikTokShopPreviewQualityReviewType,
      reviewStatus: row.review_status as TikTokShopPreviewQualityReviewStatus,
      qualityScore: row.quality_score as number | null,
      usefulnessScore: row.usefulness_score as number | null,
      stabilityScore: row.stability_score as number | null,
      reviewPayload: row.review_payload as Record<string, unknown>,
      createdAt: new Date(row.created_at as string),
    };
  }
}

/**
 * TikTok Shop Commercial Readiness Repository
 */
export class TikTokCommercialReadinessRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  /**
   * Create a commercial readiness review
   */
  async createReview(input: {
    reviewType: TikTokShopCommercialReadinessReviewType;
    reviewPayload: Record<string, unknown>;
  }): Promise<TikTokShopCommercialReadinessReview> {
    const { data, error } = await this.client
      .from('tiktok_shop_commercial_readiness_reviews')
      .insert({
        review_type: input.reviewType,
        readiness_status: 'not_ready',
        review_payload: input.reviewPayload,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to create commercial readiness review', error: error.message });
      throw new Error(`Failed to create review: ${error.message}`);
    }

    return this.mapToCommercialReview(data);
  }

  /**
   * Update review
   */
  async updateReview(
    id: string,
    updates: {
      readinessStatus?: TikTokShopCommercialReadinessStatus;
      readinessScore?: number;
      blockerCount?: number;
      warningCount?: number;
      reviewPayload?: Record<string, unknown>;
      finalizedAt?: Date;
    }
  ): Promise<TikTokShopCommercialReadinessReview | null> {
    const updateData: Record<string, unknown> = {};
    if (updates.readinessStatus) updateData.readiness_status = updates.readinessStatus;
    if (updates.readinessScore !== undefined) updateData.readiness_score = updates.readinessScore;
    if (updates.blockerCount !== undefined) updateData.blocker_count = updates.blockerCount;
    if (updates.warningCount !== undefined) updateData.warning_count = updates.warningCount;
    if (updates.reviewPayload) updateData.review_payload = updates.reviewPayload;
    if (updates.finalizedAt) updateData.finalized_at = updates.finalizedAt.toISOString();

    const { data, error } = await this.client
      .from('tiktok_shop_commercial_readiness_reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to update commercial readiness review', error: error.message });
      throw new Error(`Failed to update review: ${error.message}`);
    }

    return data ? this.mapToCommercialReview(data) : null;
  }

  /**
   * Get latest review by type
   */
  async getLatestReviewByType(type: TikTokShopCommercialReadinessReviewType): Promise<TikTokShopCommercialReadinessReview | null> {
    const { data, error } = await this.client
      .from('tiktok_shop_commercial_readiness_reviews')
      .select('*')
      .eq('review_type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error({ msg: 'Failed to get latest review by type', error: error.message });
      throw new Error(`Failed to get review: ${error.message}`);
    }

    return data ? this.mapToCommercialReview(data) : null;
  }

  /**
   * Map database row to commercial review
   */
  private mapToCommercialReview(row: Record<string, unknown>): TikTokShopCommercialReadinessReview {
    return {
      id: row.id as string,
      reviewType: row.review_type as TikTokShopCommercialReadinessReviewType,
      readinessStatus: row.readiness_status as TikTokShopCommercialReadinessStatus,
      readinessScore: row.readiness_score as number | null,
      blockerCount: row.blocker_count as number,
      warningCount: row.warning_count as number,
      reviewPayload: row.review_payload as Record<string, unknown>,
      createdAt: new Date(row.created_at as string),
      finalizedAt: row.finalized_at ? new Date(row.finalized_at as string) : null,
    };
  }
}

/**
 * Repository singletons
 */
export const tiktokPreviewQualityReviewRepository = new TikTokPreviewQualityReviewRepository();
export const tiktokCommercialReadinessRepository = new TikTokCommercialReadinessRepository();
