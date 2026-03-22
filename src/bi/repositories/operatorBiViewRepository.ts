/**
 * Operator BI View Repository
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';

export class OperatorBiViewRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  async create(input: { viewKey: string; viewType: string; viewScope: string; configurationPayload?: Record<string, unknown> }) {
    const { data, error } = await this.supabase
      .from('operator_bi_views')
      .insert({
        view_key: input.viewKey,
        view_type: input.viewType,
        view_scope: input.viewScope,
        configuration_payload: input.configurationPayload,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async findByKey(key: string) {
    const { data } = await this.supabase.from('operator_bi_views').select('*').eq('view_key', key).single();
    return data;
  }

  async findByType(type: string) {
    const { data } = await this.supabase.from('operator_bi_views').select('*').eq('view_type', type).eq('view_status', 'active');
    return data ?? [];
  }
}

let repo: OperatorBiViewRepository | null = null;
export function getOperatorBiViewRepository(): OperatorBiViewRepository {
  if (!repo) repo = new OperatorBiViewRepository();
  return repo;
}
