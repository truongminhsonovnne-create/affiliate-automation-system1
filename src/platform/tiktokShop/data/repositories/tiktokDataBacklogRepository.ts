/**
 * TikTok Shop Data Backlog Repository
 * Repository for TikTok Shop data backlog items
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { TikTokShopDataBacklogItem, TikTokShopBacklogType, TikTokShopBacklogStatus } from '../types.js';

interface TikTokShopDataBacklogRow {
  id: string;
  backlog_type: string;
  backlog_status: string;
  priority: string;
  backlog_payload: Record<string, unknown>;
  assigned_to: string | null;
  due_at: string | null;
  created_at: string;
  completed_at: string | null;
}

function mapRowToBacklog(row: TikTokShopDataBacklogRow): TikTokShopDataBacklogItem {
  return {
    id: row.id,
    backlogType: row.backlog_type as TikTokShopBacklogType,
    backlogStatus: row.backlog_status as TikTokShopBacklogStatus,
    priority: row.priority,
    backlogPayload: row.backlog_payload,
    assignedTo: row.assigned_to ?? undefined,
    dueAt: row.due_at ? new Date(row.due_at) : undefined,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  };
}

export class TikTokDataBacklogRepository {
  async findAll(filters?: {
    backlogType?: TikTokShopBacklogType;
    backlogStatus?: TikTokShopBacklogStatus;
    priority?: string;
  }): Promise<TikTokShopDataBacklogItem[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('tiktok_shop_data_backlog').select('*');

    if (filters?.backlogType) {
      query = query.eq('backlog_type', filters.backlogType);
    }
    if (filters?.backlogStatus) {
      query = query.eq('backlog_status', filters.backlogStatus);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch backlog items: ${error.message}`);
    return (data || []).map(mapRowToBacklog);
  }

  async findById(id: string): Promise<TikTokShopDataBacklogItem | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_data_backlog')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch backlog item: ${error.message}`);
    }
    return mapRowToBacklog(data as TikTokShopDataBacklogRow);
  }

  async findOpen(): Promise<TikTokShopDataBacklogItem[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_data_backlog')
      .select('*')
      .eq('backlog_status', 'open')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch open backlog items: ${error.message}`);
    return (data || []).map(mapRowToBacklog);
  }

  async create(data: Omit<TikTokShopDataBacklogItem, 'id' | 'createdAt' | 'completedAt'>): Promise<TikTokShopDataBacklogItem> {
    const supabase = getSupabaseClient();
    const { data: row, error } = await supabase
      .from('tiktok_shop_data_backlog')
      .insert({
        backlog_type: data.backlogType,
        backlog_status: data.backlogStatus,
        priority: data.priority,
        backlog_payload: data.backlogPayload,
        assigned_to: data.assignedTo ?? null,
        due_at: data.dueAt?.toISOString() ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create backlog item: ${error.message}`);
    return mapRowToBacklog(row as TikTokShopDataBacklogRow);
  }

  async update(id: string, data: Partial<TikTokShopDataBacklogItem>): Promise<TikTokShopDataBacklogItem> {
    const supabase = getSupabaseClient();
    const updates: Record<string, unknown> = {};

    if (data.backlogStatus) updates.backlog_status = data.backlogStatus;
    if (data.priority) updates.priority = data.priority;
    if (data.backlogPayload) updates.backlog_payload = data.backlogPayload;
    if (data.assignedTo !== undefined) updates.assigned_to = data.assignedTo;
    if (data.dueAt !== undefined) updates.due_at = data.dueAt?.toISOString() ?? null;
    if (data.completedAt) updates.completed_at = data.completedAt.toISOString();

    const { data: row, error } = await supabase
      .from('tiktok_shop_data_backlog')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update backlog item: ${error.message}`);
    return mapRowToBacklog(row as TikTokShopDataBacklogRow);
  }

  async complete(id: string, completionNotes?: string): Promise<TikTokShopDataBacklogItem> {
    const supabase = getSupabaseClient();
    const { data: row, error } = await supabase
      .from('tiktok_shop_data_backlog')
      .update({
        backlog_status: TikTokShopBacklogStatus.COMPLETED,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to complete backlog item: ${error.message}`);
    return mapRowToBacklog(row as TikTokShopDataBacklogRow);
  }

  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('tiktok_shop_data_backlog')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete backlog item: ${error.message}`);
  }
}

let repository: TikTokDataBacklogRepository | null = null;

export function getTikTokShopDataBacklogRepository(): TikTokDataBacklogRepository {
  if (!repository) {
    repository = new TikTokDataBacklogRepository();
  }
  return repository;
}
