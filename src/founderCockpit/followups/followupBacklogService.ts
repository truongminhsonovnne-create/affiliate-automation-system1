/**
 * Followup Backlog Service
 */

import type { OperatingFollowupRecord } from '../types.js';
import { getSupabaseClient } from '../../db/supabaseClient.js';

export async function createFounderFollowup(input: Omit<OperatingFollowupRecord, 'id'>): Promise<OperatingFollowupRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('operating_followup_backlog')
    .insert({
      source_type: input.sourceType,
      source_id: input.sourceId,
      backlog_status: input.status,
      priority: input.priority,
      followup_payload: input.payload,
      assigned_to: input.assignedTo,
      due_at: input.dueAt,
    })
    .select()
    .single();

  if (error) throw error;
  return data as OperatingFollowupRecord;
}

export async function getFounderFollowupBacklog(status?: string): Promise<OperatingFollowupRecord[]> {
  const supabase = getSupabaseClient();
  let query = supabase.from('operating_followup_backlog').select('*');
  if (status) query = query.eq('backlog_status', status);
  const { data } = await query.order('priority', { ascending: false });
  return (data ?? []) as OperatingFollowupRecord[];
}

export async function completeFounderFollowup(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from('operating_followup_backlog')
    .update({ backlog_status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id);
}

export async function detectStaleFounderFollowups(daysOld = 7): Promise<OperatingFollowupRecord[]> {
  const supabase = getSupabaseClient();
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const { data } = await supabase
    .from('operating_followup_backlog')
    .select('*')
    .eq('backlog_status', 'pending')
    .lt('created_at', cutoff.toISOString());
  return (data ?? []) as OperatingFollowupRecord[];
}
