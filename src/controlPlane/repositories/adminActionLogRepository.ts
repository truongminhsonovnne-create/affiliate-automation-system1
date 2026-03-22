/**
 * Admin Action Log Repository
 *
 * Database persistence for admin action audit logs.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import type { AdminAuditRecordInput, AdminActionLogFilters, AdminActionType, AdminTargetType } from '../types.js';

const logger = createLogger({ subsystem: 'admin_action_log_repository' });

/** Supabase client (lazy loaded) */
let supabase: any = null;

/**
 * Initialize Supabase client
 */
async function getClient() {
  if (!supabase) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase not configured');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

/**
 * Insert admin action log
 */
export async function insertAdminActionLog(input: AdminAuditRecordInput): Promise<void> {
  try {
    const client = await getClient();

    await client.from('admin_action_logs').insert({
      actor_id: input.actorId,
      actor_role: input.actorRole,
      actor_email: input.actorEmail,
      action_type: input.actionType,
      target_type: input.targetType,
      target_id: input.targetId,
      request_payload: input.requestPayload,
      result_status: input.resultStatus,
      result_summary: input.resultSummary,
      result_error_code: input.resultErrorCode,
      correlation_id: input.correlationId,
      source_ip: input.sourceIp,
      user_agent: input.userAgent,
      metadata: input.metadata,
    });

    logger.debug('Admin action logged', { actionType: input.actionType, targetId: input.targetId });
  } catch (err) {
    logger.error('Failed to insert admin action log', err as Error);
    throw err;
  }
}

/**
 * Get admin action logs with filters
 */
export async function getAdminActionLogs(
  filters: AdminActionLogFilters & { page?: number; pageSize?: number }
): Promise<{ logs: any[]; total: number }> {
  try {
    const client = await getClient();

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = client
      .from('admin_action_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.actorId) {
      query = query.eq('actor_id', filters.actorId);
    }

    if (filters.actionType) {
      query = query.eq('action_type', filters.actionType);
    }

    if (filters.targetType) {
      query = query.eq('target_type', filters.targetType);
    }

    if (filters.targetId) {
      query = query.eq('target_id', filters.targetId);
    }

    if (filters.resultStatus) {
      query = query.eq('result_status', filters.resultStatus);
    }

    if (filters.since) {
      query = query.gte('created_at', filters.since);
    }

    if (filters.until) {
      query = query.lte('created_at', filters.until);
    }

    // Apply sorting
    const sortField = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
    query = query.order(sortField, sortOrder);

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to query admin action logs', error);
      return { logs: [], total: 0 };
    }

    return {
      logs: data || [],
      total: count || 0,
    };
  } catch (err) {
    logger.error('Failed to get admin action logs', err as Error);
    return { logs: [], total: 0 };
  }
}

/**
 * Get recent admin actions
 */
export async function getRecentAdminActions(
  limit: number = 20,
  filters?: {
    actorId?: string;
    actionType?: AdminActionType;
    resultStatus?: string;
  }
): Promise<any[]> {
  try {
    const client = await getClient();

    let query = client
      .from('admin_action_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.actorId) {
      query = query.eq('actor_id', filters.actorId);
    }

    if (filters?.actionType) {
      query = query.eq('action_type', filters.actionType);
    }

    if (filters?.resultStatus) {
      query = query.eq('result_status', filters.resultStatus);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get recent admin actions', error);
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error('Failed to get recent admin actions', err as Error);
    return [];
  }
}

/**
 * Get action logs for specific target
 */
export async function getLogsForTarget(
  targetType: AdminTargetType,
  targetId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const client = await getClient();

    const { data, error } = await client
      .from('admin_action_logs')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to get logs for target', error);
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error('Failed to get logs for target', err as Error);
    return [];
  }
}

/**
 * Get action statistics
 */
export async function getActionStatistics(
  since?: string
): Promise<Record<string, { total: number; success: number; failure: number }>> {
  try {
    const client = await getClient();

    let query = client
      .from('admin_action_logs')
      .select('action_type, result_status', { count: 'exact' });

    if (since) {
      query = query.gte('created_at', since);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get action statistics', error);
      return {};
    }

    // Group by action_type and result_status
    const stats: Record<string, { total: number; success: number; failure: number }> = {};

    for (const row of data || []) {
      const actionType = row.action_type;
      const resultStatus = row.result_status;

      if (!stats[actionType]) {
        stats[actionType] = { total: 0, success: 0, failure: 0 };
      }

      stats[actionType].total++;

      if (resultStatus === 'success') {
        stats[actionType].success++;
      } else if (resultStatus === 'failure') {
        stats[actionType].failure++;
      }
    }

    return stats;
  } catch (err) {
    logger.error('Failed to get action statistics', err as Error);
    return {};
  }
}
