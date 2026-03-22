/**
 * TikTok Shop Acquisition Backlog Repository
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { TikTokShopAcquisitionBacklog } from '../types.js';

interface Row {
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

function map(row: Row): TikTokShopAcquisitionBacklog {
  return {
    id: row.id,
    backlogType: row.backlog_type as any,
    backlogStatus: row.backlog_status as any,
    priority: row.priority,
    backlogPayload: row.backlog_payload,
    assignedTo: row.assigned_to ?? undefined,
    dueAt: row.due_at ? new Date(row.due_at) : undefined,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  };
}

export class TikTokAcquisitionBacklogRepository {
  async findAll() {
    const { data } = await getSupabaseClient().from('tiktok_shop_acquisition_backlog').select('*').order('created_at', { ascending: false });
    return (data || []).map(map);
  }

  async findOpen() {
    const { data } = await getSupabaseClient().from('tiktok_shop_acquisition_backlog').select('*').eq('backlog_status', 'open').order('priority').order('created_at', { ascending: false });
    return (data || []).map(map);
  }

  async create(item: Omit<TikTokShopAcquisitionBacklog, 'id' | 'createdAt' | 'completedAt'>) {
    const { data } = await getSupabaseClient().from('tiktok_shop_acquisition_backlog').insert({
      backlog_type: item.backlogType,
      backlog_status: item.backlogStatus,
      priority: item.priority,
      backlog_payload: item.backlogPayload,
      assigned_to: item.assignedTo ?? null,
      due_at: item.dueAt?.toISOString() ?? null,
    }).select().single();
    return data ? map(data as Row) : null;
  }

  async complete(id: string) {
    const { data } = await getSupabaseClient().from('tiktok_shop_acquisition_backlog').update({ backlog_status: 'completed', completed_at: new Date().toISOString() }).eq('id', id).select().single();
    return data ? map(data as Row) : null;
  }
}

let repo: TikTokAcquisitionBacklogRepository | null = null;
export function getTikTokAcquisitionBacklogRepository() {
  if (!repo) repo = new TikTokAcquisitionBacklogRepository();
  return repo;
}
