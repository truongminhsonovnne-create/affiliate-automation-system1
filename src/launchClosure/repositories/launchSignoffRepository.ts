/**
 * Launch Signoff Repository
 */
import supabase from '../../db/supabaseClient.js';
import type { LaunchSignoffRecord, LaunchSignoffInput } from '../types.js';

export async function createSignoff(input: LaunchSignoffInput): Promise<LaunchSignoffRecord> {
  const { data, error } = await supabase.from('launch_signoffs').insert({
    launch_review_id: input.launchReviewId ?? null,
    signoff_area: input.signoffArea,
    signoff_payload: input.signoffPayload,
    actor_id: input.actorId ?? null,
    actor_role: input.actorRole ?? null,
  }).select().single();
  if (error) throw new Error(`Failed to create signoff: ${error.message}`);
  return mapToSignoff(data);
}

export async function getSignoffsByReview(reviewId: string): Promise<LaunchSignoffRecord[]> {
  const { data, error } = await supabase.from('launch_signoffs').select('*').eq('launch_review_id', reviewId).order('created_at');
  if (error) throw new Error(`Failed to get signoffs: ${error.message}`);
  return (data ?? []).map(mapToSignoff);
}

export async function updateSignoffStatus(id: string, status: string): Promise<LaunchSignoffRecord | null> {
  const { data, error } = await supabase.from('launch_signoffs').update({ signoff_status: status }).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update signoff: ${error.message}`);
  return data ? mapToSignoff(data) : null;
}

function mapToSignoff(row: Record<string, unknown>): LaunchSignoffRecord {
  return {
    id: row.id as string,
    launchReviewId: row.launch_review_id as string | undefined,
    signoffArea: row.signoff_area as any,
    signoffStatus: row.signoff_status as any,
    signoffPayload: row.signoff_payload as Record<string, unknown>,
    actorId: row.actor_id as string | undefined,
    actorRole: row.actor_role as string | undefined,
    createdAt: new Date(row.created_at as string),
  };
}
