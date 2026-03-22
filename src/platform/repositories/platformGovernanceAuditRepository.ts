/**
 * Platform Governance Audit Repository
 */

import { getSupabaseClient } from '../../db/supabaseClient.js';
import type { PlatformGovernanceAudit, PlatformAuditAction } from '../types.js';

export class PlatformGovernanceAuditRepository {
  async findByPlatform(platformKey: string, limit = 100): Promise<PlatformGovernanceAudit[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_governance_audits')
      .select('*')
      .eq('platform_key', platformKey)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map(this.mapToRecord);
  }

  async findByEntity(entityType: string, entityId: string): Promise<PlatformGovernanceAudit[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_governance_audits')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(this.mapToRecord);
  }

  async create(params: {
    platformKey: string;
    entityType: string;
    entityId?: string;
    auditAction: PlatformAuditAction;
    actorId?: string;
    actorRole?: string;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
    rationale?: string;
  }): Promise<PlatformGovernanceAudit> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_governance_audits')
      .insert({
        platform_key: params.platformKey,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        audit_action: params.auditAction,
        actor_id: params.actorId || null,
        actor_role: params.actorRole || null,
        previous_state: params.previousState || null,
        new_state: params.newState || null,
        rationale: params.rationale || null,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecord(data);
  }

  private mapToRecord(data: any): PlatformGovernanceAudit {
    return {
      id: data.id,
      platformKey: data.platform_key,
      entityType: data.entity_type,
      entityId: data.entity_id,
      auditAction: data.audit_action,
      actorId: data.actor_id,
      actorRole: data.actor_role,
      previousState: data.previous_state,
      newState: data.new_state,
      rationale: data.rationale,
      createdAt: new Date(data.created_at),
    };
  }
}

let repository: PlatformGovernanceAuditRepository | null = null;

export function getPlatformGovernanceAuditRepository(): PlatformGovernanceAuditRepository {
  if (!repository) {
    repository = new PlatformGovernanceAuditRepository();
  }
  return repository;
}
