/**
 * Platform Enablement Condition Repository
 *
 * Repository for managing enablement conditions.
 */

import { getSupabaseClient } from '../../../db/supabaseClient.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PlatformEnablementCondition,
  PlatformEnablementConditionType,
  PlatformEnablementConditionStatus,
} from '../types/index.js';
import logger from '../../../utils/logger.js';

export class PlatformEnablementConditionRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  async createCondition(input: {
    reviewId?: string;
    decisionId?: string;
    conditionType: PlatformEnablementConditionType;
    conditionStatus?: PlatformEnablementConditionStatus;
    severity: string;
    title: string;
    description: string;
    category: string;
    evidenceRef?: Record<string, unknown>;
    remediationAction?: string;
    estimatedResolutionDays?: number;
    assignedTo?: string;
    conditionPayload?: Record<string, unknown>;
  }): Promise<PlatformEnablementCondition> {
    const { data, error } = await this.client
      .from('platform_enablement_conditions')
      .insert({
        review_id: input.reviewId || null,
        decision_id: input.decisionId || null,
        condition_type: input.conditionType,
        condition_status: input.conditionStatus || 'pending',
        severity: input.severity,
        title: input.title,
        description: input.description,
        category: input.category,
        evidence_ref: input.evidenceRef || {},
        remediation_action: input.remediationAction || null,
        estimated_resolution_days: input.estimatedResolutionDays || null,
        assigned_to: input.assignedTo || null,
        condition_payload: input.conditionPayload || {},
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to create condition', error: error.message });
      throw new Error(`Failed to create condition: ${error.message}`);
    }

    return this.mapToCondition(data);
  }

  async getConditionById(id: string): Promise<PlatformEnablementCondition | null> {
    const { data, error } = await this.client
      .from('platform_enablement_conditions')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    return data ? this.mapToCondition(data) : null;
  }

  async getConditionsByReview(reviewId: string): Promise<PlatformEnablementCondition[]> {
    const { data, error } = await this.client
      .from('platform_enablement_conditions')
      .select('*')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapToCondition);
  }

  async getConditionsByDecision(decisionId: string): Promise<PlatformEnablementCondition[]> {
    const { data, error } = await this.client
      .from('platform_enablement_conditions')
      .select('*')
      .eq('decision_id', decisionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapToCondition);
  }

  async updateConditionStatus(
    id: string,
    status: PlatformEnablementConditionStatus
  ): Promise<PlatformEnablementCondition | null> {
    const updateData: Record<string, unknown> = { condition_status: status };

    if (status === 'satisfied') {
      updateData.satisfied_at = new Date().toISOString();
    } else if (status === 'expired') {
      updateData.expired_at = new Date().toISOString();
    }

    const { data, error } = await this.client
      .from('platform_enablement_conditions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data ? this.mapToCondition(data) : null;
  }

  private mapToCondition(row: Record<string, unknown>): PlatformEnablementCondition {
    return {
      id: row.id as string,
      reviewId: row.review_id as string | null,
      decisionId: row.decision_id as string | null,
      conditionType: row.condition_type as PlatformEnablementConditionType,
      conditionStatus: row.condition_status as PlatformEnablementConditionStatus,
      severity: row.severity as 'critical' | 'high' | 'medium' | 'low',
      title: row.title as string,
      description: row.description as string,
      category: row.category as string,
      evidenceRef: row.evidence_ref as Record<string, unknown>,
      remediationAction: row.remediation_action as string | null,
      estimatedResolutionDays: row.estimated_resolution_days as number | null,
      assignedTo: row.assigned_to as string | null,
      conditionPayload: row.condition_payload as Record<string, unknown>,
      createdAt: new Date(row.created_at as string),
      satisfiedAt: row.satisfied_at ? new Date(row.satisfied_at as string) : null,
      expiredAt: row.expired_at ? new Date(row.expired_at as string) : null,
    };
  }
}

export const platformEnablementConditionRepository = new PlatformEnablementConditionRepository();
