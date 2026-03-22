/**
 * Strategic Review Pack Repository
 */

import { getSupabaseClient } from '../../db/supabaseClient.js';

export class StrategicReviewPackRepository {
  async create(input: { reviewType: string; periodStart: Date; periodEnd: Date; payload: Record<string, unknown> }) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('strategic_review_packs').insert({
      review_type: input.reviewType,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      pack_payload: input.payload,
      pack_status: 'completed',
    }).select().single();
    if (error) throw error;
    return data;
  }

  async findByFilters(type?: string, status?: string) {
    const supabase = getSupabaseClient();
    let query = supabase.from('strategic_review_packs').select('*').order('created_at', { ascending: false });
    if (type) query = query.eq('review_type', type);
    if (status) query = query.eq('pack_status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}

let repo: StrategicReviewPackRepository | null = null;
export function getStrategicReviewPackRepository(): StrategicReviewPackRepository {
  if (!repo) repo = new StrategicReviewPackRepository();
  return repo;
}
