/**
 * Scorecard Snapshot Repository
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';

export class ScorecardSnapshotRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  async create(input: {
    snapshotWindowStart: Date;
    snapshotWindowEnd: Date;
    scorecardType: string;
    scorecardKey: string;
    scorecardPayload: Record<string, unknown>;
  }) {
    const { data, error } = await this.supabase
      .from('executive_scorecard_snapshots')
      .insert({
        snapshot_window_start: input.snapshotWindowStart,
        snapshot_window_end: input.snapshotWindowEnd,
        scorecard_type: input.scorecardType,
        scorecard_key: input.scorecardKey,
        scorecard_payload: input.scorecardPayload,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findByType(type: string) {
    const { data } = await this.supabase
      .from('executive_scorecard_snapshots')
      .select('*')
      .eq('scorecard_type', type)
      .order('created_at', { ascending: false })
      .limit(1);
    return data?.[0];
  }

  async findByKey(key: string) {
    const { data } = await this.supabase
      .from('executive_scorecard_snapshots')
      .select('*')
      .eq('scorecard_key', key)
      .order('created_at', { ascending: false })
      .limit(1);
    return data?.[0];
  }
}

let repo: ScorecardSnapshotRepository | null = null;
export function getScorecardSnapshotRepository(): ScorecardSnapshotRepository {
  if (!repo) repo = new ScorecardSnapshotRepository();
  return repo;
}
