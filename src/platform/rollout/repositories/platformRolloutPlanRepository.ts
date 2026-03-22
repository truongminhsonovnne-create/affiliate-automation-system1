/**
 * Platform Rollout Plan Repository
 */

import { getSupabaseClient } from '../../../db/supabaseClient.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlatformRolloutPlan } from '../types/index.js';
import logger from '../../../utils/logger.js';

export class PlatformRolloutPlanRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  async createPlan(input: {
    platformKey: string;
    rolloutKey: string;
    rolloutStatus?: string;
    targetEnablementStage: string;
    rolloutPayload?: Record<string, unknown>;
    createdBy?: string;
  }): Promise<PlatformRolloutPlan> {
    const { data, error } = await this.client
      .from('platform_rollout_plans')
      .insert({
        platform_key: input.platformKey,
        rollout_key: input.rolloutKey,
        rollout_status: input.rolloutStatus || 'planned',
        target_enablement_stage: input.targetEnablementStage,
        rollout_payload: input.rolloutPayload || {},
        created_by: input.createdBy || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create plan: ${error.message}`);
    return this.mapToPlan(data);
  }

  async getPlanById(id: string): Promise<PlatformRolloutPlan | null> {
    const { data, error } = await this.client
      .from('platform_rollout_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data ? this.mapToPlan(data) : null;
  }

  async getPlanByPlatform(platformKey: string): Promise<PlatformRolloutPlan | null> {
    const { data, error } = await this.client
      .from('platform_rollout_plans')
      .select('*')
      .eq('platform_key', platformKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data ? this.mapToPlan(data) : null;
  }

  async updatePlanStatus(id: string, status: string): Promise<PlatformRolloutPlan | null> {
    const { data, error } = await this.client
      .from('platform_rollout_plans')
      .update({ rollout_status: status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data ? this.mapToPlan(data) : null;
  }

  async startPlan(id: string): Promise<PlatformRolloutPlan | null> {
    const { data, error } = await this.client
      .from('platform_rollout_plans')
      .update({
        rollout_status: 'staged',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data ? this.mapToPlan(data) : null;
  }

  private mapToPlan(row: Record<string, unknown>): PlatformRolloutPlan {
    return {
      id: row.id as string,
      platformKey: row.platform_key as string,
      rolloutKey: row.rollout_key as string,
      rolloutStatus: row.rollout_status as any,
      targetEnablementStage: row.target_enablement_stage as string,
      rolloutPayload: row.rollout_payload as Record<string, unknown>,
      createdBy: row.created_by as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      finalizedAt: row.finalized_at ? new Date(row.finalized_at as string) : null,
      startedAt: row.started_at ? new Date(row.started_at as string) : null,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    };
  }
}

export const platformRolloutPlanRepository = new PlatformRolloutPlanRepository();
