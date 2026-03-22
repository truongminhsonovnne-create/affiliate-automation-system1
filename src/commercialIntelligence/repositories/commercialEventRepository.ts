/**
 * Commercial Event Repository
 *
 * Production-grade data access for funnel events.
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type { CommercialFunnelEvent, CreateFunnelEventInput, CommercialResult } from '../types.js';

export class CommercialEventRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  async create(input: CreateFunnelEventInput): Promise<CommercialResult<CommercialFunnelEvent>> {
    try {
      const { data, error } = await this.supabase
        .from('affiliate_funnel_events')
        .insert({
          session_id: input.sessionId,
          event_type: input.eventType,
          event_time: input.eventTime ?? new Date(),
          platform: input.platform ?? 'public',
          voucher_id: input.voucherId,
          resolution_request_id: input.resolutionRequestId,
          surface_type: input.surfaceType,
          surface_id: input.surfaceId,
          experiment_context: input.experimentContext ?? {},
          event_payload: input.eventPayload ?? {},
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      return { success: true, data: this.mapToDomain(data) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async findBySessionId(sessionId: string): Promise<CommercialFunnelEvent[]> {
    const { data } = await this.supabase
      .from('affiliate_funnel_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('event_time', { ascending: true });

    return (data ?? []).map(this.mapToDomain);
  }

  async findByEventType(eventType: string): Promise<CommercialFunnelEvent[]> {
    const { data } = await this.supabase
      .from('affiliate_funnel_events')
      .select('*')
      .eq('event_type', eventType)
      .order('event_time', { ascending: false });

    return (data ?? []).map(this.mapToDomain);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<CommercialFunnelEvent[]> {
    const { data } = await this.supabase
      .from('affiliate_funnel_events')
      .select('*')
      .gte('event_time', startDate.toISOString())
      .lte('event_time', endDate.toISOString())
      .order('event_time', { ascending: false });

    return (data ?? []).map(this.mapToDomain);
  }

  async findByVoucherId(voucherId: string): Promise<CommercialFunnelEvent[]> {
    const { data } = await this.supabase
      .from('affiliate_funnel_events')
      .select('*')
      .eq('voucher_id', voucherId)
      .order('event_time', { ascending: false });

    return (data ?? []).map(this.mapToDomain);
  }

  async findBySurface(surfaceType: string, surfaceId: string): Promise<CommercialFunnelEvent[]> {
    const { data } = await this.supabase
      .from('affiliate_funnel_events')
      .select('*')
      .eq('surface_type', surfaceType)
      .eq('surface_id', surfaceId)
      .order('event_time', { ascending: false });

    return (data ?? []).map(this.mapToDomain);
  }

  private mapToDomain(data: Record<string, unknown>): CommercialFunnelEvent {
    return {
      id: data.id as string,
      sessionId: data.session_id as string | null,
      eventType: data.event_type as CommercialFunnelEvent['eventType'],
      eventTime: new Date(data.event_time as string),
      platform: data.platform as CommercialFunnelEvent['platform'],
      voucherId: data.voucher_id as string | null,
      resolutionRequestId: data.resolution_request_id as string | null,
      surfaceType: data.surface_type as string | null,
      surfaceId: data.surface_id as string | null,
      experimentContext: data.experiment_context as Record<string, unknown> ?? {},
      eventPayload: data.event_payload as Record<string, unknown> ?? {},
      createdAt: new Date(data.created_at as string),
    };
  }
}

let repo: CommercialEventRepository | null = null;
export function getCommercialEventRepository(): CommercialEventRepository {
  if (!repo) repo = new CommercialEventRepository();
  return repo;
}
