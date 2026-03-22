/**
 * TikTok Shop Data Source Repository
 * Repository for TikTok Shop data sources
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type {
  TikTokShopDataSource,
  TikTokShopDataSourceStatus,
  TikTokShopSourceHealthStatus,
} from '../types.js';

interface TikTokShopDataSourceRow {
  id: string;
  source_key: string;
  source_type: string;
  source_status: string;
  source_priority: number;
  source_config: Record<string, unknown> | null;
  support_level: string;
  health_status: string;
  readiness_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
}

function mapRowToDataSource(row: TikTokShopDataSourceRow): TikTokShopDataSource {
  return {
    id: row.id,
    sourceKey: row.source_key,
    sourceType: row.source_type as any,
    sourceStatus: row.source_status as TikTokShopDataSourceStatus,
    sourcePriority: row.source_priority,
    sourceConfig: row.source_config ?? undefined,
    supportLevel: row.support_level as any,
    healthStatus: row.health_status as TikTokShopSourceHealthStatus,
    readinessPayload: row.readiness_payload ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastCheckedAt: row.last_checked_at ? new Date(row.last_checked_at) : undefined,
  };
}

export class TikTokDataSourceRepository {
  async findAll(): Promise<TikTokShopDataSource[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_data_sources')
      .select('*')
      .order('source_priority', { ascending: false });

    if (error) throw new Error(`Failed to fetch data sources: ${error.message}`);
    return (data || []).map(mapRowToDataSource);
  }

  async findById(id: string): Promise<TikTokShopDataSource | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_data_sources')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch data source: ${error.message}`);
    }
    return mapRowToDataSource(data as TikTokShopDataSourceRow);
  }

  async findByKey(sourceKey: string): Promise<TikTokShopDataSource | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_data_sources')
      .select('*')
      .eq('source_key', sourceKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch data source: ${error.message}`);
    }
    return mapRowToDataSource(data as TikTokShopDataSourceRow);
  }

  async findActive(): Promise<TikTokShopDataSource[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tiktok_shop_data_sources')
      .select('*')
      .eq('source_status', 'active')
      .order('source_priority', { ascending: false });

    if (error) throw new Error(`Failed to fetch active sources: ${error.message}`);
    return (data || []).map(mapRowToDataSource);
  }

  async create(data: Omit<TikTokShopDataSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<TikTokShopDataSource> {
    const supabase = getSupabaseClient();
    const { data: row, error } = await supabase
      .from('tiktok_shop_data_sources')
      .insert({
        source_key: data.sourceKey,
        source_type: data.sourceType,
        source_status: data.sourceStatus,
        source_priority: data.sourcePriority,
        source_config: data.sourceConfig ?? null,
        support_level: data.supportLevel,
        health_status: data.healthStatus,
        readiness_payload: data.readinessPayload ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create data source: ${error.message}`);
    return mapRowToDataSource(row as TikTokShopDataSourceRow);
  }

  async update(id: string, data: Partial<TikTokShopDataSource>): Promise<TikTokShopDataSource> {
    const supabase = getSupabaseClient();
    const updates: Record<string, unknown> = {};

    if (data.sourceStatus) updates.source_status = data.sourceStatus;
    if (data.sourceConfig) updates.source_config = data.sourceConfig;
    if (data.supportLevel) updates.support_level = data.supportLevel;
    if (data.healthStatus) updates.health_status = data.healthStatus;
    if (data.readinessPayload) updates.readiness_payload = data.readinessPayload;
    if (data.lastCheckedAt) updates.last_checked_at = data.lastCheckedAt.toISOString();

    const { data: row, error } = await supabase
      .from('tiktok_shop_data_sources')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update data source: ${error.message}`);
    return mapRowToDataSource(row as TikTokShopDataSourceRow);
  }

  async updateStatus(sourceKey: string, status: TikTokShopDataSourceStatus): Promise<TikTokShopDataSource> {
    const supabase = getSupabaseClient();
    const { data: row, error } = await supabase
      .from('tiktok_shop_data_sources')
      .update({ source_status: status, last_checked_at: new Date().toISOString() })
      .eq('source_key', sourceKey)
      .select()
      .single();

    if (error) throw new Error(`Failed to update source status: ${error.message}`);
    return mapRowToDataSource(row as TikTokShopDataSourceRow);
  }

  async updateHealth(sourceKey: string, healthStatus: TikTokShopSourceHealthStatus, payload?: Record<string, unknown>): Promise<TikTokShopDataSource> {
    const supabase = getSupabaseClient();
    const updates: Record<string, unknown> = {
      health_status: healthStatus,
      last_checked_at: new Date().toISOString(),
    };
    if (payload) updates.readiness_payload = payload;

    const { data: row, error } = await supabase
      .from('tiktok_shop_data_sources')
      .update(updates)
      .eq('source_key', sourceKey)
      .select()
      .single();

    if (error) throw new Error(`Failed to update source health: ${error.message}`);
    return mapRowToDataSource(row as TikTokShopDataSourceRow);
  }
}

let repository: TikTokDataSourceRepository | null = null;

export function getTikTokDataSourceRepository(): TikTokDataSourceRepository {
  if (!repository) {
    repository = new TikTokDataSourceRepository();
  }
  return repository;
}
