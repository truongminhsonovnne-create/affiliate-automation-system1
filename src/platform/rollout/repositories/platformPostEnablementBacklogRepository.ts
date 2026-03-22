/**
 * Platform Post-Enablement Backlog Repository
 */

import { getSupabaseClient } from '../../../db/supabaseClient.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlatformPostEnablementBacklogItem } from '../types/index.js';

export class PlatformPostEnablementBacklogRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  async createBacklogItem(input: {
    platformKey: string;
    backlogType: string;
    priority: string;
    title: string;
    description: string;
    category: string;
    backlogPayload?: Record<string, unknown>;
    assignedTo?: string;
    dueAt?: Date;
  }): Promise<PlatformPostEnablementBacklogItem> {
    const { data, error } = await this.client
      .from('platform_post_enablement_backlog')
      .insert({
        platform_key: input.platformKey,
        backlog_type: input.backlogType,
        backlog_status: 'open',
        priority: input.priority,
        title: input.title,
        description: input.description,
        category: input.category,
        backlog_payload: input.backlogPayload || {},
        assigned_to: input.assignedTo || null,
        due_at: input.dueAt?.toISOString() || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create backlog: ${error.message}`);
    return this.mapToBacklogItem(data);
  }

  async getBacklogByPlatform(platformKey: string): Promise<PlatformPostEnablementBacklogItem[]> {
    const { data, error } = await this.client
      .from('platform_post_enablement_backlog')
      .select('*')
      .eq('platform_key', platformKey)
      .order('priority', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapToBacklogItem);
  }

  private mapToBacklogItem(row: Record<string, unknown>): PlatformPostEnablementBacklogItem {
    return {
      id: row.id as string,
      platformKey: row.platform_key as string,
      rolloutPlanId: null,
      backlogType: row.backlog_type as any,
      backlogStatus: row.backlog_status as any,
      priority: row.priority as any,
      title: row.title as string,
      description: row.description as string,
      category: row.category as string,
      backlogPayload: row.backlog_payload as Record<string, unknown>,
      assignedTo: row.assigned_to as string | null,
      dueAt: row.due_at ? new Date(row.due_at as string) : null,
      createdAt: new Date(row.created_at as string),
      completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    };
  }
}

export const platformPostEnablementBacklogRepository = new PlatformPostEnablementBacklogRepository();
