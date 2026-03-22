/**
 * TikTok Shop Monetization Governance & Backlog Repository
 *
 * Repository for managing governance actions and backlog items using Supabase.
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  TikTokShopMonetizationGovernanceAction,
  TikTokShopPreviewBacklogItem,
  TikTokShopMonetizationGovernanceActionType,
  TikTokShopMonetizationGovernanceActionStatus,
  TikTokShopPreviewBacklogItemType,
  TikTokShopPreviewBacklogItemStatus,
  TikTokShopPreviewBacklogItemPriority,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * TikTok Shop Monetization Governance Repository
 */
export class TikTokMonetizationGovernanceRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  /**
   * Create governance action
   */
  async createAction(input: {
    actionType: TikTokShopMonetizationGovernanceActionType;
    targetEntityType?: string;
    targetEntityId?: string;
    actionPayload: Record<string, unknown>;
    rationale?: string;
    actorId?: string;
    actorRole?: string;
  }): Promise<TikTokShopMonetizationGovernanceAction> {
    const { data, error } = await this.client
      .from('tiktok_shop_monetization_governance_actions')
      .insert({
        action_type: input.actionType,
        action_status: 'pending',
        target_entity_type: input.targetEntityType || null,
        target_entity_id: input.targetEntityId || null,
        action_payload: input.actionPayload,
        rationale: input.rationale || null,
        actor_id: input.actorId || null,
        actor_role: input.actorRole || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to create governance action', error: error.message });
      throw new Error(`Failed to create action: ${error.message}`);
    }

    return this.mapToAction(data);
  }

  /**
   * Execute action
   */
  async executeAction(id: string): Promise<TikTokShopMonetizationGovernanceAction | null> {
    const { data, error } = await this.client
      .from('tiktok_shop_monetization_governance_actions')
      .update({
        action_status: 'executed',
        executed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to execute action', error: error.message });
      throw new Error(`Failed to execute action: ${error.message}`);
    }

    return data ? this.mapToAction(data) : null;
  }

  /**
   * Get actions by status
   */
  async getActionsByStatus(status: TikTokShopMonetizationGovernanceActionStatus, limit: number = 100): Promise<TikTokShopMonetizationGovernanceAction[]> {
    const { data, error } = await this.client
      .from('tiktok_shop_monetization_governance_actions')
      .select('*')
      .eq('action_status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ msg: 'Failed to get actions by status', error: error.message });
      throw new Error(`Failed to get actions: ${error.message}`);
    }

    return (data || []).map(this.mapToAction);
  }

  /**
   * Get pending actions
   */
  async getPendingActions(limit: number = 100): Promise<TikTokShopMonetizationGovernanceAction[]> {
    const { data, error } = await this.client
      .from('tiktok_shop_monetization_governance_actions')
      .select('*')
      .eq('action_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ msg: 'Failed to get pending actions', error: error.message });
      throw new Error(`Failed to get pending actions: ${error.message}`);
    }

    return (data || []).map(this.mapToAction);
  }

  /**
   * Get recent actions
   */
  async getRecentActions(limit: number = 50): Promise<TikTokShopMonetizationGovernanceAction[]> {
    const { data, error } = await this.client
      .from('tiktok_shop_monetization_governance_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ msg: 'Failed to get recent actions', error: error.message });
      throw new Error(`Failed to get recent actions: ${error.message}`);
    }

    return (data || []).map(this.mapToAction);
  }

  /**
   * Map database row to action
   */
  private mapToAction(row: Record<string, unknown>): TikTokShopMonetizationGovernanceAction {
    return {
      id: row.id as string,
      actionType: row.action_type as TikTokShopMonetizationGovernanceActionType,
      actionStatus: row.action_status as TikTokShopMonetizationGovernanceActionStatus,
      targetEntityType: row.target_entity_type as string | null,
      targetEntityId: row.target_entity_id as string | null,
      actionPayload: row.action_payload as Record<string, unknown>,
      rationale: row.rationale as string | null,
      actorId: row.actor_id as string | null,
      actorRole: row.actor_role as string | null,
      createdAt: new Date(row.created_at as string),
      executedAt: row.executed_at ? new Date(row.executed_at as string) : null,
    };
  }
}

/**
 * TikTok Shop Preview Backlog Repository
 */
export class TikTokPreviewBacklogRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  /**
   * Create backlog item
   */
  async createItem(input: {
    backlogType: TikTokShopPreviewBacklogItemType;
    backlogStatus?: TikTokShopPreviewBacklogItemStatus;
    priority: TikTokShopPreviewBacklogItemPriority;
    backlogPayload: Record<string, unknown>;
    assignedTo?: string;
    dueAt?: Date;
  }): Promise<TikTokShopPreviewBacklogItem> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_backlog')
      .insert({
        backlog_type: input.backlogType,
        backlog_status: input.backlogStatus || 'open',
        priority: input.priority,
        backlog_payload: input.backlogPayload,
        assigned_to: input.assignedTo || null,
        due_at: input.dueAt?.toISOString() || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to create backlog item', error: error.message });
      throw new Error(`Failed to create backlog item: ${error.message}`);
    }

    return this.mapToBacklogItem(data);
  }

  /**
   * Update item
   */
  async updateItem(
    id: string,
    updates: {
      backlogStatus?: TikTokShopPreviewBacklogItemStatus;
      priority?: TikTokShopPreviewBacklogItemPriority;
      backlogPayload?: Record<string, unknown>;
      assignedTo?: string;
      dueAt?: Date;
      completedAt?: Date;
    }
  ): Promise<TikTokShopPreviewBacklogItem | null> {
    const updateData: Record<string, unknown> = {};
    if (updates.backlogStatus) updateData.backlog_status = updates.backlogStatus;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.backlogPayload) updateData.backlog_payload = updates.backlogPayload;
    if (updates.assignedTo) updateData.assigned_to = updates.assignedTo;
    if (updates.dueAt) updateData.due_at = updates.dueAt.toISOString();
    if (updates.completedAt) updateData.completed_at = updates.completedAt.toISOString();

    const { data, error } = await this.client
      .from('tiktok_shop_preview_backlog')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to update backlog item', error: error.message });
      throw new Error(`Failed to update backlog item: ${error.message}`);
    }

    return data ? this.mapToBacklogItem(data) : null;
  }

  /**
   * Complete item
   */
  async completeItem(id: string): Promise<TikTokShopPreviewBacklogItem | null> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_backlog')
      .update({
        backlog_status: 'resolved',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to complete backlog item', error: error.message });
      throw new Error(`Failed to complete backlog item: ${error.message}`);
    }

    return data ? this.mapToBacklogItem(data) : null;
  }

  /**
   * Get items by status
   */
  async getItemsByStatus(status: TikTokShopPreviewBacklogItemStatus, limit: number = 100): Promise<TikTokShopPreviewBacklogItem[]> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_backlog')
      .select('*')
      .eq('backlog_status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ msg: 'Failed to get items by status', error: error.message });
      throw new Error(`Failed to get items: ${error.message}`);
    }

    return (data || []).map(this.mapToBacklogItem);
  }

  /**
   * Get open items
   */
  async getOpenItems(limit: number = 100): Promise<TikTokShopPreviewBacklogItem[]> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_backlog')
      .select('*')
      .in('backlog_status', ['open', 'in_progress', 'blocked'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ msg: 'Failed to get open items', error: error.message });
      throw new Error(`Failed to get open items: ${error.message}`);
    }

    return (data || []).map(this.mapToBacklogItem);
  }

  /**
   * Get critical items
   */
  async getCriticalItems(limit: number = 50): Promise<TikTokShopPreviewBacklogItem[]> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_backlog')
      .select('*')
      .eq('priority', 'critical')
      .in('backlog_status', ['open', 'in_progress', 'blocked'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ msg: 'Failed to get critical items', error: error.message });
      throw new Error(`Failed to get critical items: ${error.message}`);
    }

    return (data || []).map(this.mapToBacklogItem);
  }

  /**
   * Get high priority items
   */
  async getHighPriorityItems(limit: number = 50): Promise<TikTokShopPreviewBacklogItem[]> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_backlog')
      .select('*')
      .in('priority', ['critical', 'high'])
      .in('backlog_status', ['open', 'in_progress', 'blocked'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ msg: 'Failed to get high priority items', error: error.message });
      throw new Error(`Failed to get high priority items: ${error.message}`);
    }

    return (data || []).map(this.mapToBacklogItem);
  }

  /**
   * Get backlog stats
   */
  async getBacklogStats(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    blocked: number;
    resolved: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const { data, error } = await this.client
      .from('tiktok_shop_preview_backlog')
      .select('*');

    if (error) {
      logger.error({ msg: 'Failed to get backlog stats', error: error.message });
      throw new Error(`Failed to get backlog stats: ${error.message}`);
    }

    const stats = {
      total: data?.length || 0,
      open: 0,
      inProgress: 0,
      blocked: 0,
      resolved: 0,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };

    for (const item of data || []) {
      const status = item.backlog_status as string;
      const type = item.backlog_type as string;
      const priority = item.priority as string;

      if (status === 'open') stats.open++;
      else if (status === 'in_progress') stats.inProgress++;
      else if (status === 'blocked') stats.blocked++;
      else if (status === 'resolved') stats.resolved++;

      stats.byType[type] = (stats.byType[type] || 0) + 1;
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
    }

    return stats;
  }

  /**
   * Map database row to backlog item
   */
  private mapToBacklogItem(row: Record<string, unknown>): TikTokShopPreviewBacklogItem {
    return {
      id: row.id as string,
      backlogType: row.backlog_type as TikTokShopPreviewBacklogItemType,
      backlogStatus: row.backlog_status as TikTokShopPreviewBacklogItemStatus,
      priority: row.priority as TikTokShopPreviewBacklogItemPriority,
      backlogPayload: row.backlog_payload as Record<string, unknown>,
      assignedTo: row.assigned_to as string | null,
      dueAt: row.due_at ? new Date(row.due_at as string) : null,
      createdAt: new Date(row.created_at as string),
      completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    };
  }
}

/**
 * Repository singletons
 */
export const tiktokMonetizationGovernanceRepository = new TikTokMonetizationGovernanceRepository();
export const tiktokPreviewBacklogRepository = new TikTokPreviewBacklogRepository();
