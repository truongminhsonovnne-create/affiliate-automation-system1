/**
 * Launch Closure Audit Repository
 */
import supabase from '../../db/supabaseClient.js';

export interface AuditEntry {
  entityType: string;
  entityId?: string;
  auditAction: string;
  actorId?: string;
  actorRole?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  rationale?: string;
}

export async function createAuditEntry(entry: AuditEntry) {
  const { data, error } = await supabase.from('launch_closure_audits').insert({
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    audit_action: entry.auditAction,
    actor_id: entry.actorId ?? null,
    actor_role: entry.actorRole ?? null,
    previous_state: entry.previousState ?? null,
    new_state: entry.newState ?? null,
    rationale: entry.rationale ?? null,
  }).select().single();
  if (error) throw new Error(`Failed to create audit: ${error.message}`);
  return data;
}

export async function getAuditsByEntity(entityType: string, entityId: string) {
  const { data, error } = await supabase.from('launch_closure_audits').select('*').eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to get audits: ${error.message}`);
  return data;
}
