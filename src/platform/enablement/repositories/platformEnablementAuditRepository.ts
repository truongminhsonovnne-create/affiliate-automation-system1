/**
 * Platform Enablement Audit Repository
 *
 * Repository for managing enablement audits.
 */

import { getSupabaseClient } from '../../../db/supabaseClient.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlatformEnablementAudit } from '../types/index.js';
import logger from '../../../utils/logger.js';

export class PlatformEnablementAuditRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  async createAudit(input: {
    platformKey: string;
    entityType: string;
    entityId?: string;
    auditAction: string;
    actorId?: string;
    actorRole?: string;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
    rationale?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<PlatformEnablementAudit> {
    const { data, error } = await this.client
      .from('platform_enablement_audits')
      .insert({
        platform_key: input.platformKey,
        entity_type: input.entityType,
        entity_id: input.entityId || null,
        audit_action: input.auditAction,
        actor_id: input.actorId || null,
        actor_role: input.actorRole || null,
        previous_state: input.previousState || null,
        new_state: input.newState || null,
        rationale: input.rationale || null,
        metadata: input.metadata || {},
        ip_address: input.ipAddress || null,
        user_agent: input.userAgent || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to create audit', error: error.message });
      throw new Error(`Failed to create audit: ${error.message}`);
    }

    return this.mapToAudit(data);
  }

  async getAuditsByPlatform(platformKey: string, limit: number = 100): Promise<PlatformEnablementAudit[]> {
    const { data, error } = await this.client
      .from('platform_enablement_audits')
      .select('*')
      .eq('platform_key', platformKey)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(this.mapToAudit);
  }

  async getAuditsByEntity(entityType: string, entityId: string): Promise<PlatformEnablementAudit[]> {
    const { data, error } = await this.client
      .from('platform_enablement_audits')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapToAudit);
  }

  private mapToAudit(row: Record<string, unknown>): PlatformEnablementAudit {
    return {
      id: row.id as string,
      platformKey: row.platform_key as string,
      entityType: row.entity_type as 'candidate_review' | 'enablement_decision' | 'condition' | 'blocker' | 'warning',
      entityId: row.entity_id as string | null,
      auditAction: row.audit_action as string,
      actorId: row.actor_id as string | null,
      actorRole: row.actor_role as string | null,
      previousState: row.previous_state as Record<string, unknown> | null,
      newState: row.new_state as Record<string, unknown> | null,
      rationale: row.rationale as string | null,
      metadata: row.metadata as Record<string, unknown>,
      ipAddress: row.ip_address as string | null,
      userAgent: row.user_agent as string | null,
      createdAt: new Date(row.created_at as string),
    };
  }
}

export const platformEnablementAuditRepository = new PlatformEnablementAuditRepository();
