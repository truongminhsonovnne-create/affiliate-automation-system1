/**
 * TikTok Shop Source Registry
 * Manages registration and retrieval of TikTok Shop data sources
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type {
  TikTokShopDataSource,
  TikTokShopDataSourceType,
  TikTokShopDataSourceStatus,
  TikTokShopSourceSupportLevel,
  TikTokShopSourceHealthStatus,
} from '../types.js';
import {
  TikTokShopDataSourceType,
  TikTokShopDataSourceStatus,
  TikTokShopSourceSupportLevel,
  TikTokShopSourceHealthStatus,
} from '../types.js';

interface TikTokShopSourceRow {
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

function mapRowToDataSource(row: TikTokShopSourceRow): TikTokShopDataSource {
  return {
    id: row.id,
    sourceKey: row.source_key,
    sourceType: row.source_type as TikTokShopDataSourceType,
    sourceStatus: row.source_status as TikTokShopDataSourceStatus,
    sourcePriority: row.source_priority,
    sourceConfig: row.source_config ?? undefined,
    supportLevel: row.support_level as TikTokShopSourceSupportLevel,
    healthStatus: row.health_status as TikTokShopSourceHealthStatus,
    readinessPayload: row.readiness_payload ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastCheckedAt: row.last_checked_at ? new Date(row.last_checked_at) : undefined,
  };
}

/**
 * Get all TikTok Shop data sources
 */
export async function getTikTokShopDataSources(): Promise<TikTokShopDataSource[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tiktok_shop_data_sources')
    .select('*')
    .order('source_priority', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch TikTok Shop data sources: ${error.message}`);
  }

  return (data || []).map(mapRowToDataSource);
}

/**
 * Get TikTok Shop source by key
 */
export async function getTikTokShopSourceByKey(sourceKey: string): Promise<TikTokShopDataSource | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tiktok_shop_data_sources')
    .select('*')
    .eq('source_key', sourceKey)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch TikTok Shop source: ${error.message}`);
  }

  return mapRowToDataSource(data as TikTokShopSourceRow);
}

/**
 * Get active TikTok Shop sources
 */
export async function getActiveTikTokShopSources(): Promise<TikTokShopDataSource[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tiktok_shop_data_sources')
    .select('*')
    .eq('source_status', 'active')
    .order('source_priority', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch active TikTok Shop sources: ${error.message}`);
  }

  return (data || []).map(mapRowToDataSource);
}

/**
 * Get TikTok Shop sources by type
 */
export async function getTikTokShopSourcesByType(sourceType: string): Promise<TikTokShopDataSource[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tiktok_shop_data_sources')
    .select('*')
    .eq('source_type', sourceType)
    .order('source_priority', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch TikTok Shop sources by type: ${error.message}`);
  }

  return (data || []).map(mapRowToDataSource);
}

/**
 * Register a new TikTok Shop source
 */
export async function registerTikTokShopSource(
  source: Omit<TikTokShopDataSource, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TikTokShopDataSource> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tiktok_shop_data_sources')
    .insert({
      source_key: source.sourceKey,
      source_type: source.sourceType,
      source_status: source.sourceStatus,
      source_priority: source.sourcePriority,
      source_config: source.sourceConfig ?? null,
      support_level: source.supportLevel,
      health_status: source.healthStatus,
      readiness_payload: source.readinessPayload ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register TikTok Shop source: ${error.message}`);
  }

  return mapRowToDataSource(data as TikTokShopSourceRow);
}

/**
 * Update TikTok Shop source status
 */
export async function updateTikTokShopSourceStatus(
  sourceKey: string,
  status: TikTokShopDataSourceStatus
): Promise<TikTokShopDataSource> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tiktok_shop_data_sources')
    .update({ source_status: status, last_checked_at: new Date().toISOString() })
    .eq('source_key', sourceKey)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update TikTok Shop source status: ${error.message}`);
  }

  return mapRowToDataSource(data as TikTokShopSourceRow);
}

/**
 * Update TikTok Shop source health
 */
export async function updateTikTokShopSourceHealth(
  sourceKey: string,
  healthStatus: TikTokShopSourceHealthStatus,
  readinessPayload?: Record<string, unknown>
): Promise<TikTokShopDataSource> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tiktok_shop_data_sources')
    .update({
      health_status: healthStatus,
      readiness_payload: readinessPayload ?? null,
      last_checked_at: new Date().toISOString(),
    })
    .eq('source_key', sourceKey)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update TikTok Shop source health: ${error.message}`);
  }

  return mapRowToDataSource(data as TikTokShopSourceRow);
}

/**
 * Validate TikTok Shop source registry integrity
 */
export async function validateTikTokShopSourceRegistry(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sourcesChecked: number;
}> {
  const sources = await getTikTokShopDataSources();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate keys
  const keys = sources.map((s) => s.sourceKey);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate source keys found: ${duplicates.join(', ')}`);
  }

  // Check for missing required fields
  for (const source of sources) {
    if (!source.sourceKey) {
      errors.push(`Source missing required field: sourceKey (id: ${source.id})`);
    }
    if (!source.sourceType) {
      errors.push(`Source missing required field: sourceType (id: ${source.id})`);
    }
    if (!source.sourceStatus) {
      warnings.push(`Source missing status: sourceKey=${source.sourceKey}`);
    }
  }

  // Check for no active sources
  const activeSources = sources.filter((s) => s.sourceStatus === TikTokShopDataSourceStatus.ACTIVE);
  if (activeSources.length === 0) {
    warnings.push('No active sources found in registry');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sourcesChecked: sources.length,
  };
}

/**
 * Get source summary for reporting
 */
export async function getTikTokShopSourceSummary(): Promise<{
  total: number;
  active: number;
  inactive: number;
  byType: Record<string, number>;
  bySupportLevel: Record<string, number>;
  byHealthStatus: Record<string, number>;
}> {
  const sources = await getTikTokShopDataSources();

  const byType: Record<string, number> = {};
  const bySupportLevel: Record<string, number> = {};
  const byHealthStatus: Record<string, number> = {};

  let active = 0;
  let inactive = 0;

  for (const source of sources) {
    // Count by status
    if (source.sourceStatus === TikTokShopDataSourceStatus.ACTIVE) {
      active++;
    } else {
      inactive++;
    }

    // Count by type
    byType[source.sourceType] = (byType[source.sourceType] || 0) + 1;

    // Count by support level
    bySupportLevel[source.supportLevel] = (bySupportLevel[source.supportLevel] || 0) + 1;

    // Count by health status
    byHealthStatus[source.healthStatus] = (byHealthStatus[source.healthStatus] || 0) + 1;
  }

  return {
    total: sources.length,
    active,
    inactive,
    byType,
    bySupportLevel,
    byHealthStatus,
  };
}
