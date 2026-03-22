/**
 * Commercial Session Repository
 *
 * Production-grade data access for commercial sessions.
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type { CommercialSession, CreateCommercialSessionInput, UpdateCommercialSessionInput, CommercialResult } from '../types.js';

export class CommercialSessionRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  async create(input: CreateCommercialSessionInput): Promise<CommercialResult<CommercialSession>> {
    try {
      const { data, error } = await this.supabase
        .from('affiliate_commercial_sessions')
        .insert({
          session_key: input.sessionKey,
          anonymous_subject_key: input.anonymousSubjectKey,
          platform: input.platform ?? 'public',
          entry_surface_type: input.entrySurfaceType,
          entry_surface_id: input.entrySurfaceId,
          attribution_context: input.attributionContext ?? {},
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      return { success: true, data: this.mapToDomain(data) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async findBySessionKey(sessionKey: string): Promise<CommercialSession | null> {
    const { data } = await this.supabase
      .from('affiliate_commercial_sessions')
      .select('*')
      .eq('session_key', sessionKey)
      .single();

    return data ? this.mapToDomain(data) : null;
  }

  async findById(id: string): Promise<CommercialSession | null> {
    const { data } = await this.supabase
      .from('affiliate_commercial_sessions')
      .select('*')
      .eq('id', id)
      .single();

    return data ? this.mapToDomain(data) : null;
  }

  async update(id: string, input: UpdateCommercialSessionInput): Promise<CommercialResult<CommercialSession>> {
    try {
      const updateData: Record<string, unknown> = {};
      if (input.attributionContext) {
        const { data: existing } = await this.supabase
          .from('affiliate_commercial_sessions')
          .select('attribution_context')
          .eq('id', id)
          .single();
        updateData.attribution_context = { ...(existing?.attribution_context ?? {}), ...input.attributionContext };
      }

      const { data, error } = await this.supabase
        .from('affiliate_commercial_sessions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      return { success: true, data: this.mapToDomain(data) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<CommercialSession[]> {
    const { data } = await this.supabase
      .from('affiliate_commercial_sessions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    return (data ?? []).map(this.mapToDomain);
  }

  private mapToDomain(data: Record<string, unknown>): CommercialSession {
    return {
      id: data.id as string,
      sessionKey: data.session_key as string,
      anonymousSubjectKey: data.anonymous_subject_key as string | null,
      platform: data.platform as CommercialSession['platform'],
      entrySurfaceType: data.entry_surface_type as CommercialSession['entrySurfaceType'],
      entrySurfaceId: data.entry_surface_id as string | null,
      attributionContext: data.attribution_context as Record<string, unknown> ?? {},
      firstSeenAt: new Date(data.first_seen_at as string),
      lastSeenAt: new Date(data.last_seen_at as string),
      createdAt: new Date(data.created_at as string),
    };
  }
}

let repo: CommercialSessionRepository | null = null;
export function getCommercialSessionRepository(): CommercialSessionRepository {
  if (!repo) repo = new CommercialSessionRepository();
  return repo;
}
