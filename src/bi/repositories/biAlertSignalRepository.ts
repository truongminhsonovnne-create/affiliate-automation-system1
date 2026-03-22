/**
 * BI Alert Signal Repository
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';

export class BiAlertSignalRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  async create(input: { alertType: string; severity: string; sourceArea: string; targetEntityType?: string; targetEntityId?: string; alertPayload: Record<string, unknown> }) {
    const { data, error } = await this.supabase
      .from('bi_alert_signals')
      .insert({
        alert_type: input.alertType,
        severity: input.severity,
        source_area: input.sourceArea,
        target_entity_type: input.targetEntityType,
        target_entity_id: input.targetEntityId,
        alert_payload: input.alertPayload,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async findRecent(days = 7, severity?: string) {
    let query = this.supabase
      .from('bi_alert_signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data } = await query;
    return data ?? [];
  }
}

let repo: BiAlertSignalRepository | null = null;
export function getBiAlertSignalRepository(): BiAlertSignalRepository {
  if (!repo) repo = new BiAlertSignalRepository();
  return repo;
}
