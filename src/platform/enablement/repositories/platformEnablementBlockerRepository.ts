/**
 * Platform Enablement Blocker Repository
 *
 * Repository for managing enablement blockers.
 */

import { getSupabaseClient } from '../../../db/supabaseClient.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PlatformEnablementBlocker,
  PlatformEnablementBlockerType,
  PlatformEnablementBlockerStatus,
} from '../types/index.js';
import logger from '../../../utils/logger.js';

export class PlatformEnablementBlockerRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  async createBlocker(input: {
    reviewId?: string;
    decisionId?: string;
    blockerType: PlatformEnablementBlockerType;
    blockerStatus?: PlatformEnablementBlockerStatus;
    severity: string;
    title: string;
    description: string;
    category: string;
    evidenceRef?: Record<string, unknown>;
    resolutionAction?: string;
    estimatedResolutionDays?: number;
    blockerPayload?: Record<string, unknown>;
  }): Promise<PlatformEnablementBlocker> {
    const { data, error } = await this.client
      .from('platform_enablement_blockers')
      .insert({
        review_id: input.reviewId || null,
        decision_id: input.decisionId || null,
        blocker_type: input.blockerType,
        blocker_status: input.blockerStatus || 'open',
        severity: input.severity,
        title: input.title,
        description: input.description,
        category: input.category,
        evidence_ref: input.evidenceRef || {},
        resolution_action: input.resolutionAction || null,
        estimated_resolution_days: input.estimatedResolutionDays || null,
        blocker_payload: input.blockerPayload || {},
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to create blocker', error: error.message });
      throw new Error(`Failed to create blocker: ${error.message}`);
    }

    return this.mapToBlocker(data);
  }

  async getBlockerById(id: string): Promise<PlatformEnablementBlocker | null> {
    const { data, error } = await this.client
      .from('platform_enablement_blockers')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    return data ? this.mapToBlocker(data) : null;
  }

  async getBlockersByReview(reviewId: string): Promise<PlatformEnablementBlocker[]> {
    const { data, error } = await this.client
      .from('platform_enablement_blockers')
      .select('*')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapToBlocker);
  }

  async getBlockersByDecision(decisionId: string): Promise<PlatformEnablementBlocker[]> {
    const { data, error } = await this.client
      .from('platform_enablement_blockers')
      .select('*')
      .eq('decision_id', decisionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapToBlocker);
  }

  async getOpenBlockers(platformKey?: string): Promise<PlatformEnablementBlocker[]> {
    let query = this.client
      .from('platform_enablement_blockers')
      .select('*')
      .eq('blocker_status', 'open');

    if (platformKey) {
      // Would need to join with reviews table
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapToBlocker);
  }

  async updateBlockerStatus(
    id: string,
    status: PlatformEnablementBlockerStatus
  ): Promise<PlatformEnablementBlocker | null> {
    const updateData: Record<string, unknown> = { blocker_status: status };

    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await this.client
      .from('platform_enablement_blockers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data ? this.mapToBlocker(data) : null;
  }

  private mapToBlocker(row: Record<string, unknown>): PlatformEnablementBlocker {
    return {
      id: row.id as string,
      reviewId: row.review_id as string | null,
      decisionId: row.decision_id as string | null,
      blockerType: row.blocker_type as PlatformEnablementBlockerType,
      blockerStatus: row.blocker_status as PlatformEnablementBlockerStatus,
      severity: row.severity as 'critical' | 'high' | 'medium' | 'low',
      title: row.title as string,
      description: row.description as string,
      category: row.category as string,
      evidenceRef: row.evidence_ref as Record<string, unknown>,
      resolutionAction: row.resolution_action as string | null,
      estimatedResolutionDays: row.estimated_resolution_days as number | null,
      blockerPayload: row.blocker_payload as Record<string, unknown>,
      createdAt: new Date(row.created_at as string),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : null,
    };
  }
}

export const platformEnablementBlockerRepository = new PlatformEnablementBlockerRepository();
