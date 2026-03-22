/**
 * Commercial Anomaly Repository
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type { CommercialAnomalySignal, AnomalySignalType, AnomalySeverity, CommercialResult } from '../types.js';

export class CommercialAnomalyRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  async create(input: {
    signalType: AnomalySignalType;
    severity: AnomalySeverity;
    targetEntityType?: string;
    targetEntityId?: string;
    signalPayload: Record<string, unknown>;
  }): Promise<CommercialResult<CommercialAnomalySignal>> {
    try {
      const { data, error } = await this.supabase
        .from('commercial_anomaly_signals')
        .insert({
          signal_type: input.signalType,
          severity: input.severity,
          target_entity_type: input.targetEntityType,
          target_entity_id: input.targetEntityId,
          signal_payload: input.signalPayload,
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: this.mapToDomain(data) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async findBySeverity(severity: AnomalySeverity): Promise<CommercialAnomalySignal[]> {
    const { data } = await this.supabase
      .from('commercial_anomaly_signals')
      .select('*')
      .eq('severity', severity)
      .order('created_at', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  async findByType(signalType: AnomalySignalType): Promise<CommercialAnomalySignal[]> {
    const { data } = await this.supabase
      .from('commercial_anomaly_signals')
      .select('*')
      .eq('signal_type', signalType)
      .order('created_at', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<CommercialAnomalySignal[]> {
    const { data } = await this.supabase
      .from('commercial_anomaly_signals')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  async findByEntity(targetEntityType: string, targetEntityId: string): Promise<CommercialAnomalySignal[]> {
    const { data } = await this.supabase
      .from('commercial_anomaly_signals')
      .select('*')
      .eq('target_entity_type', targetEntityType)
      .eq('target_entity_id', targetEntityId)
      .order('created_at', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  private mapToDomain(data: Record<string, unknown>): CommercialAnomalySignal {
    return {
      id: data.id as string,
      signalType: data.signal_type as AnomalySignalType,
      severity: data.severity as AnomalySeverity,
      targetEntityType: data.target_entity_type as string | null,
      targetEntityId: data.target_entity_id as string | null,
      signalPayload: data.signal_payload as Record<string, unknown> ?? {},
      createdAt: new Date(data.created_at as string),
    };
  }
}

let repo: CommercialAnomalyRepository | null = null;
export function getCommercialAnomalyRepository(): CommercialAnomalyRepository {
  if (!repo) repo = new CommercialAnomalyRepository();
  return repo;
}
