/**
 * Platform Enablement Decision Repository
 *
 * Repository for managing enablement decisions.
 */

import { getSupabaseClient } from '../../../db/supabaseClient.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PlatformEnablementDecision,
  PlatformEnablementDecisionType,
  PlatformEnablementDecisionStatus,
  PlatformEnablementTargetStage,
} from '../types/index.js';
import logger from '../../../utils/logger.js';

export class PlatformEnablementDecisionRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  /**
   * Create a new decision
   */
  async createDecision(input: {
    platformKey: string;
    decisionType: PlatformEnablementDecisionType;
    targetStage: PlatformEnablementTargetStage;
    previousStage?: PlatformEnablementTargetStage;
    decisionPayload?: Record<string, unknown>;
    rationale?: string;
    actorId?: string;
    actorRole?: string;
    reviewId?: string;
    conditionsJson?: Record<string, unknown>[];
    warningsJson?: Record<string, unknown>[];
  }): Promise<PlatformEnablementDecision> {
    const { data, error } = await this.client
      .from('platform_enablement_decisions')
      .insert({
        platform_key: input.platformKey,
        decision_type: input.decisionType,
        decision_status: 'pending',
        target_stage: input.targetStage,
        previous_stage: input.previousStage || null,
        decision_payload: input.decisionPayload || {},
        rationale: input.rationale || null,
        actor_id: input.actorId || null,
        actor_role: input.actorRole || null,
        review_id: input.reviewId || null,
        conditions_json: input.conditionsJson || [],
        warnings_json: input.warningsJson || [],
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to create decision', error: error.message });
      throw new Error(`Failed to create decision: ${error.message}`);
    }

    return this.mapToDecision(data);
  }

  /**
   * Get decision by ID
   */
  async getDecisionById(id: string): Promise<PlatformEnablementDecision | null> {
    const { data, error } = await this.client
      .from('platform_enablement_decisions')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    return data ? this.mapToDecision(data) : null;
  }

  /**
   * Get latest decision for platform
   */
  async getLatestDecision(platformKey: string): Promise<PlatformEnablementDecision | null> {
    const { data, error } = await this.client
      .from('platform_enablement_decisions')
      .select('*')
      .eq('platform_key', platformKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    return data ? this.mapToDecision(data) : null;
  }

  /**
   * Get decisions by platform
   */
  async getDecisionsByPlatform(
    platformKey: string,
    limit: number = 10
  ): Promise<PlatformEnablementDecision[]> {
    const { data, error } = await this.client
      .from('platform_enablement_decisions')
      .select('*')
      .eq('platform_key', platformKey)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(this.mapToDecision);
  }

  /**
   * Get decisions by type
   */
  async getDecisionsByType(
    platformKey: string,
    decisionType: PlatformEnablementDecisionType
  ): Promise<PlatformEnablementDecision[]> {
    const { data, error } = await this.client
      .from('platform_enablement_decisions')
      .select('*')
      .eq('platform_key', platformKey)
      .eq('decision_type', decisionType)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapToDecision);
  }

  /**
   * Update decision status
   */
  async updateDecisionStatus(
    id: string,
    status: PlatformEnablementDecisionStatus,
    executedAt?: Date
  ): Promise<PlatformEnablementDecision | null> {
    const updateData: Record<string, unknown> = {
      decision_status: status,
    };

    if (executedAt) {
      updateData.executed_at = executedAt.toISOString();
    }

    const { data, error } = await this.client
      .from('platform_enablement_decisions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data ? this.mapToDecision(data) : null;
  }

  /**
   * Map database row to decision
   */
  private mapToDecision(row: Record<string, unknown>): PlatformEnablementDecision {
    return {
      id: row.id as string,
      platformKey: row.platform_key as string,
      decisionType: row.decision_type as PlatformEnablementDecisionType,
      decisionStatus: row.decision_status as PlatformEnablementDecisionStatus,
      targetStage: row.target_stage as PlatformEnablementTargetStage,
      previousStage: row.previous_stage as PlatformEnablementTargetStage | null,
      decisionPayload: row.decision_payload as Record<string, unknown>,
      rationale: row.rationale as string | null,
      actorId: row.actor_id as string | null,
      actorRole: row.actor_role as string | null,
      reviewId: row.review_id as string | null,
      conditionsJson: [],
      warningsJson: [],
      createdAt: new Date(row.created_at as string),
      executedAt: row.executed_at ? new Date(row.executed_at as string) : null,
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
    };
  }
}

export const platformEnablementDecisionRepository = new PlatformEnablementDecisionRepository();
