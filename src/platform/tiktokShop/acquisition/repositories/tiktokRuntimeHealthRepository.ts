/**
 * TikTok Shop Runtime Health Repository
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { TikTokShopRuntimeHealthSnapshot } from '../types.js';

interface Row {
  id: string;
  runtime_role: string;
  health_status: string;
  snapshot_payload: Record<string, unknown>;
  created_at: string;
}

function map(row: Row): TikTokShopRuntimeHealthSnapshot {
  return {
    id: row.id,
    runtimeRole: row.runtime_role as any,
    healthStatus: row.health_status as any,
    snapshotPayload: row.snapshot_payload,
    createdAt: new Date(row.created_at),
  };
}

export class TikTokRuntimeHealthRepository {
  async findAll() {
    const { data } = await getSupabaseClient().from('tiktok_shop_runtime_health_snapshots').select('*').order('created_at', { ascending: false });
    return (data || []).map(map);
  }

  async findLatest(role?: string) {
    let query = getSupabaseClient().from('tiktok_shop_runtime_health_snapshots').select('*').order('created_at', { ascending: false }).limit(1);
    if (role) query = query.eq('runtime_role', role);
    const { data } = await query.single();
    return data ? map(data as Row) : null;
  }

  async create(snapshot: Omit<TikTokShopRuntimeHealthSnapshot, 'id' | 'createdAt'>) {
    const { data } = await getSupabaseClient().from('tiktok_shop_runtime_health_snapshots').insert({
      runtime_role: snapshot.runtimeRole,
      health_status: snapshot.healthStatus,
      snapshot_payload: snapshot.snapshotPayload,
    }).select().single();
    return data ? map(data as Row) : null;
  }
}

let repo: TikTokRuntimeHealthRepository | null = null;
export function getTikTokRuntimeHealthRepository() {
  if (!repo) repo = new TikTokRuntimeHealthRepository();
  return repo;
}
