/**
 * Weekly Review Repository
 */

import { getSupabaseClient } from '../../db/supabaseClient.js';

export class WeeklyReviewRepository {
  async create(input: { reviewKey: string; periodStart: Date; periodEnd: Date; payload: Record<string, unknown> }) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('weekly_operating_reviews').insert({
      review_key: input.reviewKey,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      review_payload: input.payload,
      review_status: 'completed',
    }).select().single();
    if (error) throw error;
    return data;
  }

  async findLatest() {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('weekly_operating_reviews').select('*').order('created_at', { ascending: false }).limit(1);
    return data?.[0];
  }

  async findByDateRange(startDate: Date, endDate: Date) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('weekly_operating_reviews')
      .select('*')
      .gte('period_start', startDate.toISOString())
      .lte('period_end', endDate.toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
}

let repo: WeeklyReviewRepository | null = null;
export function getWeeklyReviewRepository(): WeeklyReviewRepository {
  if (!repo) repo = new WeeklyReviewRepository();
  return repo;
}
