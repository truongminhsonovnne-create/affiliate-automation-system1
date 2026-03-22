/**
 * TikTok Shop Preview Click Lineage Repository
 *
 * Repository for managing preview click lineage records using Supabase.
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  TikTokShopPreviewClickLineage,
  CreateTikTokShopPreviewClickLineageInput,
  TikTokShopPreviewSupportState,
  TikTokShopPreviewStage,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * TikTok Shop Preview Click Lineage Repository
 */
export class TikTokPreviewClickLineageRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  /**
   * Create click lineage record
   */
  async createLineage(input: CreateTikTokShopPreviewClickLineageInput): Promise<TikTokShopPreviewClickLineage> {
    const lineageKey = `tiktok-preview-lineage-${crypto.randomUUID()}`;

    const { data, error } = await this.client
      .from('tiktok_shop_preview_click_lineage')
      .insert({
        preview_session_id: input.previewSessionId || null,
        lineage_key: lineageKey,
        support_state: input.supportState,
        platform_stage: input.platformStage,
        resolution_context: input.resolutionContext || {},
        click_payload: input.clickPayload,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to create click lineage', error: error.message });
      throw new Error(`Failed to create lineage: ${error.message}`);
    }

    return this.mapToLineage(data);
  }

  /**
   * Get lineage by key
   */
  async getLineageByKey(lineageKey: string): Promise<TikTokShopPreviewClickLineage | null> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_click_lineage')
      .select('*')
      .eq('lineage_key', lineageKey)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error({ msg: 'Failed to get lineage by key', error: error.message });
      throw new Error(`Failed to get lineage: ${error.message}`);
    }

    return data ? this.mapToLineage(data) : null;
  }

  /**
   * Get lineages by session ID
   */
  async getLineagesBySession(sessionId: string, limit: number = 100): Promise<TikTokShopPreviewClickLineage[]> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_click_lineage')
      .select('*')
      .eq('preview_session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ msg: 'Failed to get lineages by session', error: error.message });
      throw new Error(`Failed to get lineages: ${error.message}`);
    }

    return (data || []).map(this.mapToLineage);
  }

  /**
   * Get lineages by support state
   */
  async getLineagesBySupportState(
    supportState: TikTokShopPreviewSupportState,
    limit: number = 100
  ): Promise<TikTokShopPreviewClickLineage[]> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_click_lineage')
      .select('*')
      .eq('support_state', supportState)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ msg: 'Failed to get lineages by support state', error: error.message });
      throw new Error(`Failed to get lineages: ${error.message}`);
    }

    return (data || []).map(this.mapToLineage);
  }

  /**
   * Count lineages
   */
  async countLineages(filters?: {
    sessionId?: string;
    supportState?: TikTokShopPreviewSupportState;
    platformStage?: TikTokShopPreviewStage;
    from?: Date;
    to?: Date;
  }): Promise<number> {
    let query = this.client.from('tiktok_shop_preview_click_lineage').select('*', { count: 'exact', head: true });

    if (filters?.sessionId) query = query.eq('preview_session_id', filters.sessionId);
    if (filters?.supportState) query = query.eq('support_state', filters.supportState);
    if (filters?.platformStage) query = query.eq('platform_stage', filters.platformStage);
    if (filters?.from) query = query.gte('created_at', filters.from.toISOString());
    if (filters?.to) query = query.lte('created_at', filters.to.toISOString());

    const { count, error } = await query;

    if (error) {
      logger.error({ msg: 'Failed to count lineages', error: error.message });
      throw new Error(`Failed to count lineages: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get lineage stats
   */
  async getLineageStats(from?: Date, to?: Date): Promise<{
    total: number;
    bySupportState: Record<string, number>;
    byPlatformStage: Record<string, number>;
  }> {
    let query = this.client.from('tiktok_shop_preview_click_lineage').select('*');

    if (from) query = query.gte('created_at', from.toISOString());
    if (to) query = query.lte('created_at', to.toISOString());

    const { data, error } = await query;

    if (error) {
      logger.error({ msg: 'Failed to get lineage stats', error: error.message });
      throw new Error(`Failed to get lineage stats: ${error.message}`);
    }

    const bySupportState: Record<string, number> = {};
    const byPlatformStage: Record<string, number> = {};

    for (const lineage of data || []) {
      bySupportState[lineage.support_state] = (bySupportState[lineage.support_state] || 0) + 1;
      byPlatformStage[lineage.platform_stage] = (byPlatformStage[lineage.platform_stage] || 0) + 1;
    }

    return {
      total: data?.length || 0,
      bySupportState,
      byPlatformStage,
    };
  }

  /**
   * Map database row to lineage
   */
  private mapToLineage(row: Record<string, unknown>): TikTokShopPreviewClickLineage {
    return {
      id: row.id as string,
      previewSessionId: row.preview_session_id as string | null,
      lineageKey: row.lineage_key as string,
      supportState: row.support_state as TikTokShopPreviewSupportState,
      platformStage: row.platform_stage as TikTokShopPreviewStage,
      resolutionContext: row.resolution_context as Record<string, unknown> | null,
      clickPayload: row.click_payload as Record<string, unknown>,
      createdAt: new Date(row.created_at as string),
    };
  }
}

/**
 * Repository singleton
 */
export const tiktokPreviewClickLineageRepository = new TikTokPreviewClickLineageRepository();
