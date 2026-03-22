/**
 * Platform Expansion Backlog Repository
 */

import { getSupabaseClient } from '../../db/supabaseClient.js';
import type { PlatformExpansionBacklogItem, PlatformBacklogType, PlatformBacklogStatus, PlatformBacklogPriority } from '../types.js';

export class PlatformExpansionBacklogRepository {
  async findByPlatform(platformKey: string, status?: PlatformBacklogStatus): Promise<PlatformExpansionBacklogItem[]> {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('platform_expansion_backlog')
      .select('*')
      .eq('platform_key', platformKey);

    if (status) {
      query = query.eq('backlog_status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(this.mapToRecord);
  }

  async findById(id: string): Promise<PlatformExpansionBacklogItem | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_expansion_backlog')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.mapToRecord(data) : null;
  }

  async create(params: {
    platformKey: string;
    backlogType: PlatformBacklogType;
    backlogStatus: PlatformBacklogStatus;
    priority: PlatformBacklogPriority;
    backlogPayload: Record<string, unknown>;
    assignedTo?: string | null;
    dueAt?: Date | null;
  }): Promise<PlatformExpansionBacklogItem> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_expansion_backlog')
      .insert({
        platform_key: params.platformKey,
        backlog_type: params.backlogType,
        backlog_status: params.backlogStatus,
        priority: params.priority,
        backlog_payload: params.backlogPayload,
        assigned_to: params.assignedTo || null,
        due_at: params.dueAt?.toISOString() || null,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecord(data);
  }

  async complete(id: string): Promise<PlatformExpansionBacklogItem> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_expansion_backlog')
      .update({
        backlog_status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecord(data);
  }

  async updateStatus(id: string, status: PlatformBacklogStatus): Promise<PlatformExpansionBacklogItem> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_expansion_backlog')
      .update({ backlog_status: status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecord(data);
  }

  private mapToRecord(data: any): PlatformExpansionBacklogItem {
    return {
      id: data.id,
      platformKey: data.platform_key,
      backlogType: data.backlog_type,
      backlogStatus: data.backlog_status,
      priority: data.priority,
      backlogPayload: data.backlog_payload,
      assignedTo: data.assigned_to,
      dueAt: data.due_at ? new Date(data.due_at) : null,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : null,
    };
  }
}

let repository: PlatformExpansionBacklogRepository | null = null;

export function getPlatformExpansionBacklogRepository(): PlatformExpansionBacklogRepository {
  if (!repository) {
    repository = new PlatformExpansionBacklogRepository();
  }
  return repository;
}
