/**
 * Metric Definition Repository
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';

export class MetricDefinitionRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  async findByKey(key: string) {
    const { data } = await this.supabase.from('metric_definition_registry').select('*').eq('metric_key', key).single();
    return data;
  }

  async findByCategory(category: string) {
    const { data } = await this.supabase.from('metric_definition_registry').select('*').eq('metric_category', category).eq('status', 'active');
    return data ?? [];
  }
}

let repo: MetricDefinitionRepository | null = null;
export function getMetricDefinitionRepository(): MetricDefinitionRepository {
  if (!repo) repo = new MetricDefinitionRepository();
  return repo;
}
