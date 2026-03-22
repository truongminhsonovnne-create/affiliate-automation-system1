/**
 * Strategic Decision Support Repository
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';

export class StrategicDecisionSupportRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  async create(input: { decisionArea: string; targetEntityType?: string; targetEntityId?: string; recommendationPayload: Record<string, unknown>; confidenceScore?: number }) {
    const { data, error } = await this.supabase
      .from('strategic_decision_support_records')
      .insert({
        decision_area: input.decisionArea,
        target_entity_type: input.targetEntityType,
        target_entity_id: input.targetEntityId,
        recommendation_payload: input.recommendationPayload,
        confidence_score: input.confidenceScore,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async findActive(limit = 20) {
    const { data } = await this.supabase
      .from('strategic_decision_support_records')
      .select('*')
      .in('recommendation_status', ['pending', 'active'])
      .order('created_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  }
}

let repo: StrategicDecisionSupportRepository | null = null;
export function getStrategicDecisionSupportRepository(): StrategicDecisionSupportRepository {
  if (!repo) repo = new StrategicDecisionSupportRepository();
  return repo;
}
