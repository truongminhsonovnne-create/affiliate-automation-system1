/**
 * Sync Orchestrator — Checkpoint Repository
 *
 * Self-contained: manages sync_source_state rows in Supabase.
 */

import { getSyncSupabase } from './types.js';

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
 * Returns defaults if no row exists.
 */
export async function getCheckpoint(source: string): Promise<{
  lastPage: number;
  lastCursor: string | null;
  lastExternalTimestamp: string | null;
  pendingContinue: boolean;
  retryCount: number;
  meta: Record<string, unknown>;
}> {
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
 * Get all enabled sources.
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
 * Get all sources.
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

interface UpdatePayload {
  lastPage?: number;
  lastCursor?: string | null;
  lastExternalTimestamp?: string | null;
  pendingContinue?: boolean;
  succeeded?: boolean;
  error?: string | null;
  metaMerge?: Record<string, unknown>;
}

/**
 * Update checkpoint state after a source sync run.
 */
export async function updateCheckpoint(
  source: string,
  payload: UpdatePayload
): Promise<void> {
  const sb = getSyncSupabase();
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updated_at: now };

  if (payload.lastPage !== undefined) updates.last_page = payload.lastPage;
  if (payload.lastCursor !== undefined) updates.last_cursor = payload.lastCursor ?? null;
  if (payload.lastExternalTimestamp !== undefined) {
    updates.last_external_timestamp = payload.lastExternalTimestamp ?? null;
  }
  if (payload.pendingContinue !== undefined) {
    updates.pending_continue = payload.pendingContinue;
  }

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
    .update(updates as Record<string, unknown>)
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
