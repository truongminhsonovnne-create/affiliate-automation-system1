/**
 * TikTok Shop Discovery Job Repository
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { TikTokShopDiscoveryJob, TikTokShopDiscoveryJobStatus } from '../types.js';

interface Row {
  id: string;
  job_type: string;
  seed_type: string;
  seed_payload: Record<string, unknown>;
  job_status: string;
  items_discovered: number;
  items_deduped: number;
  items_failed: number;
  started_at: string;
  finished_at: string | null;
  created_at: string;
}

function map(row: Row): TikTokShopDiscoveryJob {
  return {
    id: row.id,
    jobType: row.job_type as any,
    seedType: row.seed_type as any,
    seedPayload: row.seed_payload,
    jobStatus: row.job_status as TikTokShopDiscoveryJobStatus,
    itemsDiscovered: row.items_discovered,
    itemsDeduped: row.items_deduped,
    itemsFailed: row.items_failed,
    startedAt: new Date(row.started_at),
    finishedAt: row.finished_at ? new Date(row.finished_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export class TikTokDiscoveryJobRepository {
  async findAll() {
    const { data } = await getSupabaseClient()
      .from('tiktok_shop_discovery_jobs')
      .select('*')
      .order('created_at', { ascending: false });
    return (data || []).map(map);
  }

  async findById(id: string) {
    const { data } = await getSupabaseClient()
      .from('tiktok_shop_discovery_jobs')
      .select('*')
      .eq('id', id)
      .single();
    return data ? map(data as Row) : null;
  }

  async create(job: Omit<TikTokShopDiscoveryJob, 'id' | 'createdAt'>) {
    const { data } = await getSupabaseClient()
      .from('tiktok_shop_discovery_jobs')
      .insert({
        job_type: job.jobType,
        seed_type: job.seedType,
        seed_payload: job.seedPayload,
        job_status: job.jobStatus,
        items_discovered: job.itemsDiscovered,
        items_deduped: job.itemsDeduped,
        items_failed: job.itemsFailed,
        started_at: job.startedAt.toISOString(),
        finished_at: job.finishedAt?.toISOString(),
      })
      .select()
      .single();
    return data ? map(data as Row) : null;
  }

  async update(id: string, updates: Partial<TikTokShopDiscoveryJob>) {
    const upd: Record<string, unknown> = {};
    if (updates.jobStatus) upd.job_status = updates.jobStatus;
    if (updates.itemsDiscovered !== undefined) upd.items_discovered = updates.itemsDiscovered;
    if (updates.itemsDeduped !== undefined) upd.items_deduped = updates.itemsDeduped;
    if (updates.itemsFailed !== undefined) upd.items_failed = updates.itemsFailed;
    if (updates.finishedAt) upd.finished_at = updates.finishedAt.toISOString();

    const { data } = await getSupabaseClient()
      .from('tiktok_shop_discovery_jobs')
      .update(upd)
      .eq('id', id)
      .select()
      .single();
    return data ? map(data as Row) : null;
  }
}

let repo: TikTokDiscoveryJobRepository | null = null;
export function getTikTokDiscoveryJobRepository() {
  if (!repo) repo = new TikTokDiscoveryJobRepository();
  return repo;
}

export async function saveDiscoveryJob(job: Omit<TikTokShopDiscoveryJob, 'id' | 'createdAt'>) {
  return getTikTokDiscoveryJobRepository().create(job);
}

export async function updateDiscoveryJob(id: string, updates: Partial<TikTokShopDiscoveryJob>) {
  return getTikTokDiscoveryJobRepository().update(id, updates);
}
