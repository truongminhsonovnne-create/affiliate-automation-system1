/**
 * Platform Parity Snapshot Repository
 * Repository for managing parity snapshots
 */

import supabase from '../../db/supabaseClient.js';
import type {
  PlatformParitySnapshot,
  PlatformParitySnapshotInput,
  PlatformParityScope,
} from '../types.js';

export interface SnapshotFilter {
  parityScope?: PlatformParityScope;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * Create a new parity snapshot
 */
export async function createPlatformParitySnapshot(
  input: PlatformParitySnapshotInput
): Promise<PlatformParitySnapshot> {
  const { data, error } = await supabase
    .from('platform_parity_snapshots')
    .insert({
      snapshot_window_start: input.snapshotWindowStart.toISOString(),
      snapshot_window_end: input.snapshotWindowEnd.toISOString(),
      parity_scope: input.parityScope,
      parity_payload: input.parityPayload,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create snapshot: ${error.message}`);
  }

  return mapToSnapshot(data);
}

/**
 * Get snapshots with filters
 */
export async function getPlatformParitySnapshots(
  filter: SnapshotFilter = {}
): Promise<PlatformParitySnapshot[]> {
  let query = supabase
    .from('platform_parity_snapshots')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter.parityScope) {
    query = query.eq('parity_scope', filter.parityScope);
  }

  if (filter.startDate) {
    query = query.gte('snapshot_window_start', filter.startDate.toISOString());
  }

  if (filter.endDate) {
    query = query.lte('snapshot_window_end', filter.endDate.toISOString());
  }

  if (filter.limit) {
    query = query.limit(filter.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get snapshots: ${error.message}`);
  }

  return (data ?? []).map(mapToSnapshot);
}

/**
 * Get latest snapshot for a scope
 */
export async function getLatestSnapshot(
  parityScope: PlatformParityScope
): Promise<PlatformParitySnapshot | null> {
  const { data, error } = await supabase
    .from('platform_parity_snapshots')
    .select('*')
    .eq('parity_scope', parityScope)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No results
    }
    throw new Error(`Failed to get latest snapshot: ${error.message}`);
  }

  return mapToSnapshot(data);
}

/**
 * Delete old snapshots
 */
export async function deleteOldSnapshots(olderThanDays: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { count, error } = await supabase
    .from('platform_parity_snapshots')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id', { count: 'exact' });

  if (error) {
    throw new Error(`Failed to delete old snapshots: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Get snapshot count by scope
 */
export async function getSnapshotCountByScope(): Promise<Record<PlatformParityScope, number>> {
  const { data, error } = await supabase
    .from('platform_parity_snapshots')
    .select('parity_scope')
    .order('parity_scope');

  if (error) {
    throw new Error(`Failed to get snapshot count: ${error.message}`);
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.parity_scope] = (counts[row.parity_scope] ?? 0) + 1;
  }

  return counts as Record<PlatformParityScope, number>;
}

// Helper functions

function mapToSnapshot(row: Record<string, unknown>): PlatformParitySnapshot {
  return {
    id: row.id as string,
    snapshotWindowStart: new Date(row.snapshot_window_start as string),
    snapshotWindowEnd: new Date(row.snapshot_window_end as string),
    parityScope: row.parity_scope as PlatformParityScope,
    parityPayload: row.parity_payload as Record<string, unknown>,
    createdAt: new Date(row.created_at as string),
  };
}
