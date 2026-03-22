/**
 * Commercial Metric Snapshot Repository
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type { CommercialMetricSnapshot, CommercialResult, MetricDimensionType } from '../types.js';

export class CommercialMetricSnapshotRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  async create(input: {
    metricWindowStart: Date;
    metricWindowEnd: Date;
    dimensionType: MetricDimensionType;
    dimensionKey: string;
    metricPayload: Record<string, unknown>;
  }): Promise<CommercialResult<CommercialMetricSnapshot>> {
    try {
      const { data, error } = await this.supabase
        .from('commercial_metric_snapshots')
        .insert({
          metric_window_start: input.metricWindowStart,
          metric_window_end: input.metricWindowEnd,
          dimension_type: input.dimensionType,
          dimension_key: input.dimensionKey,
          metric_payload: input.metricPayload,
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: this.mapToDomain(data) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async findByDimension(dimensionType: MetricDimensionType, dimensionKey: string): Promise<CommercialMetricSnapshot[]> {
    const { data } = await this.supabase
      .from('commercial_metric_snapshots')
      .select('*')
      .eq('dimension_type', dimensionType)
      .eq('dimension_key', dimensionKey)
      .order('metric_window_start', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<CommercialMetricSnapshot[]> {
    const { data } = await this.supabase
      .from('commercial_metric_snapshots')
      .select('*')
      .gte('metric_window_start', startDate.toISOString())
      .lte('metric_window_end', endDate.toISOString())
      .order('metric_window_start', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  private mapToDomain(data: Record<string, unknown>): CommercialMetricSnapshot {
    return {
      id: data.id as string,
      metricWindowStart: new Date(data.metric_window_start as string),
      metricWindowEnd: new Date(data.metric_window_end as string),
      dimensionType: data.dimension_type as MetricDimensionType,
      dimensionKey: data.dimension_key as string,
      metricPayload: data.metric_payload as Record<string, unknown>,
      createdAt: new Date(data.created_at as string),
    };
  }
}

let repo: CommercialMetricSnapshotRepository | null = null;
export function getCommercialMetricSnapshotRepository(): CommercialMetricSnapshotRepository {
  if (!repo) repo = new CommercialMetricSnapshotRepository();
  return repo;
}
