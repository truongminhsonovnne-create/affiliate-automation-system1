/**
 * Click Attribution Repository
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type { AffiliateClickAttribution, CreateClickAttributionInput, CommercialResult } from '../types.js';

export class ClickAttributionRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  async create(input: CreateClickAttributionInput): Promise<CommercialResult<AffiliateClickAttribution>> {
    try {
      const { data, error } = await this.supabase
        .from('affiliate_click_attributions')
        .insert({
          session_id: input.sessionId,
          click_key: input.clickKey,
          platform: input.platform ?? 'public',
          voucher_id: input.voucherId,
          resolution_request_id: input.resolutionRequestId,
          source_surface_type: input.sourceSurfaceType,
          source_surface_id: input.sourceSurfaceId,
          attribution_payload: input.attributionPayload ?? {},
          clicked_at: input.clickedAt ?? new Date(),
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: this.mapToDomain(data) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async findByClickKey(clickKey: string): Promise<AffiliateClickAttribution | null> {
    const { data } = await this.supabase
      .from('affiliate_click_attributions')
      .select('*')
      .eq('click_key', clickKey)
      .single();
    return data ? this.mapToDomain(data) : null;
  }

  async findBySessionId(sessionId: string): Promise<AffiliateClickAttribution[]> {
    const { data } = await this.supabase
      .from('affiliate_click_attributions')
      .select('*')
      .eq('session_id', sessionId)
      .order('clicked_at', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<AffiliateClickAttribution[]> {
    const { data } = await this.supabase
      .from('affiliate_click_attributions')
      .select('*')
      .gte('clicked_at', startDate.toISOString())
      .lte('clicked_at', endDate.toISOString())
      .order('clicked_at', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  private mapToDomain(data: Record<string, unknown>): AffiliateClickAttribution {
    return {
      id: data.id as string,
      sessionId: data.session_id as string | null,
      clickKey: data.click_key as string,
      platform: data.platform as AffiliateClickAttribution['platform'],
      voucherId: data.voucher_id as string | null,
      resolutionRequestId: data.resolution_request_id as string | null,
      sourceSurfaceType: data.source_surface_type as string | null,
      sourceSurfaceId: data.source_surface_id as string | null,
      attributionPayload: data.attribution_payload as Record<string, unknown> ?? {},
      clickedAt: new Date(data.clicked_at as string),
      createdAt: new Date(data.created_at as string),
    };
  }
}

let repo: ClickAttributionRepository | null = null;
export function getClickAttributionRepository(): ClickAttributionRepository {
  if (!repo) repo = new ClickAttributionRepository();
  return repo;
}
