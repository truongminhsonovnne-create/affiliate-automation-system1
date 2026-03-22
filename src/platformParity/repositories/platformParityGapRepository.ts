/**
 * Platform Parity Gap Repository
 * Repository for managing parity gaps
 */

import supabase from '../../db/supabaseClient.js';
import type {
  PlatformParityGap,
  PlatformParityGapInput,
  PlatformParityGapArea,
  PlatformParityGapStatus,
  PlatformParityGapSeverity,
  PlatformKey,
} from '../types.js';

export interface GapFilter {
  platformKey?: PlatformKey;
  gapArea?: PlatformParityGapArea;
  gapStatus?: PlatformParityGapStatus;
  severity?: PlatformParityGapSeverity;
  limit?: number;
  offset?: number;
}

/**
 * Create a new parity gap
 */
export async function createPlatformParityGap(
  input: PlatformParityGapInput
): Promise<PlatformParityGap> {
  const { data, error } = await supabase
    .from('platform_parity_gaps')
    .insert({
      platform_key: input.platformKey,
      gap_area: input.gapArea,
      gap_status: input.gapStatus ?? 'open',
      severity: input.severity,
      gap_payload: input.gapPayload,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create gap: ${error.message}`);
  }

  return mapToGap(data);
}

/**
 * Get gaps with filters
 */
export async function getPlatformParityGaps(
  filter: GapFilter = {}
): Promise<PlatformParityGap[]> {
  let query = supabase
    .from('platform_parity_gaps')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter.platformKey) {
    query = query.eq('platform_key', filter.platformKey);
  }

  if (filter.gapArea) {
    query = query.eq('gap_area', filter.gapArea);
  }

  if (filter.gapStatus) {
    query = query.eq('gap_status', filter.gapStatus);
  }

  if (filter.severity) {
    query = query.eq('severity', filter.severity);
  }

  if (filter.limit) {
    query = query.limit(filter.limit);
  }

  if (filter.offset) {
    query = query.range(filter.offset, filter.offset + (filter.limit ?? 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get gaps: ${error.message}`);
  }

  return (data ?? []).map(mapToGap);
}

/**
 * Get open (unresolved) gaps
 */
export async function getOpenGaps(): Promise<PlatformParityGap[]> {
  const { data, error } = await supabase
    .from('platform_parity_gaps')
    .select('*')
    .in('gap_status', ['open', 'investigating', 'in_progress'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get open gaps: ${error.message}`);
  }

  return (data ?? []).map(mapToGap);
}

/**
 * Get gaps by platform
 */
export async function getGapsByPlatform(
  platformKey: PlatformKey
): Promise<PlatformParityGap[]> {
  const { data, error } = await supabase
    .from('platform_parity_gaps')
    .select('*')
    .eq('platform_key', platformKey)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get gaps by platform: ${error.message}`);
  }

  return (data ?? []).map(mapToGap);
}

/**
 * Get gaps by area
 */
export async function getGapsByArea(
  gapArea: PlatformParityGapArea
): Promise<PlatformParityGap[]> {
  const { data, error } = await supabase
    .from('platform_parity_gaps')
    .select('*')
    .eq('gap_area', gapArea)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get gaps by area: ${error.message}`);
  }

  return (data ?? []).map(mapToGap);
}

/**
 * Update gap status
 */
export async function updateGapStatus(
  gapId: string,
  status: PlatformParityGapStatus,
  resolvedAt?: Date
): Promise<PlatformParityGap | null> {
  const update: Record<string, unknown> = {
    gap_status: status,
  };

  if (resolvedAt) {
    update.resolved_at = resolvedAt.toISOString();
  }

  const { data, error } = await supabase
    .from('platform_parity_gaps')
    .update(update)
    .eq('id', gapId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update gap status: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapToGap(data);
}

/**
 * Resolve a gap
 */
export async function resolveGap(gapId: string): Promise<PlatformParityGap | null> {
  return updateGapStatus(gapId, 'resolved', new Date());
}

/**
 * Get gap by ID
 */
export async function getGapById(gapId: string): Promise<PlatformParityGap | null> {
  const { data, error } = await supabase
    .from('platform_parity_gaps')
    .select('*')
    .eq('id', gapId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get gap: ${error.message}`);
  }

  return mapToGap(data);
}

/**
 * Get gap count by severity
 */
export async function getGapCountBySeverity(): Promise<Record<PlatformParityGapSeverity, number>> {
  const { data, error } = await supabase
    .from('platform_parity_gaps')
    .select('severity')
    .in('gap_status', ['open', 'investigating', 'in_progress']);

  if (error) {
    throw new Error(`Failed to get gap count: ${error.message}`);
  }

  const counts: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const row of data ?? []) {
    counts[row.severity] = (counts[row.severity] ?? 0) + 1;
  }

  return counts as Record<PlatformParityGapSeverity, number>;
}

/**
 * Delete old resolved gaps
 */
export async function deleteOldResolvedGaps(olderThanDays: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { count, error } = await supabase
    .from('platform_parity_gaps')
    .delete()
    .eq('gap_status', 'resolved')
    .lt('resolved_at', cutoffDate.toISOString())
    .select('id', { count: 'exact' });

  if (error) {
    throw new Error(`Failed to delete old gaps: ${error.message}`);
  }

  return count ?? 0;
}

// Helper functions

function mapToGap(row: Record<string, unknown>): PlatformParityGap {
  return {
    id: row.id as string,
    platformKey: row.platform_key as PlatformKey,
    gapArea: row.gap_area as PlatformParityGapArea,
    gapStatus: row.gap_status as PlatformParityGapStatus,
    severity: row.severity as PlatformParityGapSeverity,
    gapPayload: row.gap_payload as Record<string, unknown>,
    createdAt: new Date(row.created_at as string),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : undefined,
  };
}
