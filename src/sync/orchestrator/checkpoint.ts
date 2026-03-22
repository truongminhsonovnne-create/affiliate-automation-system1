/**
 * Sync Orchestrator — Checkpoint Repository
 *
 * Reads and writes sync_source_state rows in Supabase.
 * Provides atomic read-modify-write for checkpoint updates.
 */

import { getSyncSupabase, type SyncCheckpoint } from './types.js';

// ── Read ───────────────────────────────────────────────────────────────────

export interface SourceStateRow {
  source: string;
  is_enabled: boolean;
  last_synced_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_page: number;
  last_cursor: string | null;
  last_external_timestamp: string | null;
  pending_continue: boolean;
  retry_count: number;
  max_retries: number;
  last_status: string | null;
  last_error: string | null;
  meta_jsonb: Record<string, unknown>;
}

/**
 * Get the current checkpoint state for a source.
 * Returns defaults if no row exists yet.
 */
export async function getCheckpoint(source: string): Promise<SyncCheckpoint> {
  const sb = getSyncSupabase();

  const { data, error } = await sb
    .from('sync_source_state')
    .select('*')
    .eq('source', source)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (data) {
    return {
      lastPage: data.last_page ?? 0,
      lastCursor: data.last_cursor ?? null,
      lastExternalTimestamp: data.last_external_timestamp ?? null,
      pendingContinue: data.pending_continue ?? false,
      retryCount: data.retry_count ?? 0,
      meta: data.meta_jsonb ?? {},
    };
  }

  return {
    lastPage: 0,
    lastCursor: null,
    lastExternalTimestamp: null,
    pendingContinue: false,
    retryCount: 0,
    meta: {},
  };
}

/**
 * Get enabled sources and their current checkpoints.
 */
export async function getEnabledSources(): Promise<SourceStateRow[]> {
  const sb = getSyncSupabase();

  const { data, error } = await sb
    .from('sync_source_state')
    .select('*')
    .eq('is_enabled', true)
    .order('source');

  if (error) throw error;
  return (data as SourceStateRow[]) ?? [];
}

/**
 * Get all sources (enabled + disabled).
 */
export async function getAllSources(): Promise<SourceStateRow[]> {
  const sb = getSyncSupabase();

  const { data, error } = await sb
    .from('sync_source_state')
    .select('*')
    .order('source');

  if (error) throw error;
  return (data as SourceStateRow[]) ?? [];
}

// ── Write ───────────────────────────────────────────────────────────────────

interface UpdateCheckpointPayload {
  /** Incremental mode: last page to save as checkpoint (1-indexed) */
  lastPage?: number;
  /** Cursor-based pagination cursor */
  lastCursor?: string | null;
  /** Last timestamp seen in this run */
  lastExternalTimestamp?: string | null;
  /** True = there are more pages to process */
  pendingContinue?: boolean;
  /** True = this run succeeded */
  succeeded?: boolean;
  /** Error message if failed */
  error?: string | null;
  /** Arbitrary metadata to merge into meta_jsonb */
  metaMerge?: Record<string, unknown>;
}

/**
 * Update the checkpoint state for a source after a sync run completes.
 *
 * Key rules:
 * - On success: reset retry_count to 0, update last_success_at
 * - On failure: increment retry_count, update last_failure_at
 * - pending_continue stays true if set (clear explicitly to end a run)
 */
export async function updateCheckpoint(
  source: string,
  payload: UpdateCheckpointPayload
): Promise<void> {
  const sb = getSyncSupabase();
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updated_at: now };

  if (payload.lastPage !== undefined) updates.last_page = payload.lastPage;
  if (payload.lastCursor !== undefined) updates.last_cursor = payload.lastCursor ?? null;
  if (payload.lastExternalTimestamp !== undefined) {
    updates.last_external_timestamp = payload.lastExternalTimestamp ?? null;
  }
  if (payload.pendingContinue !== undefined) updates.pending_continue = payload.pendingContinue;

  if (payload.succeeded) {
    updates.last_status = 'completed';
    updates.last_synced_at = now;
    updates.last_success_at = now;
    updates.last_error = null;
    updates.retry_count = 0;
  } else if (payload.error !== undefined) {
    updates.last_status = 'failed';
    updates.last_synced_at = now;
    updates.last_failure_at = now;
    updates.last_error = payload.error;
    updates.retry_count = sb.sql`retry_count + 1`;
  }

  if (payload.metaMerge) {
    const { data: existing } = await sb
      .from('sync_source_state')
      .select('meta_jsonb')
      .eq('source', source)
      .single();

    const existingMeta = (existing?.meta_jsonb as Record<string, unknown>) ?? {};
    updates.meta_jsonb = { ...existingMeta, ...payload.metaMerge };
  }

  const { error } = await sb
    .from('sync_source_state')
    .update(updates satisfies Record<string, unknown>)
    .eq('source', source);

  if (error) throw error;
}

/**
 * Reset checkpoint for a source (force full rescan).
 */
export async function resetCheckpoint(source: string): Promise<void> {
  const sb = getSyncSupabase();

  const { error } = await sb
    .from('sync_source_state')
    .update({
      last_page: 0,
      last_cursor: null,
      last_external_timestamp: null,
      pending_continue: false,
      retry_count: 0,
      last_status: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('source', source);

  if (error) throw error;
}

/**
 * Enable or disable a source.
 */
export async function setSourceEnabled(source: string, enabled: boolean): Promise<void> {
  const sb = getSyncSupabase();

  const { error } = await sb
    .from('sync_source_state')
    .update({
      is_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('source', source);

  if (error) throw error;
}
