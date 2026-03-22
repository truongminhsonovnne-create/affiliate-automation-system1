/**
 * Cockpit Snapshot Repository
 */

import { getSupabaseClient } from '../../db/supabaseClient.js';

export class CockpitSnapshotRepository {
  async create(input: { snapshotType: string; startDate: Date; endDate: Date; payload: Record<string, unknown> }) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('founder_cockpit_snapshots').insert({
      snapshot_type: input.snapshotType,
      snapshot_window_start: input.startDate,
      snapshot_window_end: input.endDate,
      cockpit_payload: input.payload,
    }).select().single();
    if (error) throw error;
    return data;
  }

  async findByDateRange(startDate: Date, endDate: Date, limit = 10) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('founder_cockpit_snapshots')
      .select('*')
      .gte('snapshot_window_start', startDate.toISOString())
      .lte('snapshot_window_end', endDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('founder_cockpit_snapshots')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }
}

let repo: CockpitSnapshotRepository | null = null;
export function getCockpitSnapshotRepository(): CockpitSnapshotRepository {
  if (!repo) repo = new CockpitSnapshotRepository();
  return repo;
}
