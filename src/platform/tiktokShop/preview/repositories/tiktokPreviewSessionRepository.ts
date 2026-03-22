/**
 * TikTok Shop Preview Session Repository
 *
 * Repository for managing TikTok Shop preview sessions using Supabase.
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  TikTokShopPreviewSession,
  TikTokShopPreviewEvent,
  TikTokShopPreviewFunnelSnapshot,
  TikTokShopPreviewStage,
  TikTokShopPreviewSupportState,
  TikTokShopPreviewEventType,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * TikTok Shop Preview Session Repository
 */
export class TikTokPreviewSessionRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  /**
   * Create a new preview session
   */
  async createSession(input: {
    sessionKey: string;
    anonymousSubjectKey?: string;
    previewEntrySurface?: string;
    previewStage: TikTokShopPreviewStage;
    supportState: TikTokShopPreviewSupportState;
    contextPayload?: Record<string, unknown>;
  }): Promise<TikTokShopPreviewSession> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_sessions')
      .insert({
        session_key: input.sessionKey,
        anonymous_subject_key: input.anonymousSubjectKey || null,
        preview_entry_surface: input.previewEntrySurface || null,
        preview_stage: input.previewStage,
        support_state: input.supportState,
        context_payload: input.contextPayload || {},
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to create preview session', error: error.message });
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return this.mapToSession(data);
  }

  /**
   * Get session by session key
   */
  async getSessionByKey(sessionKey: string): Promise<TikTokShopPreviewSession | null> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_sessions')
      .select('*')
      .eq('session_key', sessionKey)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error({ msg: 'Failed to get session by key', error: error.message });
      throw new Error(`Failed to get session: ${error.message}`);
    }

    return data ? this.mapToSession(data) : null;
  }

  /**
   * Get session by ID
   */
  async getSessionById(id: string): Promise<TikTokShopPreviewSession | null> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error({ msg: 'Failed to get session by id', error: error.message });
      throw new Error(`Failed to get session: ${error.message}`);
    }

    return data ? this.mapToSession(data) : null;
  }

  /**
   * Get sessions by preview stage
   */
  async getSessionsByStage(stage: TikTokShopPreviewStage, limit: number = 100): Promise<TikTokShopPreviewSession[]> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_sessions')
      .select('*')
      .eq('preview_stage', stage)
      .order('last_seen_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ msg: 'Failed to get sessions by stage', error: error.message });
      throw new Error(`Failed to get sessions: ${error.message}`);
    }

    return (data || []).map(this.mapToSession);
  }

  /**
   * Update session
   */
  async updateSession(
    id: string,
    updates: Partial<{
      previewStage: TikTokShopPreviewStage;
      supportState: TikTokShopPreviewSupportState;
      contextPayload: Record<string, unknown>;
    }>
  ): Promise<TikTokShopPreviewSession | null> {
    const updateData: Record<string, unknown> = {
      last_seen_at: new Date().toISOString(),
    };

    if (updates.previewStage) updateData.preview_stage = updates.previewStage;
    if (updates.supportState) updateData.support_state = updates.supportState;
    if (updates.contextPayload) updateData.context_payload = updates.contextPayload;

    const { data, error } = await this.client
      .from('tiktok_shop_preview_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to update session', error: error.message });
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return data ? this.mapToSession(data) : null;
  }

  /**
   * Count sessions
   */
  async countSessions(filters?: {
    stage?: TikTokShopPreviewStage;
    supportState?: TikTokShopPreviewSupportState;
    from?: Date;
    to?: Date;
  }): Promise<number> {
    let query = this.client.from('tiktok_shop_preview_sessions').select('*', { count: 'exact', head: true });

    if (filters?.stage) query = query.eq('preview_stage', filters.stage);
    if (filters?.supportState) query = query.eq('support_state', filters.supportState);
    if (filters?.from) query = query.gte('created_at', filters.from.toISOString());
    if (filters?.to) query = query.lte('created_at', filters.to.toISOString());

    const { count, error } = await query;

    if (error) {
      logger.error({ msg: 'Failed to count sessions', error: error.message });
      throw new Error(`Failed to count sessions: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get session stats
   */
  async getSessionStats(from?: Date, to?: Date): Promise<{
    total: number;
    byStage: Record<string, number>;
    bySupportState: Record<string, number>;
  }> {
    let query = this.client.from('tiktok_shop_preview_sessions').select('*');

    if (from) query = query.gte('created_at', from.toISOString());
    if (to) query = query.lte('created_at', to.toISOString());

    const { data, error } = await query;

    if (error) {
      logger.error({ msg: 'Failed to get session stats', error: error.message });
      throw new Error(`Failed to get session stats: ${error.message}`);
    }

    const byStage: Record<string, number> = {};
    const bySupportState: Record<string, number> = {};

    for (const session of data || []) {
      byStage[session.preview_stage] = (byStage[session.preview_stage] || 0) + 1;
      bySupportState[session.support_state] = (bySupportState[session.support_state] || 0) + 1;
    }

    return {
      total: data?.length || 0,
      byStage,
      bySupportState,
    };
  }

  /**
   * Create preview event
   */
  async createEvent(input: {
    sessionId?: string;
    eventType: TikTokShopPreviewEventType;
    supportState?: TikTokShopPreviewSupportState;
    resolutionRunId?: string;
    eventPayload?: Record<string, unknown>;
  }): Promise<TikTokShopPreviewEvent> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_events')
      .insert({
        session_id: input.sessionId || null,
        event_type: input.eventType,
        support_state: input.supportState || null,
        resolution_run_id: input.resolutionRunId || null,
        event_payload: input.eventPayload || {},
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to create preview event', error: error.message });
      throw new Error(`Failed to create event: ${error.message}`);
    }

    return this.mapToEvent(data);
  }

  /**
   * Get events by session ID
   */
  async getEventsBySession(sessionId: string, limit: number = 1000): Promise<TikTokShopPreviewEvent[]> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ msg: 'Failed to get events by session', error: error.message });
      throw new Error(`Failed to get events: ${error.message}`);
    }

    return (data || []).map(this.mapToEvent);
  }

  /**
   * Get event counts by type
   */
  async getEventCountsByType(from?: Date, to?: Date): Promise<Record<string, number>> {
    let query = this.client.from('tiktok_shop_preview_events').select('event_type');

    if (from) query = query.gte('created_at', from.toISOString());
    if (to) query = query.lte('created_at', to.toISOString());

    const { data, error } = await query;

    if (error) {
      logger.error({ msg: 'Failed to get event counts', error: error.message });
      throw new Error(`Failed to get event counts: ${error.message}`);
    }

    const counts: Record<string, number> = {};
    for (const event of data || []) {
      counts[event.event_type] = (counts[event.event_type] || 0) + 1;
    }

    return counts;
  }

  /**
   * Count events
   */
  async countEvents(filters?: {
    sessionId?: string;
    eventType?: TikTokShopPreviewEventType;
    supportState?: TikTokShopPreviewSupportState;
    from?: Date;
    to?: Date;
  }): Promise<number> {
    let query = this.client.from('tiktok_shop_preview_events').select('*', { count: 'exact', head: true });

    if (filters?.sessionId) query = query.eq('session_id', filters.sessionId);
    if (filters?.eventType) query = query.eq('event_type', filters.eventType);
    if (filters?.supportState) query = query.eq('support_state', filters.supportState);
    if (filters?.from) query = query.gte('created_at', filters.from.toISOString());
    if (filters?.to) query = query.lte('created_at', filters.to.toISOString());

    const { count, error } = await query;

    if (error) {
      logger.error({ msg: 'Failed to count events', error: error.message });
      throw new Error(`Failed to count events: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Create funnel snapshot
   */
  async createFunnelSnapshot(
    periodStart: Date,
    periodEnd: Date,
    payload: Record<string, unknown>
  ): Promise<TikTokShopPreviewFunnelSnapshot> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_funnel_snapshots')
      .insert({
        snapshot_period_start: periodStart.toISOString(),
        snapshot_period_end: periodEnd.toISOString(),
        snapshot_payload: payload,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to create funnel snapshot', error: error.message });
      throw new Error(`Failed to create snapshot: ${error.message}`);
    }

    return this.mapToFunnelSnapshot(data);
  }

  /**
   * Get latest funnel snapshot
   */
  async getLatestFunnelSnapshot(): Promise<TikTokShopPreviewFunnelSnapshot | null> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_funnel_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error({ msg: 'Failed to get latest funnel snapshot', error: error.message });
      throw new Error(`Failed to get snapshot: ${error.message}`);
    }

    return data ? this.mapToFunnelSnapshot(data) : null;
  }

  /**
   * Map database row to session
   */
  private mapToSession(row: Record<string, unknown>): TikTokShopPreviewSession {
    return {
      id: row.id as string,
      sessionKey: row.session_key as string,
      anonymousSubjectKey: row.anonymous_subject_key as string | null,
      previewEntrySurface: row.preview_entry_surface as string | null,
      previewStage: row.preview_stage as TikTokShopPreviewStage,
      supportState: row.support_state as TikTokShopPreviewSupportState,
      contextPayload: row.context_payload as Record<string, unknown> | null,
      firstSeenAt: new Date(row.first_seen_at as string),
      lastSeenAt: new Date(row.last_seen_at as string),
      createdAt: new Date(row.created_at as string),
    };
  }

  /**
   * Map database row to event
   */
  private mapToEvent(row: Record<string, unknown>): TikTokShopPreviewEvent {
    return {
      id: row.id as string,
      sessionId: row.session_id as string | null,
      eventType: row.event_type as TikTokShopPreviewEventType,
      supportState: row.support_state as TikTokShopPreviewSupportState | null,
      resolutionRunId: row.resolution_run_id as string | null,
      eventPayload: row.event_payload as Record<string, unknown> | null,
      createdAt: new Date(row.created_at as string),
    };
  }

  /**
   * Map database row to funnel snapshot
   */
  private mapToFunnelSnapshot(row: Record<string, unknown>): TikTokShopPreviewFunnelSnapshot {
    return {
      id: row.id as string,
      periodStart: new Date(row.snapshot_period_start as string),
      periodEnd: new Date(row.snapshot_period_end as string),
      snapshotPayload: row.snapshot_payload as Record<string, unknown>,
      createdAt: new Date(row.created_at as string),
    };
  }
}

/**
 * Repository singleton
 */
export const tiktokPreviewSessionRepository = new TikTokPreviewSessionRepository();
