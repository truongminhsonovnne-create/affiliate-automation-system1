/**
 * Launch Checklist Repository
 */
import supabase from '../../db/supabaseClient.js';
import type { LaunchHardeningChecklist, LaunchChecklistInput } from '../types.js';

export async function createChecklist(input: LaunchChecklistInput): Promise<LaunchHardeningChecklist> {
  const { data, error } = await supabase.from('launch_hardening_checklists').insert({
    launch_review_id: input.launchReviewId ?? null,
    checklist_key: input.checklistKey,
    checklist_payload: input.checklistPayload,
  }).select().single();
  if (error) throw new Error(`Failed to create checklist: ${error.message}`);
  return mapToChecklist(data);
}

export async function getChecklistsByReview(reviewId: string): Promise<LaunchHardeningChecklist[]> {
  const { data, error } = await supabase.from('launch_hardening_checklists').select('*').eq('launch_review_id', reviewId).order('created_at');
  if (error) throw new Error(`Failed to get checklists: ${error.message}`);
  return (data ?? []).map(mapToChecklist);
}

export async function updateChecklistStatus(id: string, status: string, completedAt?: Date): Promise<LaunchHardeningChecklist | null> {
  const update: Record<string, unknown> = { checklist_status: status };
  if (completedAt) update.completed_at = completedAt.toISOString();
  const { data, error } = await supabase.from('launch_hardening_checklists').update(update).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update checklist: ${error.message}`);
  return data ? mapToChecklist(data) : null;
}

function mapToChecklist(row: Record<string, unknown>): LaunchHardeningChecklist {
  return {
    id: row.id as string,
    launchReviewId: row.launch_review_id as string | undefined,
    checklistKey: row.checklist_key as string,
    checklistStatus: row.checklist_status as any,
    checklistPayload: row.checklist_payload as Record<string, unknown>,
    createdAt: new Date(row.created_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
  };
}
