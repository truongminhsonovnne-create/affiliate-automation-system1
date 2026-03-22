/**
 * Followup Backlog Repository
 */

import { getSupabaseClient } from '../../db/supabaseClient.js';

export class FollowupBacklogRepository {
  async create(input: { sourceType: string; priority: string; payload: Record<string, unknown> }) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('operating_followup_backlog').insert({
      source_type: input.sourceType,
      priority: input.priority,
      followup_payload: input.payload,
      backlog_status: 'pending',
    }).select().single();
    if (error) throw error;
    return data;
  }
}

let repo: FollowupBacklogRepository | null = null;
export function getFollowupBacklogRepository(): FollowupBacklogRepository {
  if (!repo) repo = new FollowupBacklogRepository();
  return repo;
}
