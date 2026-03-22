/**
 * TikTok Shop Acquisition Run Repository
 * Repository for TikTok Shop acquisition runs
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { TikTokShopAcquisitionRun, TikTokShopAcquisitionRunStatus } from '../types.js';

interface TikTokShopAcquisitionRunRow {
  id: string;
  source_id: string;
  run_type: string;
  run_status: string;
  items_seen: number;
  items_normalized: number;
  items_enriched: number;
  items_failed: number;
  error_summary: string | null;
  run_payload: Record<string, unknown> | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
}

function mapRowToAcquisitionRun(row: TikTokShopAcquisitionRunRow): TikTokShopAcquisitionRun {
  return {
    id: row.id,
    sourceId: row.source_id,
    runType: row.run_type as any,
    runStatus: row.run_status as TikTokShopAcquisitionRunStatus,
    itemsSeen: row.items_seen,
    itemsNormalized: row.items_normalized,
    itemsEnriched: row.items_enriched,
    itemsFailed: row.items_failed,
    errorSummary: row.error_summary ?? undefined,
    runPayload: row.run_payload ?? undefined,
    startedAt: new Date(row.started_at),
    finishedAt: row.finished_at ? new Date(row.finished_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export class TikTokAcquisitionRunRepository {
  async findAll(): Promise<TikTokShopAcquisitionRun[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_acquisition_runs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch acquisition runs: ${error.message}`);
    return (data || []).map(mapRowToAcquisitionRun);
  }

  async findById(id: string): Promise<TikTokShopAcquisitionRun | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_acquisition_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch acquisition run: ${error.message}`);
    }
    return mapRowToAcquisitionRun(data as TikTokShopAcquisitionRunRow);
  }

  async findBySourceId(sourceId: string): Promise<TikTokShopAcquisitionRun[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_acquisition_runs')
      .select('*')
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch acquisition runs by source: ${error.message}`);
    return (data || []).map(mapRowToAcquisitionRun);
  }

  async findByStatus(status: TikTokShopAcquisitionRunStatus): Promise<TikTokShopAcquisitionRun[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_acquisition_runs')
      .select('*')
      .eq('run_status', status)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch acquisition runs by status: ${error.message}`);
    return (data || []).map(mapRowToAcquisitionRun);
  }

  async create(data: Omit<TikTokShopAcquisitionRun, 'id' | 'createdAt'>): Promise<TikTokShopAcquisitionRun> {
    const supabase = getSupabaseClient();
    const { data: row, error } = await supabase
      .from('tiktok_shop_acquisition_runs')
      .insert({
        source_id: data.sourceId,
        run_type: data.runType,
        run_status: data.runStatus,
        items_seen: data.itemsSeen,
        items_normalized: data.itemsNormalized,
        items_enriched: data.itemsEnriched,
        items_failed: data.itemsFailed,
        error_summary: data.errorSummary ?? null,
        run_payload: data.runPayload ?? null,
        started_at: data.startedAt.toISOString(),
        finished_at: data.finishedAt?.toISOString() ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create acquisition run: ${error.message}`);
    return mapRowToAcquisitionRun(row as TikTokShopAcquisitionRunRow);
  }

  async update(id: string, data: Partial<TikTokShopAcquisitionRun>): Promise<TikTokShopAcquisitionRun> {
    const supabase = getSupabaseClient();
    const updates: Record<string, unknown> = {};

    if (data.runStatus) updates.run_status = data.runStatus;
    if (data.itemsSeen !== undefined) updates.items_seen = data.itemsSeen;
    if (data.itemsNormalized !== undefined) updates.items_normalized = data.itemsNormalized;
    if (data.itemsEnriched !== undefined) updates.items_enriched = data.itemsEnriched;
    if (data.itemsFailed !== undefined) updates.items_failed = data.itemsFailed;
    if (data.errorSummary) updates.error_summary = data.errorSummary;
    if (data.runPayload) updates.run_payload = data.runPayload;
    if (data.finishedAt) updates.finished_at = data.finishedAt.toISOString();

    const { data: row, error } = await supabase
      .from('tiktok_shop_acquisition_runs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update acquisition run: ${error.message}`);
    return mapRowToAcquisitionRun(row as TikTokShopAcquisitionRunRow);
  }
}

let repository: TikTokAcquisitionRunRepository | null = null;

export function getTikTokAcquisitionRunRepository(): TikTokAcquisitionRunRepository {
  if (!repository) {
    repository = new TikTokAcquisitionRunRepository();
  }
  return repository;
}

// Convenience functions
export async function saveTikTokShopAcquisitionRun(
  data: Omit<TikTokShopAcquisitionRun, 'id' | 'createdAt'>
): Promise<TikTokShopAcquisitionRun> {
  return getTikTokAcquisitionRunRepository().create(data);
}

export async function updateAcquisitionRun(
  id: string,
  data: Partial<TikTokShopAcquisitionRun>
): Promise<TikTokShopAcquisitionRun> {
  return getTikTokAcquisitionRunRepository().update(id, data);
}
