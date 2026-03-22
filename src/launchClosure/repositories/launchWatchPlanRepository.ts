/**
 * Launch Watch Plan Repository
 */
import supabase from '../../db/supabaseClient.js';
import type { LaunchWatchPlan, LaunchWatchPlanInput } from '../types.js';

export async function createWatchPlan(input: LaunchWatchPlanInput): Promise<LaunchWatchPlan> {
  const { data, error } = await supabase.from('launch_watch_plans').insert({
    launch_review_id: input.launchReviewId ?? null,
    plan_payload: input.planPayload,
    watch_window_start: input.watchWindowStart?.toISOString() ?? null,
    watch_window_end: input.watchWindowEnd?.toISOString() ?? null,
  }).select().single();
  if (error) throw new Error(`Failed to create watch plan: ${error.message}`);
  return mapToWatchPlan(data);
}

export async function getWatchPlanByReview(reviewId: string): Promise<LaunchWatchPlan | null> {
  const { data, error } = await supabase.from('launch_watch_plans').select('*').eq('launch_review_id', reviewId).single();
  if (error) { if (error.code === 'PGRST116') return null; throw new Error(`Failed to get watch plan: ${error.message}`); }
  return mapToWatchPlan(data);
}

export async function updateWatchPlanStatus(id: string, status: string): Promise<LaunchWatchPlan | null> {
  const { data, error } = await supabase.from('launch_watch_plans').update({ plan_status: status }).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update watch plan: ${error.message}`);
  return data ? mapToWatchPlan(data) : null;
}

function mapToWatchPlan(row: Record<string, unknown>): LaunchWatchPlan {
  return {
    id: row.id as string,
    launchReviewId: row.launch_review_id as string | undefined,
    planStatus: row.plan_status as any,
    watchWindowStart: row.watch_window_start ? new Date(row.watch_window_start as string) : undefined,
    watchWindowEnd: row.watch_window_end ? new Date(row.watch_window_end as string) : undefined,
    planPayload: row.plan_payload as Record<string, unknown>,
    createdAt: new Date(row.created_at as string),
  };
}
