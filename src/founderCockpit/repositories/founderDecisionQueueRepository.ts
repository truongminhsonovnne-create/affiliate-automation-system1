/**
 * Founder Decision Queue Repository
 */

import { getSupabaseClient } from '../../db/supabaseClient.js';

export class FounderDecisionQueueRepository {
  async create(input: { decisionArea: string; severity: string; title: string; summary: string; evidence: Record<string, unknown>; recommendation?: Record<string, unknown> }) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('founder_decision_queue').insert({
      decision_area: input.decisionArea,
      severity: input.severity,
      title: input.title,
      summary: input.summary,
      evidence_payload: input.evidence,
      recommendation_payload: input.recommendation,
      status: 'pending',
    }).select().single();
    if (error) throw error;
    return data;
  }

  async findPending(limit = 20) {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('founder_decision_queue').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(limit);
    return data ?? [];
  }

  async resolve(id: string) {
    const supabase = getSupabaseClient();
    await supabase.from('founder_decision_queue').update({ status: 'completed', resolved_at: new Date().toISOString() }).eq('id', id);
  }
}

let repo: FounderDecisionQueueRepository | null = null;
export function getFounderDecisionQueueRepository(): FounderDecisionQueueRepository {
  if (!repo) repo = new FounderDecisionQueueRepository();
  return repo;
}
