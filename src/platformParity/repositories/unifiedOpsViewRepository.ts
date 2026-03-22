/**
 * Unified Ops View Repository
 * Repository for managing unified ops views
 */

import supabase from '../../db/supabaseClient.js';
import type {
  UnifiedOpsView,
  UnifiedOpsViewInput,
} from '../types.js';

export interface OpsViewFilter {
  viewScope?: string;
  viewStatus?: 'active' | 'deprecated' | 'disabled';
  limit?: number;
}

/**
 * Create a new unified ops view
 */
export async function createUnifiedOpsView(
  input: UnifiedOpsViewInput
): Promise<UnifiedOpsView> {
  const { data, error } = await supabase
    .from('unified_ops_views')
    .insert({
      view_key: input.viewKey,
      view_scope: input.viewScope,
      view_status: input.viewStatus ?? 'active',
      configuration_payload: input.configurationPayload ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create unified ops view: ${error.message}`);
  }

  return mapToView(data);
}

/**
 * Get unified ops views with filters
 */
export async function getUnifiedOpsViews(
  filter: OpsViewFilter = {}
): Promise<UnifiedOpsView[]> {
  let query = supabase
    .from('unified_ops_views')
    .select('*')
    .order('updated_at', { ascending: false });

  if (filter.viewScope) {
    query = query.eq('view_scope', filter.viewScope);
  }

  if (filter.viewStatus) {
    query = query.eq('view_status', filter.viewStatus);
  }

  if (filter.limit) {
    query = query.limit(filter.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get unified ops views: ${error.message}`);
  }

  return (data ?? []).map(mapToView);
}

/**
 * Get unified ops view by key
 */
export async function getUnifiedOpsViewByKey(
  viewKey: string
): Promise<UnifiedOpsView | null> {
  const { data, error } = await supabase
    .from('unified_ops_views')
    .select('*')
    .eq('view_key', viewKey)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get unified ops view: ${error.message}`);
  }

  return mapToView(data);
}

/**
 * Update unified ops view
 */
export async function updateUnifiedOpsView(
  viewKey: string,
  updates: Partial<UnifiedOpsViewInput>
): Promise<UnifiedOpsView | null> {
  const update: Record<string, unknown> = {};

  if (updates.viewScope) {
    update.view_scope = updates.viewScope;
  }
  if (updates.viewStatus) {
    update.view_status = updates.viewStatus;
  }
  if (updates.configurationPayload) {
    update.configuration_payload = updates.configurationPayload;
  }

  const { data, error } = await supabase
    .from('unified_ops_views')
    .update(update)
    .eq('view_key', viewKey)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update unified ops view: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapToView(data);
}

/**
 * Delete unified ops view
 */
export async function deleteUnifiedOpsView(viewKey: string): Promise<boolean> {
  const { error } = await supabase
    .from('unified_ops_views')
    .delete()
    .eq('view_key', viewKey);

  if (error) {
    throw new Error(`Failed to delete unified ops view: ${error.message}`);
  }

  return true;
}

/**
 * Get active views by scope
 */
export async function getActiveViewsByScope(
  viewScope: string
): Promise<UnifiedOpsView[]> {
  const { data, error } = await supabase
    .from('unified_ops_views')
    .select('*')
    .eq('view_scope', viewScope)
    .eq('view_status', 'active')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get active views: ${error.message}`);
  }

  return (data ?? []).map(mapToView);
}

// Helper functions

function mapToView(row: Record<string, unknown>): UnifiedOpsView {
  return {
    id: row.id as string,
    viewKey: row.view_key as string,
    viewScope: row.view_scope as string,
    viewStatus: row.view_status as 'active' | 'deprecated' | 'disabled',
    configurationPayload: row.configuration_payload as Record<string, unknown> | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
