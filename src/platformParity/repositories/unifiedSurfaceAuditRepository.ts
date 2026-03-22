/**
 * Unified Surface Audit Repository
 * Repository for managing unified surface audits
 */

import supabase from '../../db/supabaseClient.js';

export interface AuditFilter {
  entityType?: string;
  entityId?: string;
  auditAction?: string;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId?: string;
  auditAction: string;
  actorId?: string;
  actorRole?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  rationale?: string;
  createdAt: Date;
}

/**
 * Create a new audit entry
 */
export async function createAuditEntry(
  entry: Omit<AuditEntry, 'id' | 'createdAt'>
): Promise<AuditEntry> {
  const { data, error } = await supabase
    .from('unified_surface_audits')
    .insert({
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      audit_action: entry.auditAction,
      actor_id: entry.actorId ?? null,
      actor_role: entry.actorRole ?? null,
      previous_state: entry.previousState ?? null,
      new_state: entry.newState ?? null,
      rationale: entry.rationale ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create audit entry: ${error.message}`);
  }

  return mapToAuditEntry(data);
}

/**
 * Get audit entries with filters
 */
export async function getAuditEntries(
  filter: AuditFilter = {}
): Promise<AuditEntry[]> {
  let query = supabase
    .from('unified_surface_audits')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter.entityType) {
    query = query.eq('entity_type', filter.entityType);
  }

  if (filter.entityId) {
    query = query.eq('entity_id', filter.entityId);
  }

  if (filter.auditAction) {
    query = query.eq('audit_action', filter.auditAction);
  }

  if (filter.actorId) {
    query = query.eq('actor_id', filter.actorId);
  }

  if (filter.startDate) {
    query = query.gte('created_at', filter.startDate.toISOString());
  }

  if (filter.endDate) {
    query = query.lte('created_at', filter.endDate.toISOString());
  }

  if (filter.limit) {
    query = query.limit(filter.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get audit entries: ${error.message}`);
  }

  return (data ?? []).map(mapToAuditEntry);
}

/**
 * Get audit entries for a specific entity
 */
export async function getAuditEntriesForEntity(
  entityType: string,
  entityId: string
): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from('unified_surface_audits')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get audit entries for entity: ${error.message}`);
  }

  return (data ?? []).map(mapToAuditEntry);
}

/**
 * Get recent audit entries
 */
export async function getRecentAuditEntries(
  limit: number = 50
): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from('unified_surface_audits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get recent audit entries: ${error.message}`);
  }

  return (data ?? []).map(mapToAuditEntry);
}

/**
 * Get audit entries by action type
 */
export async function getAuditEntriesByAction(
  auditAction: string,
  limit: number = 50
): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from('unified_surface_audits')
    .select('*')
    .eq('audit_action', auditAction)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get audit entries by action: ${error.message}`);
  }

  return (data ?? []).map(mapToAuditEntry);
}

/**
 * Get audit entries by actor
 */
export async function getAuditEntriesByActor(
  actorId: string,
  limit: number = 50
): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from('unified_surface_audits')
    .select('*')
    .eq('actor_id', actorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get audit entries by actor: ${error.message}`);
  }

  return (data ?? []).map(mapToAuditEntry);
}

/**
 * Delete old audit entries
 */
export async function deleteOldAuditEntries(olderThanDays: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { count, error } = await supabase
    .from('unified_surface_audits')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id', { count: 'exact' });

  if (error) {
    throw new Error(`Failed to delete old audit entries: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Get audit entry count by action
 */
export async function getAuditEntryCountByAction(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('unified_surface_audits')
    .select('audit_action');

  if (error) {
    throw new Error(`Failed to get audit entry count: ${error.message}`);
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.audit_action] = (counts[row.audit_action] ?? 0) + 1;
  }

  return counts;
}

// Helper functions

function mapToAuditEntry(row: Record<string, unknown>): AuditEntry {
  return {
    id: row.id as string,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string | undefined,
    auditAction: row.audit_action as string,
    actorId: row.actor_id as string | undefined,
    actorRole: row.actor_role as string | undefined,
    previousState: row.previous_state as Record<string, unknown> | undefined,
    newState: row.new_state as Record<string, unknown> | undefined,
    rationale: row.rationale as string | undefined,
    createdAt: new Date(row.created_at as string),
  };
}
